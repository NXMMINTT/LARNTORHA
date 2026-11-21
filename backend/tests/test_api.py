import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.ai.fake import FakeAnalyzer
from app.auth import hash_password, issue_session, verify_password, verify_session
from app.config import Settings
from app.deps import Deps
from app.domain.models import Guardian, Osm
from app.line_client import LineClient, SendResult
from app.main import create_app
from app.repo.memory import MemoryRepo
from app.repo.seed import OSM_ID, seed

TOKEN = "i" * 32
CALLS = "c" * 32
SECRET = "s" * 32
LINE_SECRET = "line-secret"
H = {"X-Internal-Token": TOKEN}
BANNED = ("2Q", "9Q", "ซึมเศร้า", "คะแนน")


class CountingAnalyzer(FakeAnalyzer):
    def __init__(self) -> None:
        self.calls = 0

    def analyze(self, turns: Any, ctx: Any) -> Any:
        self.calls += 1
        return super().analyze(turns, ctx)


class RecordingLine(LineClient):
    def __init__(self, fail: bool = False) -> None:
        super().__init__("", dry_run=True)
        self.fail = fail
        self.pushes: list[tuple[str, list[dict[str, Any]]]] = []

    def push(self, to: str, messages: list[dict[str, Any]], key_seed: str) -> SendResult:
        self.pushes.append((to, messages))
        if self.fail:
            return SendResult(False, "http_500")
        return SendResult(True)


@pytest.fixture
def env() -> dict[str, Any]:
    settings = Settings(
        _env_file=None,
        internal_api_token=TOKEN,
        calls_api_token=CALLS,
        session_secret=SECRET,
        line_channel_secret=LINE_SECRET,
        demo_mode=True,
        app_base_url="https://app.test",
    )
    repo = MemoryRepo()
    seed(repo)
    analyzer = CountingAnalyzer()
    line = RecordingLine()
    deps = Deps(settings=settings, repo=repo, analyzer=analyzer, line=line)
    client = TestClient(create_app(settings, deps))
    return {"client": client, "repo": repo, "line": line, "analyzer": analyzer, "deps": deps}


def link_guardian(repo: MemoryRepo, elder_id: str, user: str = "Ufamily") -> None:
    g = repo.list_guardians(elder_id)[0]
    g.line_user_id = user
    repo.put_guardian(g)


def link_osm(repo: MemoryRepo, user: str = "Uosm") -> None:
    o = repo.get_osm(OSM_ID)
    assert o
    o.line_user_id = user
    repo.put_osm(o)


def post_call(client: TestClient, **kw: Any) -> Any:
    body = {
        "call_id": kw.pop("call_id", "call-1"),
        "elder_id": kw.pop("elder_id", "eld_somsri"),
        "started_at": datetime.now(UTC).isoformat(),
        "duration_sec": 200,
        "outcome": kw.pop("outcome", "answered"),
        **kw,
    }
    if "transcript" not in body and body["outcome"] != "no_answer":
        body["transcript"] = [
            {"speaker": "ai", "text": "วันนี้เป็นยังไงบ้างคะ"},
            {"speaker": "elder", "text": kw.get("say", "สบายดีจ้า กินยาแล้ว")},
        ]
    body.pop("say", None)
    return client.post("/v1/calls", json=body, headers={"Authorization": f"Bearer {CALLS}"})


def login(client: TestClient) -> dict[str, str]:
    r = client.post(
        "/v1/osm/login", json={"phone": "0812345678", "password": "demo-password"}, headers=H
    )
    assert r.status_code == 200
    return {**H, "Authorization": f"Bearer {r.json()['session']}"}


# ---------------------------------------------------------------- /v1/calls


def test_calls_requires_token(env: dict[str, Any]) -> None:
    r = env["client"].post("/v1/calls", json={}, headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401
    assert r.json()["error"] == "unauthorized"


def test_unknown_elder_404(env: dict[str, Any]) -> None:
    r = post_call(env["client"], elder_id="eld_nope")
    assert (r.status_code, r.json()["error"]) == (404, "elder_not_found")


def test_green_goes_to_guardian_only(env: dict[str, Any]) -> None:
    link_guardian(env["repo"], "eld_somsri")
    link_osm(env["repo"])
    r = post_call(env["client"])
    assert r.status_code == 201
    j = r.json()
    assert (j["status"], j["card"], j["notified"]) == ("green", "green", 1)
    assert [to for to, _ in env["line"].pushes] == ["Ufamily"]


def test_red_goes_to_guardian_and_osm(env: dict[str, Any]) -> None:
    link_guardian(env["repo"], "eld_somsri")
    link_osm(env["repo"])
    r = post_call(env["client"], say="เมื่อเช้าเจ็บหน้าอกมาก")
    j = r.json()
    assert (j["status"], j["risk_level"], j["notified"]) == ("red", "red", 2)
    assert {to for to, _ in env["line"].pushes} == {"Ufamily", "Uosm"}


def test_duplicate_call_not_analyzed_or_sent_twice(env: dict[str, Any]) -> None:
    link_guardian(env["repo"], "eld_somsri")
    assert post_call(env["client"]).status_code == 201
    r = post_call(env["client"])
    assert r.status_code == 200
    assert r.json() == {"ok": True, "duplicate": True}
    assert env["analyzer"].calls == 1
    assert len(env["line"].pushes) == 1


def test_two_q_creates_one_task_with_due_date(env: dict[str, Any]) -> None:
    repo = env["repo"]
    started = datetime(2026, 11, 20, 2, 0, tzinfo=UTC)
    for i in range(2):
        r = env["client"].post(
            "/v1/calls",
            json={
                "call_id": f"q{i}",
                "elder_id": "eld_somsri",
                "started_at": (started + timedelta(minutes=i)).isoformat(),
                "duration_sec": 100,
                "outcome": "answered",
                "summary": "เล่าว่าเบื่อ",
                "two_q_positive": True,
            },
            headers={"Authorization": f"Bearer {CALLS}"},
        )
        assert r.status_code == 201
    tasks = repo.list_open_tasks("eld_somsri")
    assert len(tasks) == 1
    assert tasks[0].due_at == started + timedelta(days=7)


def test_family_card_has_no_banned_words(env: dict[str, Any]) -> None:
    link_guardian(env["repo"], "eld_somsri")
    env["client"].post(
        "/v1/calls",
        json={
            "call_id": "q-banned",
            "elder_id": "eld_somsri",
            "started_at": datetime.now(UTC).isoformat(),
            "duration_sec": 100,
            "outcome": "answered",
            "summary": "2Q ผลบวก ซึมเศร้า",
            "two_q_positive": True,
        },
        headers={"Authorization": f"Bearer {CALLS}"},
    )
    ((_to, msgs),) = env["line"].pushes
    dumped = json.dumps(msgs, ensure_ascii=False)
    assert not any(b in dumped for b in BANNED)


def test_no_family_consent_no_guardian_push(env: dict[str, Any]) -> None:
    repo = env["repo"]
    e = repo.get_elder("eld_somsri")
    assert e
    e.consents.family_summary = False
    repo.elders[e.id] = e
    link_guardian(repo, "eld_somsri")
    j = post_call(env["client"]).json()
    assert j["notified"] == 0
    assert env["line"].pushes == []


def test_no_2q_consent_drops_result(env: dict[str, Any]) -> None:
    repo = env["repo"]
    e = repo.get_elder("eld_somsri")
    assert e
    e.consents.screening_2q = False
    repo.elders[e.id] = e
    r = env["client"].post(
        "/v1/calls",
        json={
            "call_id": "q-noconsent",
            "elder_id": "eld_somsri",
            "started_at": datetime.now(UTC).isoformat(),
            "duration_sec": 100,
            "outcome": "answered",
            "summary": "คุยปกติ",
            "two_q_positive": True,
        },
        headers={"Authorization": f"Bearer {CALLS}"},
    )
    assert "ignored_2q_without_consent" in r.json()["warnings"]
    assert repo.list_open_tasks("eld_somsri") == []
    assert repo.get_call("eld_somsri", "q-noconsent").two_q_positive is None


def test_push_failure_does_not_crash(env: dict[str, Any]) -> None:
    env["deps"].line = RecordingLine(fail=True)
    link_guardian(env["repo"], "eld_somsri")
    r = post_call(env["client"])
    assert r.status_code == 201
    assert r.json()["notified"] == 0
    assert env["repo"].notifications[-1].ok is False


def test_no_answer_skips_analysis(env: dict[str, Any]) -> None:
    j = post_call(env["client"], outcome="no_answer").json()
    assert j["status"] == "unreachable"
    assert env["analyzer"].calls == 0


def test_answered_requires_transcript_or_legacy(env: dict[str, Any]) -> None:
    r = post_call(env["client"], transcript=[])
    assert (r.status_code, r.json()["error"]) == (422, "transcript_required")


# ---------------------------------------------------------------- webhook


def signed(body: dict[str, Any]) -> tuple[bytes, dict[str, str]]:
    raw = json.dumps(body).encode()
    sig = base64.b64encode(hmac.new(LINE_SECRET.encode(), raw, hashlib.sha256).digest()).decode()
    return raw, {"x-line-signature": sig, "content-type": "application/json"}


def hook(client: TestClient, *events: dict[str, Any]) -> Any:
    raw, headers = signed({"events": list(events)})
    return client.post("/v1/line/webhook", content=raw, headers=headers)


def text_event(user: str, msg: str) -> dict[str, Any]:
    return {
        "type": "message",
        "replyToken": "r",
        "source": {"userId": user},
        "message": {"type": "text", "text": msg},
    }


def postback(
    user: str, action: str, elder: str = "eld_somchai", call: str = "call_somchai_0"
) -> Any:
    return {
        "type": "postback",
        "replyToken": "r",
        "source": {"userId": user},
        "postback": {"data": f"action={action}&elder={elder}&call={call}"},
    }


def test_bad_signature_401(env: dict[str, Any]) -> None:
    r = env["client"].post("/v1/line/webhook", content=b"{}", headers={"x-line-signature": "x"})
    assert r.status_code == 401


def test_verify_with_empty_events_200(env: dict[str, Any]) -> None:
    assert hook(env["client"]).status_code == 200


def test_link_code_single_use(env: dict[str, Any]) -> None:
    repo, client = env["repo"], env["client"]
    code = repo.list_guardians("eld_somsri")[0].line_link_code
    hook(client, text_event("U1", f"รหัส {code.lower()}"))
    g = repo.list_guardians("eld_somsri")[0]
    assert g.line_user_id == "U1" and g.line_link_code is None
    hook(client, text_event("U2", code))
    assert repo.list_guardians("eld_somsri")[0].line_user_id == "U1"
    replies = [s["reply"]["messages"][0]["text"] for s in env["line"].sent if "reply" in s]
    assert "สำเร็จ" in replies[0] and "1669" in replies[0]
    assert "ไม่ถูกต้อง" in replies[1]


def test_expired_link_code_rejected(env: dict[str, Any]) -> None:
    repo = env["repo"]
    g: Guardian = repo.list_guardians("eld_somsri")[0]
    g.line_link_code_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    repo.put_guardian(g)
    hook(env["client"], text_event("U1", g.line_link_code or ""))
    assert repo.list_guardians("eld_somsri")[0].line_user_id is None


def test_osm_link_code(env: dict[str, Any]) -> None:
    repo = env["repo"]
    o: Osm | None = repo.get_osm(OSM_ID)
    assert o
    o.line_link_code = "LTH-777777"
    repo.put_osm(o)
    hook(env["client"], text_event("Uosm", "LTH-777777"))
    o2 = repo.get_osm(OSM_ID)
    assert o2 and o2.line_user_id == "Uosm" and o2.line_link_code is None


def test_stranger_postback_rejected(env: dict[str, Any]) -> None:
    hook(env["client"], postback("Ustranger", "ack"))
    c = env["repo"].get_call("eld_somchai", "call_somchai_0")
    assert c.acknowledged_at is None
    assert "ไม่มีสิทธิ์" in env["line"].sent[-1]["reply"]["messages"][0]["text"]


def test_notify_osm_pushes_once(env: dict[str, Any]) -> None:
    repo = env["repo"]
    link_guardian(repo, "eld_somchai")
    link_osm(repo)
    hook(env["client"], postback("Ufamily", "notify_osm"), postback("Ufamily", "notify_osm"))
    hook(env["client"], postback("Ufamily", "notify_osm"))
    assert [to for to, _ in env["line"].pushes] == ["Uosm"]
    hook(env["client"], postback("Ufamily", "ack"))
    assert repo.get_call("eld_somchai", "call_somchai_0").acknowledged_at is not None


def menu_tap(user: str, key: str) -> dict[str, Any]:
    return {
        "type": "postback",
        "replyToken": "r",
        "source": {"userId": user},
        "postback": {"data": f"menu={key}"},
    }


def last_reply(env: dict[str, Any]) -> list[dict[str, Any]]:
    msgs: list[dict[str, Any]] = env["line"].sent[-1]["reply"]["messages"]
    return msgs


def test_menu_requires_linked_guardian(env: dict[str, Any]) -> None:
    for key in ("report", "history", "elder", "contact"):
        hook(env["client"], menu_tap("Ustranger", key))
        assert "LTH-" in last_reply(env)[0]["text"]
    hook(env["client"], menu_tap("Ustranger", "help"))
    assert "1669" in last_reply(env)[0]["text"]
    hook(env["client"], menu_tap("Ustranger", "settings"))
    assert "เร็ว ๆ นี้" in last_reply(env)[0]["text"]


def test_menu_report_resends_latest_card(env: dict[str, Any]) -> None:
    link_guardian(env["repo"], "eld_somchai")
    hook(env["client"], menu_tap("Ufamily", "report"))
    msg = last_reply(env)[0]
    assert msg["type"] == "flex" and "เร่งด่วน" in msg["altText"]


def test_menu_replies_have_no_banned_words(env: dict[str, Any]) -> None:
    repo = env["repo"]
    link_guardian(repo, "eld_samlee")  # forgot meds + 2Q positive in seed
    for key in ("report", "history", "elder", "contact"):
        hook(env["client"], menu_tap("Ufamily", key))
        dump = json.dumps(last_reply(env), ensure_ascii=False)
        assert not any(w in dump for w in BANNED), key
    hook(env["client"], menu_tap("Ufamily", "history"))
    assert "ประวัติการโทร" in last_reply(env)[0]["text"]


# ---------------------------------------------------------------- OSM


def test_login_and_wrong_password(env: dict[str, Any]) -> None:
    c = env["client"]
    bad = c.post("/v1/osm/login", json={"phone": "0812345678", "password": "x"}, headers=H)
    unknown = c.post("/v1/osm/login", json={"phone": "0800000000", "password": "x"}, headers=H)
    assert bad.status_code == unknown.status_code == 401
    assert bad.json() == unknown.json()
    me = c.get("/v1/osm/me", headers=login(c)).json()
    assert me["referral_code"] == "OSM-DEMO" and "password_hash" not in me


def test_internal_token_required(env: dict[str, Any]) -> None:
    r = env["client"].post(
        "/v1/osm/login", json={"phone": "0812345678", "password": "demo-password"}
    )
    assert r.status_code == 401


def test_dashboard_order_and_visibility(env: dict[str, Any]) -> None:
    repo, c = env["repo"], env["client"]
    e = repo.get_elder("eld_somsri")
    assert e
    e.consents.osm_share = False
    repo.elders[e.id] = e
    other = repo.get_elder("eld_kham")
    assert other
    other.osm_id = "osm_other"
    repo.elders[other.id] = other
    data = c.get("/v1/osm/dashboard", headers=login(c)).json()
    names = [r["name"] for r in data["rows"]]
    assert "ยายสมศรี" not in names and "ยายคำ" not in names
    statuses = [r["status"] for r in data["rows"]]
    assert statuses == ["red", "yellow", "yellow", "yellow", "unreachable"]
    assert data["rows"][0]["name"] == "ตาสมชาย"
    assert data["counts"]["tasks_open"] == 3
    r = c.get("/v1/osm/elders/eld_somsri/daily", headers=login(c))
    assert r.status_code == 404


def test_resolve_and_daily(env: dict[str, Any]) -> None:
    c = env["client"]
    h = login(c)
    assert c.post(
        "/v1/osm/calls/eld_somchai/call_somchai_0/resolve", json={"note": "โทรแล้ว"}, headers=h
    ).json() == {"ok": True}
    rows = c.get("/v1/osm/dashboard", headers=h).json()["rows"]
    assert rows[0]["resolved"] is True
    daily = c.get("/v1/osm/elders/eld_somchai/daily?days=14", headers=h).json()
    assert len(daily["days"]) == 14
    assert daily["days"][0]["risk_level"] == "red"
    digest = c.get("/v1/osm/daily-digest", headers=h).json()
    assert digest["visit_first"][0]["status"] in ("yellow", "unreachable")
    assert (
        c.post("/v1/osm/tasks/eld_bualoy/task_bualoy/complete", json={}, headers=h).status_code
        == 200
    )


def test_session_tokens() -> None:
    tok, _ = issue_session("osm_1", SECRET)
    assert verify_session(tok, SECRET) == "osm_1"
    assert verify_session(tok, "x" * 32) is None
    assert verify_session(tok[:-2] + "aa", SECRET) is None
    old, _ = issue_session("osm_1", SECRET, now=datetime.now(UTC) - timedelta(hours=13))
    assert verify_session(old, SECRET) is None
    h = hash_password("pw")
    assert h.startswith("scrypt$16384$8$1$")
    assert verify_password("pw", h) and not verify_password("nope", h)


# ---------------------------------------------------------------- register


def reg_body(**kw: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "guardian": {"name": "สุดา", "phone": "081-234-5678", "relation": "ลูกสาว"},
        "elder": {"name": "ยายทดสอบ", "age": 74, "phone": "+66891234567", "call_time": "09:00"},
        "referral_code": "osm-demo",
        "medications": [{"name": "ยาความดัน", "times": ["8.00"]}],
        "plan": "standard",
        "consents": {
            "record_conversation": True,
            "family_summary": True,
            "osm_share": True,
            "screening_2q": False,
        },
        "osm_explained": True,
    }
    body.update(kw)
    return body


def test_register_ok_and_normalizes(env: dict[str, Any]) -> None:
    r = env["client"].post("/v1/public/register", json=reg_body(), headers=H)
    assert r.status_code == 201
    assert r.json()["link_code"].startswith("LTH-")
    e = next(x for x in env["repo"].elders.values() if x.name == "ยายทดสอบ")
    assert e.phone == "0891234567"
    assert e.medications[0].times == ["08:00"]


def test_register_errors(env: dict[str, Any]) -> None:
    c = env["client"]
    assert (
        c.post(
            "/v1/public/register", json=reg_body(referral_code="OSM-NOPE"), headers=H
        ).status_code
        == 404
    )
    young = reg_body(elder={"name": "x", "age": 59, "phone": "0891234567", "call_time": "09:00"})
    assert c.post("/v1/public/register", json=young, headers=H).status_code == 422
    no_consent = reg_body(
        consents={
            "record_conversation": False,
            "family_summary": True,
            "osm_share": False,
            "screening_2q": False,
        }
    )
    assert c.post("/v1/public/register", json=no_consent, headers=H).status_code == 422


# ---------------------------------------------------------------- demo


def test_demo_scenario_runs_full_pipeline(env: dict[str, Any]) -> None:
    c = env["client"]
    scenarios = c.get("/v1/demo/scenarios", headers=H).json()
    assert any(s["id"] == "red-chest-isan" for s in scenarios)
    r = c.post(
        "/v1/demo/calls",
        json={"elder_id": "eld_somsri", "scenario_id": "red-chest-isan"},
        headers=H,
    )
    j = r.json()
    assert j["status"] == "red" and j["analysis"]["risk_level"] == "red"
    assert any(card["to"] == "guardian" and card["kind"] == "red" for card in j["cards"])
    rows = c.get("/v1/osm/dashboard", headers=login(c)).json()["rows"]
    assert rows[0]["name"] in ("ตาสมชาย", "ยายสมศรี") and rows[1]["status"] == "red"
    assert c.post("/v1/demo/reset", headers=H).json() == {"ok": True}


def test_demo_line_user_linked_on_seed() -> None:
    from app.repo.seed import link_demo_line

    repo = MemoryRepo()
    seed(repo)
    link_demo_line(repo, " Ume , Uother")
    assert [g.line_user_id for g in repo.list_guardians_by_line_user("Ume")] == ["Ume"]
    link_demo_line(MemoryRepo(), "")  # empty / no seed: no-op


# ---------------------------------------------------------------- family dashboard (LIFF)


class LiffLine(RecordingLine):
    def verify_id_token(self, id_token: str, channel_id: str) -> str | None:
        return {"tok-family": "Ufamily", "tok-stranger": "Ustranger"}.get(id_token)


@pytest.fixture
def fam(env: dict[str, Any]) -> dict[str, Any]:
    env["deps"].line = LiffLine()
    link_guardian(env["repo"], "eld_samlee")
    return env


def fam_login(client: TestClient, token: str) -> Any:
    return client.post("/v1/family/login", json={"id_token": token}, headers=H)


def test_family_login_requires_linked_guardian(fam: dict[str, Any]) -> None:
    c = fam["client"]
    assert fam_login(c, "bad").status_code == 401
    assert fam_login(c, "tok-stranger").status_code == 403
    assert fam_login(c, "tok-family").status_code == 200
    assert c.post("/v1/family/login", json={"id_token": "tok-family"}).status_code == 401  # no H


def test_family_dashboard_is_family_safe(fam: dict[str, Any]) -> None:
    c = fam["client"]
    session = fam_login(c, "tok-family").json()["session"]
    r = c.get("/v1/family/dashboard", headers={**H, "Authorization": f"Bearer {session}"})
    assert r.status_code == 200
    elders = r.json()["elders"]
    assert [e["elder"]["name"] for e in elders] == ["ยายสำลี"]
    dump = json.dumps(r.json(), ensure_ascii=False)
    assert not any(w in dump for w in BANNED)
    for banned_key in ("evidence", "risk_reasons", "summary_osm", "mood", "phone", "reasons"):
        assert f'"{banned_key}"' not in dump
    assert elders[0]["status"] == "followup" and len(elders[0]["days"]) == 14


def test_family_dashboard_rejects_osm_session(fam: dict[str, Any]) -> None:
    c = fam["client"]
    osm_headers = login(c)
    assert c.get("/v1/family/dashboard", headers=osm_headers).status_code == 401
    session = fam_login(c, "tok-family").json()["session"]
    assert (
        c.get("/v1/osm/me", headers={**H, "Authorization": f"Bearer {session}"}).status_code == 401
    )


# ---------------------------------------------------------------- อสม. accounts (create_osm.py)


def test_create_osm_account_then_login(env: dict[str, Any], tmp_path: Any) -> None:
    import re

    from app.repo.osm_accounts import AccountError, create_account, load_into

    path = tmp_path / "osm.json"
    osm = create_account(path, " สมใจ ", "0891112222", "ต.บ้านดง", "secret-pass")
    assert re.fullmatch(r"OSM-[A-HJ-NP-Z2-9]{4}", osm.referral_code)
    assert osm.name == "สมใจ" and "secret-pass" not in path.read_text(encoding="utf-8")
    for bad in (
        ("0891112222", "secret-pass"),  # phone taken
        ("0812345678", "secret-pass"),  # demo อสม.
        ("12345", "secret-pass"),
        ("0893334444", "short"),
    ):
        with pytest.raises(AccountError):
            create_account(path, "ก", bad[0], "ต.ก", bad[1])

    assert load_into(env["repo"], path) == 1
    r = env["client"].post(
        "/v1/osm/login", json={"phone": "0891112222", "password": "secret-pass"}, headers=H
    )
    assert r.status_code == 200
