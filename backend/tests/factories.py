from datetime import UTC, datetime, timedelta
from typing import Any

from app.domain.models import (
    CallAnalysis,
    CallOutcome,
    CallResult,
    Consents,
    Elder,
    NineQTask,
    RiskLevel,
    TranscriptTurn,
)

NOW = datetime(2026, 11, 20, 2, 0, tzinfo=UTC)


def analysis(risk: RiskLevel = "green", **kw: Any) -> CallAnalysis:
    base: dict[str, Any] = {
        "summary_family": "วันนี้คุยเรื่องสวน",
        "summary_osm": "พูดคุยปกติ",
        "risk_level": risk,
        "prompt_version": "test",
    }
    base.update(kw)
    return CallAnalysis(**base)


def call(
    days_ago: int = 0,
    outcome: CallOutcome = "answered",
    a: CallAnalysis | None = None,
    med_taken: bool | None = None,
    **kw: Any,
) -> CallResult:
    if outcome != "no_answer" and a is None:
        a = analysis(med_taken=med_taken)
    return CallResult(
        id=kw.pop("id", f"c{days_ago}"),
        elder_id="eld_x",
        started_at=NOW - timedelta(days=days_ago),
        duration_sec=200,
        outcome=outcome,
        analysis=a,
        summary=a.summary_osm if a else None,
        med_taken=(a.med_taken if a else None) if outcome == "answered" else None,
        urgent_reason=a.urgent_reason if a else None,
        received_at=NOW,
        **kw,
    )


def task() -> NineQTask:
    return NineQTask(
        id="t1", elder_id="eld_x", osm_id="osm_x", screened_at=NOW, due_at=NOW + timedelta(days=7)
    )


def elder(**kw: Any) -> Elder:
    consents = Consents(
        record_conversation=True,
        family_summary=kw.pop("family_summary", True),
        osm_share=kw.pop("osm_share", True),
        screening_2q=kw.pop("screening_2q", True),
        given_at=NOW,
    )
    base: dict[str, Any] = {
        "id": "eld_x",
        "name": "ยายทดสอบ",
        "age": 75,
        "phone": "0891234567",
        "osm_id": "osm_x",
        "call_time": "09:00",
        "plan": "standard",
        "consents": consents,
        "created_at": NOW,
    }
    base.update(kw)
    return Elder(**base)


def elder_says(*texts: str) -> list[TranscriptTurn]:
    turns = [TranscriptTurn(speaker="ai", text="สวัสดีค่ะ วันนี้เป็นอย่างไรบ้างคะ")]
    turns += [TranscriptTurn(speaker="elder", text=t) for t in texts]
    return turns
