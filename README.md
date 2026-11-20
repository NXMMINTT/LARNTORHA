# หลานโทรหา (LarnTorHa)

สเปกฉบับเต็มอยู่ใน [CLAUDE.md](CLAUDE.md) · README ฉบับสมบูรณ์ (วิธี deploy, Bedrock, LINE) จะเขียนใน M7

## รันแบบ dev (ไม่ต้องมี Docker)

```bash
# backend
cd backend && cp .env.example .env && uv sync && uv run uvicorn app.main:app --reload --port 8000
# frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

หรือใช้ `docker compose up --build` (frontend + backend + DynamoDB Local)

## ตรวจคุณภาพ

```bash
cd backend && uv run ruff check . && uv run mypy app tests && uv run pytest
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

## Decisions

- **ปิด `cacheComponents` ของ Next.js 16:** ทุกหน้าที่มีข้อมูลเป็นข้อมูลส่วนตัวรายบัญชีและต้อง `no-store` จึงใช้ dynamic rendering ล้วน ลดความเสี่ยงที่ข้อมูลสุขภาพจะถูก cache ข้ามผู้ใช้
- **Tailwind v4 ผ่าน `@tailwindcss/postcss`** ตาม CLAUDE.md §1 (create-next-app รุ่นนี้ตั้งค่าเริ่มต้นเป็น `@tailwindcss/turbopack` แต่ PostCSS ยังเป็นวิธีที่เอกสาร Next.js รองรับ และใช้ได้กับ vitest ด้วย)
- **หน้าสาธารณะใช้โทนขาว-แดง ส่วน Dashboard ใช้น้ำเงิน:** ตามที่ผู้ใช้เลือก (อ้างอิงแบบหน้าแรกที่ทีมส่งมา) ทำผ่าน class `theme-public` ที่ override `--color-brand-*` แยก Dashboard ไว้เป็นน้ำเงินเพื่อให้สีแดงที่นั่นหมายถึง 🔴 เร่งด่วนอย่างเดียว
- **ข้อมูลจำลองระหว่างยังไม่มี backend:** `MOCK_BACKEND=true` (dev เท่านั้น) ใช้ `frontend/src/lib/mock-backend.ts` แทน FastAPI จะลบเมื่อ M5 เสร็จ
- **`npm test` เรียกผ่าน `scripts/vitest.mjs`:** บน Windows ถ้า terminal เปิดด้วยตัวอักษรไดรฟ์ตัวเล็ก (`c:\`) vitest จะโหลดตัวเองซ้ำสองชุดแล้ว crash สคริปต์นี้แก้ cwd ให้ตรงกับดิสก์ก่อนเรียก vitest
