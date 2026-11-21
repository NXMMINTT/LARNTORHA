"""Family (guardian) dashboard: the family-safe view of a linked elder.

Same rules as the family LINE card (CLAUDE.md §0, §8): no 2Q/9Q, no risk reasons, no evidence
from the transcript, no อสม. summary and no mood. Only summary_family, status and medication.
"""

from typing import Any, Literal

from app.domain.models import CallResult, Elder
from app.domain.status import CARD_FOR_STATUS, compute_status
from app.repo.base import Repo
from app.services.dashboard import bangkok_date

DayLevel = Literal["green", "followup", "red", "unreachable"]
SELF_HARM_SUMMARY = "มีเรื่องที่ต้องการความช่วยเหลือเร่งด่วน กรุณาติดต่อคุณ{name}ทันที"
UNCLEAR_SUMMARY = "วันนี้ฟังไม่ชัดจนสรุปไม่ได้"
LEVEL_RANK: dict[DayLevel, int] = {"red": 3, "followup": 2, "unreachable": 1, "green": 0}


def linked_elders(repo: Repo, line_user_id: str) -> list[Elder]:
    """Elders this LINE account is a guardian of, with consent (2) to family summaries."""
    out: list[Elder] = []
    for g in repo.list_guardians_by_line_user(line_user_id):
        e = repo.get_elder(g.elder_id)
        if e is not None and e.consents.family_summary:
            out.append(e)
    return out


def _level(c: CallResult) -> DayLevel:
    if c.outcome == "no_answer":
        return "unreachable"
    a = c.analysis
    if a is not None and a.risk_level == "red":
        return "red"
    if a is None or a.risk_level == "yellow" or c.outcome == "unclear":
        return "followup"
    return "followup" if a.transcript_quality == "poor" else "green"


def _summary(c: CallResult, elder: Elder) -> str | None:
    a = c.analysis
    if c.outcome == "no_answer":
        return "โทรแล้ว 2 ครั้ง แต่ยังไม่มีผู้รับสาย"
    if a is None:
        return UNCLEAR_SUMMARY
    if a.self_harm:  # never show transcript wording for this case (§8)
        return SELF_HARM_SUMMARY.format(name=elder.name)
    if c.outcome == "unclear" or a.transcript_quality == "poor":
        return UNCLEAR_SUMMARY
    return a.summary_family


def elder_view(repo: Repo, elder: Elder, days: int = 14) -> dict[str, Any]:
    calls = repo.list_calls(elder.id, 200)
    st = compute_status(calls[:14], repo.list_open_tasks(elder.id))
    by_day: dict[str, CallResult] = {}
    for c in calls:  # newest first: keep the most serious call of each day
        k = bangkok_date(c.started_at)
        if k not in by_day or LEVEL_RANK[_level(c)] > LEVEL_RANK[_level(by_day[k])]:
            by_day[k] = c
    entries = []
    for date in sorted(by_day, reverse=True)[:days]:
        c = by_day[date]
        entries.append(
            {
                "date": date,
                "started_at": c.started_at.isoformat(),
                "duration_sec": c.duration_sec,
                "level": _level(c),
                "summary": _summary(c, elder),
                "med_taken": c.med_taken if c.outcome == "answered" else None,
                "ai_summary": c.analysis is not None and c.analysis.ai_status == "ok",
                "acknowledged": c.acknowledged_at is not None,
            }
        )
    osm = repo.get_osm(elder.osm_id)
    return {
        "elder": {
            "id": elder.id,
            "name": elder.name,
            "age": elder.age,
            "call_time": elder.call_time,
            "plan": elder.plan,
            "medications": [m.model_dump() for m in elder.medications],
            "voice_confirmed": elder.consents.voice_confirmed_at is not None,
        },
        "osm": {"name": osm.name, "tambon": osm.tambon} if osm else None,
        # Card kind of the current status (same mapping as the LINE card); never the reasons.
        "status": CARD_FOR_STATUS[st.status] or "pending",
        "days": entries,
    }


def family_dashboard(repo: Repo, line_user_id: str) -> dict[str, Any]:
    return {"elders": [elder_view(repo, e) for e in linked_elders(repo, line_user_id)]}
