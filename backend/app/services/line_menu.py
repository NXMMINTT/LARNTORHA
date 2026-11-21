"""Rich menu buttons on the LINE OA (postback data `menu=<key>`).

Family-facing replies only: never mention 2Q/9Q or risk reasons (CLAUDE.md §0, §8).
"""

from datetime import datetime, timedelta
from typing import Any

from app.deps import Deps
from app.domain.line_cards import BKK, family_card, thai_date
from app.domain.models import CallResult, Elder
from app.domain.status import CARD_FOR_STATUS, compute_status
from app.line_client import text

MAX_MESSAGES = 5  # LINE reply limit

NOT_LINKED = (
    "เมนูนี้ใช้ได้หลังเชื่อม LINE กับผู้สูงอายุที่สมัครไว้\n"
    "กรุณาพิมพ์รหัสเชื่อม LINE ที่ได้รับตอนสมัคร (เช่น LTH-123456)\n\n"
    "หากฉุกเฉินโทร 1669"
)
GREEN_NOTE = "🟢 หมายถึงไม่พบสัญญาณผิดปกติในสาย ไม่ได้ยืนยันว่าปลอดภัย"
HELP = (
    "หลานโทรหาทำงานอย่างไร\n"
    '1. ผู้ช่วย AI "น้องหลาน" โทรหาผู้สูงอายุตามเวลาที่ตั้งไว้ และแนะนำตัวว่าเป็น AI\n'
    "2. ชวนคุยเรื่องทั่วไปและเตือนกินยาตามตาราง (ไม่แนะนำยาหรือขนาดยา)\n"
    "3. หลังวางสาย ส่งสรุปมาที่ LINE นี้ พร้อมสถานะ 🟢 ปกติ 🟠 ควรติดตาม 🔴 เร่งด่วน\n"
    "4. ถ้ามีเรื่องควรติดตาม อสม. ในพื้นที่จะได้รับแจ้งด้วย\n\n"
    "เมนูด้านล่าง\n"
    "• รายงานผลการโทร: ดูการ์ดสรุปสายล่าสุดอีกครั้ง\n"
    "• ประวัติการโทร: สถานะ 7 วันล่าสุด\n"
    "• ข้อมูลผู้สูงอายุ: เวลาโทร แพ็กเกจ และตารางยา\n\n"
    "หลานโทรหาไม่ใช่สายด่วน ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค "
    "หากฉุกเฉินโทร 1669"
)
SETTINGS = (
    "การตั้งค่าการแจ้งเตือนผ่าน LINE ยังไม่เปิดให้ใช้ (เร็ว ๆ นี้)\n"
    "ตอนนี้ระบบจะส่งสรุปมาหลังทุกสาย หากต้องการเปลี่ยนเวลาโทร ตารางยา "
    "หรือหยุดบริการ กรุณาติดต่อ อสม. ในพื้นที่"
)
PLAN_LABEL = {
    "light": "Light (3 ครั้งต่อสัปดาห์)",
    "standard": "Standard (วันเว้นวัน)",
    "premium": "Premium (ทุกวัน)",
}


def handle_menu(deps: Deps, user_id: str, key: str) -> list[dict[str, Any]]:
    """Messages to reply for a rich menu tap."""
    if key == "help":
        return [text(HELP)]
    if key == "settings":
        return [text(SETTINGS)]
    elders = _linked_elders(deps, user_id)
    if not elders:
        return [text(NOT_LINKED)]
    if key == "report":
        return [_report(deps, e) for e in elders][:MAX_MESSAGES]
    if key == "history":
        return [text("\n\n".join(_history(deps, e) for e in elders))]
    if key == "elder":
        return [text("\n\n".join(_elder_info(e) for e in elders))]
    if key == "contact":
        return [text(_contact(deps, elders))]
    return [text("ไม่พบเมนูนี้")]


def _linked_elders(deps: Deps, user_id: str) -> list[Elder]:
    out: list[Elder] = []
    for g in deps.repo.list_guardians_by_line_user(user_id):
        e = deps.repo.get_elder(g.elder_id)
        if e is not None and e.consents.family_summary:
            out.append(e)
    return out


def _report(deps: Deps, elder: Elder) -> dict[str, Any]:
    repo = deps.repo
    st = compute_status(repo.list_calls(elder.id, 14), repo.list_open_tasks(elder.id))
    kind = CARD_FOR_STATUS[st.status]
    if kind is None or st.latest_call is None:
        return text(f"ยังไม่มีสายแรกของ{elder.name} เมื่อโทรแล้วจะส่งสรุปมาที่นี่")
    return family_card(kind, elder, st.latest_call, deps.settings.card_image_base_url or None)


def _day_rank(c: CallResult) -> tuple[int, str]:
    if c.outcome == "no_answer":
        return 1, "📵 ไม่รับสาย"
    risk = c.analysis.risk_level if c.analysis else "yellow"
    if risk == "red":
        return 3, "🔴 เร่งด่วน"
    if risk == "yellow" or c.outcome == "unclear":
        return 2, "🟠 ควรติดตาม"
    return 0, "🟢 ปกติ"


def _history(deps: Deps, elder: Elder) -> str:
    since = (datetime.now(BKK) - timedelta(days=6)).date()
    by_day: dict[str, tuple[int, str]] = {}
    for c in deps.repo.list_calls(elder.id, 14):  # newest first
        local = c.started_at.astimezone(BKK).date()
        if local < since:
            continue
        day = thai_date(c.started_at)
        rank = _day_rank(c)
        if day not in by_day or rank[0] > by_day[day][0]:
            by_day[day] = rank
    if not by_day:
        return f"{elder.name}: ยังไม่มีสายใน 7 วันล่าสุด"
    lines = [f"{day}  {label}" for day, (_, label) in by_day.items()]
    return f"ประวัติการโทร 7 วันล่าสุดของ{elder.name}\n" + "\n".join(lines) + f"\n\n{GREEN_NOTE}"


def _elder_info(elder: Elder) -> str:
    meds = (
        "\n".join(f"• {m.name} ({', '.join(m.times)} น.)" for m in elder.medications)
        if elder.medications
        else "• ไม่มีตารางยา"
    )
    voice = "ยืนยันแล้ว" if elder.consents.voice_confirmed_at else "รอยืนยันด้วยเสียงในสายแรก"
    return (
        f"ข้อมูลของ{elder.name} (อายุ {elder.age} ปี)\n"
        f"เวลาโทร: {elder.call_time} น.\n"
        f"แพ็กเกจ: {PLAN_LABEL[elder.plan]}\n"
        f"ความยินยอมของผู้สูงอายุ: {voice}\n"
        f"ตารางยาที่ให้ AI เตือน:\n{meds}\n"
        "(AI จะไม่แนะนำยาหรือขนาดยา)"
    )


def _contact(deps: Deps, elders: list[Elder]) -> str:
    lines = []
    for e in elders:
        osm = deps.repo.get_osm(e.osm_id)
        if osm is not None:
            tambon = osm.tambon if osm.tambon.startswith("ต.") else f"ต.{osm.tambon}"
            lines.append(f"• {e.name}: อสม. {osm.name} {tambon}")
    who = "\n".join(lines) if lines else "• ไม่พบข้อมูล อสม."
    return (
        "อสม. ที่ดูแลในพื้นที่\n"
        f"{who}\n\n"
        'ถ้าต้องการให้ อสม. ช่วยดู กดปุ่ม "แจ้ง อสม." บนการ์ดสรุปการโทร '
        "หรือติดต่อ อสม. ผ่านช่องทางที่ใช้ตอนสมัคร\n\n"
        "หากฉุกเฉินโทร 1669"
    )
