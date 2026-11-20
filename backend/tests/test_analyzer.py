import json
from typing import Any

import pytest
from botocore.exceptions import ClientError, ReadTimeoutError

from app.ai.analyzer import AnalysisContext, AnalysisOutcome, BedrockAnalyzer
from app.ai.bedrock_client import BedrockSettings
from app.ai.fake import FakeAnalyzer
from app.ai.prompts import TOOL_NAME
from app.domain.models import TranscriptTurn
from tests.factories import elder_says

CTX = AnalysisContext(
    name="ยายสมศรี", age=74, medications=["ยาความดัน"], recent_topics=["ผักบุ้ง"], consent_2q=True
)
SETTINGS = BedrockSettings(model_id="test-model", guardrail_id="gr-1", guardrail_version="1")


def ai_output(**kw: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "summary_family": "วันนี้ยายเล่าว่าผักบุ้งขึ้นแล้ว",
        "summary_osm": "พูดคุยปกติ กินยาแล้ว",
        "topics": ["ผักบุ้ง"],
        "med_taken": True,
        "risk_level": "green",
        "risk_reasons": [],
        "evidence": ["ผักบุ้งขึ้นแล้ว"],
        "urgent_reason": None,
        "two_q": "not_asked",
        "mood": "good",
        "transcript_quality": "good",
        "self_harm": False,
    }
    base.update(kw)
    return base


def tool_response(data: Any) -> dict[str, Any]:
    return {
        "stopReason": "tool_use",
        "output": {
            "message": {
                "role": "assistant",
                "content": [{"toolUse": {"toolUseId": "t", "name": TOOL_NAME, "input": data}}],
            }
        },
    }


class StubClient:
    def __init__(self, *responses: Any) -> None:
        self.responses = list(responses)
        self.requests: list[dict[str, Any]] = []

    def converse(self, **kwargs: Any) -> Any:
        self.requests.append(kwargs)
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


def run(
    client: StubClient, turns: list[TranscriptTurn] | None = None, ctx: AnalysisContext = CTX
) -> AnalysisOutcome:
    turns = turns or elder_says("ผักบุ้งขึ้นแล้วเด้อ", "กินยาแล้วจ้า")
    return BedrockAnalyzer(client, SETTINGS).analyze(turns, ctx)


def test_request_shape_and_no_private_data() -> None:
    client = StubClient(tool_response(ai_output()))
    out = run(client)
    req = client.requests[0]
    assert req["toolConfig"]["toolChoice"] == {"tool": {"name": TOOL_NAME}}
    assert req["guardrailConfig"] == {"guardrailIdentifier": "gr-1", "guardrailVersion": "1"}
    assert "temperature" not in req["inferenceConfig"]  # rejected by claude-sonnet-5
    assert req["modelId"] == "test-model"
    payload = json.dumps(req, ensure_ascii=False)
    assert "0891234567" not in payload and "สุดา" not in payload and "eld_" not in payload
    assert out.analysis.ai_status == "ok"
    assert out.analysis.risk_level == "green"
    assert out.analysis.model_id == "test-model"


def test_schema_invalid_retries_once_then_succeeds() -> None:
    client = StubClient(tool_response({"bad": 1}), tool_response(ai_output()))
    assert run(client).analysis.ai_status == "ok"
    assert len(client.requests) == 2


def test_schema_invalid_twice_falls_back_to_yellow() -> None:
    client = StubClient(tool_response({"bad": 1}), tool_response({"bad": 2}))
    a = run(client).analysis
    assert a.ai_status == "fallback"
    assert a.risk_level == "yellow"
    assert "ระบบสรุปอัตโนมัติไม่สำเร็จ" in a.summary_family


@pytest.mark.parametrize(
    "error",
    [
        ReadTimeoutError(endpoint_url="https://bedrock"),
        ClientError({"Error": {"Code": "ThrottlingException", "Message": "x"}}, "Converse"),
    ],
)
def test_timeout_and_throttling_fall_back(error: Exception) -> None:
    a = run(StubClient(error)).analysis
    assert (a.ai_status, a.risk_level) == ("fallback", "yellow")


def test_guardrail_block_with_self_harm_is_red() -> None:
    blocked = {"stopReason": "guardrail_intervened", "output": {"message": {"content": []}}}
    a = run(StubClient(blocked), elder_says("ไม่อยากมีชีวิตอยู่แล้ว")).analysis
    assert (a.ai_status, a.risk_level) == ("fallback", "red")
    assert a.self_harm
    blocked2 = {"stopReason": "guardrail_intervened", "output": {"message": {"content": []}}}
    assert run(StubClient(blocked2)).analysis.risk_level == "yellow"


def test_rules_raise_green_to_red() -> None:
    a = run(StubClient(tool_response(ai_output())), elder_says("เมื่อเช้าเจ็บหน้าอก")).analysis
    assert a.risk_level == "red"
    assert a.urgent_reason == "เจ็บหน้าอก"
    assert "เจ็บหน้าอก" in a.rule_flags


def test_rules_never_lower_bedrock_red() -> None:
    out = ai_output(risk_level="red", urgent_reason="พูดไม่ชัดเฉียบพลัน")
    a = run(StubClient(tool_response(out))).analysis
    assert a.risk_level == "red"
    assert a.urgent_reason == "พูดไม่ชัดเฉียบพลัน"


def test_negated_chest_pain_stays_green() -> None:
    a = run(StubClient(tool_response(ai_output())), elder_says("ไม่ได้เจ็บหน้าอกแล้ว")).analysis
    assert a.risk_level == "green"
    assert "negated:เจ็บหน้าอก" in a.rule_flags


def test_fake_evidence_dropped_and_banned_family_text_replaced() -> None:
    out = ai_output(
        evidence=["ผักบุ้งขึ้นแล้ว", "ข้อความที่ไม่มีจริง"],
        summary_family="คุณยายผล 2Q ปกติ",
    )
    res = run(StubClient(tool_response(out)))
    assert res.analysis.evidence == ["ผักบุ้งขึ้นแล้ว"]
    assert "2Q" not in res.analysis.summary_family
    assert "family_summary_replaced" in res.warnings


def test_unscheduled_drug_in_family_text_replaced() -> None:
    out = ai_output(summary_family="ยายกินพาราไปสองเม็ด")
    assert "พารา" not in run(StubClient(tool_response(out))).analysis.summary_family


def test_two_q_forced_not_asked_without_consent() -> None:
    ctx = AnalysisContext("ยายสมศรี", 74, [], [], consent_2q=False)
    res = run(StubClient(tool_response(ai_output(two_q="positive"))), ctx=ctx)
    assert res.analysis.two_q == "not_asked"
    assert "ignored_2q_without_consent" in res.warnings


def test_low_asr_confidence_is_poor_and_yellow() -> None:
    turns = [TranscriptTurn(speaker="elder", text="อือ ๆ", asr_confidence=0.3)]
    a = run(StubClient(tool_response(ai_output())), turns).analysis
    assert (a.transcript_quality, a.risk_level) == ("poor", "yellow")


def test_fake_analyzer() -> None:
    a = FakeAnalyzer().analyze(elder_says("ยังบ่ได้กินยาเลย ลืม"), CTX).analysis
    assert a.med_taken is False
    assert a.risk_level == "yellow"
    red = FakeAnalyzer().analyze(elder_says("หายใจบ่ออก"), CTX).analysis
    assert red.risk_level == "red"
