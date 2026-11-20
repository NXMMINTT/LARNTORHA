---
inclusion: always
---
# Structure — หลานโทรหา (LarnTorHa)

> The repo layout is defined in `CLAUDE.md` §2. Put new code where CLAUDE.md says.
> Extra pieces the team added on 21 Nov live at the repo root:

```
LARNTORHA/ (repo root)
├── CLAUDE.md                 # Mymint's full spec — source of truth for stack and layout
├── frontend/                 # Next.js 16 (CLAUDE.md §2, §7)
├── backend/                  # FastAPI (CLAUDE.md §2, §5, §5A, §6)
├── infra/                    # DynamoDB table, IAM policy
├── agent.py                  # LIVE AI call "หลาน" (Strands + Bedrock), typed chat in terminal
├── agent_postpal.py          # bootcamp PostPal starter (setup test 5) — do not build on it
├── check_bedrock.py          # prints READY when Bedrock works
├── pyproject.toml, uv.lock   # deps for agent.py / check_bedrock.py (strands-agents)
├── data/                     # seed elders + calls used by agent.py (made-up)
├── docs/
│   ├── submission.md         # Quick submission (the idea, source of truth for the product)
│   └── handoff.md            # where we stopped, next step
└── .kiro/
    ├── settings/mcp.json     # aws-mcp, strands-agents, agentcore-docs (disabled until build)
    ├── steering/             # product.md, tech.md (team decisions), structure.md, aws.md
    └── specs/                # dashboard-line (end-to-end must-have), daily-checkin (live call agent)
```

## Where the live call connects
`agent.py` conversation → transcript (`[{speaker: "ai"|"elder", text}]`) → `POST /v1/demo/calls` on the backend → Bedrock analysis + red flags → status → LINE card + dashboard (CLAUDE.md §3 pipeline).
When the live call moves into the web app, put the agent under `backend/app/ai/` (e.g. `live_call.py`) and keep one agent per call.

## Naming
Follow CLAUDE.md (snake_case in Python and JSON, types in `frontend/src/lib/types.ts` match the backend).
