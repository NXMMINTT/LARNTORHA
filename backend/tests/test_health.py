import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_health_reports_fake_provider() -> None:
    client = TestClient(create_app(Settings(_env_file=None)))
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "bedrock": "fake"}


def test_production_refuses_incomplete_config() -> None:
    with pytest.raises(ValueError, match="SESSION_SECRET"):
        Settings(_env_file=None, env="production")


def test_production_refuses_memory_repo_and_demo_mode() -> None:
    strong = "x" * 32
    with pytest.raises(ValueError) as exc:
        Settings(
            _env_file=None,
            env="production",
            session_secret=strong,
            calls_api_token=strong,
            internal_api_token=strong,
            line_channel_access_token="t",
            line_channel_secret="s",
            repo_driver="memory",
            demo_mode=True,
            ai_provider="bedrock",
            bedrock_model_id="m",
            bedrock_guardrail_id="g",
            bedrock_guardrail_version="1",
        )
    msg = str(exc.value)
    assert "REPO_DRIVER=memory" in msg
    assert "DEMO_MODE" in msg
