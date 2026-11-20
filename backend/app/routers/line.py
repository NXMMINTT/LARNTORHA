"""POST /v1/line/webhook (CLAUDE.md §6.2)."""

import json
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.routers.common import DepsDep
from app.services.line_webhook import handle_events, signature_ok

router = APIRouter()


@router.post("/v1/line/webhook")
async def webhook(
    request: Request,
    deps: DepsDep,
    x_line_signature: Annotated[str | None, Header()] = None,
) -> dict[str, bool]:
    body = await request.body()
    if not signature_ok(deps.settings.line_channel_secret, body, x_line_signature):
        raise HTTPException(401, "invalid_signature")
    try:
        payload: dict[str, Any] = json.loads(body or b"{}")
    except ValueError:
        return {"ok": True}
    events = payload.get("events") or []
    # LINE pushes/replies are blocking HTTP calls: keep them off the event loop.
    await run_in_threadpool(handle_events, deps, events if isinstance(events, list) else [])
    return {"ok": True}
