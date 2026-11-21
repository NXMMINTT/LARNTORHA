"""Application settings loaded from environment (see CLAUDE.md §11)."""

from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["development", "production"] = "development"
    repo_driver: Literal["memory", "dynamodb"] = "memory"
    dynamodb_table: str = "larntorha"
    dynamodb_endpoint_url: str | None = None  # DynamoDB Local in dev only
    aws_region: str = "ap-southeast-1"

    session_secret: str = ""
    calls_api_token: str = ""
    internal_api_token: str = ""
    line_channel_access_token: str = ""
    line_channel_secret: str = ""
    app_base_url: str = "http://localhost:3000"
    # Public HTTPS folder holding the LINE card header images ({kind}.png), e.g. GitHub raw of
    # backend/app/static/cards, S3/CloudFront, or {backend}/static/cards. Empty = plain header.
    card_image_base_url: str = ""
    # LINE Login channel that owns the LIFF app of the family dashboard (verifies LIFF ID tokens).
    # Must be under the same LINE provider as the Messaging API channel so userIds match.
    line_login_channel_id: str = ""
    seed_demo: bool = True
    # Dev only: LINE userIds (comma separated) linked to the demo guardian on seed. Ignored in prod.
    line_to_user_ids: str = ""
    demo_mode: bool = False

    ai_provider: Literal["bedrock", "fake"] = "fake"
    bedrock_region: str = "ap-southeast-1"
    bedrock_model_id: str = ""
    bedrock_guardrail_id: str = ""
    bedrock_guardrail_version: str = ""
    bedrock_timeout_sec: float = 20.0
    retain_transcript_days: int = 0

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @model_validator(mode="after")
    def _check_production(self) -> "Settings":
        if not self.is_production:
            return self
        problems: list[str] = []
        for name in ("session_secret", "calls_api_token", "internal_api_token"):
            if len(getattr(self, name)) < 32:
                problems.append(f"{name.upper()} must be at least 32 characters")
        for name in ("line_channel_access_token", "line_channel_secret"):
            if not getattr(self, name):
                problems.append(f"{name.upper()} is required")
        if self.repo_driver == "memory":
            problems.append("REPO_DRIVER=memory is not allowed in production")
        if self.demo_mode:
            problems.append("DEMO_MODE must be false in production")
        if self.ai_provider != "bedrock":
            problems.append("AI_PROVIDER must be bedrock in production")
        for name in ("bedrock_model_id", "bedrock_guardrail_id", "bedrock_guardrail_version"):
            if not getattr(self, name):
                problems.append(f"{name.upper()} is required")
        if problems:
            raise ValueError("; ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
