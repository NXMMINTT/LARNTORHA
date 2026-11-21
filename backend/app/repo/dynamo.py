"""DynamoDB single-table repository (CLAUDE.md §9) for production.

Each item keeps the Pydantic model as JSON in `data`, next to its keys. Unique values (phone,
referral code, LINE link codes, call ids) get a pointer item `LOOKUP#<KIND>#<value>` written in
the same TransactWriteItems as the main item with `attribute_not_exists(PK)`, so duplicates and
concurrent writes are rejected by DynamoDB itself.

Extension to the §9 table: a guardian linked to LINE also carries GSI1PK=`LINEUSER#<uid>` so the
LINE menu can find "my elders" without a scan.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, TypeVar

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError
from pydantic import BaseModel

from app.domain.models import CallResult, Elder, Guardian, NineQTask, NotificationLog, Osm

M = TypeVar("M", bound=BaseModel)
NOTIF_TTL = timedelta(days=180)


def _osm_pk(osm_id: str) -> str:
    return f"OSM#{osm_id}"


def _elder_pk(elder_id: str) -> str:
    return f"ELDER#{elder_id}"


def _lookup(kind: str, value: str) -> dict[str, str]:
    return {"PK": f"LOOKUP#{kind}#{value}", "SK": "LOOKUP"}


def _call_sk(call: CallResult) -> str:
    return f"CALL#{call.started_at.isoformat()}#{call.id}"


def _task_gsi_sk(task: NineQTask) -> str:
    return f"TASK9Q#{task.status}#{task.due_at.isoformat()}"


class DynamoRepo:
    def __init__(self, table_name: str, region: str, endpoint_url: str | None = None) -> None:
        self._ddb = boto3.resource("dynamodb", region_name=region, endpoint_url=endpoint_url)
        self._table = self._ddb.Table(table_name)
        self._client = self._ddb.meta.client
        self._name = table_name

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _load(model: type[M], item: dict[str, Any] | None) -> M | None:
        return model.model_validate_json(str(item["data"])) if item else None

    def _get(self, key: dict[str, str]) -> dict[str, Any] | None:
        item: dict[str, Any] | None = self._table.get_item(Key=key, ConsistentRead=True).get("Item")
        return item

    def _query(self, **kw: Any) -> list[dict[str, Any]]:
        """Query and follow LastEvaluatedKey until done (or `Limit` items are collected)."""
        limit = kw.get("Limit")
        out: list[dict[str, Any]] = []
        while True:
            resp = self._table.query(**kw)
            out.extend(resp.get("Items", []))
            last = resp.get("LastEvaluatedKey")
            if not last or (limit and len(out) >= limit):
                return out[:limit] if limit else out
            kw["ExclusiveStartKey"] = last

    def _transact(self, items: list[dict[str, Any]]) -> bool:
        """Run a write transaction; False when a condition failed (duplicate)."""
        for it in items:
            for op in it.values():
                op["TableName"] = self._name
        try:
            self._client.transact_write_items(TransactItems=items)  # type: ignore[arg-type]
        except ClientError as e:
            if e.response["Error"]["Code"] == "TransactionCanceledException":
                return False
            raise
        return True

    @staticmethod
    def _put(item: dict[str, Any], *, new: bool = False) -> dict[str, Any]:
        op: dict[str, Any] = {"Item": item}
        if new:
            op["ConditionExpression"] = "attribute_not_exists(PK)"
        return {"Put": op}

    @staticmethod
    def _put_lookup(kind: str, value: str, owner: dict[str, str]) -> dict[str, Any]:
        """Pointer item; may be rewritten only by the same owner."""
        return {
            "Put": {
                "Item": {**_lookup(kind, value), **owner},
                "ConditionExpression": "attribute_not_exists(PK) OR #o = :o",
                "ExpressionAttributeNames": {"#o": "owner"},
                "ExpressionAttributeValues": {":o": owner["owner"]},
            }
        }

    @staticmethod
    def _delete(key: dict[str, str]) -> dict[str, Any]:
        return {"Delete": {"Key": key}}

    # ------------------------------------------------------------------ OSM

    def get_osm(self, osm_id: str) -> Osm | None:
        return self._load(Osm, self._get({"PK": _osm_pk(osm_id), "SK": "PROFILE"}))

    def _osm_via(self, kind: str, value: str) -> Osm | None:
        ptr = self._get(_lookup(kind, value))
        return self.get_osm(str(ptr["osm_id"])) if ptr else None

    def get_osm_by_phone(self, phone: str) -> Osm | None:
        return self._osm_via("PHONE", phone)

    def get_osm_by_referral(self, code: str) -> Osm | None:
        return self._osm_via("REF", code)

    def get_osm_by_link_code(self, code: str) -> Osm | None:
        return self._osm_via("OSMLINK", code)

    def put_osm(self, osm: Osm) -> None:
        old = self.get_osm(osm.id)
        owner = {"owner": osm.id, "osm_id": osm.id}
        items: list[dict[str, Any]] = [
            self._put({"PK": _osm_pk(osm.id), "SK": "PROFILE", "data": osm.model_dump_json()})
        ]
        pairs = [
            ("PHONE", osm.phone, old.phone if old else None),
            ("REF", osm.referral_code, old.referral_code if old else None),
            ("OSMLINK", osm.line_link_code, old.line_link_code if old else None),
        ]
        for kind, new, prev in pairs:
            if prev and prev != new:
                items.append(self._delete(_lookup(kind, prev)))
            if new and new != prev:
                items.append(self._put_lookup(kind, new, owner))
        if not self._transact(items):
            raise ValueError("phone, referral code or LINE link code already in use")

    # ------------------------------------------------------------------ elders + guardians

    def get_elder(self, elder_id: str) -> Elder | None:
        return self._load(Elder, self._get({"PK": _elder_pk(elder_id), "SK": "PROFILE"}))

    def list_elders_by_osm(self, osm_id: str) -> list[Elder]:
        items = self._query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(_osm_pk(osm_id))
            & Key("GSI1SK").begins_with("ELDER#"),
        )
        return [Elder.model_validate_json(str(i["data"])) for i in items]

    def _elder_item(self, elder: Elder) -> dict[str, Any]:
        return {
            "PK": _elder_pk(elder.id),
            "SK": "PROFILE",
            "GSI1PK": _osm_pk(elder.osm_id),
            "GSI1SK": f"ELDER#{elder.id}",
            "data": elder.model_dump_json(),
        }

    @staticmethod
    def _guardian_item(g: Guardian) -> dict[str, Any]:
        item: dict[str, Any] = {
            "PK": _elder_pk(g.elder_id),
            "SK": f"GUARDIAN#{g.id}",
            "data": g.model_dump_json(),
        }
        if g.line_user_id:
            item["GSI1PK"] = f"LINEUSER#{g.line_user_id}"
            item["GSI1SK"] = f"GUARDIAN#{g.id}"
        return item

    def create_registration(self, elder: Elder, guardian: Guardian) -> None:
        items = [
            self._put(self._elder_item(elder), new=True),
            self._put(self._guardian_item(guardian), new=True),
        ]
        if guardian.line_link_code:
            owner = {"owner": guardian.id, "elder_id": elder.id, "guardian_id": guardian.id}
            items.append(self._put_lookup("LINK", guardian.line_link_code, owner))
        if not self._transact(items):
            raise ValueError("duplicate id or link code")

    def list_guardians(self, elder_id: str) -> list[Guardian]:
        items = self._query(
            KeyConditionExpression=Key("PK").eq(_elder_pk(elder_id))
            & Key("SK").begins_with("GUARDIAN#"),
            ConsistentRead=True,
        )
        return [Guardian.model_validate_json(str(i["data"])) for i in items]

    def _get_guardian(self, elder_id: str, guardian_id: str) -> Guardian | None:
        return self._load(
            Guardian, self._get({"PK": _elder_pk(elder_id), "SK": f"GUARDIAN#{guardian_id}"})
        )

    def get_guardian_by_link_code(self, code: str) -> Guardian | None:
        ptr = self._get(_lookup("LINK", code))
        if not ptr:
            return None
        return self._get_guardian(str(ptr["elder_id"]), str(ptr["guardian_id"]))

    def list_guardians_by_line_user(self, line_user_id: str) -> list[Guardian]:
        items = self._query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"LINEUSER#{line_user_id}"),
        )
        return [Guardian.model_validate_json(str(i["data"])) for i in items]

    def put_guardian(self, guardian: Guardian) -> None:
        old = self._get_guardian(guardian.elder_id, guardian.id)
        items: list[dict[str, Any]] = [self._put(self._guardian_item(guardian))]
        prev = old.line_link_code if old else None
        new = guardian.line_link_code
        if prev and prev != new:
            items.append(self._delete(_lookup("LINK", prev)))  # link codes are single use
        if new and new != prev:
            owner = {
                "owner": guardian.id,
                "elder_id": guardian.elder_id,
                "guardian_id": guardian.id,
            }
            items.append(self._put_lookup("LINK", new, owner))
        if not self._transact(items):
            raise ValueError("link code already in use")

    # ------------------------------------------------------------------ calls

    def call_exists(self, call_id: str) -> bool:
        return self._get(_lookup("CALLID", call_id)) is not None

    def put_call_if_absent(self, call: CallResult) -> bool:
        sk = _call_sk(call)
        return self._transact(
            [
                {
                    "Put": {
                        "Item": {**_lookup("CALLID", call.id), "elder_id": call.elder_id, "sk": sk},
                        "ConditionExpression": "attribute_not_exists(PK)",
                    }
                },
                self._put(
                    {"PK": _elder_pk(call.elder_id), "SK": sk, "data": call.model_dump_json()}
                ),
            ]
        )

    def get_call(self, elder_id: str, call_id: str) -> CallResult | None:
        ptr = self._get(_lookup("CALLID", call_id))
        if not ptr or ptr["elder_id"] != elder_id:
            return None
        return self._load(CallResult, self._get({"PK": _elder_pk(elder_id), "SK": str(ptr["sk"])}))

    def list_calls(self, elder_id: str, limit: int) -> list[CallResult]:
        items = self._query(
            KeyConditionExpression=Key("PK").eq(_elder_pk(elder_id))
            & Key("SK").begins_with("CALL#"),
            ScanIndexForward=False,
            Limit=limit,
            ConsistentRead=True,
        )
        return [CallResult.model_validate_json(str(i["data"])) for i in items]

    def put_call(self, call: CallResult) -> None:
        """Insert or update; keeps the CALLID pointer so get_call/call_exists find it."""
        sk = _call_sk(call)
        self._transact(
            [
                self._put({**_lookup("CALLID", call.id), "elder_id": call.elder_id, "sk": sk}),
                self._put(
                    {"PK": _elder_pk(call.elder_id), "SK": sk, "data": call.model_dump_json()}
                ),
            ]
        )

    # ------------------------------------------------------------------ 9Q tasks

    def list_open_tasks(self, elder_id: str) -> list[NineQTask]:
        items = self._query(
            KeyConditionExpression=Key("PK").eq(_elder_pk(elder_id))
            & Key("SK").begins_with("TASK9Q#"),
            FilterExpression=Attr("status").eq("open"),
            ConsistentRead=True,
        )
        return [NineQTask.model_validate_json(str(i["data"])) for i in items]

    def list_open_tasks_by_osm(self, osm_id: str) -> list[NineQTask]:
        items = self._query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(_osm_pk(osm_id))
            & Key("GSI1SK").begins_with("TASK9Q#open#"),
        )
        return [NineQTask.model_validate_json(str(i["data"])) for i in items]  # sorted by due_at

    def get_task(self, elder_id: str, task_id: str) -> NineQTask | None:
        return self._load(
            NineQTask, self._get({"PK": _elder_pk(elder_id), "SK": f"TASK9Q#{task_id}"})
        )

    def put_task(self, task: NineQTask) -> None:
        self._table.put_item(
            Item={
                "PK": _elder_pk(task.elder_id),
                "SK": f"TASK9Q#{task.id}",
                "GSI1PK": _osm_pk(task.osm_id),
                "GSI1SK": _task_gsi_sk(task),
                "status": task.status,
                "data": task.model_dump_json(),
            }
        )

    # ------------------------------------------------------------------ notifications

    def add_notification(self, log: NotificationLog) -> None:
        self._table.put_item(
            Item={
                "PK": _elder_pk(log.elder_id),
                "SK": f"NOTIF#{log.at.isoformat()}#{log.id}",
                "ttl": int((log.at + NOTIF_TTL).timestamp()),
                "data": log.model_dump_json(),
            }
        )
