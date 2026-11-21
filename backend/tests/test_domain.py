import json

from app.domain.line_cards import family_card, osm_alert
from app.domain.models import CallResult, TranscriptTurn
from app.domain.red_flags import check_transcript
from app.domain.status import compute_status, dashboard_sort_key, missed_med_streak
from tests.factories import analysis, call, elder, elder_says, task

# ---------------------------------------------------------------- compute_status


def test_no_calls_is_pending() -> None:
    r = compute_status([], [])
    assert r.status == "pending"
    assert r.reasons == ["ยังไม่มีสายแรก"]


def test_red_from_risk_level_and_urgent_reason() -> None:
    a = analysis("red", urgent_reason="เจ็บหน้าอก", risk_reasons=["เจ็บหน้าอก"])
    r = compute_status([call(a=a)], [])
    assert r.status == "red"
    assert r.reasons == ["เจ็บหน้าอก — แนะนำ 1669 แล้ว"]


def test_red_uses_first_reason_without_urgent_reason() -> None:
    r = compute_status([call(a=analysis("red", risk_reasons=["หายใจไม่ออก"]))], [])
    assert r.reasons == ["หายใจไม่ออก — แนะนำ 1669 แล้ว"]


def test_no_answer_is_unreachable() -> None:
    r = compute_status([call(outcome="no_answer")], [])
    assert r.status == "unreachable"
    assert "ยังติดต่อไม่ได้" in r.reasons[0]


def test_yellow_from_analysis_reasons() -> None:
    r = compute_status([call(a=analysis("yellow", risk_reasons=["มีไข้"]))], [])
    assert (r.status, r.reasons) == ("yellow", ["มีไข้"])


def test_unclear_and_poor_quality_are_yellow() -> None:
    assert compute_status([call(outcome="unclear")], []).status == "yellow"
    poor = analysis(transcript_quality="poor")
    assert compute_status([call(a=poor)], []).reasons == ["ฟังไม่ชัดจนสรุปไม่ได้"]


def test_missed_meds_two_days_green_three_days_yellow() -> None:
    two = [call(0, med_taken=False), call(1, med_taken=False), call(2, med_taken=True)]
    assert compute_status(two, []).status == "green"
    three = [call(0, med_taken=False), call(1, med_taken=False), call(2, med_taken=False)]
    r = compute_status(three, [])
    assert r.status == "yellow"
    assert r.reasons == ["ลืมยาติดกัน 3 วัน"]


def test_missed_streak_skips_no_answer_and_unknown() -> None:
    calls = [
        call(0, med_taken=False),
        call(1, outcome="no_answer"),
        call(2, med_taken=None),
        call(3, med_taken=False),
        call(4, med_taken=True),
        call(5, med_taken=False),
    ]
    assert missed_med_streak(calls) == 2


def test_open_9q_task_is_yellow() -> None:
    r = compute_status([call()], [task()])
    assert r.status == "yellow"
    assert r.reasons == ["2Q ผลบวก — รอ อสม. ประเมิน 9Q"]


def test_green_uses_summary_and_resolved_flag() -> None:
    from tests.factories import NOW

    r = compute_status([call(resolved_at=NOW)], [])
    assert r.status == "green"
    assert r.reasons == ["พูดคุยปกติ"]
    assert r.resolved is True


def test_dashboard_order() -> None:
    rows = [
        ("pending", False, "ยายคำ"),
        ("green", False, "ยายสมศรี"),
        ("red", True, "ตาเก่ง"),
        ("red", False, "ตาสมชาย"),
        ("unreachable", False, "ยายมาลี"),
        ("yellow", False, "ยายบัวลอย"),
        ("yellow", False, "เอกชัย"),
    ]
    ordered = sorted(rows, key=lambda r: dashboard_sort_key(r[0], r[1], r[2]))  # type: ignore[arg-type]
    assert [r[2] for r in ordered] == [
        "ตาสมชาย",
        "ตาเก่ง",
        "ยายบัวลอย",
        "เอกชัย",
        "ยายมาลี",
        "ยายสมศรี",
        "ยายคำ",
    ]


# ---------------------------------------------------------------- red flags


def test_rules_catch_chest_pain_in_elder_turn() -> None:
    r = check_transcript(elder_says("เมื่อเช้า เจ็บ หน้าอก มากเลย"))
    assert r.risk == "red"
    assert r.urgent_term == "เจ็บหน้าอก"


def test_rules_catch_isan() -> None:
    assert check_transcript(elder_says("เจ็บเอิกหลายเด้อ")).risk == "red"
    assert check_transcript(elder_says("ล้มหัวฟาดพื้น")).risk == "red"


def test_rules_catch_northern() -> None:
    assert check_transcript(elder_says("ปวดหัวขนาดเลยเจ้า")).risk == "red"
    assert check_transcript(elder_says("แขนขาบ่มีแฮงซีกเดียว")).risk == "red"
    r = check_transcript(elder_says("ใค่ตายแล้วเจ้า"))
    assert r.risk == "red" and r.self_harm
    assert check_transcript(elder_says("ลืมกิ๋นยาเมื่อเช้า")).risk == "yellow"


def test_rules_catch_southern() -> None:
    assert check_transcript(elder_says("ปวดหัวจังหูเลยลูก")).risk == "red"
    assert check_transcript(elder_says("ล้มหัวโขกพื้นแหละ")).risk == "red"
    assert check_transcript(elder_says("หายใจไม่หลุดเลย")).risk == "red"


def test_regional_negation_is_not_red() -> None:
    assert check_transcript(elder_says("บ่ใค่ตายดอก ยังสบายดี")).risk == "green"
    assert check_transcript(elder_says("ไม่ได้ปวดหัวจังหูแล้ว")).risk == "green"


def test_rules_ignore_ai_turns() -> None:
    turns = [TranscriptTurn(speaker="ai", text="มีเจ็บหน้าอกไหมคะ"), *elder_says("สบายดีจ้า")]
    assert check_transcript(turns).risk == "green"


def test_negation_is_not_red_but_flagged() -> None:
    r = check_transcript(elder_says("ไม่ได้เจ็บหน้าอกแล้ว"))
    assert r.risk == "green"
    assert "negated:เจ็บหน้าอก" in r.flags
    assert check_transcript(elder_says("บ่เจ็บเอิกดอก")).risk == "green"


def test_why_is_not_negation() -> None:
    assert check_transcript(elder_says("ทำไมเจ็บหน้าอกก็ไม่รู้")).risk == "red"


def test_self_harm_sets_flag() -> None:
    r = check_transcript(elder_says("อยู่ไปก็เท่านั้น อยากตาย"))
    assert r.risk == "red"
    assert r.self_harm


def test_past_fall_is_only_yellow() -> None:
    assert check_transcript(elder_says("เมื่อปีก่อนเคยหกล้ม")).risk == "yellow"


# ---------------------------------------------------------------- LINE cards

BANNED = ("2Q", "9Q", "ซึมเศร้า", "คะแนน")


def test_family_cards_never_contain_banned_words() -> None:
    e = elder()
    risky = analysis("yellow", two_q="positive", summary_family="วันนี้คุยเรื่องอากาศ")
    for kind, c in [
        ("green", call()),
        ("followup", call(a=risky)),
        ("red", call(a=analysis("red", urgent_reason="เจ็บหน้าอก"))),
        ("unreachable", call(outcome="no_answer")),
    ]:
        msg = family_card(kind, e, c)  # type: ignore[arg-type]
        dumped = json.dumps(msg, ensure_ascii=False)
        assert msg["altText"]
        assert not any(b in dumped for b in BANNED), kind


def test_red_card_has_1669_and_self_harm_adds_1323_without_transcript() -> None:
    e = elder()
    normal = json.dumps(family_card("red", e, call(a=analysis("red"))), ensure_ascii=False)
    assert "tel:1669" in normal
    assert "tel:1323" not in normal
    a = analysis("red", self_harm=True, summary_family="ข้อความจากบทสนทนา")
    harm = json.dumps(family_card("red", e, call(a=a)), ensure_ascii=False)
    assert "tel:1323" in harm
    assert "ข้อความจากบทสนทนา" not in harm
    assert "ระบบไม่สามารถเรียกรถพยาบาล" in harm


def test_green_card_has_ack_postback_and_disclaimer() -> None:
    dumped = json.dumps(family_card("green", elder(), call()), ensure_ascii=False)
    assert "action=ack&elder=eld_x&call=c0" in dumped
    assert "ไม่ได้หมายความว่าปลอดภัยแน่นอน" in dumped
    assert "สรุปโดย AI" in dumped


def test_family_card_header_image_when_public_url_set() -> None:
    base = "https://cdn.test/cards/"
    cases: list[tuple[str, CallResult]] = [
        ("green", call()),
        ("unreachable", call()),
        ("followup", call(a=analysis("yellow"))),
        ("red", call(a=analysis("red"))),
    ]
    for kind, c in cases:
        bubble = family_card(kind, elder(), c, base)["contents"]  # type: ignore[arg-type]
        assert "header" not in bubble
        assert bubble["hero"]["url"].startswith(f"{base}{kind}.jpg?v=")
        dumped = json.dumps(bubble, ensure_ascii=False)
        assert f"{base}icons/calendar-64748b.png" in dumped and "wave.png" not in dumped
        assert elder().name in dumped
        assert not any(w in dumped for w in ("2Q", "9Q", "ซึมเศร้า", "คะแนน"))
        # every button is a real action, not a picture
        footer = json.dumps(bubble["footer"], ensure_ascii=False)
        assert footer.count('"action"') >= 1


def test_family_card_buttons_are_real_actions() -> None:
    e = elder()
    unreachable = json.dumps(family_card("unreachable", e, call()), ensure_ascii=False)
    assert (
        f"tel:{e.phone}" in unreachable and "action=notify_osm&elder=eld_x&call=c0" in unreachable
    )
    red = json.dumps(family_card("red", e, call(a=analysis("red"))), ensure_ascii=False)
    assert "tel:1669" in red and f"tel:{e.phone}" in red and "action=notify_osm" in red


def test_family_card_plain_header_without_public_url() -> None:
    bubble = family_card("green", elder(), call())["contents"]
    assert "hero" not in bubble and bubble["header"]["backgroundColor"] == "#16a34a"


def test_family_card_bubble_is_under_line_limit() -> None:
    a = analysis("red", summary_family="ก" * 300)
    for kind in ("green", "unreachable", "followup", "red"):
        msg = family_card(kind, elder(), call(a=a), "https://cdn.test/cards")
        assert len(json.dumps(msg["contents"], ensure_ascii=False).encode()) < 30_000
        assert len(msg["altText"]) <= 400


def test_card_images_are_served() -> None:
    from fastapi.testclient import TestClient

    from app.config import Settings
    from app.main import create_app

    client = TestClient(create_app(Settings(_env_file=None)))
    for name, ctype in [
        *((f"{k}.jpg", "image/jpeg") for k in ("green", "unreachable", "followup", "red")),
        ("icons/phone-ffffff.png", "image/png"),
    ]:
        r = client.get(f"/static/cards/{name}")
        assert r.status_code == 200 and r.headers["content-type"] == ctype


def test_osm_alert_links_dashboard() -> None:
    msg = osm_alert(elder(), "yellow", ["2Q ผลบวก — รอ อสม. ประเมิน 9Q"], "https://x.test/")
    assert "https://x.test/dashboard" in json.dumps(msg)
