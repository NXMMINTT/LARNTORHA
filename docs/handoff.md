# Handoff — หลานโทรหา (LarnTorHa)

**Repo:** github.com/NXMMINTT/LARNTORHA (Mymint's code: Next.js frontend + FastAPI backend + infra, spec in `CLAUDE.md`). The bootcamp files (`.kiro/`, `agent.py`, `data/`, `docs/`) were added on 21 Nov 01:30.

**Team decisions (21 Nov):** stack = CLAUDE.md · live AI call = in scope (agent.py) · risk level = undecided (A rules only / B Bedrock + rules) · model = `anthropic.claude-sonnet-5` in ap-southeast-1 only. Details: `.kiro/steering/tech.md`.

**Must-have:** live AI call → transcript → `POST /v1/demo/calls` → Bedrock analysis → LINE card → อสม. dashboard. Spec: `.kiro/specs/dashboard-line/requirements.md`.

**State:** AWS signed in, `check_bedrock.py` READY, `agent.py` tested with Bedrock, MCP servers connected in Kiro. Frontend pages exist with a mock backend (commit 0b05cde). Backend routers/AI are still scaffolds.

**Next step:** decide the risk-level option, then connect `agent.py` to `/v1/demo/calls` once the backend demo endpoint exists.
