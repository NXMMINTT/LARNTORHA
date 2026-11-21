"""FastAPI entrypoint."""

import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.deps import Deps, build_deps
from app.routers import calls, demo, line, osm, public


def _errors(exc: RequestValidationError) -> list[dict[str, Any]]:
    # Field paths + messages only: never echo submitted values (may hold personal data).
    return [{"loc": list(e.get("loc", [])), "msg": e.get("msg", "")} for e in exc.errors()]


def create_app(settings: Settings | None = None, deps: Deps | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO)
    # No CORS middleware on purpose: browsers never call the backend directly (CLAUDE.md §3).
    app = FastAPI(title="LarnTorHa API", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.deps = deps or build_deps(settings)

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse({"error": str(exc.detail), "detail": None}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse({"error": "validation_error", "detail": _errors(exc)}, status_code=422)

    @app.get("/health")
    def health() -> dict[str, object]:
        return {
            "ok": True,
            "bedrock": "configured" if settings.ai_provider == "bedrock" else "fake",
        }

    # Public, non-personal assets only (LINE card header images).
    app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
    app.include_router(calls.router)
    app.include_router(line.router)
    app.include_router(public.router)
    app.include_router(osm.router)
    if settings.demo_mode:
        app.include_router(demo.router)
    return app


app = create_app()
