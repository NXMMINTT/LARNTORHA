"""Live call for /demo (team decision 21 Nov: live AI call in scope, typed instead of spoken).

Two roles, one Converse call per turn, stateless (the caller sends the whole history):
- "ai": น้องหลาน, the same rules as agent.py (introduce as AI, ask about last topic, medicine
  reminder, never give medical advice, no money/OTP, urgent words -> 1669).
- "elder": a simulated elder that follows the chosen demo scenario, so the call runs by itself.

Safety does not depend on the model: urgent words in the elder's lines are found with the same
red_flags rules as the analysis, and force the 1669 instruction. If Bedrock is not configured or
fails, a short scripted call is used instead (source="script") so the demo still works.
"""

import logging
import re
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any, Literal

from app.ai.analyzer import AnalysisContext
from app.ai.bedrock_client import ConverseClient
from app.domain.models import TranscriptTurn
from app.domain.red_flags import check_transcript

log = logging.getLogger("larntorha.live_call")

Role = Literal["ai", "elder"]
END_MARK = "[จบสาย]"
MAX_TURNS = 20  # after this the AI is told to say goodbye
MAX_TEXT = 500


@dataclass
class ScenarioBrief:
    """What the simulated elder should bring up (from a demo fixture)."""

    title: str
    elder_lines: list[str] = field(default_factory=list)


@dataclass
class LiveTurn:
    speaker: Role
    text: str
    end: bool
    source: Literal["bedrock", "script"]
    urgent: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "speaker": self.speaker,
            "text": self.text,
            "end": self.end,
            "source": self.source,
            "urgent": self.urgent,
        }


# ------------------------------------------------------------------ prompts


def _grandchild_prompt(
    ctx: AnalysisContext, n_turns: int, urgent: str | None, self_harm: bool
) -> str:
    meds = ", ".join(ctx.medications) or "ไม่มีในตาราง"
    topics = ", ".join(ctx.recent_topics) or "ไม่มี"
    p = (
        "คุณคือ 'น้องหลาน' ผู้ช่วย AI ของบริการหลานโทรหา ที่ลูกหลานสมัครไว้ให้โทรคุยกับผู้สูงอายุทุกวัน "
        "พูดภาษาไทยสุภาพ อบอุ่น ใช้คำว่า 'หนู' แทนตัวเอง ประโยคสั้น ใช้คำง่าย ตอบครั้งละไม่เกินสองประโยค "
        "ตอบเฉพาะคำพูดของน้องหลาน ไม่ต้องใส่ชื่อผู้พูดหรือคำบรรยาย\n"
        f"ผู้สูงอายุ: {ctx.name} อายุ {ctx.age} ปี · ยาตามตาราง: {meds} · เรื่องที่เคยคุย: {topics}\n"
        "ลำดับสาย: ประโยคแรกทักทายด้วยชื่อ และบอกว่าเป็นผู้ช่วย AI ที่ลูกหลานสมัครไว้ "
        "ถามต่อจากเรื่องที่เคยคุยถ้ามี ถ้าไม่มีอย่าแต่งเรื่องขึ้นมา "
        "เตือนยาตามตารางและถามว่ากินแล้วหรือยัง ฟังเรื่องที่เล่าแล้วถามต่อสั้น ๆ\n"
        "กฎ: ถ้าถูกถามว่าเป็นคนจริงไหม ตอบตามจริงว่าเป็น AI "
        "ห้ามแนะนำยา ขนาดยา หรือการรักษาทุกกรณี รวมถึงคำแนะนำให้พัก ดื่มน้ำ หรือทำอะไรกับร่างกาย "
        "ถ้าถูกถามเรื่องยาหรือพูดถึงอาการ ให้ปฏิเสธเรื่องยาอย่างสุภาพ แล้วถามว่ามีเวียนหัวมาก ปวดหัวรุนแรง "
        "แขนขาอ่อนแรง หรือพูดไม่ชัดไหม "
        "ห้ามถามเรื่องเงิน บัญชี หรือรหัส OTP ถ้าผู้สูงอายุเล่าว่ามีคนขอ ให้บอกว่าอย่าให้ใคร และจะแจ้งลูกหลาน "
        "ห้ามสัญญาว่าใครจะไปถึงบ้านเมื่อไร และห้ามบอกว่าเรียกรถพยาบาลให้\n"
        "เมื่อคุยครบแล้ว หรือผู้สูงอายุขอวางสายหรือขอให้หยุด ให้ลาสุภาพว่าพรุ่งนี้เวลาเดิมหนูจะโทรมาใหม่ "
        f"แล้วต่อท้ายด้วย {END_MARK}"
    )
    if urgent:
        p += (
            f"\nสำคัญ: ผู้สูงอายุเพิ่งพูดถึง '{urgent}' ตอนนี้ให้แนะนำให้โทร 1669 ทันทีอย่างสงบ "
            "บอกว่าหนูจะแจ้งลูกหลานและ อสม. ให้ทราบ ห้ามแนะนำการรักษา"
        )
        if self_harm:
            p += " และบอกว่าโทรคุยกับสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชั่วโมง พูดอย่างอ่อนโยน"
    if n_turns >= MAX_TURNS:
        p += f"\nสายนี้ยาวพอแล้ว ให้ลาสุภาพตอนนี้ แล้วต่อท้ายด้วย {END_MARK}"
    return p


def _elder_prompt(ctx: AnalysisContext, brief: ScenarioBrief | None) -> str:
    p = (
        "นี่คือการสาธิตระบบด้วยข้อมูลสมมติ คุณแสดงเป็นผู้สูงอายุสมมติที่รับสายจากผู้ช่วย AI ชื่อน้องหลาน "
        f"ชื่อ {ctx.name} อายุ {ctx.age} ปี อยู่คนเดียว "
        "พูดภาษาพูดแบบผู้สูงอายุไทย อบอุ่น ตอบสั้น หนึ่งถึงสองประโยค "
        "ตอบเฉพาะคำพูดของตัวเอง ไม่ต้องใส่ชื่อผู้พูด วงเล็บ หรือคำบรรยายท่าทาง "
        "ห้ามใส่ชื่อจริง ที่อยู่ เบอร์โทร หรือข้อมูลส่วนตัวของคนจริง\n"
    )
    if brief and brief.elder_lines:
        lines = "\n".join(f"- {line}" for line in brief.elder_lines)
        p += (
            f"สถานการณ์ของสายนี้: {brief.title}\n"
            "เรื่องที่ต้องพูดในสายนี้ ตามลำดับ (พูดด้วยคำของตัวเองได้ แต่ต้องคงอาการ คำสำคัญ "
            "และสำเนียงไว้):\n"
            f"{lines}\n"
            "พูดทีละเรื่องตามที่หลานถาม เมื่อพูดครบแล้วและหลานลา ให้ลากลับสั้น ๆ"
        )
    else:
        p += "วันนี้สบายดี กินยาตามตารางแล้ว เล่าเรื่องในบ้านหรือสวนสั้น ๆ เมื่อหลานลา ให้ลากลับสั้น ๆ"
    return p


# ------------------------------------------------------------------ helpers


def _messages(history: Sequence[TranscriptTurn], me: Role) -> list[dict[str, Any]]:
    """History as Converse messages from `me`'s point of view (me = assistant).
    Merges same-role runs; starts and ends with a user message as Converse requires."""
    msgs: list[dict[str, Any]] = []
    for t in history:
        if t.speaker not in ("ai", "elder") or not t.text.strip():
            continue
        role = "assistant" if t.speaker == me else "user"
        if msgs and msgs[-1]["role"] == role:
            msgs[-1]["content"][0]["text"] += "\n" + t.text
        else:
            msgs.append({"role": role, "content": [{"text": t.text}]})
    if not msgs or msgs[0]["role"] != "user":
        msgs.insert(0, {"role": "user", "content": [{"text": "[ระบบ] สายต่อติดแล้ว เริ่มพูดได้เลย"}]})
    if msgs[-1]["role"] != "user":
        msgs.append({"role": "user", "content": [{"text": "[ระบบ] พูดต่อ"}]})
    return msgs


_PREFIX = re.compile(r"^\s*(น้องหลาน|หลาน|AI|ผู้สูงอายุ|ยาย|ตา)\s*[:：]\s*", re.IGNORECASE)


def _clean(text: str) -> tuple[str, bool]:
    end = END_MARK in text
    text = text.replace(END_MARK, "").strip().strip('"“”')
    text = _PREFIX.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_TEXT], end


def _converse(
    client: ConverseClient,
    model_id: str,
    system: str,
    messages: list[dict[str, Any]],
    guardrail: tuple[str, str] | None,
) -> str | None:
    req: dict[str, Any] = {
        "modelId": model_id,
        "system": [{"text": system}],
        "messages": messages,
        # anthropic.claude-sonnet-5 rejects `temperature` (see bedrock_client.build_request).
        "inferenceConfig": {"maxTokens": 400},
    }
    if guardrail:
        req["guardrailConfig"] = {
            "guardrailIdentifier": guardrail[0],
            "guardrailVersion": guardrail[1],
        }
    resp = client.converse(**req)
    if resp.get("stopReason") == "guardrail_intervened":
        return None
    for block in resp.get("output", {}).get("message", {}).get("content", []):
        if isinstance(block.get("text"), str) and block["text"].strip():
            return str(block["text"])
    return None


# ------------------------------------------------------------------ scripted fallback


def _script_ai(
    ctx: AnalysisContext, history: Sequence[TranscriptTurn], urgent: str | None
) -> LiveTurn:
    said = [t.text for t in history if t.speaker == "ai"]
    if urgent and not any("1669" in s for s in said):
        text = "อาการแบบนี้ แนะนำให้โทร 1669 ทันทีนะคะ หนูจะแจ้งลูกหลานและ อสม. ให้ทราบค่ะ"
        return LiveTurn("ai", text, False, "script", urgent)
    if not said:
        text = (
            f"สวัสดีค่ะ {ctx.name} หนูชื่อน้องหลาน เป็นผู้ช่วย AI ที่ลูกหลานสมัครไว้ให้โทรมาถามไถ่ทุกวันค่ะ "
            "วันนี้เป็นยังไงบ้างคะ"
        )
        return LiveTurn("ai", text, False, "script")
    if len(said) == 1 and ctx.medications and not urgent:
        return LiveTurn("ai", f"วันนี้กิน{ctx.medications[0]}แล้วหรือยังคะ", False, "script")
    text = "ขอบคุณที่เล่าให้หนูฟังนะคะ พรุ่งนี้เวลาเดิมหนูโทรมาใหม่นะคะ"
    return LiveTurn("ai", text, True, "script")


def _script_elder(history: Sequence[TranscriptTurn], brief: ScenarioBrief | None) -> LiveTurn:
    n = sum(1 for t in history if t.speaker == "elder")
    lines = brief.elder_lines if brief and brief.elder_lines else ["สบายดีจ้ะหลาน", "กินแล้วจ้ะ"]
    text = lines[n] if n < len(lines) else "จ้ะ ขอบใจเด้อหลาน"
    return LiveTurn("elder", text, False, "script")


# ------------------------------------------------------------------ entry point


@dataclass
class LiveCallSettings:
    model_id: str
    guardrail_id: str = ""
    guardrail_version: str = ""


def next_turn(
    client: ConverseClient | None,
    s: LiveCallSettings | None,
    role: Role,
    ctx: AnalysisContext,
    history: Sequence[TranscriptTurn],
    brief: ScenarioBrief | None,
) -> LiveTurn:
    last_elder = next((t for t in reversed(history) if t.speaker == "elder"), None)
    # Urgent instruction only for the reply right after the elder said it.
    fresh = check_transcript([last_elder]) if last_elder and history[-1] is last_elder else None
    urgent = fresh.urgent_term if fresh and fresh.risk == "red" else None

    if client is None or s is None or not s.model_id:
        return _script_ai(ctx, history, urgent) if role == "ai" else _script_elder(history, brief)

    try:
        if role == "ai":
            guard = (s.guardrail_id, s.guardrail_version) if s.guardrail_id else None
            system = _grandchild_prompt(ctx, len(history), urgent, bool(fresh and fresh.self_harm))
            raw = _converse(client, s.model_id, system, _messages(history, "ai"), guard)
        else:
            raw = _converse(
                client, s.model_id, _elder_prompt(ctx, brief), _messages(history, "elder"), None
            )
    except Exception as e:  # any Bedrock failure falls back to the script
        log.warning("live_call_bedrock_failed role=%s error=%s", role, type(e).__name__)
        raw = None

    if raw is None:
        return _script_ai(ctx, history, urgent) if role == "ai" else _script_elder(history, brief)
    text, end = _clean(raw)
    if not text:
        return _script_ai(ctx, history, urgent) if role == "ai" else _script_elder(history, brief)
    if role == "ai" and urgent and "1669" not in text:
        # The rule wins over the model: always say 1669 after an urgent word.
        text = f"{text} อาการแบบนี้ แนะนำให้โทร 1669 ทันทีนะคะ"
    return LiveTurn(role, text, end and role == "ai", "bedrock", urgent)
