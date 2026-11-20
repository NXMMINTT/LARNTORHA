"""Shared dependencies: deps container, internal token and OSM session."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request

from app.auth import tokens_equal, verify_session
from app.deps import Deps
from app.domain.models import Osm


def get_deps(request: Request) -> Deps:
    deps: Deps = request.app.state.deps
    return deps


DepsDep = Annotated[Deps, Depends(get_deps)]


def require_internal(
    deps: DepsDep, x_internal_token: Annotated[str | None, Header()] = None
) -> None:
    if not tokens_equal(x_internal_token, deps.settings.internal_api_token):
        raise HTTPException(401, "unauthorized")


def current_osm(deps: DepsDep, authorization: Annotated[str | None, Header()] = None) -> Osm:
    token = (authorization or "").removeprefix("Bearer ").strip()
    osm_id = verify_session(token, deps.settings.session_secret) if token else None
    osm = deps.repo.get_osm(osm_id) if osm_id else None
    if osm is None:
        raise HTTPException(401, "unauthorized")
    return osm


OsmDep = Annotated[Osm, Depends(current_osm)]


def client_ip(request: Request) -> str:
    # Next.js forwards the browser IP (trusted: only it holds the internal token).
    forwarded = request.headers.get("x-client-ip")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"
