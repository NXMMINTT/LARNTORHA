"""Wiring: settings + repo + analyzer + LINE client, built once per app."""

from dataclasses import dataclass, field
from pathlib import Path

from app.ai.analyzer import Analyzer, BedrockAnalyzer
from app.ai.bedrock_client import BedrockSettings, ConverseClient, make_client
from app.ai.fake import FakeAnalyzer
from app.auth import RateLimiter
from app.config import Settings
from app.line_client import LineClient
from app.repo.base import Repo
from app.repo.memory import MemoryRepo
from app.repo.osm_accounts import load_into
from app.repo.seed import link_demo_line, seed


@dataclass
class Deps:
    settings: Settings
    repo: Repo
    analyzer: Analyzer
    line: LineClient
    # Bedrock client for the /demo live call (None = scripted fallback, e.g. AI_PROVIDER=fake).
    live_client: ConverseClient | None = None
    login_limiter: RateLimiter = field(default_factory=lambda: RateLimiter(5, 15 * 60))
    register_limiter: RateLimiter = field(default_factory=lambda: RateLimiter(10, 60 * 60))


def build_analyzer(s: Settings) -> Analyzer:
    if s.ai_provider == "fake":
        return FakeAnalyzer()
    if not s.bedrock_model_id:
        raise RuntimeError("BEDROCK_MODEL_ID is required when AI_PROVIDER=bedrock")
    return BedrockAnalyzer(
        make_client(s.bedrock_region, s.bedrock_timeout_sec),
        BedrockSettings(s.bedrock_model_id, s.bedrock_guardrail_id, s.bedrock_guardrail_version),
    )


def build_deps(s: Settings) -> Deps:
    if s.repo_driver == "dynamodb":
        raise RuntimeError("REPO_DRIVER=dynamodb is not implemented yet (M4)")
    repo = MemoryRepo()
    if s.seed_demo:
        seed(repo)
        if not s.is_production:
            link_demo_line(repo, s.line_to_user_ids)
    load_into(repo, Path(s.osm_accounts_file))
    dry_run = not s.line_channel_access_token and not s.is_production
    return Deps(
        settings=s,
        repo=repo,
        analyzer=build_analyzer(s),
        line=LineClient(s.line_channel_access_token, dry_run=dry_run),
        live_client=(
            make_client(s.bedrock_region, s.bedrock_timeout_sec)
            if s.demo_mode and s.ai_provider == "bedrock" and s.bedrock_model_id
            else None
        ),
    )
