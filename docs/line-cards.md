# การ์ด LINE ของลูกหลาน (Flex Message)

การ์ดสรุปผลการโทรที่ส่งถึงลูกหลานผ่าน LINE Official Account มี 4 สถานะ หน้าตาตามดีไซน์ของทีม (2026-11-21)

| สถานะในดีไซน์ | `kind` ในโค้ด | ส่งเมื่อ | ปุ่ม (ทำงานจริง) |
|---|---|---|---|
| ปกติ (success) | `green` | สายปกติ ไม่พบสัญญาณผิดปกติ | รับทราบ (postback `ack`) |
| ยังติดต่อไม่ได้ (unreachable) | `unreachable` | ไม่รับสาย 2 ครั้ง ห่างกัน 30 นาที | โทรหาผู้สูงอายุ (`tel:`) · แจ้ง อสม. (postback `notify_osm`) |
| ควรติดตาม (followup) | `followup` | มีเรื่องควรติดตาม เช่น ลืมยา ไม่สบาย ฟังไม่ชัด | โทรหาผู้สูงอายุ (`tel:`) · รับทราบ (`ack`) |
| เร่งด่วน (urgent) | `red` | พบสัญญาณอันตราย | โทร 1669 · แจ้ง อสม. · โทรหาผู้สูงอายุ (+ สายด่วน 1323 ถ้าเกี่ยวกับการทำร้ายตัวเอง) |

สถานะมาจาก `compute_status` (CLAUDE.md §5) ไม่ใช่การเลือกเอง การ์ด "ควรติดตาม" หมายถึง "มีเรื่องที่ อสม. ควรติดตาม" (ไม่ใช่ "ระบบจะโทรซ้ำ") ข้อความบังคับใน CLAUDE.md §8 มีครบทุกใบ และการ์ดลูกหลานห้ามมีคำว่า 2Q / 9Q / ซึมเศร้า / คะแนน (มี test ตรวจ)

## โครงสร้างโค้ด

```
backend/app/domain/line_cards.py   สร้างการ์ด (ไม่มีโค้ดส่ง)
  family_card_data(kind, elder, call) -> FamilyCardData   1. ข้อมูลบนการ์ด (dynamic ต่อสาย)
  CARD_THEMES[kind]                                        2. สี ป้าย ไอคอน ของแต่ละสถานะ
  render_family_card(data, image_base) -> Flex message     3. แปลงเป็น Flex JSON (bubble เดียว)
  family_card(kind, elder, call, image_base)               = 1 + 3 (ที่ services/calls.py เรียก)
backend/app/line_client.py         ส่งข้อความ (push/reply, retry, X-Line-Retry-Key)
backend/app/services/calls.py      ขั้นตอนหลังวางสาย: สร้างการ์ด -> ส่งให้ guardian ที่เชื่อม LINE แล้ว
backend/app/services/line_webhook.py  รับปุ่ม postback (ack / notify_osm) และตรวจสิทธิ์ผู้กด
backend/app/static/cards/          ภาพหัวการ์ด (banners.png -> {kind}.jpg) และไอคอน (icons/)
backend/scripts/line_cards_demo.py ตัวอย่างข้อมูล 4 สถานะ + ส่งทดสอบ
frontend/scripts/crop-line-card-banners.mjs  ตัดภาพหัวการ์ดจาก banners.png
frontend/scripts/build-line-card-icons.mjs    สร้างไอคอน lucide เป็น PNG
docs/line-cards/*.json             ตัวอย่าง JSON (สร้างจากสคริปต์)
```

## โครงการ์ด

```
hero    ภาพ {kind}.jpg 1024x320 (แบนเนอร์สถานะ + น้องหลาน ตัดจาก banners.png)
body    วงกลมอักษรแรกของชื่อ + ชื่อ + "ผู้รับบริการ"
        แถวข้อมูล (ไอคอน · หัวข้อ · ค่า) เช่น วันที่โทร เวลา ระยะเวลาสนทนา ยา
        กล่องสีอ่อนตามสถานะ: สรุปการสนทนา / หมายเหตุ / สิ่งที่ควรติดตาม / ข้อสังเกต (+ ไอคอนบอท "สรุปโดย AI")
        ข้อความบังคับด้านความปลอดภัย
footer  ปุ่มทรงแคปซูล (แดงทึบ = ปุ่มหลัก, ขอบแดง = ปุ่มรอง) แถวละ 2 ปุ่ม (ชื่อยาวได้แถวของตัวเอง) ไอคอนทุกจุดเป็น lucide PNG ไม่ใช้ emoji
```

ถ้าไม่ได้ตั้ง `CARD_IMAGE_BASE_URL` การ์ดจะไม่มีภาพ และใช้แถบหัวสีตามสถานะแทน (ข้อมูลและปุ่มเหมือนเดิม)

## เชื่อมกับ LINE Bot เดิม

ไม่ต้องแก้อะไรเพิ่ม การ์ดใช้ช่องทางเดิมทั้งหมด:

1. ระบบโทรส่ง transcript มาที่ `POST /v1/calls` (หรือหน้าเดโม `/v1/demo/calls`)
2. `services/calls.py` คำนวณสถานะ เรียก `family_card(...)` แล้วส่งผ่าน `LineClient.push` ให้ guardian ทุกคนที่มี `line_user_id`
3. ลูกหลานกดปุ่ม: `tel:` เปิดแอปโทรศัพท์ในมือถือ ส่วน postback (`action=ack|notify_osm&elder=…&call=…`) วิ่งกลับมาที่ `POST /v1/line/webhook` ซึ่งตรวจว่าผู้กดเป็นลูกหลานของผู้สูงอายุคนนั้นจริงก่อนทำงาน

ค่าที่ต้องตั้งใน `backend/.env`:

```
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
CARD_IMAGE_BASE_URL=https://raw.githubusercontent.com/NXMMINTT/LARNTORHA/main/backend/app/static/cards
```

## ทดสอบ

```bash
cd backend
uv run pytest                                           # รวม test ของการ์ด
uv run python scripts/line_cards_demo.py                # เขียน docs/line-cards/*.json + ขนาดแต่ละใบ
uv run python scripts/line_cards_demo.py --push Uxxxx   # ส่งการ์ด 4 แบบเข้า LINE ของ userId นั้น
```

- **ดูใน LINE Flex Message Simulator:** เปิด https://developers.line.biz/flex-simulator/ แล้ววางไฟล์ `docs/line-cards/{kind}.bubble.json`
- **หา userId ของตัวเอง:** เพิ่มเพื่อน OA แล้วพิมพ์รหัสเชื่อม `LTH-xxxxxx` จากนั้นดู `line_user_id` ของ guardian (หรือใช้หน้าเดโม จำลองสายแล้วการ์ดจะส่งให้เองถ้าเชื่อม LINE แล้ว)
- **ส่งผ่าน pipeline จริง:** `POST /v1/demo/calls` ด้วย `scenario_id` เช่น `red-chest-isan`, `yellow-meds-northern`

## เปลี่ยนรูปภาพ

1. แทนที่แผ่นแบนเนอร์ต้นฉบับ `backend/app/static/cards/banners.png` (2x2: ปกติ | ยังติดต่อไม่ได้ / ควรติดตาม | เร่งด่วน)
2. ตัดภาพหัวการ์ด: `cd frontend && node scripts/crop-line-card-banners.mjs` จะได้ `{kind}.jpg` (1024x320) ถ้าขนาดแผ่นเปลี่ยน ให้แก้พิกัดใน `CROPS` ในสคริปต์
   ไอคอน: แก้รายการ `ICONS` ใน `frontend/scripts/build-line-card-icons.mjs` แล้วรัน `node scripts/build-line-card-icons.mjs`
3. **เพิ่ม `CARD_IMAGE_VERSION`** ใน `line_cards.py` (เช่น "2" เป็น "3") เพราะ LINE cache ภาพตาม URL
4. อัปโหลดภาพไปที่ปลายทางของ `CARD_IMAGE_BASE_URL` (ถ้าใช้ GitHub raw คือ push ขึ้น `main`)

## เปลี่ยนข้อมูลหรือข้อความบนการ์ด

- **ข้อมูลต่อสาย** (ชื่อ วันที่ ระยะเวลา สรุป ยา): มาจากสายจริงใน `family_card_data()` ไม่ต้องแก้มือ
- **หัวข้อ ไอคอน สีของแต่ละสถานะ:** แก้ที่ `CARD_THEMES`
- **แถวข้อมูล ปุ่ม ข้อความบังคับ:** แก้ใน `family_card_data()` ตาม `kind` (ข้อความใน CLAUDE.md §8 ห้ามตัด)
- **ทำการ์ดแบบอื่นหรือพรีวิว:** สร้าง `FamilyCardData(...)` เองแล้วส่งเข้า `render_family_card()` ดูตัวอย่างใน `scripts/line_cards_demo.py`

## ข้อจำกัดของ LINE (จากเอกสาร Messaging API)

| รายการ | ข้อจำกัด | การ์ดนี้ |
|---|---|---|
| ภาพ (image) | HTTPS (TLS 1.2+), JPEG/PNG, ไม่เกิน 1024x1024 px, ไม่เกิน 10 MB (แนะนำ ≤ 1 MB), URL ไม่เกิน 2000 ตัวอักษร | 1024x320 JPEG ราว 60 KB และไอคอน PNG 96x96 |
| JSON ต่อ bubble | ไม่เกิน 30 KB | ราว 4–5 KB (มี test ตรวจว่าไม่เกิน) |
| altText | ไม่เกิน 1500 ตัวอักษร | ตัดที่ 400 |
| aspectRatio | width:height ค่า 1–100000 และสูงไม่เกิน 3 เท่าของกว้าง | 16:5 |
| label ของ action | (ใช้ไม่เกิน 40 ตัวอักษร) | ตัดที่ 40 |

## ขึ้นใช้งานจริง

- **ที่เก็บภาพ:** ใช้ S3 + CloudFront (ap-southeast-1) หรือ CDN ที่เป็น HTTPS แล้วตั้ง `CARD_IMAGE_BASE_URL` ให้ชี้ไปที่นั่น GitHub raw ใช้ได้ตอนเดโมเท่านั้น (ต้องเป็น repo สาธารณะ และมี rate limit) **ห้ามใช้ ngrok ฟรี** เพราะ ngrok ส่งหน้าเตือนแทนภาพให้ client ที่เป็นเบราว์เซอร์
- **backend** เปิด `/static/cards/*` ไว้แล้ว ถ้า backend มีโดเมน HTTPS จริง ตั้ง `CARD_IMAGE_BASE_URL=https://<backend>/static/cards` ได้เลย
- ทุกครั้งที่เปลี่ยนภาพ ให้เพิ่ม `CARD_IMAGE_VERSION`
- ภาพเป็นข้อมูลสาธารณะ ไม่มีข้อมูลส่วนบุคคล ข้อมูลของผู้สูงอายุอยู่ในตัวข้อความของการ์ดเท่านั้น ซึ่ง LINE ส่งถึงลูกหลานที่เชื่อมบัญชีแล้วเท่านั้น
- ทดสอบบนมือถือจริงทั้ง iOS และ Android ก่อนเปิดใช้ เพราะ Simulator กับแอปจริงแสดงผลต่างกันเล็กน้อย
