"""/v1/demo/* (CLAUDE.md §6.5). Mounted only when DEMO_MODE=true (never in production)."""

import json
import secrets
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.ai.live_call import LiveCallSettings, ScenarioBrief, next_turn
from app.domain.models import TranscriptTurn
from app.repo.memory import MemoryRepo
from app.repo.osm_accounts import load_into
from app.repo.seed import link_demo_line, seed
from app.routers.common import DepsDep, require_internal
from app.services.calls import CallError, CallIn, process_call
from app.services.calls import _context as call_context

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "transcripts"
router = APIRouter(prefix="/v1/demo", dependencies=[Depends(require_internal)])


@lru_cache
def scenarios() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for p in sorted(FIXTURES.glob("*.json")):
        data = json.loads(p.read_text(encoding="utf-8"))
        out[data["id"]] = data
    return out


class DemoCallIn(BaseModel):
    elder_id: str
    scenario_id: str | None = None
    transcript: list[TranscriptTurn] | None = Field(default=None, min_length=1, max_length=200)

    @model_validator(mode="after")
    def _one(self) -> "DemoCallIn":
        if (self.scenario_id is None) == (self.transcript is None):
            raise ValueError("give exactly one of scenario_id or transcript")
        return self


@router.get("/scenarios")
def list_scenarios() -> list[dict[str, Any]]:
    # transcript lets /demo play a scenario back turn by turn before "hanging up" (seed data only).
    return [
        {
            "id": s["id"],
            "title": s["title"],
            "expected_risk": s["expected_risk"],
            "transcript": [{"speaker": t["speaker"], "text": t["text"]} for t in s["transcript"]],
        }
        for s in scenarios().values()
    ]


@router.post("/calls")
def demo_call(body: DemoCallIn, deps: DepsDep) -> dict[str, Any]:
    if body.scenario_id is not None:
        sc = scenarios().get(body.scenario_id)
        if sc is None:
            raise HTTPException(404, "scenario_not_found")
        turns = [TranscriptTurn(**t) for t in sc["transcript"]]
    else:
        turns = body.transcript or []
    now = datetime.now(UTC)
    req = CallIn(
        call_id=f"demo_{secrets.token_hex(8)}",
        elder_id=body.elder_id,
        started_at=now,
        duration_sec=min(3600, 30 * len(turns)),
        outcome="answered",
        transcript=turns,
    )
    try:
        result = process_call(deps, req, now)
    except CallError as e:
        raise HTTPException(e.status, e.code) from e
    analysis = result.pop("_analysis")
    cards = result.pop("_cards")
    return {
        **result,
        "call_id": req.call_id,
        "transcript": [t.model_dump() for t in turns],
        "analysis": analysis.model_dump(mode="json") if analysis else None,
        "cards": cards,
    }


class LiveTurnIn(BaseModel):
    elder_id: str = Field(min_length=1, max_length=64)
    role: Literal["ai", "elder"]
    scenario_id: str | None = Field(default=None, max_length=64)
    history: list[TranscriptTurn] = Field(default_factory=list, max_length=60)


@router.post("/live/turn")
def live_turn(body: LiveTurnIn, deps: DepsDep) -> dict[str, Any]:
    """Next line of the /demo live call: น้องหลาน (role=ai) or the simulated elder (role=elder)."""
    elder = deps.repo.get_elder(body.elder_id)
    if elder is None:
        raise HTTPException(404, "elder_not_found")
    brief = None
    if body.scenario_id is not None:
        sc = scenarios().get(body.scenario_id)
        if sc is None:
            raise HTTPException(404, "scenario_not_found")
        brief = ScenarioBrief(
            title=sc["title"],
            elder_lines=[t["text"] for t in sc["transcript"] if t["speaker"] == "elder"],
        )
    s = deps.settings
    live_settings = (
        LiveCallSettings(s.bedrock_model_id, s.bedrock_guardrail_id, s.bedrock_guardrail_version)
        if deps.live_client is not None
        else None
    )
    turn = next_turn(
        deps.live_client, live_settings, body.role, call_context(deps, elder), body.history, brief
    )
    return turn.as_dict()


@router.post("/reset")
def reset(deps: DepsDep) -> dict[str, bool]:
    if not isinstance(deps.repo, MemoryRepo):
        raise HTTPException(409, "reset_only_for_memory_repo")
    deps.repo.clear()
    seed(deps.repo)
    link_demo_line(deps.repo, deps.settings.line_to_user_ids)
    load_into(deps.repo, Path(deps.settings.osm_accounts_file))
    deps.login_limiter.reset()
    deps.register_limiter.reset()
    return {"ok": True}
