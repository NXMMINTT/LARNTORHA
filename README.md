# หลานโทรหา (LarnTorHa)

สเปกฉบับเต็มอยู่ใน [CLAUDE.md](CLAUDE.md) · การตัดสินใจของทีมวันที่ 21 พ.ย. อยู่ใน [.kiro/steering/tech.md](.kiro/steering/tech.md)

## รันแบบ dev (ไม่ต้องมี Docker)

```bash
# backend (:8000)
cd backend && cp .env.example .env && uv sync && uv run uvicorn app.main:app --reload --port 8000
# frontend (:3000)
cd frontend && cp .env.example .env && npm install && npm run dev
```

- ตั้ง `INTERNAL_API_TOKEN` ให้เป็นค่าเดียวกันทั้งสองฝั่ง และตั้ง `SESSION_SECRET` / `CALLS_API_TOKEN` (สุ่มค่าได้ด้วย `python -c "import secrets;print(secrets.token_urlsafe(32))"`)
- **ใช้ Bedrock จริง:** ตั้ง `AI_PROVIDER=bedrock` และ `BEDROCK_MODEL_ID=anthropic.claude-sonnet-5` แล้ว `aws sso login` ก่อน ถ้าไม่มี AWS ให้ใช้ `AI_PROVIDER=fake` (ใช้กฎ + template)
- **โหมดเดโม:** ตั้ง `DEMO_MODE=true` ทั้ง backend และ frontend ระบบจะเปิด `/v1/demo/*` และแสดงบัญชีเดโมในหน้า login (เบอร์ `0812345678` · รหัสผ่าน `demo-password`)
- ข้อมูล seed เป็นบุคคลสมมติทั้งหมด และอยู่ในหน่วยความจำ ถ้า restart backend ข้อมูลจะกลับเป็นค่าเริ่มต้น

หรือใช้ `docker compose up --build` (frontend + backend + DynamoDB Local)

## ตรวจคุณภาพ

```bash
cd backend && uv run ruff check . && uv run mypy app tests && uv run pytest
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
# e2e: ต้องเปิด backend (DEMO_MODE=true) และ frontend ไว้ก่อน
cd frontend && INTERNAL_API_TOKEN=<ค่าเดียวกับ .env> npx playwright test
```

## จำลองสายเดโม (pipeline เดียวกับสายจริง รวม Bedrock)

```bash
curl -X POST localhost:8000/v1/demo/calls -H "X-Internal-Token: $TOKEN" -H "content-type: application/json" \
  -d '{"elder_id":"eld_somsri","scenario_id":"red-chest-isan"}'
```

รายการ scenario: `GET /v1/demo/scenarios` (ไฟล์อยู่ใน `backend/app/fixtures/transcripts/`) · ล้างข้อมูลแล้ว seed ใหม่: `POST /v1/demo/reset`

## ตั้งค่า LINE Official Account (ส่งการ์ดจริง)

1. สร้าง Messaging API channel ที่ [LINE Developers Console](https://developers.line.biz/console/) แล้วคัดลอก **Channel secret** (แท็บ Basic settings) และ **Channel access token (long-lived)** (แท็บ Messaging API)
2. ใส่ใน `backend/.env`: `LINE_CHANNEL_SECRET=...` และ `LINE_CHANNEL_ACCESS_TOKEN=...` แล้ว restart backend (ถ้าไม่ตั้ง token ระบบจะ log `[LINE dry-run]` แทนการส่งจริง)
3. ตั้ง `APP_BASE_URL` เป็น URL ของ frontend (ใช้ในปุ่ม "เปิด Dashboard" ในการ์ดของ อสม.)
4. Webhook ต้องเป็น HTTPS ที่ LINE เรียกถึงได้ ตอน dev ใช้ tunnel เช่น `ngrok http 8000` แล้วตั้ง Webhook URL เป็น `https://<tunnel>/v1/line/webhook` เปิด **Use webhook** แล้วกด **Verify** (ต้องได้ 200)
5. ใน LINE Official Account Manager ให้ปิด auto-reply และ greeting message ของ OA เพราะ backend ตอบเอง
6. เพิ่มเพื่อน OA ด้วยมือถือ แล้วพิมพ์รหัสเชื่อม:
   - ลูกหลานของ seed ใช้รหัส `LTH-100001` … `LTH-100007` ตามลำดับ: ตาสมชาย, ยายมาลี, ยายบัวลอย, ยายสมศรี, ตาทองดี, ยายสำลี, ยายคำ (ใช้ได้ครั้งเดียว และใช้ได้ใหม่ทุกครั้งหลัง reset)
   - อสม. กด "สร้างรหัสเชื่อม LINE" ใน Dashboard แล้วพิมพ์รหัสนั้นใน LINE
7. จำลองสาย (หัวข้อด้านบน) แล้วการ์ด 🟢🟡🔴 จะเข้า LINE ปุ่ม "รับทราบ" และ "แจ้ง อสม." จะกลับมาที่ webhook

## Decisions

- **ปิด `cacheComponents` ของ Next.js 16:** ทุกหน้าที่มีข้อมูลเป็นข้อมูลส่วนตัวรายบัญชีและต้อง `no-store` จึงใช้ dynamic rendering ล้วน ลดความเสี่ยงที่ข้อมูลสุขภาพจะถูก cache ข้ามผู้ใช้
- **Tailwind v4 ผ่าน `@tailwindcss/postcss`** ตาม CLAUDE.md §1 (create-next-app รุ่นนี้ตั้งค่าเริ่มต้นเป็น `@tailwindcss/turbopack` แต่ PostCSS ยังเป็นวิธีที่เอกสาร Next.js รองรับ และใช้ได้กับ vitest ด้วย)
- **หน้าสาธารณะใช้โทนขาว-แดง ส่วน Dashboard ใช้น้ำเงิน:** ตามที่ผู้ใช้เลือก (อ้างอิงแบบหน้าแรกที่ทีมส่งมา) ทำผ่าน class `theme-public` ที่ override `--color-brand-*` แยก Dashboard ไว้เป็นน้ำเงินเพื่อให้สีแดงที่นั่นหมายถึง 🔴 เร่งด่วนอย่างเดียว
- **`npm test` เรียกผ่าน `scripts/vitest.mjs`:** บน Windows ถ้า terminal เปิดด้วยตัวอักษรไดรฟ์ตัวเล็ก (`c:\`) vitest จะโหลดตัวเองซ้ำสองชุดแล้ว crash สคริปต์นี้แก้ cwd ให้ตรงกับดิสก์ก่อนเรียก vitest
- **โมเดล `anthropic.claude-sonnet-5` ใน ap-southeast-1** (กติกางาน ดู `.kiro/steering/tech.md`) ไม่ใช้ cross-region inference profile ข้อมูลจึงประมวลผลใน Singapore เท่านั้น
- **ไม่ส่ง `temperature`:** CLAUDE.md กำหนด `temperature=0` แต่ claude-sonnet-5 ปฏิเสธพารามิเตอร์นี้ (deprecated) ผลลัพธ์ที่คงที่มาจากการบังคับ tool + Pydantic validation แทน
- **`maxTokens=2000` แทน 800:** คำตอบภาษาไทยใช้โทเคนมาก ที่ 800 โทเคน เคส red ถูกตัดกลางคำตอบ (`stopReason=max_tokens`) แล้วตกไป fallback
- **Guardrail ใส่เฉพาะเมื่อตั้ง `BEDROCK_GUARDRAIL_ID`:** ตอน dev ยังไม่ได้สร้าง guardrail ส่วน production จะไม่ยอมเริ่มถ้าไม่ได้ตั้ง
- **กฎ "ล้ม" อย่างเดียวเป็นแค่ 🟡:** 🔴 เฉพาะล้มแล้วศีรษะกระแทกหรือลุกไม่ได้ (ตาม §5A.3) เพื่อไม่ให้ "เมื่อปีก่อนเคยล้ม" เป็น 🔴 ส่วนคำปฏิเสธดูจากข้อความที่ยังมีวรรณยุกต์ ("ทำไม" ไม่นับเป็นคำปฏิเสธ)
- **การ์ด 🔴 ของลูกหลานใช้ `summary_family`** (ผ่านตัวกรองคำต้องห้ามแล้ว) ส่วนกรณีทำร้ายตัวเองใช้ข้อความกลางเท่านั้น ไม่มีถ้อยคำจาก transcript
- **`notify_osm` push ครั้งเดียว:** บันทึก `osm_request_notified_at` ก่อน push เพื่อให้กดซ้ำแล้วไม่ส่งซ้ำ
- **Rate limit ใช้ IP ที่ Next.js ส่งมาใน `X-Client-IP`** (เชื่อได้เพราะต้องมี internal token) production ต้องเสริมด้วย AWS WAF
- **ยังไม่เก็บ transcript ถาวร** (`RETAIN_TRANSCRIPT_DAYS` ยังไม่ได้ทำ ค่าเริ่มต้น 0 จึงไม่มีผล)

## ยังไม่ได้ทำ

- `REPO_DRIVER=dynamodb` (M4): ตอนนี้มีแค่ memory repo
- หน้า `/demo` บนเว็บ และการต่อ `agent.py` เข้ากับ `/v1/demo/calls`
- fixtures ให้ครบ 24 ชุด + `scripts/eval_bedrock.py` + `docs/eval-results.md` (ตอนนี้มี 8 ชุด)
- Bedrock Guardrail จริง, Dockerfile/deploy, `scripts/create_osm.py`
