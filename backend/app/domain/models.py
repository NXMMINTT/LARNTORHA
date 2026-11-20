"""Domain models (CLAUDE.md §4). JSON uses snake_case; times are UTC-aware datetimes."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Plan = Literal["light", "standard", "premium"]
CallOutcome = Literal["answered", "no_answer", "unclear"]
RiskLevel = Literal["red", "yellow", "green"]
ElderStatus = Literal["red", "yellow", "unreachable", "green", "pending"]
TwoQ = Literal["positive", "negative", "not_asked"]
Mood = Literal["good", "neutral", "low", "unclear"]
CardKind = Literal["green", "unreachable", "followup", "red", "osm_request"]

RISK_RANK: dict[RiskLevel, int] = {"green": 0, "yellow": 1, "red": 2}


def max_risk(*levels: RiskLevel) -> RiskLevel:
    return max(levels, key=lambda lv: RISK_RANK[lv])


class Osm(BaseModel):
    id: str
    name: str
    phone: str
    tambon: str
    password_hash: str
    referral_code: str
    line_user_id: str | None = None
    line_link_code: str | None = None
    created_at: datetime


class Consents(BaseModel):
    record_conversation: bool
    family_summary: bool
    osm_share: bool
    screening_2q: bool
    given_at: datetime
    voice_confirmed_at: datetime | None = None


class Medication(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    times: list[str] = Field(min_length=1, max_length=4)


class Elder(BaseModel):
    id: str
    name: str
    age: int
    phone: str
    osm_id: str
    call_time: str
    plan: Plan
    medications: list[Medication] = Field(default_factory=list)
    consents: Consents
    created_at: datetime


class Guardian(BaseModel):
    id: str
    elder_id: str
    name: str
    phone: str
    relation: str
    line_user_id: str | None = None
    line_link_code: str | None = None
    line_link_code_expires_at: datetime | None = None
    created_at: datetime


class TranscriptTurn(BaseModel):
    speaker: Literal["ai", "elder", "other"]
    text: str = Field(max_length=1000)
    asr_confidence: float | None = Field(default=None, ge=0, le=1)


class CallAnalysis(BaseModel):
    summary_family: str = Field(max_length=300)
    summary_osm: str = Field(max_length=500)
    topics: list[str] = Field(default_factory=list, max_length=5)
    med_taken: bool | None = None
    risk_level: RiskLevel
    risk_reasons: list[str] = Field(default_factory=list, max_length=3)
    evidence: list[str] = Field(default_factory=list, max_length=3)
    urgent_reason: str | None = None
    two_q: TwoQ = "not_asked"
    mood: Mood = "unclear"
    transcript_quality: Literal["good", "poor"] = "good"
    ai_status: Literal["ok", "fallback"] = "ok"
    rule_flags: list[str] = Field(default_factory=list)
    self_harm: bool = False  # card uses the 1323 variant without transcript wording (§8)
    model_id: str | None = None
    prompt_version: str = ""
    latency_ms: int = 0


class CallResult(BaseModel):
    id: str
    elder_id: str
    started_at: datetime
    duration_sec: int = Field(ge=0, le=3600)
    outcome: CallOutcome
    analysis: CallAnalysis | None = None
    summary: str | None = None
    med_taken: bool | None = None
    urgent_reason: str | None = None
    two_q_positive: bool | None = None
    received_at: datetime
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    resolve_note: str | None = None
    family_requested_osm_at: datetime | None = None
    osm_request_notified_at: datetime | None = None  # notify_osm push sent once


class NineQTask(BaseModel):
    id: str
    elder_id: str
    osm_id: str
    screened_at: datetime
    due_at: datetime
    status: Literal["open", "done"] = "open"
    done_at: datetime | None = None
    note: str | None = None


class NotificationLog(BaseModel):
    id: str
    elder_id: str
    call_id: str | None
    to: Literal["guardian", "osm"]
    kind: CardKind
    ok: bool
    error: str | None = None
    at: datetime
