"""Process one finished call (CLAUDE.md §6.1). Steps run in the order the spec requires."""

import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.ai.analyzer import AnalysisContext
from app.deps import Deps
from app.domain.line_cards import family_card, osm_alert
from app.domain.models import (
    CallAnalysis,
    CallOutcome,
    CallResult,
    CardKind,
    Elder,
    NineQTask,
    NotificationLog,
    TranscriptTurn,
)
from app.domain.status import CARD_FOR_STATUS, compute_status

log = logging.getLogger("larntorha.calls")


class CallIn(BaseModel):
    call_id: str = Field(min_length=1, max_length=128)
    elder_id: str = Field(min_length=1, max_length=64)
    started_at: datetime
    duration_sec: int = Field(ge=0, le=3600)
    outcome: CallOutcome
    transcript: list[TranscriptTurn] | None = Field(default=None, max_length=200)
    # Legacy fields: accepted only when ENV != production (checked in process_call).
    summary: str | None = Field(default=None, max_length=500)
    med_taken: bool | None = None
    urgent: str | None = Field(default=None, max_length=200)
    two_q_positive: bool | None = None

    @model_validator(mode="after")
    def _check(self) -> "CallIn":
        if self.started_at.tzinfo is None:
            raise ValueError("started_at must include a timezone offset")
        return self

    @property
    def has_legacy(self) -> bool:
        return any(
            v is not None for v in (self.summary, self.med_taken, self.urgent, self.two_q_positive)
        )


class CallError(Exception):
    def __init__(self, status: int, code: str, detail: Any = None) -> None:
        self.status, self.code, self.detail = status, code, detail


def _context(deps: Deps, elder: Elder) -> AnalysisContext:
    topics: list[str] = []
    for c in deps.repo.list_calls(elder.id, 3):
        if c.analysis:
            topics.extend(t for t in c.analysis.topics if t not in topics)
    return AnalysisContext(
        name=elder.name,
        age=elder.age,
        medications=[m.name for m in elder.medications],
        recent_topics=topics[:5],
        consent_2q=elder.consents.screening_2q,
    )


def _legacy_analysis(req: CallIn, elder: Elder) -> tuple[CallAnalysis, list[str]]:
    warnings = ["legacy_fields_used"]
    two_q = "not_asked"
    if req.two_q_positive is not None:
        if elder.consents.screening_2q:
            two_q = "positive" if req.two_q_positive else "negative"
        else:
            warnings.append("ignored_2q_without_consent")
    risk: Literal["red", "yellow", "green"] = "green"
    reasons: list[str] = []
    if req.urgent:
        risk, reasons = "red", [req.urgent]
    elif two_q == "positive" or req.med_taken is False:
        risk = "yellow"
        reasons = (["2Q ผลบวก"] if two_q == "positive" else []) + (
            ["ยังไม่ได้กินยา"] if req.med_taken is False else []
        )
    summary = req.summary or "ไม่มีสรุป"
    return (
        CallAnalysis(
            summary_family=f"วันนี้คุยกับ{elder.name}แล้ว" if two_q == "positive" else summary[:300],
            summary_osm=summary,
            med_taken=req.med_taken,
            risk_level=risk,
            risk_reasons=reasons,
            urgent_reason=req.urgent,
            two_q=two_q,
            model_id="legacy",
            prompt_version="legacy",
        ),
        warnings,
    )


def process_call(deps: Deps, req: CallIn, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(UTC)
    repo, s = deps.repo, deps.settings

    # 1. elder exists
    elder = repo.get_elder(req.elder_id)
    if elder is None:
        raise CallError(404, "elder_not_found")

    # input shape (no Bedrock cost yet)
    turns = req.transcript or []
    if req.outcome != "no_answer" and not turns and (s.is_production or not req.has_legacy):
        raise CallError(422, "transcript_required")
    if req.has_legacy and s.is_production:
        raise CallError(422, "legacy_fields_not_allowed")

    # 2. duplicate check before calling Bedrock
    if repo.call_exists(req.call_id):
        return {"ok": True, "duplicate": True}

    # 3. analysis
    warnings: list[str] = []
    analysis: CallAnalysis | None = None
    if req.outcome != "no_answer":
        if turns:
            result = deps.analyzer.analyze(turns, _context(deps, elder))
            analysis, warnings = result.analysis, result.warnings
        else:
            analysis, warnings = _legacy_analysis(req, elder)

    answered = req.outcome == "answered"
    if analysis and not answered:
        analysis.med_taken = None
    call = CallResult(
        id=req.call_id,
        elder_id=elder.id,
        started_at=req.started_at.astimezone(UTC),
        duration_sec=req.duration_sec,
        outcome=req.outcome,
        analysis=analysis,
        summary=analysis.summary_osm if analysis else None,
        med_taken=analysis.med_taken if analysis and answered else None,
        urgent_reason=analysis.urgent_reason if analysis else None,
        two_q_positive=(
            None
            if analysis is None or analysis.two_q == "not_asked"
            else analysis.two_q == "positive"
        ),
        received_at=now,
    )

    # 4. put-if-absent (concurrent duplicates)
    if not repo.put_call_if_absent(call):
        return {"ok": True, "duplicate": True}

    # 5. 2Q positive → one open 9Q task
    if analysis and analysis.two_q == "positive" and not repo.list_open_tasks(elder.id):
        repo.put_task(
            NineQTask(
                id=f"task_{secrets.token_hex(10)}",
                elder_id=elder.id,
                osm_id=elder.osm_id,
                screened_at=call.started_at,
                due_at=call.started_at + timedelta(days=7),
            )
        )

    # 6. status from history
    st = compute_status(repo.list_calls(elder.id, 14), repo.list_open_tasks(elder.id))
    card_kind = CARD_FOR_STATUS[st.status]

    # 7. guardians
    notified = 0
    cards: list[dict[str, Any]] = []
    if card_kind and elder.consents.family_summary:
        msg = family_card(card_kind, elder, call, s.card_image_base_url or None)
        cards.append({"to": "guardian", "kind": card_kind, "message": msg})
        for g in repo.list_guardians(elder.id):
            if g.line_user_id:
                notified += _send(deps, elder, call.id, "guardian", card_kind, g.line_user_id, msg)

    # 8. อสม.
    if elder.consents.osm_share and st.status in ("red", "yellow", "unreachable"):
        osm = repo.get_osm(elder.osm_id)
        alert = osm_alert(elder, st.status, st.reasons, s.app_base_url)
        cards.append({"to": "osm", "kind": card_kind, "message": alert})
        if osm and osm.line_user_id and card_kind:
            notified += _send(deps, elder, call.id, "osm", card_kind, osm.line_user_id, alert)

    # 10. response
    return {
        "ok": True,
        "duplicate": False,
        "status": st.status,
        "reasons": st.reasons,
        "card": card_kind,
        "risk_level": analysis.risk_level if analysis else None,
        "ai_status": analysis.ai_status if analysis else None,
        "notified": notified,
        "warnings": warnings,
        "_analysis": analysis,
        "_cards": cards,
    }


def _send(
    deps: Deps,
    elder: Elder,
    call_id: str,
    to: Literal["guardian", "osm"],
    kind: CardKind,
    user_id: str,
    message: dict[str, Any],
) -> int:
    # 9. log every send; never raise
    try:
        res = deps.line.push(user_id, [message], key_seed=call_id)
        ok, err = res.ok, res.error
    except Exception as e:  # pragma: no cover - defensive
        ok, err = False, type(e).__name__
    deps.repo.add_notification(
        NotificationLog(
            id=f"ntf_{secrets.token_hex(8)}",
            elder_id=elder.id,
            call_id=call_id,
            to=to,
            kind=kind,
            ok=ok,
            error=err,
            at=datetime.now(UTC),
        )
    )
    if not ok:
        log.warning("notify failed elder=%s call=%s to=%s", elder.id, call_id, to)
    return 1 if ok else 0
