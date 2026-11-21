"""transcript -> CallAnalysis: Bedrock + deterministic rules + post-validation + fallback
(CLAUDE.md §5A.3–§5A.5)."""

import logging
import re
import time
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Protocol

from pydantic import BaseModel, Field, ValidationError

from app.ai.bedrock_client import (
    BadModelOutput,
    BedrockSettings,
    ConverseClient,
    GuardrailBlocked,
    invoke_tool,
)
from app.ai.prompts import PROMPT_VERSION
from app.domain.models import (
    CallAnalysis,
    Mood,
    RiskLevel,
    TranscriptTurn,
    TwoQ,
    max_risk,
)
from app.domain.red_flags import RuleResult, check_transcript
from app.metrics import count

log = logging.getLogger("larntorha.ai")

FAMILY_BANNED = ("2q", "9q", "ซึมเศร้า", "คะแนน")
# Common drug names that must not appear in the family summary unless on the elder's schedule.
COMMON_DRUGS = (
    "พารา",
    "พาราเซตามอล",
    "แอสไพริน",
    "ไอบูโพรเฟน",
    "ยาแก้ปวด",
    "ยานอนหลับ",
    "ยาแก้อักเสบ",
    "ยาปฏิชีวนะ",
    "ยาฆ่าเชื้อ",
    "อินซูลิน",
    "เมตฟอร์มิน",
    "ยาลดความดัน",
)


@dataclass
class AnalysisContext:
    name: str
    age: int
    medications: list[str]
    recent_topics: list[str]
    consent_2q: bool


@dataclass
class AnalysisOutcome:
    analysis: CallAnalysis
    warnings: list[str] = field(default_factory=list)


class Analyzer(Protocol):
    def analyze(self, turns: Sequence[TranscriptTurn], ctx: AnalysisContext) -> AnalysisOutcome: ...


class AiOutput(BaseModel):
    """What the model must return (validated with Pydantic, CLAUDE.md §5A.3)."""

    summary_family: str = Field(min_length=1, max_length=300)
    summary_osm: str = Field(min_length=1, max_length=500)
    topics: list[str] = Field(max_length=5)
    med_taken: bool | None
    risk_level: RiskLevel
    risk_reasons: list[str] = Field(max_length=3)
    evidence: list[str] = Field(max_length=3)
    urgent_reason: str | None
    two_q: TwoQ
    mood: Mood
    transcript_quality: str
    self_harm: bool = False


# ---------------------------------------------------------------- helpers shared with fake.py


def _squash(text: str) -> str:
    return re.sub(r"\s+", "", text)


def render_user_text(turns: Sequence[TranscriptTurn], ctx: AnalysisContext) -> str:
    """Only nickname, age, medicine names, recent topics and 2Q consent (no phone/ids/family)."""
    labels = {"ai": "AI", "elder": "ผู้สูงอายุ", "other": "คนอื่น"}
    lines = [f"{labels[t.speaker]}: {t.text}" for t in turns]
    meds = ", ".join(ctx.medications) or "ไม่มี"
    topics = ", ".join(ctx.recent_topics) or "ไม่มี"
    consent = "ยินยอม" if ctx.consent_2q else "ไม่ยินยอม (ต้องตอบ two_q = not_asked)"
    return (
        "บริบทของผู้สูงอายุ:\n"
        f"- ชื่อเรียก: {ctx.name}\n- อายุ: {ctx.age} ปี\n"
        f"- ยาตามตาราง: {meds}\n- เรื่องที่คุยใน 3 สายล่าสุด: {topics}\n"
        f"- การคัดกรอง 2Q: {consent}\n\n"
        "<transcript>\n" + "\n".join(lines) + "\n</transcript>\n\n"
        "บันทึกผลด้วยเครื่องมือ record_call_analysis"
    )


def transcript_is_poor(turns: Sequence[TranscriptTurn]) -> bool:
    scores = [
        t.asr_confidence for t in turns if t.speaker == "elder" and t.asr_confidence is not None
    ]
    return bool(scores) and sum(scores) / len(scores) < 0.5


def family_template(ctx: AnalysisContext, risk: RiskLevel) -> str:
    if risk == "green":
        return f"วันนี้ได้คุยกับ{ctx.name}แล้ว ไม่พบสัญญาณผิดปกติในสายนี้"
    return f"วันนี้ได้คุยกับ{ctx.name}แล้ว มีบางเรื่องที่ควรติดตาม อสม. ในพื้นที่จะช่วยดู"


def family_text_is_safe(text: str, ctx: AnalysisContext) -> bool:
    low = text.lower()
    if any(b in low for b in FAMILY_BANNED):
        return False
    scheduled = " ".join(ctx.medications)
    return not any(d in text and d not in scheduled for d in COMMON_DRUGS)


def keep_real_evidence(evidence: Sequence[str], turns: Sequence[TranscriptTurn]) -> list[str]:
    whole = _squash("".join(t.text for t in turns))
    return [e[:80] for e in evidence if e.strip() and _squash(e) in whole][:3]


def fallback(
    ctx: AnalysisContext,
    rules: RuleResult,
    poor: bool,
    reason: str,
    latency_ms: int,
    model: str | None,
) -> CallAnalysis:
    log.warning("bedrock_fallback reason=%s", reason)
    count("bedrock_fallback", reason=reason)  # CloudWatch metric + alarm (§5A.5)
    flags = ", ".join(f for f in rules.flags if not f.startswith("negated:"))
    risk = max_risk(rules.risk, "yellow")
    reasons = [rules.urgent_term] if rules.urgent_term else []
    reasons.append("สรุปอัตโนมัติไม่สำเร็จ — ต้องให้คนตรวจสอบ")
    return CallAnalysis(
        summary_family=f"วันนี้คุยกับ{ctx.name}แล้ว ระบบสรุปอัตโนมัติไม่สำเร็จ อสม. จะช่วยตรวจสอบ",
        summary_osm="สรุปอัตโนมัติล้มเหลว — โปรดโทรตรวจสอบ" + (f" (กฎพบ: {flags})" if flags else ""),
        topics=[],
        med_taken=None,
        risk_level=risk,
        risk_reasons=reasons[:3],
        evidence=[],
        urgent_reason=rules.urgent_term if risk == "red" else None,
        two_q="not_asked",
        mood="unclear",
        transcript_quality="poor" if poor else "good",
        ai_status="fallback",
        rule_flags=rules.flags,
        self_harm=rules.self_harm,
        model_id=model,
        prompt_version=PROMPT_VERSION,
        latency_ms=latency_ms,
    )


def merge(
    out: AiOutput,
    turns: Sequence[TranscriptTurn],
    ctx: AnalysisContext,
    rules: RuleResult,
    poor: bool,
    model_id: str | None,
    latency_ms: int,
) -> AnalysisOutcome:
    """Post-validation + rule merge. Rules may raise the level, never lower it."""
    warnings: list[str] = []
    poor = poor or out.transcript_quality == "poor"
    risk = max_risk(out.risk_level, rules.risk, "yellow" if poor else "green")

    reasons = [r for r in out.risk_reasons if r.strip()]
    if rules.urgent_term and rules.risk == "red" and out.risk_level != "red":
        reasons.insert(0, rules.urgent_term)
    if poor and "ฟังไม่ชัด" not in reasons:
        reasons.append("ฟังไม่ชัด")

    urgent = out.urgent_reason if risk == "red" else None
    if risk == "red" and not urgent:
        urgent = rules.urgent_term or (reasons[0] if reasons else None)

    two_q = out.two_q
    if not ctx.consent_2q and two_q != "not_asked":
        two_q = "not_asked"
        warnings.append("ignored_2q_without_consent")

    family = out.summary_family
    if not family_text_is_safe(family, ctx):
        family = family_template(ctx, risk)
        warnings.append("family_summary_replaced")

    analysis = CallAnalysis(
        summary_family=family,
        summary_osm=out.summary_osm,
        topics=[t[:30] for t in out.topics][:5],
        med_taken=out.med_taken,
        risk_level=risk,
        risk_reasons=reasons[:3],
        evidence=keep_real_evidence(out.evidence, turns),
        urgent_reason=urgent,
        two_q=two_q,
        mood=out.mood,
        transcript_quality="poor" if poor else "good",
        ai_status="ok",
        rule_flags=rules.flags,
        self_harm=out.self_harm or rules.self_harm,
        model_id=model_id,
        prompt_version=PROMPT_VERSION,
        latency_ms=latency_ms,
    )
    return AnalysisOutcome(analysis, warnings)


# ---------------------------------------------------------------- Bedrock analyzer


class BedrockAnalyzer:
    def __init__(self, client: ConverseClient, settings: BedrockSettings) -> None:
        self.client = client
        self.settings = settings

    def analyze(self, turns: Sequence[TranscriptTurn], ctx: AnalysisContext) -> AnalysisOutcome:
        rules = check_transcript(turns)
        poor = transcript_is_poor(turns)
        user_text = render_user_text(turns, ctx)
        model = self.settings.model_id
        t0 = time.monotonic()

        def ms() -> int:
            return int((time.monotonic() - t0) * 1000)

        out: AiOutput | None = None
        for attempt in range(2):  # schema failure → retry once (§5A.3)
            try:
                raw = invoke_tool(self.client, self.settings, user_text)
                out = AiOutput.model_validate(raw)
                break
            except GuardrailBlocked:
                return AnalysisOutcome(
                    fallback(ctx, rules, poor, "guardrail", ms(), model), ["guardrail_intervened"]
                )
            except (ValidationError, BadModelOutput) as e:
                log.warning("bedrock schema invalid attempt=%d: %s", attempt + 1, type(e).__name__)
            except Exception as e:  # timeout, throttling after retries, auth, network
                log.warning("bedrock call failed: %s", type(e).__name__)
                return AnalysisOutcome(
                    fallback(ctx, rules, poor, type(e).__name__, ms(), model), ["bedrock_error"]
                )
        if out is None:
            return AnalysisOutcome(
                fallback(ctx, rules, poor, "schema", ms(), model), ["bedrock_schema_invalid"]
            )
        return merge(out, turns, ctx, rules, poor, model, ms())
