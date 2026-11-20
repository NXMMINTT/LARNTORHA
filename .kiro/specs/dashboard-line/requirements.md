# Requirements — หลานโทรหา end-to-end: live AI call → Bedrock analysis → LINE card → อสม. dashboard

> Source: `docs/submission.md` (§3, §7, §9 M2/M5–M8/M11, §10 TC2–TC8), `.kiro/steering/product.md`, `.kiro/steering/tech.md` (team decisions 21 Nov) and `CLAUDE.md`.
> **Dashboard, LINE cards, analysis, status, data model and API are specified in CLAUDE.md (§4–§8). This spec does not repeat them.**
> It adds the live AI call (team decision: in scope) and how it joins CLAUDE.md's pipeline. Stop before design.

## Requirement 1: Live AI call (typed) — the heart of the demo
**User story:** As a demo viewer, I want to watch the AI "หลาน" talk live with an elder, so that I see how the product works for the elder.
1. WHEN a call starts for a seed elder THEN the AI SHALL greet the elder by nickname in Thai and say it is an AI assistant the family signed up for.
2. WHEN the elder replies THEN the AI SHALL answer in Thai, in two or three short sentences.
3. WHEN the call starts THEN the AI SHALL ask about a topic from the last calls IF one exists, and SHALL NOT invent one IF none exists.
4. WHEN the chat has started THEN the AI SHALL remind each scheduled medicine and record the answer as taken, not taken or unsure.
5. WHEN asked whether it is a real person THEN the AI SHALL answer truthfully that it is not a person.
6. WHEN asked about a medicine, dose or treatment THEN the AI SHALL decline politely and ask the danger-sign questions, and SHALL NOT recommend any medicine, dose or treatment.
7. The AI SHALL NOT ask about money, bank details or an OTP.
8. WHEN an elder message contains an urgent word or danger sign THEN code SHALL flag it before the model replies, the AI SHALL advise calling 1669, and it SHALL NOT claim an ambulance was called.
9. WHEN the elder says goodbye or asks to stop, or the operator ends the call, THEN the system SHALL end the call.
10. Each call SHALL have its own conversation and state.
11. The model SHALL be `anthropic.claude-sonnet-5` in `ap-southeast-1`.

## Requirement 2: The call joins CLAUDE.md's pipeline
**User story:** As a family member and อสม., I want the live call's result to reach LINE and the dashboard, so that the demo shows the whole product.
1. WHEN a live call ends THEN the system SHALL build a transcript (`[{speaker: "ai" | "elder", text}]`) of the whole conversation.
2. WHEN the transcript is built THEN the system SHALL send it to `POST /v1/demo/calls` (CLAUDE.md §6.5) for the seed elder, so that it goes through the same analysis, status, LINE card and dashboard path as a real call.
3. WHEN the backend is not running THEN the call SHALL still finish and SHALL save the transcript to a local file, with a Thai message that it was not sent.
4. WHEN the dashboard is refreshed after a live call THEN the elder SHALL appear with the status from that call.

## Requirement 3: Risk level — decision pending
1. The team SHALL choose before the build: (A) deterministic rules only, or (B) Bedrock analysis plus rules that can only raise the level (CLAUDE.md §5A.4).
2. Until the team chooses, the build SHALL follow (B), and `red_flags.py` SHALL be usable on its own so that (A) needs no new code.
3. In both options, an urgent word SHALL always result in 🔴.

## Agent design (live call)
- **Job:** hold a short, warm daily check-in call in Thai with one elder, remind and confirm medicine, and close the call — without ever giving medical advice.
- **System prompt:** `SYSTEM_PROMPT` in `agent.py`.
- **Tools** (seed data, no network): `get_elder_profile(elder_id)`, `record_medication(elder_id, medicine, status)`, `save_call_summary(elder_id, story, unclear)`.
- **Kept out of the agent:** urgent-word check (code), risk level and status (CLAUDE.md pipeline), LINE cards, dashboard.
- **Today:** `agent.py` runs in the terminal with one global agent. To put it on `/demo`, move it to `backend/app/ai/live_call.py` with one agent per call.

## Demo script (22 Nov, about 3 minutes)
1. Open the อสม. dashboard: seed elders already show 🔴, 🟡 with a 9Q task, 📵 and 🟢.
2. Start a live call with ยายสมศรี: the AI says it is an AI and asks about the ผักบุ้ง.
3. "กินยาแล้วจ้ะ" → medicine recorded. "เป็นคนจริงไหม" → truthful. "กินยาพาราเพิ่มได้ไหม" → no advice, triage.
4. "เมื่อเช้าเจ็บหน้าอก" → AI advises 1669 at once.
5. End the call → the transcript goes to `/v1/demo/calls` → the 🔴 LINE card appears and ยายสมศรี moves to the top of the dashboard.
