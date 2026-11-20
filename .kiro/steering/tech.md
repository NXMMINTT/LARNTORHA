---
inclusion: always
---
# Tech — หลานโทรหา (LarnTorHa)

> **The full technical spec is `CLAUDE.md` at the repo root (Mymint's spec). Follow it for stack, structure, API, data model and tests.**
> This file only records the team decisions of 21 Nov that override or extend CLAUDE.md. When the two disagree, this file wins and you should tell the user.

## Team decisions (21 Nov 2026)
| Topic | Decision |
|---|---|
| Stack | **As CLAUDE.md §1**: Next.js 16 + TypeScript + Tailwind v4 (frontend), FastAPI + Pydantic v2 + uv (backend), DynamoDB, LINE Messaging API, Bedrock Converse + Guardrails. |
| Live AI call with the elder | **In scope** (overrides CLAUDE.md §0 "นอกขอบเขต"). The AI "หลาน" chats live with the elder, typed instead of spoken for the prototype. Source: `agent.py` (Strands Agents) and `.kiro/specs/daily-checkin/requirements.md`. Its finished conversation becomes a transcript and goes into the same pipeline as CLAUDE.md (`POST /v1/demo/calls` in demo mode). No telephony, STT or TTS yet. |
| Who decides the risk level | **Open — team to decide.** Option A: deterministic rules only. Option B (CLAUDE.md §5A): Bedrock analysis + rules that can only raise, never lower. Until decided, build per CLAUDE.md (B) but keep `red_flags.py` able to work alone. |
| Model | **Forced by the event:** `BEDROCK_MODEL_ID=anthropic.claude-sonnet-5`, Region `ap-southeast-1`. Never `global.` or `apac.` inference profiles (the team account refuses them), and no Haiku/other model unless the organisers change the rule. Applies to `agent.py`, the backend analyzer, and AgentCore. |

## AWS rules of the team account
- Only `ap-southeast-1` (default), `ap-southeast-7`, `us-east-1`. Budget US$500 per team for the programme, keep under US$30/day.
- Sign in with `aws sso login` (profile `default`). Never create or paste access keys.
- See `.kiro/steering/aws.md` for how Kiro must use the AWS MCP server.

## Commands
- Live call (terminal): `uv run agent.py` or `uv run agent.py e2` (repo root). Bedrock test: `uv run check_bedrock.py`.
- Backend / frontend dev, lint and tests: see `README.md` and CLAUDE.md §13.

## Privacy
- Seed data only (made-up people). Never real names, addresses, phone numbers or health data — not in code, data files, prompts or chats.
