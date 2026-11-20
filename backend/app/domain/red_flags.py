"""Deterministic safety rules (CLAUDE.md §5A.4). Works on its own (team option A) or as a
safety net under Bedrock (option B). Only turns spoken by the elder are checked."""

import re
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.domain.models import RiskLevel, TranscriptTurn

# Canonical label -> phrases (Central Thai + Isan + common ASR spellings).
RED_TERMS: dict[str, list[str]] = {
    "เจ็บหน้าอก": [
        "เจ็บหน้าอก",
        "แน่นหน้าอก",
        "เจ็บอก",
        "แน่นอก",
        "จุกหน้าอก",
        "เจ็บเอิก",
        "แน่นเอิก",
        "เจ็บหน้าเอิก",
        "แน่นหน้าเอิก",
        "เจ็บหน้าอ็อก",
    ],
    "หายใจไม่ออก": [
        "หายใจไม่ออก",
        "หายใจบ่ออก",
        "หายใจไม่ทัน",
        "หายใจบ่ทัน",
        "หายใจลำบาก",
        "หายใจไม่อิ่ม",
        "หอบเหนื่อยมาก",
    ],
    "ล้มศีรษะกระแทก/ลุกไม่ได้": [
        "หัวฟาด",
        "หัวกระแทก",
        "ศีรษะกระแทก",
        "หัวแตก",
        "ลุกไม่ได้",
        "ลุกไม่ขึ้น",
        "ลุกบ่ได้",
        "ลุกบ่ขึ้น",
    ],
    "หมดสติ/พูดไม่ชัด": [
        "หมดสติ",
        "เป็นลม",
        "สลบ",
        "พูดไม่ชัด",
        "พูดบ่ชัด",
        "ปากเบี้ยว",
        "ลิ้นแข็ง",
        "พูดไม่ออก",
    ],
    "แขนขาอ่อนแรง": [
        "แขนขาอ่อนแรง",
        "แขนอ่อนแรง",
        "ขาอ่อนแรง",
        "อ่อนแรงซีกเดียว",
        "ชาครึ่งซีก",
        "ยกแขนไม่ขึ้น",
        "ยกแขนบ่ขึ้น",
        "แขนขาบ่มีแรง",
    ],
    "เลือดออกมาก": [
        "เลือดออกมาก",
        "เลือดไหลไม่หยุด",
        "เลือดออกบ่หยุด",
        "อาเจียนเป็นเลือด",
        "ถ่ายเป็นเลือด",
    ],
    "ปวดหัวรุนแรง/เวียนหัวมาก": ["ปวดหัวรุนแรง", "ปวดหัวมาก", "เวียนหัวมาก", "เวียนหัวหลาย"],
    "ขอความช่วยเหลือ": ["ช่วยด้วย", "ช่วยแหน่", "ช่วยข้อยแหน่"],
}
SELF_HARM_LABEL = "พูดถึงการทำร้ายตัวเอง"
RED_TERMS[SELF_HARM_LABEL] = [
    "อยากตาย",
    "ฆ่าตัวตาย",
    "ไม่อยากมีชีวิต",
    "ไม่อยากอยู่แล้ว",
    "ไม่อยากอยู่ต่อ",
    "บ่อยากอยู่แล้ว",
    "บ่อยากมีชีวิต",
    "ทำร้ายตัวเอง",
    "จบชีวิต",
    "ผูกคอ",
    "กินยาตาย",
]

YELLOW_TERMS: dict[str, list[str]] = {
    "ล้ม": ["หกล้ม", "ล้ม"],
    "ยังไม่ได้กินยา": ["ลืมกินยา", "ยังไม่ได้กินยา", "ยังบ่ได้กินยา", "บ่ได้กินยา", "ลืมยา"],
    "มีคนขอเงิน/OTP": ["otp", "โอทีพี", "รหัสโอทีพี", "เลขบัญชี", "โอนเงิน"],
}

NEGATIONS = ("ไม่", "ไม่ได้", "ไม่มี", "ไม่เคย", "บ่", "บ่ได้", "บ่มี", "บ่เคย")

_DROP = re.compile(r"[\s​‌‍ๆ็์]")  # spaces, zero-width, ๆ, ็, ์


def _normalize_with_map(text: str) -> tuple[str, str, list[int]]:
    """Return (compact, normalized, map normalized index -> compact index)."""
    compact = re.sub(r"[\s​‌‍]", "", text).lower()
    norm_chars: list[str] = []
    idx: list[int] = []
    for i, ch in enumerate(compact):
        if _DROP.match(ch):
            continue
        norm_chars.append(ch)
        idx.append(i)
    return compact, "".join(norm_chars), idx


def normalize(text: str) -> str:
    return _normalize_with_map(text)[1]


@dataclass
class RuleResult:
    risk: RiskLevel = "green"
    flags: list[str] = field(default_factory=list)
    urgent_term: str | None = None
    self_harm: bool = False


@dataclass
class _Hit:
    start: int
    end: int
    label: str
    level: RiskLevel
    negated: bool


def _hits(text: str) -> list[_Hit]:
    compact, norm, idx = _normalize_with_map(text)
    found: list[_Hit] = []
    for level, table in (("red", RED_TERMS), ("yellow", YELLOW_TERMS)):
        for label, phrases in table.items():
            for phrase in phrases:
                p = normalize(phrase)
                for m in re.finditer(re.escape(p), norm):
                    prefix = compact[: idx[m.start()]]
                    negated = prefix.endswith(NEGATIONS) and not phrase.startswith(("ไม่", "บ่"))
                    found.append(_Hit(m.start(), m.end(), label, level, negated))  # type: ignore[arg-type]
    # Keep the longest match where spans overlap (e.g. "หกล้ม" over "ล้ม").
    found.sort(key=lambda h: (-(h.end - h.start), h.start))
    kept: list[_Hit] = []
    for h in found:
        if all(h.end <= k.start or h.start >= k.end for k in kept):
            kept.append(h)
    return sorted(kept, key=lambda h: h.start)


def check_transcript(turns: Sequence[TranscriptTurn]) -> RuleResult:
    result = RuleResult()
    for turn in turns:
        if turn.speaker != "elder":
            continue
        for h in _hits(turn.text):
            flag = f"negated:{h.label}" if h.negated else h.label
            if flag not in result.flags:
                result.flags.append(flag)
            if h.negated:
                continue
            if h.level == "red":
                result.risk = "red"
                if result.urgent_term is None:
                    result.urgent_term = h.label
                if h.label == SELF_HARM_LABEL:
                    result.self_harm = True
            elif result.risk == "green":
                result.risk = "yellow"
    return result
