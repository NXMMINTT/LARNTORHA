import type { Metadata } from "next";

import { Notice } from "@/components/Notice";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว (ร่าง)" };

export default function PrivacyPage() {
  return (
    <div className="theme-public flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-bold text-brand-900">นโยบายความเป็นส่วนตัว</h1>
        <Notice variant="warn" title="ร่าง — อยู่ระหว่างการตรวจโดยที่ปรึกษา PDPA">
          เนื้อหานี้ยังไม่ใช่ฉบับสมบูรณ์และอาจเปลี่ยนแปลง
        </Notice>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">ข้อมูลที่เก็บ</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>ข้อมูลผู้สมัคร (ลูกหลาน): ชื่อ เบอร์โทร ความสัมพันธ์ และบัญชี LINE ที่เชื่อมไว้</li>
            <li>ข้อมูลผู้สูงอายุ: ชื่อเรียก อายุ เบอร์โทร เวลาโทร และตารางยา</li>
            <li>
              ผลสรุปของแต่ละสาย เช่น สรุปเรื่องที่คุย ระดับความเสี่ยง และการกินยา
              <strong> ระบบไม่เก็บข้อความบทสนทนาฉบับเต็มเป็นค่าเริ่มต้น</strong>
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">ความยินยอม 4 ข้อ (แยกกัน)</h2>
          <ol className="list-decimal space-y-1 pl-6">
            <li>บันทึกและประมวลผลบทสนทนา (จำเป็นต่อการให้บริการ)</li>
            <li>ส่งสรุปการโทรให้ลูกหลานทาง LINE (จำเป็นต่อการให้บริการ)</li>
            <li>แบ่งปันสรุปและระดับความเสี่ยงกับ อสม. ในพื้นที่ (ไม่บังคับ)</li>
            <li>คัดกรองภาวะอารมณ์ด้วยคำถาม 2 ข้อ (ไม่บังคับ) ผลจะแจ้งเฉพาะ อสม. ไม่แสดงให้ลูกหลานเห็น</li>
          </ol>
          <p>ผู้สูงอายุจะได้รับการขอให้ยืนยันความยินยอมด้วยเสียงในสายแรก และบอกให้หยุดได้ทุกเมื่อ</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">การประมวลผลด้วย AI</h2>
          <p>
            ข้อความจากสายถูกส่งไปสรุปด้วย Amazon Bedrock โดยไม่ส่งเบอร์โทร ชื่อลูกหลาน หรือข้อมูล อสม. ไปด้วย
            ภูมิภาคที่ข้อมูลอาจถูกประมวลผลจะระบุไว้ในฉบับสมบูรณ์
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">ข้อจำกัดของบริการ</h2>
          <p>
            บริการนี้ไม่ใช่สายด่วน ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค หากเกิดเหตุฉุกเฉินโปรดโทร 1669
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
