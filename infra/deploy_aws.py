"""Deploy หลานโทรหา to AWS (ap-southeast-1). Safe to re-run: creates what is missing, updates.

    cd backend && uv run python ../infra/deploy_aws.py            # everything
    cd backend && uv run python ../infra/deploy_aws.py guardrail  # one step

Steps: table (DynamoDB + TTL + PITR) · guardrail (Bedrock Guardrail + version) · secrets (Secrets
Manager, values from backend/.env) · roles (IAM for App Runner) · images (ECR + docker push) ·
services (App Runner backend + frontend) · alarm (CloudWatch on bedrock_fallback).

The stage deployment runs ENV=development + DEMO_MODE=true (CLAUDE.md §6.5 allows demo mode
for the presentation, never in production) with REPO_DRIVER=dynamodb and the real Bedrock.
Needs: AWS credentials (aws sso login), Docker running.
"""

from __future__ import annotations

import base64
import contextlib
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError

REGION = "ap-southeast-1"
NAME = "larntorha"
ROOT = Path(__file__).resolve().parents[1]
INFRA = ROOT / "infra"
BACKEND_ENV = ROOT / "backend" / ".env"
FRONTEND_ENV = ROOT / "frontend" / ".env"
SECRET_KEYS = [
    "SESSION_SECRET",
    "CALLS_API_TOKEN",
    "INTERNAL_API_TOKEN",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_CHANNEL_SECRET",
]

session = boto3.Session(region_name=REGION)
ACCOUNT = session.client("sts").get_caller_identity()["Account"]


def log(msg: str) -> None:
    print(f"→ {msg}", flush=True)


def read_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.split(" #")[0].strip().strip('"')
    return out


def set_env(path: Path, updates: dict[str, str]) -> None:
    """Write KEY=value lines in place (keeps the rest of the file)."""
    lines = path.read_text(encoding="utf-8").splitlines()
    done = set()
    for i, line in enumerate(lines):
        k = line.split("=", 1)[0].strip()
        if k in updates:
            lines[i] = f"{k}={updates[k]}"
            done.add(k)
    lines += [f"{k}={v}" for k, v in updates.items() if k not in done]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------- DynamoDB


def table() -> None:
    ddb = session.client("dynamodb")
    spec = json.loads((INFRA / "dynamodb-table.json").read_text(encoding="utf-8"))
    try:
        ddb.describe_table(TableName=spec["TableName"])
        log("DynamoDB table exists")
    except ddb.exceptions.ResourceNotFoundException:
        log("creating DynamoDB table")
        ddb.create_table(**spec)
        ddb.get_waiter("table_exists").wait(TableName=spec["TableName"])
    ttl = ddb.describe_time_to_live(TableName=spec["TableName"])["TimeToLiveDescription"]
    if ttl.get("TimeToLiveStatus") not in ("ENABLED", "ENABLING"):
        ddb.update_time_to_live(
            TableName=spec["TableName"],
            TimeToLiveSpecification={"Enabled": True, "AttributeName": "ttl"},
        )
    ddb.update_continuous_backups(
        TableName=spec["TableName"],
        PointInTimeRecoverySpecification={"PointInTimeRecoveryEnabled": True},
    )
    log("DynamoDB: TTL + PITR on")


# ---------------------------------------------------------------------------- Bedrock Guardrail


def guardrail() -> tuple[str, str]:
    br = session.client("bedrock")
    spec = json.loads((INFRA / "guardrail.json").read_text(encoding="utf-8"))
    found = [g for g in br.list_guardrails()["guardrails"] if g["name"] == spec["name"]]
    if found:
        gid = found[0]["id"]
        log(f"updating guardrail {gid}")
        br.update_guardrail(guardrailIdentifier=gid, **spec)
    else:
        log("creating guardrail")
        gid = br.create_guardrail(**spec)["guardrailId"]
    for _ in range(30):
        if br.get_guardrail(guardrailIdentifier=gid)["status"] == "READY":
            break
        time.sleep(2)
    version = br.create_guardrail_version(guardrailIdentifier=gid, description="deploy")["version"]
    log(f"guardrail {gid} version {version}")
    set_env(BACKEND_ENV, {"BEDROCK_GUARDRAIL_ID": gid, "BEDROCK_GUARDRAIL_VERSION": version})
    return gid, version


# ---------------------------------------------------------------------------- Secrets Manager


def secrets() -> dict[str, str]:
    sm = session.client("secretsmanager")
    env = read_env(BACKEND_ENV)
    arns: dict[str, str] = {}
    for key in SECRET_KEYS:
        value = env.get(key, "")
        if not value:
            continue
        name = f"{NAME}/{key}"
        try:
            arns[key] = sm.put_secret_value(SecretId=name, SecretString=value)["ARN"]
        except sm.exceptions.ResourceNotFoundException:
            arns[key] = sm.create_secret(Name=name, SecretString=value)["ARN"]
    log(f"secrets stored: {', '.join(arns)}")
    return arns


# ---------------------------------------------------------------------------- IAM


def _role(name: str, service: str, policy: dict[str, Any] | None, managed: str | None) -> str:
    iam = session.client("iam")
    trust = {
        "Version": "2012-10-17",
        "Statement": [
            {"Effect": "Allow", "Principal": {"Service": service}, "Action": "sts:AssumeRole"}
        ],
    }
    try:
        arn = iam.get_role(RoleName=name)["Role"]["Arn"]
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(RoleName=name, AssumeRolePolicyDocument=json.dumps(trust))["Role"][
            "Arn"
        ]
        time.sleep(8)  # IAM is eventually consistent
    if managed:
        iam.attach_role_policy(RoleName=name, PolicyArn=managed)
    if policy:
        iam.put_role_policy(RoleName=name, PolicyName="app", PolicyDocument=json.dumps(policy))
    return arn


def roles(gid: str, secret_arns: dict[str, str]) -> dict[str, str]:
    env = read_env(BACKEND_ENV)
    model = env["BEDROCK_MODEL_ID"]
    backend_policy = json.loads(
        (INFRA / "iam-policy.json")
        .read_text(encoding="utf-8")
        .replace("<ACCOUNT_ID>", ACCOUNT)
        .replace("<BEDROCK_MODEL_ID>", model)
        .replace("<FOUNDATION_MODEL_ID>", model)
        .replace("<BEDROCK_GUARDRAIL_ID>", gid)
    )
    backend_policy["Statement"].append(
        {
            "Effect": "Allow",
            "Action": "secretsmanager:GetSecretValue",
            "Resource": list(secret_arns.values()),
        }
    )
    frontend_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "secretsmanager:GetSecretValue",
                "Resource": [secret_arns["INTERNAL_API_TOKEN"]],
            }
        ],
    }
    out = {
        "ecr": _role(
            f"{NAME}-apprunner-ecr",
            "build.apprunner.amazonaws.com",
            None,
            "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
        ),
        "backend": _role(f"{NAME}-backend", "tasks.apprunner.amazonaws.com", backend_policy, None),
        "frontend": _role(
            f"{NAME}-frontend", "tasks.apprunner.amazonaws.com", frontend_policy, None
        ),
    }
    log("IAM roles ready")
    return out


# ---------------------------------------------------------------------------- ECR + Docker


def _sh(*cmd: str, stdin: str | None = None) -> None:
    subprocess.run(cmd, check=True, input=stdin, text=True)  # noqa: S603 — fixed docker commands


def images() -> dict[str, str]:
    ecr = session.client("ecr")
    auth = ecr.get_authorization_token()["authorizationData"][0]
    user, password = base64.b64decode(auth["authorizationToken"]).decode().split(":", 1)
    registry = auth["proxyEndpoint"].removeprefix("https://")
    _sh("docker", "login", "--username", user, "--password-stdin", registry, stdin=password)
    tag = time.strftime("%Y%m%d%H%M%S")
    line_oa = read_env(FRONTEND_ENV).get("NEXT_PUBLIC_LINE_OA_URL", "")
    out: dict[str, str] = {}
    for part in ("backend", "frontend"):
        repo = f"{NAME}-{part}"
        with contextlib.suppress(ecr.exceptions.RepositoryAlreadyExistsException):
            ecr.create_repository(
                repositoryName=repo, imageScanningConfiguration={"scanOnPush": True}
            )
        uri = f"{registry}/{repo}:{tag}"
        log(f"docker build + push {uri}")
        args = ["docker", "build", "--platform", "linux/amd64", "-t", uri]
        if part == "frontend":
            args += ["--build-arg", f"NEXT_PUBLIC_LINE_OA_URL={line_oa}"]
        _sh(*args, str(ROOT / part))
        _sh("docker", "push", uri)
        out[part] = uri
    return out


# ---------------------------------------------------------------------------- App Runner


def _service(
    name: str,
    image: str,
    port: str,
    env: dict[str, str],
    secrets_: dict[str, str],
    role: str,
    ecr_role: str,
) -> str:
    ar = session.client("apprunner")
    source = {
        "ImageRepository": {
            "ImageIdentifier": image,
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": port,
                "RuntimeEnvironmentVariables": env,
                "RuntimeEnvironmentSecrets": secrets_,
            },
        },
        "AuthenticationConfiguration": {"AccessRoleArn": ecr_role},
        "AutoDeploymentsEnabled": False,
    }
    instance = {"Cpu": "1 vCPU", "Memory": "2 GB", "InstanceRoleArn": role}
    health = {"Protocol": "HTTP", "Path": "/health" if port == "8000" else "/", "Interval": 10}
    existing = [s for s in ar.list_services()["ServiceSummaryList"] if s["ServiceName"] == name]
    if existing:
        arn = existing[0]["ServiceArn"]
        log(f"updating App Runner service {name}")
        ar.update_service(
            ServiceArn=arn,
            SourceConfiguration=source,
            InstanceConfiguration=instance,
            HealthCheckConfiguration=health,
        )
    else:
        log(f"creating App Runner service {name}")
        arn = ar.create_service(
            ServiceName=name,
            SourceConfiguration=source,
            InstanceConfiguration=instance,
            HealthCheckConfiguration=health,
        )["Service"]["ServiceArn"]
    while True:
        svc = ar.describe_service(ServiceArn=arn)["Service"]
        if svc["Status"] != "OPERATION_IN_PROGRESS":
            break
        time.sleep(15)
    if svc["Status"] != "RUNNING":
        raise SystemExit(f"{name}: {svc['Status']} (ดู log ใน App Runner console)")
    url = f"https://{svc['ServiceUrl']}"
    log(f"{name} RUNNING at {url}")
    return url


def services(imgs: dict[str, str], role_arns: dict[str, str], secret_arns: dict[str, str]) -> None:
    benv = read_env(BACKEND_ENV)
    fenv = read_env(FRONTEND_ENV)
    backend_env = {
        "ENV": "development",  # stage deployment with DEMO_MODE (never production)
        "REPO_DRIVER": "dynamodb",
        "DYNAMODB_TABLE": NAME,
        "AWS_REGION": REGION,
        "SEED_DEMO": "true",
        "DEMO_MODE": "true",
        "AI_PROVIDER": "bedrock",
        "BEDROCK_REGION": REGION,
        "BEDROCK_MODEL_ID": benv["BEDROCK_MODEL_ID"],
        "BEDROCK_GUARDRAIL_ID": benv["BEDROCK_GUARDRAIL_ID"],
        "BEDROCK_GUARDRAIL_VERSION": benv["BEDROCK_GUARDRAIL_VERSION"],
        "BEDROCK_TIMEOUT_SEC": benv.get("BEDROCK_TIMEOUT_SEC", "20"),
    }
    for key in ("LINE_LOGIN_CHANNEL_ID", "LINE_TO_USER_IDS", "CARD_IMAGE_BASE_URL"):
        if benv.get(key) and "ngrok" not in benv[key]:
            backend_env[key] = benv[key]
    backend_secrets = {k: v for k, v in secret_arns.items()}
    backend_url = _service(
        f"{NAME}-backend",
        imgs["backend"],
        "8000",
        backend_env,
        backend_secrets,
        role_arns["backend"],
        role_arns["ecr"],
    )
    frontend_env = {"BACKEND_URL": backend_url, "DEMO_MODE": "true"}
    if fenv.get("LIFF_ID"):
        frontend_env["LIFF_ID"] = fenv["LIFF_ID"]
    frontend_url = _service(
        f"{NAME}-frontend",
        imgs["frontend"],
        "3000",
        frontend_env,
        {"INTERNAL_API_TOKEN": secret_arns["INTERNAL_API_TOKEN"]},
        role_arns["frontend"],
        role_arns["ecr"],
    )
    backend_env["APP_BASE_URL"] = frontend_url  # links in LINE alerts open the deployed site
    _service(
        f"{NAME}-backend",
        imgs["backend"],
        "8000",
        backend_env,
        backend_secrets,
        role_arns["backend"],
        role_arns["ecr"],
    )
    (INFRA / "deployed.json").write_text(
        json.dumps({"frontend": frontend_url, "backend": backend_url}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\nเว็บ: {frontend_url}\nbackend: {backend_url}")


# ---------------------------------------------------------------------------- CloudWatch


def alarm() -> None:
    session.client("cloudwatch").put_metric_alarm(
        AlarmName=f"{NAME}-bedrock-fallback",
        AlarmDescription="Bedrock สรุปสายไม่สำเร็จ ระบบใช้กฎอย่างเดียว ให้คนตรวจ (CLAUDE.md §5A.5)",
        Namespace="LarnTorHa",
        MetricName="bedrock_fallback",
        Statistic="Sum",
        Period=300,
        EvaluationPeriods=1,
        Threshold=1,
        ComparisonOperator="GreaterThanOrEqualToThreshold",
        TreatMissingData="notBreaching",
    )
    log("CloudWatch alarm larntorha-bedrock-fallback ready")


def main() -> None:
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    try:
        if step in ("table", "all"):
            table()
        if step == "guardrail":
            guardrail()
            return
        if step == "alarm":
            alarm()
            return
        if step == "all":
            gid, _ = guardrail()
            arns = secrets()
            role_arns = roles(gid, arns)
            imgs = images()
            services(imgs, role_arns, arns)
            alarm()
    except ClientError as e:
        raise SystemExit(
            f"AWS: {e.response['Error']['Code']}: {e.response['Error']['Message']}"
        ) from e


if __name__ == "__main__":
    main()
