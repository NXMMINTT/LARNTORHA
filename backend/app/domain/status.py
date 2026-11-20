"""Status policy (CLAUDE.md §5). Pure functions only."""

from collections.abc import Sequence
from dataclasses import dataclass, field

from app.domain.models import CallResult, CardKind, ElderStatus, NineQTask

GREEN_DEFAULT = "ไม่พบสัญญาณผิดปกติในสายนี้"
NINEQ_REASON = "2Q ผลบวก — รอ อสม. ประเมิน 9Q"  # dashboard only, never to family
STATUS_ORDER: dict[ElderStatus, int] = {
    "red": 0,
    "yellow": 1,
    "unreachable": 2,
    "green": 3,
    "pending": 4,
}
CARD_FOR_STATUS: dict[ElderStatus, CardKind | None] = {
    "red": "red",
    "unreachable": "unreachable",
    "yellow": "followup",
    "green": "green",
    "pending": None,
}


@dataclass
class StatusResult:
    status: ElderStatus
    reasons: list[str] = field(default_factory=list)
    latest_call: CallResult | None = None
    resolved: bool = False


def _med_taken(call: CallResult) -> bool | None:
    return call.med_taken if call.outcome == "answered" else None


def missed_med_streak(calls_newest_first: Sequence[CallResult]) -> int:
    n = 0
    for c in calls_newest_first:
        taken = _med_taken(c)
        if taken is None:
            continue
        if taken:
            break
        n += 1
    return n


def compute_status(
    calls_newest_first: Sequence[CallResult], open_tasks: Sequence[NineQTask]
) -> StatusResult:
    if not calls_newest_first:
        return StatusResult("pending", ["ยังไม่มีสายแรก"])
    latest = calls_newest_first[0]
    resolved = latest.resolved_at is not None
    a = latest.analysis

    if a is not None and (a.risk_level == "red" or a.urgent_reason):
        why = a.urgent_reason or (a.risk_reasons[0] if a.risk_reasons else "พบสัญญาณอันตราย")
        return StatusResult("red", [f"{why} — แนะนำ 1669 แล้ว"], latest, resolved)

    if latest.outcome == "no_answer":
        return StatusResult("unreachable", ["ไม่รับสาย 2 ครั้ง — ยังติดต่อไม่ได้"], latest, resolved)

    reasons: list[str] = []
    if a is not None and a.risk_level == "yellow":
        reasons.extend(a.risk_reasons or ["ควรติดตาม"])
    if latest.outcome == "unclear" or (a is not None and a.transcript_quality == "poor"):
        reasons.append("ฟังไม่ชัดจนสรุปไม่ได้")
    streak = missed_med_streak(calls_newest_first)
    if streak >= 3:
        reasons.append(f"ลืมยาติดกัน {streak} วัน")
    if open_tasks:
        reasons.append(NINEQ_REASON)
    unique = list(dict.fromkeys(reasons))
    if unique:
        return StatusResult("yellow", unique, latest, resolved)
    return StatusResult("green", [latest.summary or GREEN_DEFAULT], latest, resolved)


_LEADING_VOWELS = "เแโใไ"


def thai_sort_key(name: str) -> str:
    """Approximate Thai dictionary order: leading vowels sort after their consonant."""
    chars = list(name)
    i = 0
    while i < len(chars) - 1:
        if chars[i] in _LEADING_VOWELS:
            chars[i], chars[i + 1] = chars[i + 1], chars[i]
            i += 2
        else:
            i += 1
    return "".join(chars)


def dashboard_sort_key(status: ElderStatus, resolved: bool, name: str) -> tuple[int, int, str]:
    return (STATUS_ORDER[status], int(resolved), thai_sort_key(name))
