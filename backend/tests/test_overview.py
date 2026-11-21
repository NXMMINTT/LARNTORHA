"""Dashboard overview extras: schedule, multi-day signals, families not on LINE, 14-day trend."""

from datetime import timedelta

from app.domain.models import Guardian
from app.repo.memory import MemoryRepo
from app.services.dashboard import overview
from tests.factories import NOW, analysis, call, elder


def _repo_with(calls_by_age: dict[int, dict[str, object]], linked: bool = False) -> MemoryRepo:
    repo = MemoryRepo()
    e = elder()
    g = Guardian(
        id="g1",
        elder_id=e.id,
        name="สุดา",
        phone="0812345678",
        relation="ลูกสาว",
        line_user_id="Uabc" if linked else None,
        line_link_code=None if linked else "LTH-123456",
        line_link_code_expires_at=None if linked else NOW + timedelta(days=3),
        created_at=NOW,
    )
    repo.create_registration(e, g)
    for days_ago, kw in calls_by_age.items():
        repo.put_call(call(days_ago=days_ago, id=f"c{days_ago}", **kw))  # type: ignore[arg-type]
    return repo


def test_unreachable_and_low_mood_streaks() -> None:
    repo = _repo_with(
        {
            0: {"outcome": "no_answer"},
            1: {"outcome": "no_answer"},
            2: {"a": analysis("yellow", mood="low")},
            3: {"a": analysis("yellow", mood="low")},
            4: {"a": analysis("green", mood="good")},
        }
    )
    out = overview(repo, [elder()], now=NOW)
    kinds = {s["kind"]: s["count"] for s in out["streaks"]}
    assert kinds["unreachable"] == 2
    assert kinds["mood"] == 2  # no-answer days are skipped, not counted as breaks


def test_single_day_is_not_a_streak() -> None:
    out = overview(_repo_with({0: {"outcome": "no_answer"}, 1: {}}), [elder()], now=NOW)
    assert out["streaks"] == []


def test_family_not_on_line_is_listed_until_linked() -> None:
    out = overview(_repo_with({0: {}}), [elder()], now=NOW)
    assert out["family_unlinked"][0]["guardian_name"] == "สุดา"
    assert out["family_unlinked"][0]["code_expires_at"] is not None
    assert overview(_repo_with({0: {}}, linked=True), [elder()], now=NOW)["family_unlinked"] == []


def test_schedule_states() -> None:
    done = overview(_repo_with({0: {}}), [elder()], now=NOW)["schedule"][0]
    assert done["state"] == "done" and done["duration_sec"] == 200
    missed = overview(_repo_with({0: {"outcome": "no_answer"}}), [elder()], now=NOW)
    assert missed["schedule"][0]["state"] == "no_answer"
    waiting = overview(_repo_with({1: {}}), [elder()], now=NOW)["schedule"][0]
    assert waiting["state"] == "pending" and waiting["call_at"] is None


def test_trend_has_14_days_one_status_per_elder_per_day() -> None:
    repo = _repo_with({0: {"a": analysis("red")}, 1: {"outcome": "no_answer"}, 2: {}})
    t = overview(repo, [elder()], now=NOW)["trend"]
    assert len(t["days"]) == 14
    last = t["days"][-1]
    assert last["red"] == 1 and sum(last[k] for k in ("yellow", "green", "unreachable")) == 0
    assert t["days"][-2]["unreachable"] == 1
    assert t["days"][0]["none"] == 1
    assert t["answered_pct"] == 67  # 2 of 3 calls answered
