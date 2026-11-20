"""FastAPI entrypoint. Routers are added in M5."""

from fastapi import FastAPI

from app.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    # No CORS middleware on purpose: browsers never call the backend directly (CLAUDE.md §3).
    app = FastAPI(title="LarnTorHa API", docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health")
    def health() -> dict[str, object]:
        return {
            "ok": True,
            "bedrock": "configured" if settings.ai_provider == "bedrock" else "fake",
        }

    return app


app = create_app()
