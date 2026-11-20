"""Thin wrapper over bedrock-runtime Converse (CLAUDE.md §5A.3)."""

from dataclasses import dataclass
from typing import Any, Protocol

import boto3
from botocore.config import Config

from app.ai.prompts import SYSTEM_PROMPT, TOOL_CONFIG, TOOL_NAME


class ConverseClient(Protocol):
    def converse(self, **kwargs: Any) -> Any: ...


class GuardrailBlocked(Exception):
    pass


class BadModelOutput(Exception):
    pass


@dataclass
class BedrockSettings:
    model_id: str
    guardrail_id: str
    guardrail_version: str


def make_client(region: str, timeout_sec: float) -> ConverseClient:
    # Standard retry mode retries ThrottlingException and 5xx with backoff + jitter.
    # total_max_attempts=3 → at most 2 retries.
    cfg = Config(
        region_name=region,
        connect_timeout=5,
        read_timeout=timeout_sec,
        retries={"total_max_attempts": 3, "mode": "standard"},
    )
    client: Any = boto3.client("bedrock-runtime", config=cfg)
    return client  # type: ignore[no-any-return]


def build_request(s: BedrockSettings, user_text: str) -> dict[str, Any]:
    req: dict[str, Any] = {
        "modelId": s.model_id,
        "system": [{"text": SYSTEM_PROMPT}],
        "messages": [{"role": "user", "content": [{"text": user_text}]}],
        "toolConfig": TOOL_CONFIG,
        # CLAUDE.md asks for temperature=0, but anthropic.claude-sonnet-5 (the model the event
        # forces) rejects `temperature` as deprecated. Determinism comes from the forced tool.
        # maxTokens 2000 (spec says 800): Thai output is token-heavy and 800 cut off red cases.
        "inferenceConfig": {"maxTokens": 2000},
    }
    if s.guardrail_id:
        req["guardrailConfig"] = {
            "guardrailIdentifier": s.guardrail_id,
            "guardrailVersion": s.guardrail_version,
        }
    return req


def invoke_tool(client: ConverseClient, s: BedrockSettings, user_text: str) -> dict[str, Any]:
    """Call Converse and return the tool input dict. Raises on guardrail or malformed output."""
    resp = client.converse(**build_request(s, user_text))
    if resp.get("stopReason") == "guardrail_intervened":
        raise GuardrailBlocked
    for block in resp.get("output", {}).get("message", {}).get("content", []):
        tool_use = block.get("toolUse")
        if tool_use and tool_use.get("name") == TOOL_NAME:
            data = tool_use.get("input")
            if isinstance(data, dict):
                return data
    raise BadModelOutput(f"no toolUse (stopReason={resp.get('stopReason')})")
