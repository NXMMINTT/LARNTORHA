"""Demo seed (CLAUDE.md §14). Every person here is fictional. Dev / demo only."""

from datetime import UTC, datetime, timedelta
from typing import Any

from app.auth import hash_password
from app.domain.line_cards import BKK
from app.domain.models import (
    CallAnalysis,
    CallOutcome,
    CallResult,
    Consents,
    Elder,
    Guardian,
    Medication,
    NineQTask,
    Osm,
)
from app.repo.memory import MemoryRepo

OSM_ID = "osm_0000000000000000demo"


def _green(family: str, osm: str, evidence: str, topics: list[str]) -> dict[str, Any]:
    return {
        "summary_family": family,
        "summary_osm": osm,
        "topics": topics,
        "med_taken": True,
        "risk_level": "green",
        "evidence": [evidence],
        "mood": "good",
    }


GREEN_POOL = [
    _green(
        "วันนี้เล่าว่าไปรดน้ำต้นมะนาวหลังบ้าน อารมณ์ดี กินยาเช้าแล้ว",
        "รับสาย พูดคุยปกติ เล่าเรื่องรดน้ำต้นไม้ กินยาเช้าแล้ว ไม่พบอาการผิดปกติ",
        "เช้านี้ไปรดน้ำต้นมะนาวมาแล้ว",
        ["สวน", "ต้นมะนาว"],
    ),
    _green(
        "วันนี้คุยเรื่องหลานที่จะกลับมาเยี่ยมช่วงปีใหม่ ฟังดูดีใจมาก",
        "พูดคุยปกติ เล่าว่าหลานจะกลับมาช่วงปีใหม่ กินยาตามเวลา",
        "หลานบอกว่าปีใหม่จะกลับมา",
        ["หลาน", "ปีใหม่"],
    ),
    _green(
        "วันนี้ไปวัดตอนเช้ากับเพื่อนบ้าน กลับมากินข้าวแล้ว",
        "ไปวัดตอนเช้า รับประทานอาหารได้ กินยาแล้ว ไม่พบอาการผิดปกติ",
        "ไปวัดกับป้าแก้วมา",
        ["วัด", "เพื่อนบ้าน"],
    ),
    _green(
        "วันนี้ทำแกงหน่อไม้กินเอง บอกว่าอร่อย นอนหลับดี",
        "ทำอาหารเองได้ นอนหลับดี กินยาครบ ไม่มีอาการผิดปกติ",
        "ทำแกงหน่อไม้กินเองเด้อ",
        ["ทำอาหาร"],
    ),
    _green(
        "วันนี้นั่งดูละครหลังข่าว เล่าเรื่องละครให้ฟังอย่างสนุก",
        "พูดคุยปกติ สื่อสารชัดเจน กินยาแล้ว",
        "ละครเมื่อคืนสนุกหลาย",
        ["ละคร"],
    ),
    _green(
        "วันนี้เดินออกกำลังรอบหมู่บ้านตอนเย็น สบายดี",
        "เดินออกกำลังกายได้ตามปกติ ไม่มีเวียนหัว กินยาแล้ว",
        "เย็นนี้จะเดินรอบหมู่บ้าน",
        ["ออกกำลังกาย"],
    ),
]


def _pick(i: int, **override: Any) -> dict[str, Any]:
    return {**GREEN_POOL[i % len(GREEN_POOL)], **override}


def _call_time(now: datetime, days_ago: int, hhmm: str, jitter: int) -> datetime:
    local = now.astimezone(BKK)
    # Before 10:00 Bangkok the "latest call" is yesterday's (§14).
    shift = 1 if local.hour < 10 else 0
    h, m = (int(x) for x in hhmm.split(":"))
    day = local.replace(hour=h, minute=m, second=0, microsecond=0)
    return (day - timedelta(days=days_ago + shift) + timedelta(minutes=jitter)).astimezone(UTC)


def seed(repo: MemoryRepo, now: datetime | None = None) -> None:
    now = now or datetime.now(UTC)
    created = now - timedelta(days=30)
    repo.put_osm(
        Osm(
            id=OSM_ID,
            name="พี่แดง (ตัวอย่าง)",
            phone="0812345678",
            tambon="ต.บ้านตัวอย่าง",
            password_hash=hash_password("demo-password"),
            referral_code="OSM-DEMO",
            created_at=created,
        )
    )

    people = [
        (
            "eld_somchai",
            "ตาสมชาย",
            82,
            "0891111234",
            "09:00",
            "premium",
            [("ยาความดัน", ["08:00"]), ("ยาละลายลิ่มเลือด", ["08:00"])],
        ),
        (
            "eld_malee",
            "ยายมาลี",
            78,
            "0892222345",
            "09:00",
            "standard",
            [("ยาเบาหวาน", ["07:30", "18:00"])],
        ),
        (
            "eld_bualoy",
            "ยายบัวลอย",
            75,
            "0893333456",
            "09:30",
            "standard",
            [("ยาความดัน", ["08:00"])],
        ),
        ("eld_somsri", "ยายสมศรี", 74, "0894444567", "08:30", "light", [("วิตามินบี", ["08:00"])]),
        ("eld_thongdee", "ตาทองดี", 80, "0895555678", "10:00", "standard", [("ยาไขมัน", ["20:00"])]),
        (
            "eld_samlee",
            "ยายสำลี",
            77,
            "0896666789",
            "09:00",
            "premium",
            [("ยาความดัน", ["08:00", "20:00"])],
        ),
        ("eld_kham", "ยายคำ", 71, "0897777890", "09:00", "light", []),
    ]
    elders: dict[str, Elder] = {}
    for n, (eid, name, age, phone, call_time, plan, meds) in enumerate(people, start=1):
        e = Elder(
            id=eid,
            name=name,
            age=age,
            phone=phone,
            osm_id=OSM_ID,
            call_time=call_time,
            plan=plan,
            medications=[Medication(name=m, times=t) for m, t in meds],
            consents=Consents(
                record_conversation=True,
                family_summary=True,
                osm_share=True,
                screening_2q=True,
                given_at=created,
                voice_confirmed_at=None if eid == "eld_kham" else created + timedelta(days=1),
            ),
            created_at=created,
        )
        g = Guardian(
            id=f"gdn_{eid[4:]}",
            elder_id=eid,
            name="ลูกหลาน (ตัวอย่าง)",
            phone=f"08000000{n:02d}",
            relation="ลูกสาว",
            # Fixed demo link codes LTH-10000N so a real LINE account can link during the demo.
            line_link_code=f"LTH-{100000 + n}",
            line_link_code_expires_at=now + timedelta(days=7),
            created_at=created,
        )
        repo.create_registration(e, g)
        elders[eid] = e

    def add(eid: str, days_ago: int, outcome: CallOutcome, a: dict[str, Any] | None) -> CallResult:
        e = elders[eid]
        analysis = (
            CallAnalysis(**{"prompt_version": "seed", "model_id": "seed", **a}) if a else None
        )
        answered = outcome == "answered"
        c = CallResult(
            id=f"call_{eid[4:]}_{days_ago}",
            elder_id=eid,
            started_at=_call_time(now, days_ago, e.call_time, (days_ago * 7) % 4),
            duration_sec=240 + (days_ago * 13) % 90 if outcome != "no_answer" else 0,
            outcome=outcome,
            analysis=analysis,
            summary=analysis.summary_osm if analysis else None,
            med_taken=analysis.med_taken if analysis and answered else None,
            urgent_reason=analysis.urgent_reason if analysis else None,
            two_q_positive=(
                None
                if not analysis or analysis.two_q == "not_asked"
                else analysis.two_q == "positive"
            ),
            received_at=now,
        )
        repo.put_call(c)
        return c

    def task(eid: str, c: CallResult) -> None:
        repo.put_task(
            NineQTask(
                id=f"task_{eid[4:]}",
                elder_id=eid,
                osm_id=OSM_ID,
                screened_at=c.started_at,
                due_at=c.started_at + timedelta(days=7),
            )
        )

    # ตาสมชาย — red: chest pain today, family asked the อสม. to check
    red = add(
        "eld_somchai",
        0,
        "answered",
        {
            "summary_family": "วันนี้คุณตาบอกว่าเจ็บหน้าอก ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว",
            "summary_osm": "แจ้งเจ็บแน่นหน้าอกตั้งแต่เช้า ร้าวไปแขนซ้าย AI แนะนำให้โทร 1669 กินยาความดันเช้าแล้ว",
            "topics": ["เจ็บหน้าอก"],
            "med_taken": True,
            "risk_level": "red",
            "risk_reasons": ["เจ็บแน่นหน้าอก"],
            "evidence": ["เจ็บหน้าอก แน่น ๆ ตั้งแต่เช้า", "มันร้าวไปแขนซ้าย"],
            "urgent_reason": "เจ็บหน้าอก",
            "mood": "low",
            "rule_flags": ["เจ็บหน้าอก"],
        },
    )
    red.family_requested_osm_at = now
    repo.put_call(red)
    for d in range(1, 14):
        add("eld_somchai", d, "answered", _pick(d))

    # ยายมาลี — unreachable today
    add("eld_malee", 0, "no_answer", None)
    for d in range(1, 14):
        add("eld_malee", d, "no_answer" if d == 6 else "answered", None if d == 6 else _pick(d + 1))

    # ยายบัวลอย — 2Q positive 2 days ago
    for d in range(14):
        if d == 2:
            c = add(
                "eld_bualoy",
                d,
                "answered",
                _pick(
                    d,
                    summary_family="วันนี้คุยกันเรื่องอากาศเย็นและงานบ้าน",
                    summary_osm="เล่าว่านอนไม่ค่อยหลับ รู้สึกไม่อยากทำอะไร 2Q ผลบวก ควรประเมิน 9Q กินยาแล้ว",
                    topics=["นอนไม่หลับ"],
                    risk_level="yellow",
                    risk_reasons=["2Q ผลบวก"],
                    evidence=["ช่วงนี้ไม่อยากทำอะไรเลย"],
                    two_q="positive",
                    mood="low",
                ),
            )
            task("eld_bualoy", c)
        else:
            add("eld_bualoy", d, "answered", _pick(d + 2))

    # ยายสมศรี — green: ผักบุ้ง
    add(
        "eld_somsri",
        0,
        "answered",
        _pick(
            0,
            summary_family="วันนี้ยายเล่าว่าผักบุ้งที่ปลูกไว้ขึ้นแล้ว ดีใจมาก กินยาเช้าแล้ว",
            summary_osm="ผักบุ้งที่ปลูกขึ้นแล้ว พูดคุยปกติ กินยาเช้าแล้ว",
            topics=["ผักบุ้ง", "สวน"],
            evidence=["ผักบุ้งที่ปลูกขึ้นแล้วเด้อ"],
        ),
    )
    for d in range(1, 14):
        add("eld_somsri", d, "answered", _pick(d + 3))

    # ตาทองดี — 2Q positive 4 days ago
    for d in range(14):
        if d == 4:
            c = add(
                "eld_thongdee",
                d,
                "answered",
                _pick(
                    d,
                    summary_family="วันนี้คุยเรื่องสวนยางและฝนที่ตกหนัก",
                    summary_osm="เล่าว่าเบื่อ ๆ เหงา ตั้งแต่ภรรยาเสีย 2Q ผลบวก ควรประเมิน 9Q",
                    topics=["เหงา"],
                    risk_level="yellow",
                    risk_reasons=["2Q ผลบวก", "เหงามาก"],
                    evidence=["อยู่คนเดียวมันเหงา"],
                    two_q="positive",
                    mood="low",
                ),
            )
            task("eld_thongdee", c)
        else:
            add("eld_thongdee", d, "answered", _pick(d + 4))

    # ยายสำลี — forgot meds 4 days + 2Q positive
    for d in range(14):
        if d < 4:
            c = add(
                "eld_samlee",
                d,
                "answered",
                _pick(
                    d + 5,
                    summary_family="วันนี้คุยกันแล้ว คุณยายยังไม่ได้กินยาตอนเช้า",
                    summary_osm="ยังไม่ได้กินยาความดันเช้า บอกว่าลืม" + (" 2Q ผลบวก" if d == 3 else ""),
                    topics=["ลืมยา"],
                    med_taken=False,
                    risk_level="yellow",
                    risk_reasons=["ลืมกินยา", "2Q ผลบวก"] if d == 3 else ["ลืมกินยา"],
                    evidence=["ยังบ่ได้กินยาเลย ลืม"],
                    two_q="positive" if d == 3 else "not_asked",
                    mood="low" if d == 3 else "neutral",
                ),
            )
            if d == 3:
                task("eld_samlee", c)
        else:
            add("eld_samlee", d, "answered", _pick(d))

    # ยายคำ — no calls yet, voice consent not confirmed
