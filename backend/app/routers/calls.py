"""POST /v1/calls from the telephony system (CLAUDE.md §6.1)."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from app.auth import tokens_equal
from app.routers.common import DepsDep
from app.services.calls import CallError, CallIn, process_call


def require_calls_token(
    deps: DepsDep, authorization: Annotated[str | None, Header()] = None
) -> None:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if not tokens_equal(token, deps.settings.calls_api_token):
        raise HTTPException(401, "unauthorized")


router = APIRouter(dependencies=[Depends(require_calls_token)])


def public_result(result: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in result.items() if not k.startswith("_")}


@router.post("/v1/calls")
def post_call(body: CallIn, deps: DepsDep) -> JSONResponse:
    try:
        result = process_call(deps, body)
    except CallError as e:
        raise HTTPException(e.status, e.code) from e
    status = 200 if result.get("duplicate") else 201
    return JSONResponse(public_result(result), status_code=status)
