"""/v1/osm/* (CLAUDE.md §6.4). All routes need the internal token; all but login need a session."""

import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.auth import DUMMY_HASH, issue_session, verify_password
from app.routers.common import DepsDep, OsmDep, client_ip, require_internal
from app.services import dashboard as dash

router = APIRouter(prefix="/v1/osm", dependencies=[Depends(require_internal)])


class LoginIn(BaseModel):
    phone: str = Field(max_length=20)
    password: str = Field(max_length=200)


class NoteIn(BaseModel):
    note: str | None = Field(default=None, max_length=300)


@router.post("/login")
def login(body: LoginIn, request: Request, deps: DepsDep) -> dict[str, str]:
    if not deps.login_limiter.allow(f"{client_ip(request)}|{body.phone}"):
        raise HTTPException(429, "rate_limited")
    osm = deps.repo.get_osm_by_phone(body.phone)
    ok = verify_password(body.password, osm.password_hash if osm else DUMMY_HASH)
    if osm is None or not ok:
        raise HTTPException(401, "invalid_credentials")
    token, exp = issue_session(osm.id, deps.settings.session_secret)
    return {"session": token, "expires_at": exp.isoformat()}


@router.get("/me")
def me(osm: OsmDep) -> dict[str, Any]:
    return dash.me(osm)


@router.get("/dashboard")
def dashboard(osm: OsmDep, deps: DepsDep) -> dict[str, Any]:
    return dash.dashboard(deps.repo, osm.id)


@router.get("/daily-digest")
def daily_digest(
    osm: OsmDep,
    deps: DepsDep,
    date: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    return dash.daily_digest(deps.repo, osm.id, date)


@router.get("/elders/{elder_id}/daily")
def elder_daily(
    elder_id: str, osm: OsmDep, deps: DepsDep, days: int = Query(default=14, ge=1, le=60)
) -> dict[str, Any]:
    elder = dash.owned_elder(deps.repo, osm.id, elder_id)
    if elder is None:
        raise HTTPException(404, "not_found")
    return dash.elder_daily(deps.repo, elder, days)


@router.post("/calls/{elder_id}/{call_id}/resolve")
def resolve(
    elder_id: str, call_id: str, body: NoteIn, osm: OsmDep, deps: DepsDep
) -> dict[str, bool]:
    if dash.owned_elder(deps.repo, osm.id, elder_id) is None:
        raise HTTPException(404, "not_found")
    call = deps.repo.get_call(elder_id, call_id)
    if call is None:
        raise HTTPException(404, "not_found")
    if call.resolved_at is None:
        call.resolved_at = datetime.now(UTC)
        call.resolved_by = osm.id
        call.resolve_note = body.note
        deps.repo.put_call(call)
    return {"ok": True}


@router.post("/tasks/{elder_id}/{task_id}/complete")
def complete_task(
    elder_id: str, task_id: str, body: NoteIn, osm: OsmDep, deps: DepsDep
) -> dict[str, bool]:
    if dash.owned_elder(deps.repo, osm.id, elder_id) is None:
        raise HTTPException(404, "not_found")
    task = deps.repo.get_task(elder_id, task_id)
    if task is None or task.osm_id != osm.id:
        raise HTTPException(404, "not_found")
    if task.status == "open":
        task.status = "done"
        task.done_at = datetime.now(UTC)
        task.note = body.note
        deps.repo.put_task(task)
    return {"ok": True}


@router.post("/line-link-code")
def line_link_code(osm: OsmDep, deps: DepsDep) -> dict[str, str]:
    for _ in range(20):
        code = f"LTH-{secrets.randbelow(1_000_000):06d}"
        if deps.repo.get_osm_by_link_code(code) is None and (
            deps.repo.get_guardian_by_link_code(code) is None
        ):
            break
    osm.line_link_code = code
    deps.repo.put_osm(osm)
    return {"code": code}
