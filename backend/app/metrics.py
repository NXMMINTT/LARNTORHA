"""CloudWatch metrics via Embedded Metric Format (EMF).

One JSON line on stdout becomes a CloudWatch metric once the container's logs reach CloudWatch
Logs (App Runner/ECS do this), so no PutMetricData call or extra permission is needed. The alarm
on `LarnTorHa/bedrock_fallback` is created by infra/deploy-aws.sh (§5A.5).
"""

import json
import sys
import time

NAMESPACE = "LarnTorHa"


def count(name: str, **props: str) -> None:
    """Emit metric `name` = 1. Props are log-only context (never personal data)."""
    line = {
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [
                {
                    "Namespace": NAMESPACE,
                    "Dimensions": [[]],
                    "Metrics": [{"Name": name, "Unit": "Count"}],
                }
            ],
        },
        name: 1,
        **props,
    }
    print(json.dumps(line), file=sys.stdout, flush=True)
