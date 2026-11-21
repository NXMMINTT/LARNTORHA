"""OSM dashboard, per-elder daily summary and daily digest (CLAUDE.md §6.4, §7.3)."""

from collections.abc import Callable, Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

from app.domain.line_cards import BKK
from app.domain.models import CallResult, Elder, Osm
from app.domain.status import compute_status, dashboard_sort_key, missed_med_streak
from app.repo.base import Repo


def mask_phone(phone: str) -> str:
    return f"{phone[:3]}-xxx-{phone[-4:]}" if len(phone) == 10 else "xxx-xxx-xxxx"


def bangkok_date(dt: datetime) -> str:
    return dt.astimezone(BKK).strftime("%Y-%m-%d")


def visible_elders(repo: Repo, osm_id: str) -> list[Elder]:
    return [e for e in repo.list_elders_by_osm(osm_id) if e.consents.osm_share]


def owned_elder(repo: Repo, osm_id: str, elder_id: str) -> Elder | None:
    """Only the session's own elders with consent (3); anything else looks like 404."""
    e = repo.get_elder(elder_id)
    if e is None or e.osm_id != osm_id or not e.consents.osm_share:
        return None
    return e


def me(osm: Osm) -> dict[str, Any]:
    return {
        "id": osm.id,
        "name": osm.name,
        "tambon": osm.tambon,
        "referral_code": osm.referral_code,
        "line_linked": osm.line_user_id is not None,
        "line_link_code": osm.line_link_code,
    }


def _med(c: CallResult | None) -> bool | None:
    return c.med_taken if c is not None and c.outcome == "answered" else None


def dashboard(repo: Repo, osm_id: str) -> dict[str, Any]:
    elders = visible_elders(repo, osm_id)
    rows: list[dict[str, Any]] = []
    for e in elders:
        st = compute_status(repo.list_calls(e.id, 14), repo.list_open_tasks(e.id))
        c = st.latest_call
        rows.append(
            {
                "elder_id": e.id,
                "name": e.name,
                "age": e.age,
                "phone_masked": mask_phone(e.phone),
                "voice_confirmed": e.consents.voice_confirmed_at is not None,
                "status": st.status,
                "reasons": st.reasons,
                "med_taken": _med(c),
                "latest_call_id": c.id if c else None,
                "latest_call_at": c.started_at.isoformat() if c else None,
                "latest_outcome": c.outcome if c else None,
                "latest_duration_sec": c.duration_sec if c else None,
                "latest_mood": c.analysis.mood if c and c.analysis else None,
                "resolved": st.resolved,
                "resolve_note": c.resolve_note if c else None,
                "family_requested_osm": bool(c and c.family_requested_osm_at),
            }
        )
    rows.sort(key=lambda r: dashboard_sort_key(r["status"], r["resolved"], r["name"]))
    names = {e.id: e.name for e in elders}
    tasks = [
        {
            "id": t.id,
            "elder_id": t.elder_id,
            "elder_name": names[t.elder_id],
            "screened_at": t.screened_at.isoformat(),
            "due_at": t.due_at.isoformat(),
        }
        for t in repo.list_open_tasks_by_osm(osm_id)
        if t.elder_id in names
    ]

    def count(s: str) -> int:
        return sum(1 for r in rows if r["status"] == s)

    return {
        "rows": rows,
        **overview(repo, elders),
        "counts": {
            "red": count("red"),
            "yellow": count("yellow"),
            "unreachable": count("unreachable"),
            "green": count("green"),
            "pending": count("pending"),
            "tasks_open": len(tasks),
        },
        "tasks": tasks,
        "generated_at": datetime.now(UTC).isoformat(),
    }


# ---------------------------------------------------------------- overview extras (2026-11-21)


def _streak(
    calls: Sequence[CallResult],
    hit: Callable[[CallResult], bool],
    skip: Callable[[CallResult], bool] = lambda c: False,
) -> int:
    """Consecutive hits from the newest call back, ignoring calls where `skip` is true."""
    n = 0
    for c in calls:
        if skip(c):
            continue
        if not hit(c):
            break
        n += 1
    return n


def overview(repo: Repo, elders: Sequence[Elder], now: datetime | None = None) -> dict[str, Any]:
    """Today's call schedule, multi-day signals, families not on LINE and a 14-day area trend.
    All derived from stored calls; nothing is estimated."""
    now = now or datetime.now(UTC)
    today = bangkok_date(now)
    days = [bangkok_date(now - timedelta(days=i)) for i in range(13, -1, -1)]
    schedule: list[dict[str, Any]] = []
    streaks: list[dict[str, Any]] = []
    unlinked: list[dict[str, Any]] = []
    trend = {d: {"red": 0, "yellow": 0, "unreachable": 0, "green": 0, "none": 0} for d in days}
    answered = total = med_yes = med_known = 0
    followup_minutes: list[float] = []

    for e in elders:
        calls = repo.list_calls(e.id, 60)
        # today's call
        c0 = calls[0] if calls else None
        state = "pending"
        if c0 and bangkok_date(c0.started_at) == today:
            state = {"answered": "done", "no_answer": "no_answer", "unclear": "unclear"}[c0.outcome]
        schedule.append(
            {
                "elder_id": e.id,
                "name": e.name,
                "call_time": e.call_time,
                "state": state,
                "call_at": c0.started_at.isoformat() if state != "pending" and c0 else None,
                "duration_sec": c0.duration_sec if state == "done" and c0 else None,
                "first_call": not calls and e.consents.voice_confirmed_at is None,
            }
        )
        # multi-day signals
        signals = [
            ("unreachable", _streak(calls, lambda c: c.outcome == "no_answer")),
            ("meds", missed_med_streak(calls)),
            (
                "mood",
                _streak(
                    calls,
                    lambda c: c.analysis is not None and c.analysis.mood == "low",
                    skip=lambda c: c.outcome == "no_answer",
                ),
            ),
        ]
        streaks += [
            {"elder_id": e.id, "name": e.name, "kind": k, "count": n} for k, n in signals if n >= 2
        ]
        # families who would get nothing on LINE
        if e.consents.family_summary:
            for g in repo.list_guardians(e.id):
                if g.line_user_id is None:
                    unlinked.append(
                        {
                            "elder_id": e.id,
                            "elder_name": e.name,
                            "guardian_name": g.name,
                            "relation": g.relation,
                            "code_expires_at": g.line_link_code_expires_at.isoformat()
                            if g.line_link_code_expires_at
                            else None,
                        }
                    )
        # 14-day trend: one status per elder per day (the most serious call of that day)
        by_day: dict[str, CallResult] = {}
        for c in calls:
            k = bangkok_date(c.started_at)
            if k in trend and (k not in by_day or _rank(c) > _rank(by_day[k])):
                by_day[k] = c
        for d in days:
            day_call = by_day.get(d)
            if day_call is None:
                trend[d]["none"] += 1
            elif day_call.outcome == "no_answer" or day_call.analysis is None:
                trend[d]["unreachable"] += 1
            else:
                trend[d][day_call.analysis.risk_level] += 1
        for c in calls:
            if bangkok_date(c.started_at) not in trend:
                continue
            total += 1
            answered += c.outcome != "no_answer"
            m = _med(c)
            if m is not None:
                med_known += 1
                med_yes += m
            if c.analysis and c.analysis.risk_level == "red" and c.resolved_at:
                followup_minutes.append((c.resolved_at - c.started_at).total_seconds() / 60)

    schedule.sort(key=lambda r: (r["call_time"], r["name"]))
    streaks.sort(key=lambda r: -r["count"])
    return {
        "schedule": schedule,
        "streaks": streaks,
        "family_unlinked": unlinked,
        "trend": {
            "days": [{"date": d, **trend[d]} for d in days],
            "answered_pct": round(100 * answered / total) if total else None,
            "med_pct": round(100 * med_yes / med_known) if med_known else None,
            "avg_red_followup_min": round(sum(followup_minutes) / len(followup_minutes))
            if followup_minutes
            else None,
        },
    }


def _rank(c: CallResult) -> float:
    if c.analysis:
        return {"red": 3, "yellow": 2, "green": 1}[c.analysis.risk_level]
    return 1.5 if c.outcome == "no_answer" else 0


def elder_daily(repo: Repo, elder: Elder, days: int) -> dict[str, Any]:
    calls = repo.list_calls(elder.id, 200)
    st = compute_status(calls[:14], repo.list_open_tasks(elder.id))
    by_day: dict[str, CallResult] = {}
    for c in calls:
        k = bangkok_date(c.started_at)
        if k not in by_day or _rank(c) > _rank(by_day[k]):
            by_day[k] = c
    entries = []
    for date in sorted(by_day, reverse=True)[:days]:
        c = by_day[date]
        a = c.analysis
        entries.append(
            {
                "date": date,
                "call_id": c.id,
                "started_at": c.started_at.isoformat(),
                "outcome": c.outcome,
                "risk_level": a.risk_level if a else None,
                "summary_osm": a.summary_osm if a else None,
                "risk_reasons": a.risk_reasons if a else [],
                "evidence": a.evidence if a else [],
                "med_taken": _med(c),
                "mood": a.mood if a else None,
                "ai_status": a.ai_status if a else None,
                "rule_flags": a.rule_flags if a else [],
            }
        )
    return {
        "elder": {
            "id": elder.id,
            "name": elder.name,
            "age": elder.age,
            "call_time": elder.call_time,
            "plan": elder.plan,
            "medications": [m.model_dump() for m in elder.medications],
            "consents": elder.consents.model_dump(mode="json"),
        },
        "status": st.status,
        "reasons": st.reasons,
        "days": entries,
    }


def daily_digest(repo: Repo, osm_id: str, date: str | None) -> dict[str, Any]:
    data = dashboard(repo, osm_id)
    rows = data["rows"]
    if date is None:
        latest = [r["latest_call_at"] for r in rows if r["latest_call_at"]]
        date = (
            bangkok_date(datetime.fromisoformat(max(latest)))
            if latest
            else bangkok_date(datetime.now(UTC))
        )
    total = sum(
        1
        for r in rows
        if r["latest_call_at"] and bangkok_date(datetime.fromisoformat(r["latest_call_at"])) == date
    )
    visit = []
    for r in rows:
        if r["status"] in ("red", "yellow", "unreachable") and not r["resolved"]:
            reasons: list[str] = r["reasons"]
            reason = next((x for x in reasons if x.startswith("ลืมยาติดกัน")), None) or (
                reasons[0] if reasons else ""
            )
            visit.append(
                {
                    "elder_id": r["elder_id"],
                    "name": r["name"],
                    "status": r["status"],
                    "reason": reason.split(" — ")[0],
                }
            )
    c = data["counts"]
    return {
        "date": date,
        "total_calls": total,
        "counts": {k: c[k] for k in ("red", "yellow", "unreachable", "green")},
        "visit_first": visit,
    }
