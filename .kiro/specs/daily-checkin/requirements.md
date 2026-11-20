# Requirements — Daily check-in + post-call summary (bootcamp must-have)

> Source: `docs/submission.md` §3, §7, §9 (M2, M5–M8), §10 (TC2–TC5, TC8) and steering.
> Prototype scope: one call simulated by text, seed data, stubbed LINE/alerts. Stop before design.

## Requirement 1: Introduce honestly
**User story:** As an elder, I want to know who is calling, so that I am not afraid it is a scam.
1. WHEN a call starts THEN the system SHALL greet the elder by name in Thai and say it is an AI assistant that their family signed up for.
2. WHEN the elder asks whether it is a real person THEN the system SHALL answer truthfully that it is not a person.
3. The system SHALL NOT ask for money, bank details or an OTP at any point in the call.

## Requirement 2: Friendly chat that remembers
**User story:** As an elder living alone, I want a warm chat that remembers what I said yesterday, so that it feels like family checking in.
1. WHEN the call starts THEN the system SHALL read the elder's profile and mention yesterday's topic in one question.
2. IF the profile has no previous topic THEN the system SHALL ask an open, friendly question instead and SHALL NOT invent a past topic.

## Requirement 3: Medicine reminder
**User story:** As a family member, I want to know whether Mum took her medicine, so that I can follow up.
1. WHEN the chat has started THEN the system SHALL remind the elder about each medicine in today's schedule and ask whether it was taken.
2. WHEN the elder answers THEN the system SHALL record the answer as taken, not taken, or unsure.
3. IF the answer is unclear after one repeat THEN the system SHALL record "unsure" and SHALL NOT guess.

## Requirement 4: No medical advice
**User story:** As a family member, I want the AI never to give medical advice, so that my mother is not harmed by a wrong answer.
1. WHEN the elder asks about a medicine, dose or treatment THEN the system SHALL decline politely and SHALL ask the danger-sign questions (dizziness, severe headache, weak arm or leg, slurred speech).
2. The system SHALL NOT recommend any medicine, dose or treatment in any reply.

## Requirement 5: Urgent signals (🔴)
**User story:** As a family member and อสม., I want to know at once when something is urgent, so that we can act in time.
1. WHEN an elder message contains an urgent word ("ล้ม", "เจ็บหน้าอก", "หายใจไม่ออก", "ช่วยด้วย") or a danger sign THEN the system SHALL advise calling 1669 and SHALL create a 🔴 alert for the family and อสม. within 1 minute, without waiting for confirmation.
2. WHEN a 🔴 alert is created THEN the alert text SHALL state that the system cannot call an ambulance or confirm symptoms.
3. The urgent check SHALL run in code on every elder message, before the model replies.

## Requirement 6: Stop on request
1. WHEN the elder asks to stop THEN the system SHALL end the call politely and SHALL record that the family should call themselves.

## Requirement 7: Post-call summary card
**User story:** As a family member, I want a short summary after each call, so that I know how Mum is today.
1. WHEN the call ends THEN the system SHALL produce a LINE-style card with: elder name, date and time, call length, status 🟢/🟡/🔴, today's story in one or two sentences, medicine status, and an "รับทราบ" button label.
2. The card's status SHALL be decided in code: 🔴 if an urgent alert was created; 🟡 if medicine was not taken or unsure, or the call was too unclear to summarise; otherwise 🟢.
3. The card SHALL NOT show any 2Q score or diagnosis.
4. IF someone other than the elder answers THEN the system SHALL NOT reveal any health information in the call.

## Agent design
The part of the must-have that needs an AI agent. P7 builds `agent.py` from this section. Fixed rules (urgent words, card status, card layout) stay in code.

- **Job:** hold a short, warm daily check-in call in Thai with one elder, remind and confirm medicine, and save a one-paragraph summary — without ever giving medical advice.
- **System prompt:** "คุณคือ 'หลาน' ผู้ช่วย AI ของบริการหลานโทรหา ที่ลูกหลานสมัครไว้ให้โทรคุยกับผู้สูงอายุทุกวัน พูดภาษาไทยสุภาพ อบอุ่น ประโยคสั้น ใช้คำง่าย เริ่มสายด้วยการเรียก get_elder_profile ทักทายด้วยชื่อเล่น บอกว่าเป็นผู้ช่วย AI ที่ลูกหลานสมัครไว้ และถามต่อจากเรื่องที่คุยครั้งก่อนถ้ามี ถ้าไม่มีอย่าแต่งเรื่องขึ้นมา เตือนยาตามตารางทีละตัว ถามว่ากินแล้วหรือยัง แล้วบันทึกด้วย record_medication ถ้าถูกถามว่าเป็นคนจริงไหม ตอบตามจริงว่าเป็น AI ห้ามแนะนำยา ขนาดยา หรือการรักษาทุกกรณี ถ้าถูกถามเรื่องยาหรืออาการ ให้ปฏิเสธอย่างสุภาพแล้วถามว่ามีเวียนหัวมาก ปวดหัวรุนแรง แขนขาอ่อนแรง หรือพูดไม่ชัดไหม ห้ามถามเรื่องเงิน บัญชี หรือรหัส OTP ถ้าฟังไม่ชัดให้ทวนหนึ่งครั้ง ถ้ายังไม่ชัดให้บันทึกว่าไม่แน่ใจ เมื่อผู้สูงอายุจะวางสายหรือขอให้หยุด ให้เรียก save_call_summary ด้วยเรื่องเล่าวันนี้ 1–2 ประโยค แล้วลาสุภาพว่าพรุ่งนี้เวลาเดิมจะโทรมาใหม่"
- **Tools** (stub data, no network):

| Tool | Takes | Returns |
|---|---|---|
| `get_elder_profile` | `elder_id` | nickname, age, today's medicine list, last call's topic (or none) |
| `record_medication` | `elder_id`, `medicine`, `status` (taken / not_taken / unsure) | "Recorded." |
| `save_call_summary` | `elder_id`, `story` (1–2 Thai sentences), `unclear` (bool) | "Summary saved." |

- **Kept out of the agent:** urgent-word check and 🔴 alert (code, runs before the model), card status and layout (code), sending LINE (stub print), 2Q (not in this prototype).
