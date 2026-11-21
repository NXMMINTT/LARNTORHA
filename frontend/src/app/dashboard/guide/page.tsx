// /dashboard/guide — short handbook for อสม. Wording follows .kiro/steering/product.md
// (alert policy, 2Q protocol, PDPA consent, safety limits). Static page, no data.
import { Ban, ClipboardList, ShieldCheck } from "lucide-react";

import { STATUS_META, StatusDot } from "@/components/Badge";
import type { ElderStatus } from "@/lib/types";

const panel = "rounded-2xl border border-console-line/80 bg-white p-5 shadow-sm";

const STATUS_GUIDE: { status: ElderStatus; when: string; todo: string }[] = [
  {
    status: "red",
    when: "ผู้สูงอายุพูดว่าล้ม เจ็บหน้าอก หายใจไม่ออก หรือขอความช่วยเหลือ หรือมีอาการอันตราย เช่น เวียนหัวมาก ปวดหัวรุนแรง แขนขาอ่อนแรง พูดไม่ชัด",
    todo: "AI แนะนำให้โทร 1669 ระหว่างสายแล้ว และส่ง LINE ถึงลูกหลานกับ อสม. ทันที ให้ติดต่อผู้สูงอายุหรือครอบครัวโดยเร็ว ถ้าจำเป็นโทร 1669",
  },
  {
    status: "yellow",
    when: "คัดกรอง 2Q ผลบวก ลืมยาติดกัน 3 วันขึ้นไป หรือฟังไม่ชัดจนสรุปไม่ได้",
    todo: "คนจริงต้องตรวจสอบ โทรถามหรือเยี่ยมบ้าน แล้วกด “ติดตามแล้ว” พร้อมบันทึก",
  },
  {
    status: "unreachable",
    when: "ไม่รับสาย 2 ครั้ง ห่างกัน 30 นาที",
    todo: "ระบบไม่ได้ตีความว่าเกิดเหตุ ให้ประสานลูกหลานหรือเพื่อนบ้านเพื่อตรวจสอบ",
  },
  {
    status: "green",
    when: "ไม่พบสัญญาณผิดปกติในสาย",
    todo: "ไม่ได้ยืนยันว่าปลอดภัย ยังเยี่ยมบ้านตามรอบปกติ",
  },
  {
    status: "pending",
    when: "สมัครแล้วแต่ยังไม่มีสายแรก",
    todo: "สายแรกจะขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียง",
  },
];

// [label, required] — required ones match lib/register-validation.ts
const CONSENTS: [string, boolean][] = [
  ["บันทึกบทสนทนา", true],
  ["ส่งสรุปให้ลูกหลาน", true],
  ["ส่งข้อมูลให้ อสม.", false],
  ["คัดกรองซึมเศร้า 2Q สัปดาห์ละครั้ง", false],
];

const LIMITS = [
  "ไม่ใช่สายด่วน และไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง",
  "ไม่เรียกรถพยาบาลเอง และยืนยันอาการไม่ได้",
  "ไม่ใช่การวินิจฉัยโรค AI ไม่แนะนำยา ขนาดยา หรือการรักษาทุกกรณี",
  "ไม่ถามเรื่องเงินหรือรหัส OTP ถ้าผู้สูงอายุเล่าว่ามีคนถาม ให้ระวังมิจฉาชีพ",
  "ผู้สูงอายุสั่งหยุดสายได้ทุกเมื่อ ระบบจะแจ้งลูกหลานให้โทรเอง",
];

export default function GuidePage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-10">
      <div>
        <h1 className="m-0 text-[26px] font-extrabold text-ink">คู่มือ อสม.</h1>
        <p className="m-0 mt-1 text-ink-muted">หลานโทรหาเป็นผู้ช่วยของ อสม. ไม่ได้มาแทน อสม. หรือลูกหลาน</p>
      </div>

      <section aria-labelledby="g-status" className={panel}>
        <h2 id="g-status" className="m-0 text-lg font-bold text-ink">
          สถานะแต่ละสี และสิ่งที่ควรทำ
        </h2>
        <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {STATUS_GUIDE.map((g) => (
            <li key={g.status} className="flex gap-3 rounded-xl bg-console-low/60 p-3">
              <StatusDot status={g.status} size="size-8" iconSize="size-4" />
              <div className="min-w-0">
                <div className={`font-bold ${STATUS_META[g.status].text}`}>
                  {STATUS_META[g.status].label}
                </div>
                <p className="m-0 text-[14px] text-ink">
                  <span className="text-ink-muted">เมื่อ: </span>
                  {g.when}
                </p>
                <p className="m-0 text-[14px] text-ink">
                  <span className="text-ink-muted">ทำ: </span>
                  {g.todo}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="g-2q" className={panel}>
        <h2 id="g-2q" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
          <ClipboardList aria-hidden className="size-5" /> คัดกรอง 2Q และงาน 9Q
        </h2>
        <ol className="m-0 mt-3 flex list-decimal flex-col gap-1 pl-5 text-[14px] text-ink">
          <li>AI ถาม 2Q สัปดาห์ละครั้ง เฉพาะผู้สูงอายุที่ยินยอมข้อ 4</li>
          <li>ตอบ “ใช่” ข้อใดข้อหนึ่ง = ผลคัดกรองเบื้องต้นเป็นบวก สถานะจะเป็น “ต้องติดตาม”</li>
          <li>ระบบสร้างงาน 9Q ให้ อสม. ไปประเมินที่บ้านภายใน 7 วัน</li>
          <li>ประเมินแล้วกด “ประเมินแล้ว” ในกล่องงาน 9Q ไม่ต้องใส่คะแนน</li>
        </ol>
        <p className="m-0 mt-3 text-[13px] text-ink-muted">
          เป็นการคัดกรองเพื่อส่งต่อ ไม่ใช่การวินิจฉัย และไม่แสดงคะแนนใน LINE ของลูกหลาน
        </p>
      </section>

      <section id="consent" aria-labelledby="g-consent" className={`${panel} scroll-mt-24`}>
        <h2 id="g-consent" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
          <ShieldCheck aria-hidden className="size-5 text-console-green" /> ความยินยอม 4 ข้อ (PDPA)
        </h2>
        <p className="m-0 mt-2 text-[14px] text-ink">
          ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว อสม. ควรอธิบายให้ผู้สูงอายุฟังตัวต่อตัวทีละข้อ แต่ละข้อแยกกัน และไม่มีการติ๊กไว้ล่วงหน้า
        </p>
        <ol className="m-0 mt-2 flex list-decimal flex-col gap-1 pl-5 text-[14px] text-ink">
          {CONSENTS.map(([c, required]) => (
            <li key={c}>
              {c}
              <span className="ml-1.5 text-[12px] text-ink-muted">
                {required ? "(จำเป็นต่อการให้บริการ)" : "(เลือกได้)"}
              </span>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-2 text-[13px] text-ink-muted">
          ถ้าไม่ยินยอมข้อ 3 ข้อมูลของผู้สูงอายุคนนั้นจะไม่แสดงใน Dashboard นี้ ถ้าไม่ยินยอมข้อ 4 ระบบจะไม่ถาม 2Q
        </p>
        <p className="m-0 mt-2 text-[13px] text-ink-muted">
          สายแรกระบบจะแนะนำตัวว่าเป็นผู้ช่วย AI และขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียง
        </p>
      </section>

      <section aria-labelledby="g-limits" className={panel}>
        <h2 id="g-limits" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
          <Ban aria-hidden className="size-5 text-brand-900" /> สิ่งที่ระบบไม่ได้ทำ
        </h2>
        <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-[14px] text-ink">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="m-0 mt-3 text-[14px] font-bold text-ink">
          เหตุฉุกเฉินโทร{" "}
          <a href="tel:1669" className="text-brand-900 underline">
            1669
          </a>
        </p>
      </section>
    </div>
  );
}
