"""Family registration (CLAUDE.md §6.3, §7.1). The backend re-validates everything."""

import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.domain.models import Consents, Elder, Guardian, Medication, Plan
from app.repo.base import Repo

RELATIONS = ("ลูกสาว", "ลูกชาย", "หลาน", "ญาติ", "อื่นๆ")
CALL_TIMES = {f"{h:02d}:{m:02d}" for h in range(7, 19) for m in (0, 30) if (h, m) <= (18, 0)}


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("66") and len(digits) == 11:
        digits = "0" + digits[2:]
    if not re.fullmatch(r"0\d{9}", digits):
        raise ValueError("เบอร์โทรต้องเป็นตัวเลข 10 หลัก")
    return digits


def normalize_time(raw: str) -> str:
    m = re.fullmatch(r"\s*(\d{1,2})[.:](\d{2})\s*", raw)
    if not m or int(m[1]) > 23 or int(m[2]) > 59:
        raise ValueError("เวลาต้องอยู่ในรูปแบบ HH:MM")
    return f"{int(m[1]):02d}:{m[2]}"


class GuardianIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str
    relation: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("relation")
    @classmethod
    def _rel(cls, v: str) -> str:
        if v not in RELATIONS:
            raise ValueError("กรุณาเลือกความสัมพันธ์")
        return v


class ElderIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    age: int = Field(ge=60, le=120)
    phone: str
    call_time: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("call_time")
    @classmethod
    def _time(cls, v: str) -> str:
        if v not in CALL_TIMES:
            raise ValueError("เวลาโทรต้องอยู่ระหว่าง 07:00–18:00 ทุก 30 นาที")
        return v


class MedicationIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    times: list[str] = Field(min_length=1, max_length=4)

    @field_validator("times")
    @classmethod
    def _times(cls, v: list[str]) -> list[str]:
        return [normalize_time(t) for t in v]


class ConsentsIn(BaseModel):
    record_conversation: Literal[True]
    family_summary: Literal[True]
    osm_share: bool
    screening_2q: bool


class RegisterIn(BaseModel):
    guardian: GuardianIn
    elder: ElderIn
    referral_code: str
    medications: list[MedicationIn] = Field(default_factory=list, max_length=8)
    plan: Plan = "standard"
    consents: ConsentsIn
    osm_explained: Literal[True]
    website: str | None = None  # honeypot

    @field_validator("referral_code")
    @classmethod
    def _ref(cls, v: str) -> str:
        return v.strip().upper()


class RegistrationError(Exception):
    def __init__(self, status: int, code: str) -> None:
        self.status, self.code = status, code


def _new_link_code(repo: Repo) -> str:
    for _ in range(20):
        code = f"LTH-{secrets.randbelow(1_000_000):06d}"
        if repo.get_guardian_by_link_code(code) is None and repo.get_osm_by_link_code(code) is None:
            return code
    raise RuntimeError("could not allocate link code")


def register(repo: Repo, req: RegisterIn, now: datetime | None = None) -> dict[str, str]:
    if req.website:
        raise RegistrationError(422, "rejected")
    now = now or datetime.now(UTC)
    osm = repo.get_osm_by_referral(req.referral_code)
    if osm is None:
        raise RegistrationError(404, "referral_not_found")
    elder = Elder(
        id=f"eld_{secrets.token_hex(10)}",
        name=req.elder.name.strip(),
        age=req.elder.age,
        phone=req.elder.phone,
        osm_id=osm.id,
        call_time=req.elder.call_time,
        plan=req.plan,
        medications=[Medication(name=m.name.strip(), times=m.times) for m in req.medications],
        consents=Consents(
            record_conversation=True,
            family_summary=True,
            osm_share=req.consents.osm_share,
            screening_2q=req.consents.screening_2q,
            given_at=now,
        ),
        created_at=now,
    )
    expires = now + timedelta(days=7)
    guardian = Guardian(
        id=f"gdn_{secrets.token_hex(10)}",
        elder_id=elder.id,
        name=req.guardian.name.strip(),
        phone=req.guardian.phone,
        relation=req.guardian.relation,
        line_link_code=_new_link_code(repo),
        line_link_code_expires_at=expires,
        created_at=now,
    )
    repo.create_registration(elder, guardian)
    return {
        "elder_name": elder.name,
        "link_code": guardian.line_link_code or "",
        "expires_at": expires.isoformat(),
    }
