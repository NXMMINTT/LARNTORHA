"""/v1/family/* — guardian dashboard via LINE Login (LIFF). Needs the internal token (Next.js only).

Login: the LIFF ID token is verified with LINE, its `sub` (LINE userId) must belong to a linked
guardian. The session carries only that userId; the backend finds the elders itself.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import issue_family_session, verify_family_session
from app.routers.common import DepsDep, client_ip, require_internal
from app.services.family import family_dashboard, linked_elders

router = APIRouter(prefix="/v1/family", dependencies=[Depends(require_internal)])


class FamilyLoginIn(BaseModel):
    id_token: str = Field(min_length=1, max_length=4000)


def current_line_user(deps: DepsDep, authorization: Annotated[str | None, Header()] = None) -> str:
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = verify_family_session(token, deps.settings.session_secret) if token else None
    if user is None:
        raise HTTPException(401, "unauthorized")
    return user


@router.post("/login")
def login(body: FamilyLoginIn, request: Request, deps: DepsDep) -> dict[str, str]:
    if not deps.login_limiter.allow(f"{client_ip(request)}|family"):
        raise HTTPException(429, "rate_limited")
    user = deps.line.verify_id_token(body.id_token, deps.settings.line_login_channel_id)
    if user is None:
        raise HTTPException(401, "invalid_id_token")
    if not linked_elders(deps.repo, user):
        raise HTTPException(403, "not_linked")
    token, exp = issue_family_session(user, deps.settings.session_secret)
    return {"session": token, "expires_at": exp.isoformat()}


@router.get("/dashboard")
def dashboard(deps: DepsDep, user: Annotated[str, Depends(current_line_user)]) -> dict[str, Any]:
    return family_dashboard(deps.repo, user)
