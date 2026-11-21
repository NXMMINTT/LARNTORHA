"""หลานโทรหา (LarnTorHa) — prototype agent for the AI for All bootcamp (P7).

A daily check-in call, simulated by text. Built from the "Agent design" section of
.kiro/specs/daily-checkin/requirements.md. Seed data only: made-up names, no real health data.
The original PostPal starter is kept as agent_postpal.py (setup test 5).

Run:  uv run agent.py          (needs `aws sso login` first)
Type what the elder says. Type 'exit' (or say goodbye) to hang up and see the LINE-style card.
"""
import json
import sys
from datetime import datetime
from pathlib import Path

from strands import Agent, tool
from strands.models import BedrockModel

# ---------------------------------------------------------------------------
# Seed data only (data/elders.json). Never put real personal or health data in a prototype.
# ---------------------------------------------------------------------------
DATA = Path(__file__).resolve().parent / "data"
ELDERS = {e["id"]: e for e in json.loads((DATA / "elders.json").read_text(encoding="utf-8"))}

CALL_STATE = {"medication": {}, "story": "", "unclear": False, "urgent": [], "stopped": False}

URGENT_WORDS = ["ล้ม", "เจ็บหน้าอก", "หายใจไม่ออก", "ช่วยด้วย", "เวียนหัวมาก", "ปวดหัวรุนแรง",
                "แขนขาอ่อนแรง", "แขนอ่อนแรง", "ขาอ่อนแรง", "พูดไม่ชัด"]
STOP_WORDS = ["หยุด", "ไม่อยากคุย", "พอแล้ว"]


# ---------------------------------------------------------------------------
# Tools: the agent reads and records; it never gives medical information.
# ---------------------------------------------------------------------------
@tool
def get_elder_profile(elder_id: str) -> str:
    """Get the elder's nickname, age, today's medicines and the topic from the last call.

    Args:
        elder_id: The elder's id, for example "e1".
    """
    e = ELDERS.get(elder_id)
    if not e:
        return "No elder with that id."
    last = e["last_topic"] or "none"
    return (f"nickname: {e['nickname']}; age: {e['age']}; "
            f"medicines today: {', '.join(e['medicines'])}; last topic: {last}")


@tool
def record_medication(elder_id: str, medicine: str, status: str) -> str:
    """Record whether the elder took one medicine today.

    Args:
        elder_id: The elder's id, for example "e1".
        medicine: The medicine name as listed in the profile.
        status: One of "taken", "not_taken" or "unsure".
    """
    if status not in ("taken", "not_taken", "unsure"):
        status = "unsure"
    CALL_STATE["medication"][medicine] = status
    return "Recorded."


@tool
def save_call_summary(elder_id: str, story: str, unclear: bool = False) -> str:
    """Save today's call summary at the end of the call.

    Args:
        elder_id: The elder's id, for example "e1".
        story: One or two Thai sentences about what the elder talked about today. No diagnosis.
        unclear: True if the call was too unclear to summarise reliably.
    """
    CALL_STATE["story"] = story.strip()
    CALL_STATE["unclear"] = bool(unclear)
    return "Summary saved."


# ---------------------------------------------------------------------------
# Plain-code rules: urgent check and card status never depend on the model.
# ---------------------------------------------------------------------------
def check_urgent(text: str) -> list:
    return [w for w in URGENT_WORDS if w in text]


def send_red_alert(elder: dict, words: list) -> None:
    # Stub: a real build sends LINE to family + อสม. here.
    print("\n🔴 [ALERT → ลูกหลาน + อสม. (stub)] "
          f"{elder['name']} พูดถึง: {', '.join(words)} · แนะนำให้โทร 1669 แล้ว · "
          "ระบบไม่สามารถเรียกรถพยาบาลหรือยืนยันอาการได้\n")


def card_status() -> str:
    if CALL_STATE["urgent"]:
        return "🔴 เร่งด่วน"
    meds = list(CALL_STATE["medication"].values())
    if CALL_STATE["unclear"] or not meds or any(s in ("not_taken", "unsure") for s in meds):
        return "🟡 ต้องติดตาม"
    return "🟢 ปกติ"


def print_line_card(elder: dict, started: datetime) -> None:
    mins = max(1, round((datetime.now() - started).total_seconds() / 60))
    label = {"taken": "✅ กินแล้ว", "not_taken": "❌ ยังไม่กิน", "unsure": "❓ ไม่แน่ใจ"}
    meds = "\n".join(f"│   • {m}: {label[s]}" for m, s in CALL_STATE["medication"].items()) or "│   • ยังไม่ได้บันทึก"
    print("\n┌─ LINE · หลานโทรหา ─────────────────────")
    print(f"│ {elder['name']} · {started:%d/%m/%Y %H:%M} · {mins} นาที")
    print(f"│ สถานะ: {card_status()}")
    print(f"│ เรื่องวันนี้: {CALL_STATE['story'] or '(ไม่มีสรุป)'}")
    print(f"│ ยา:\n{meds}")
    if CALL_STATE["stopped"]:
        print("│ คุณยายขอให้หยุดสาย — กรุณาโทรหาเองนะครับ")
    print("│ [ รับทราบ ]")
    print("└──────────────────────────────────────")


def save_call_record(elder_id: str, started: datetime) -> None:
    """Append this call's result to data/calls.json so the dashboard shows it (plain code)."""
    path = DATA / "calls.json"
    calls = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    calls.append({
        "elder_id": elder_id,
        "datetime": started.strftime("%Y-%m-%dT%H:%M"),
        "answered": True,
        "attempts": 1,
        "duration_min": max(1, round((datetime.now() - started).total_seconds() / 60)),
        "story": CALL_STATE["story"],
        "medication": CALL_STATE["medication"],
        "urgent": CALL_STATE["urgent"],
        "two_q": None,
        "unclear": CALL_STATE["unclear"],
        "stopped": CALL_STATE["stopped"],
    })
    path.write_text(json.dumps(calls, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n💾 บันทึกผลสายลง data/calls.json แล้ว — รีเฟรชแดชบอร์ดเพื่อดู")


# ---------------------------------------------------------------------------
# The agent
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "คุณคือ 'หลาน' ผู้ช่วย AI ของบริการหลานโทรหา ที่ลูกหลานสมัครไว้ให้โทรคุยกับผู้สูงอายุทุกวัน "
    "หลานเป็นเด็กผู้ชาย ใช้คำว่า 'ผม' แทนตัวเอง และลงท้ายด้วย 'ครับ' "
    "พูดภาษาไทยสุภาพ อบอุ่น ประโยคสั้น ใช้คำง่าย ตอบครั้งละไม่เกินสองสามประโยค "
    "เริ่มสายด้วยการเรียก get_elder_profile ทักทายด้วยชื่อเล่น บอกว่าเป็นผู้ช่วย AI ที่ลูกหลานสมัครไว้ "
    "และถามต่อจากเรื่องที่คุยครั้งก่อนถ้ามี ถ้าไม่มีอย่าแต่งเรื่องขึ้นมา "
    "เตือนยาตามตารางทีละตัว ถามว่ากินแล้วหรือยัง แล้วบันทึกด้วย record_medication "
    "ถ้าถูกถามว่าเป็นคนจริงไหม ตอบตามจริงว่าเป็น AI "
    "ห้ามแนะนำยา ขนาดยา หรือการรักษาทุกกรณี ถ้าถูกถามเรื่องยาหรืออาการ ให้ปฏิเสธอย่างสุภาพ "
    "แล้วถามว่ามีเวียนหัวมาก ปวดหัวรุนแรง แขนขาอ่อนแรง หรือพูดไม่ชัดไหม "
    "ห้ามถามเรื่องเงิน บัญชี หรือรหัส OTP "
    "ถ้าฟังไม่ชัดให้ทวนหนึ่งครั้ง ถ้ายังไม่ชัดให้บันทึกว่าไม่แน่ใจ "
    "เมื่อผู้สูงอายุจะวางสายหรือขอให้หยุด ให้เรียก save_call_summary ด้วยเรื่องเล่าวันนี้ 1–2 ประโยค "
    "แล้วลาสุภาพว่าพรุ่งนี้เวลาเดิมจะโทรมาใหม่"
)

model = BedrockModel(
    model_id="anthropic.claude-sonnet-5",
    region_name="ap-southeast-1",
)

agent = Agent(
    model=model,
    system_prompt=SYSTEM_PROMPT,
    tools=[get_elder_profile, record_medication, save_call_summary],
)

if __name__ == "__main__":
    elder_id = sys.argv[1] if len(sys.argv) > 1 else "e1"   # e.g. uv run agent.py e2
    elder = ELDERS[elder_id]
    started = datetime.now()
    print(f"📞 หลานโทรหา → {elder['name']} (จำลองสายด้วยข้อความ) · พิมพ์ 'exit' เพื่อวางสาย")
    agent(f"[ระบบ] สายต่อติดแล้ว elder_id={elder_id} เริ่มทักทายได้เลย")
    while True:
        text = input("\nคุณยาย > ").strip()
        if not text:
            continue
        if text.lower() in ("exit", "quit"):
            if not CALL_STATE["story"]:
                agent(f"[ระบบ] ผู้สูงอายุวางสายแล้ว elder_id={elder_id} เรียก save_call_summary เดี๋ยวนี้ ไม่ต้องพูดต่อ")
            break
        words = check_urgent(text)
        if words:
            CALL_STATE["urgent"].extend(words)
            send_red_alert(elder, words)
            text += " [ระบบ: พบคำเร่งด่วน แนะนำให้โทร 1669 ทันทีอย่างสงบ และบอกว่าแจ้งลูกหลานกับ อสม. แล้ว ห้ามบอกว่าเรียกรถพยาบาลให้]"
        if any(w in text for w in STOP_WORDS):
            CALL_STATE["stopped"] = True
        agent(text)
        if CALL_STATE["story"] or CALL_STATE["stopped"]:
            break
    print_line_card(elder, started)
    save_call_record(elder_id, started)
