"""/v1/public/* (CLAUDE.md §6.3)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from app.routers.common import DepsDep, client_ip, require_internal
from app.services.registration import RegisterIn, RegistrationError, register

router = APIRouter(prefix="/v1/public", dependencies=[Depends(require_internal)])


@router.post("/register", status_code=201)
def post_register(body: RegisterIn, request: Request, deps: DepsDep) -> JSONResponse:
    if not deps.register_limiter.allow(client_ip(request)):
        raise HTTPException(429, "rate_limited")
    try:
        result = register(deps.repo, body)
    except RegistrationError as e:
        raise HTTPException(e.status, e.code) from e
    return JSONResponse(result, status_code=201)
