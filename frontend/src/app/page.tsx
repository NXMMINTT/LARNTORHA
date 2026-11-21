// Home page (CLAUDE.md §7.4). Red & white public theme, laid out after the team's FinLens page:
// floating pill nav → hero with stacked mockups → what it does (4 cards) → LINE demo (phone) →
// status levels → how it works (01–04) → what the AI won't do → pricing ticket → FAQ → CTA → footer.
// Icons only (lucide-react) — no emoji anywhere on this page.
import {
  Ban,
  Bot,
  Check,
  CircleCheck,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  Siren,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, STATUS_META } from "@/components/Badge";
import { HeroFlow } from "@/components/home/HeroFlow";
import { LineDemo } from "@/components/home/LineDemo";
import { Logo, Mascot, type Pose } from "@/components/Brand";
import { BrandMark } from "@/components/SiteChrome";
import { PLANS } from "@/lib/constants";
import { anuphan } from "@/lib/fonts";
import type { ElderStatus } from "@/lib/types";

const LINE_OA_URL = process.env.NEXT_PUBLIC_LINE_OA_URL ?? null;

const NAV = [
  ["#features", "ใครได้อะไร"],
  ["#line", "ตัวอย่าง LINE"],
  ["#ai", "AI ทำงานอย่างไร"],
  ["#pricing", "ค่าบริการ"],
  ["#faq", "ถามบ่อย"],
] as const;

const btnRed =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-brand-600 px-7 text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(225,29,46,.28)] transition hover:bg-brand-900";
const btnLine =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#06c755] px-7 text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(6,199,85,.3)] transition hover:bg-[#05b34c]";

// ------------------------------------------------------------------ small pieces

/** Four-point sparkle, decorative. */
function Sparkle({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute animate-sparkle text-brand-600/35 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <svg viewBox="0 0 24 24" className="size-full" fill="currentColor">
        <path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z" />
      </svg>
    </span>
  );
}

function SectionTitle({ id, children, sub }: { id: string; children: ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h2
        id={id}
        className="relative m-0 self-center font-display text-[30px] font-bold leading-snug md:text-[38px]"
      >
        <span className="max-md:hidden">
          <Sparkle className="-left-12 top-0 size-7" />
          <Sparkle className="-left-5 top-9 size-3.5" delay={600} />
          <Sparkle className="-right-12 top-1 size-5" delay={300} />
        </span>
        {children}
      </h2>
      {sub && <p className="m-0 text-ink-muted">{sub}</p>}
    </div>
  );
}

/** Chat-bubble interlude: a family member says something, หลานโทรหา answers. */
function Interlude({ ask, reply, tint = false }: { ask: string; reply: string; tint?: boolean }) {
  return (
    <div
      aria-hidden
      className={`flex min-h-[132px] flex-col items-center gap-2.5 px-5 py-10 text-[16px] md:text-[17px] ${tint ? "bg-brand-50" : ""}`}
    >
      <div className="flex max-w-full items-end gap-2.5 self-start sm:self-auto md:-ml-28">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <UserRound className="size-5" />
        </span>
        <span className="rounded-[20px] rounded-bl-md bg-white px-[18px] py-2.5 shadow-[0_4px_14px_rgba(120,20,30,.08)]">
          {ask}
        </span>
      </div>
      <div className="flex max-w-full items-end gap-2.5 self-end sm:self-auto md:ml-28">
        <span className="animate-pop rounded-[20px] rounded-br-md bg-brand-600 px-[18px] py-2.5 text-white">
          {reply}
        </span>
        <BrandMark className="size-10 rounded-full" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ one call, three people

const panel =
  "flex flex-col gap-2 rounded-2xl border border-[#f0dcdd] bg-white p-4 text-[13px] leading-snug text-[#1e293b] shadow-[0_8px_24px_rgba(80,20,25,.08)]";

const DASH_ROWS: { name: string; status: ElderStatus; reason: string }[] = [
  { name: "ตาสมชาย", status: "red", reason: "เจ็บหน้าอก" },
  { name: "ยายสำลี", status: "yellow", reason: "ลืมยา 4 วัน" },
  { name: "ยายมาลี", status: "unreachable", reason: "ไม่รับสาย 2 ครั้ง" },
  { name: "ยายสมศรี", status: "green", reason: "ผักบุ้งขึ้นแล้ว" },
];

function AudienceCard({
  pose,
  who,
  title,
  points,
  children,
}: {
  pose: Pose;
  who: string;
  title: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <article className="relative flex flex-col gap-4 rounded-[24px] border border-brand-100 bg-brand-50 p-6">
      <Mascot pose={pose} className="absolute -top-6 right-3 h-28 w-auto drop-shadow-md" />
      <span className="self-start rounded-full bg-brand-600 px-3 py-1 text-[15px] font-bold text-white">
        {who}
      </span>
      <h3 className="m-0 font-display text-[22px] font-bold leading-snug">{title}</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-base text-ink-muted">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-brand-600" strokeWidth={3} />
            {p}
          </li>
        ))}
      </ul>
      <div aria-hidden className="mt-auto pt-2">
        {children}
      </div>
    </article>
  );
}

function Audience() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-24 px-5 py-16 md:px-6"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
        <SectionTitle id="features-title" sub="ผู้สูงอายุแค่รับสาย แล้วแต่ละคนได้ข้อมูลเท่าที่ต้องใช้">
          หนึ่งสาย <span className="marker">ถึงสามคน</span>
        </SectionTitle>
        <div className="grid gap-5 lg:grid-cols-3">
          <AudienceCard
            pose="call"
            who="ผู้สูงอายุ"
            title="มีคนโทรมาถามไถ่ทุกวัน"
            points={[
              "ผู้ช่วย AI บอกชัดว่าเป็น AI คุยภาษาไทย เข้าใจภาษาถิ่นทุกภาค เหนือ อีสาน ใต้",
              "ถามเรื่องกินยาตามตารางที่ลูกหลานตั้งไว้",
              "จำเรื่องที่เล่าเมื่อวานได้ บอกให้หยุดได้ทุกเมื่อ",
            ]}
          >
            <div className={panel}>
              <span className="self-start rounded-xl rounded-tl-sm bg-[#f8eeee] px-2.5 py-1.5">
                ผักบุ้งที่ยายปลูกไว้ เก็บได้หรือยังคะ แล้วยาความดันตอนเช้ากินแล้วหรือยัง
              </span>
              <span className="self-end rounded-xl rounded-tr-sm bg-brand-100 px-2.5 py-1.5 text-brand-900">
                กินแล้วจ้า ผักบุ้งขึ้นงามเลยเด้อ
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#8a7275]">
                <Clock className="size-3" /> 09:00 น. · คุย 4 นาที
              </span>
            </div>
          </AudienceCard>

          <AudienceCard
            pose="report"
            who="ลูกหลาน"
            title="รู้ทุกวันผ่าน LINE"
            points={[
              "การ์ดสรุปสั้น อบอุ่น ไม่มีศัพท์แพทย์",
              "เห็นว่ากินยาแล้วหรือยัง พร้อมสถานะสีเขียว เหลือง แดง",
              "กด “แจ้ง อสม.” ให้ช่วยไปดูได้จากการ์ด",
            ]}
          >
            <div className="overflow-hidden rounded-2xl border border-[#f0dcdd] bg-white text-[13px] leading-snug text-[#1e293b] shadow-[0_8px_24px_rgba(80,20,25,.08)]">
              <span className="flex items-center gap-1.5 bg-[#16a34a] px-3 py-2 font-bold text-white">
                <CircleCheck className="size-4" strokeWidth={2.5} /> ยายสมศรี — ปกติ
              </span>
              <span className="flex flex-col gap-1.5 px-3 py-2.5">
                <span>
                  <b>วันนี้เล่าว่า</b> ผักบุ้งที่ปลูกไว้ขึ้นแล้ว ดีใจมาก
                </span>
                <span className="flex items-center gap-1">
                  <Check className="size-3.5 text-[#16a34a]" strokeWidth={3} /> กินยาเช้าแล้ว
                </span>
              </span>
              <span className="block border-t border-[#e2e8f0] py-1.5 text-center font-bold text-[#06c755]">
                รับทราบ
              </span>
            </div>
          </AudienceCard>

          <AudienceCard
            pose="screen"
            who="อสม. ในพื้นที่"
            title="รู้ว่าควรเยี่ยมใครก่อน"
            points={[
              "Dashboard เรียงผู้สูงอายุตามความเสี่ยง",
              "อ่านสรุปย้อนหลัง 14 วัน พร้อมหลักฐานจากบทสนทนา",
              "ได้แจ้งเตือนทาง LINE เมื่อมีเรื่องควรติดตาม",
            ]}
          >
            <div className={panel}>
              <b className="text-[12px] text-[#64748b]">ควรเยี่ยมก่อน · วันนี้</b>
              {DASH_ROWS.map((r) => (
                <span key={r.name} className="flex items-center justify-between gap-2">
                  <span className="w-16 shrink-0 font-semibold">{r.name}</span>
                  <span className="flex-1 truncate text-[#64748b]">{r.reason}</span>
                  <Badge status={r.status} />
                </span>
              ))}
            </div>
          </AudienceCard>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ how the AI reads a call

const AI_STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileText,
    title: "รับบทสนทนาหลังวางสาย",
    body: "ส่งแค่ข้อความ ชื่อเรียก อายุ และตารางยา ไม่ส่งเบอร์โทรหรือชื่อลูกหลานให้ AI",
  },
  {
    icon: Bot,
    title: "Amazon Bedrock สรุปและจัดระดับ",
    body: "เขียนสรุป 2 ฉบับ ฉบับลูกหลานอ่านง่าย ฉบับ อสม. มีเหตุผลและหลักฐานจากบทสนทนา",
  },
  {
    icon: ShieldCheck,
    title: "กฎความปลอดภัยตรวจซ้ำ",
    body: "จับคำอันตรายทั้งภาษากลางและภาษาถิ่นทุกภาค เช่น “เจ็บเอิก” “ปวดหัวจังหู” ยกระดับได้ แต่ไม่ลดระดับที่ AI ให้",
  },
  {
    icon: UserRound,
    title: "ไม่แน่ใจ ให้คนจริงดู",
    body: "ถ้า AI สรุปไม่สำเร็จ ระบบตั้งเป็น “ควรติดตาม” ให้ อสม. โทรตรวจสอบเอง",
  },
];

function AiSection() {
  return (
    <section id="ai" aria-labelledby="ai-title" className="scroll-mt-24 px-5 py-16 md:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-5">
          <span className="self-start rounded-md bg-brand-50 px-2.5 py-1 text-[14px] font-bold text-brand-600">
            เบื้องหลังทุกสาย
          </span>
          <h2
            id="ai-title"
            className="m-0 font-display text-[30px] font-bold leading-snug md:text-[38px]"
          >
            AI อ่านทุกสาย
            <br />
            <span className="marker">บอกว่าควรห่วงแค่ไหน</span>
          </h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {AI_STEPS.map(({ icon: I, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <I aria-hidden className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="font-bold">{title}</span>
                  <span className="text-base text-ink-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* transcript -> analysis mock */}
        <figure
          aria-label="ตัวอย่าง: ผู้สูงอายุพูดว่าเจ็บเอิกหลาย ระบบจัดเป็นเร่งด่วน พร้อมหลักฐานจากบทสนทนา"
          className="relative m-0 flex flex-col gap-3 text-[14px] leading-snug text-[#1e293b]"
        >
          <Mascot
            pose="alert"
            className="absolute -right-4 bottom-[-22px] z-10 h-28 w-auto drop-shadow-md sm:-right-12 sm:h-32"
          />
          <div className="rounded-2xl border border-[#f0dcdd] bg-white p-4 shadow-[0_8px_24px_rgba(80,20,25,.08)]">
            <b className="text-[12px] text-[#64748b]">บทสนทนา (ตัวอย่าง)</b>
            <p className="m-0 mt-2">
              <span className="font-semibold text-[#64748b]">AI:</span> มื้อนี้เป็นจั่งใดแน่คะพ่อ
            </p>
            <p className="m-0 mt-1">
              <span className="font-semibold text-[#64748b]">ผู้สูงอายุ:</span>{" "}
              <mark className="rounded bg-[#fee2e2] px-0.5 text-[#991b1b]">
                เจ็บเอิกหลายเด้อ ตั้งแต่เช้า
              </mark>{" "}
              หายใจบ่ค่อยอิ่ม
            </p>
          </div>
          <span
            aria-hidden
            className="mx-auto flex items-center gap-2 text-[13px] font-bold text-brand-600"
          >
            <Bot className="size-4" /> Amazon Bedrock + กฎความปลอดภัย
          </span>
          <div className="overflow-hidden rounded-2xl border border-[#f0dcdd] bg-white shadow-[0_18px_40px_rgba(80,20,25,.14)]">
            <div className="flex items-center justify-between gap-2 bg-[#dc2626] px-4 py-2.5 text-white">
              <b className="flex items-center gap-1.5">
                <Siren aria-hidden className="size-4" /> เร่งด่วน
              </b>
              <span className="text-[12px] opacity-90">มุมมองของ อสม.</span>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <span>
                <b>เหตุผล</b> เจ็บหน้าอกและหายใจลำบากตั้งแต่เช้า
              </span>
              <span className="border-l-[3px] border-[#fecaca] pl-2.5 italic text-[#475569]">
                “เจ็บเอิกหลายเด้อ ตั้งแต่เช้า”
                <span className="ml-1.5 text-[11px] not-italic text-[#94a3b8]">จากบทสนทนา</span>
              </span>
              <span className="flex flex-wrap gap-1.5 text-[12px]">
                <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 font-semibold text-[#991b1b]">
                  กฎความปลอดภัย: เจ็บเอิก
                </span>
                <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[#475569]">
                  แนะนำ 1669 แล้ว
                </span>
              </span>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ levels

const LEVELS: { status: ElderStatus; name: string; body: string; then: string }[] = [
  {
    status: "red",
    name: "เร่งด่วน",
    body: "พูดถึงอาการที่อาจอันตรายเฉียบพลัน เช่น เจ็บหน้าอก หายใจไม่ออก ล้มศีรษะกระแทก",
    then: "AI แนะนำให้โทร 1669 แจ้งลูกหลานและ อสม. ทันที",
  },
  {
    status: "yellow",
    name: "ควรติดตาม",
    body: "ลืมกินยาหลายวัน ไม่สบายแต่ไม่เฉียบพลัน ฟังไม่ชัด หรือโทรแล้วติดต่อไม่ได้",
    then: "แจ้งลูกหลาน และ อสม. ในพื้นที่ช่วยติดตาม",
  },
  {
    status: "green",
    name: "ไม่พบสัญญาณผิดปกติ",
    body: "ไม่พบสัญญาณผิดปกติในสายนี้ ซึ่งไม่ได้หมายความว่าปลอดภัยแน่นอน",
    then: "ส่งสรุปประจำวันให้ลูกหลาน",
  },
];

function Levels() {
  return (
    <section id="levels" aria-labelledby="levels-title" className="scroll-mt-24 px-5 py-16 md:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_10px_30px_rgba(120,20,30,.06)] md:p-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <span className="self-start rounded-md bg-brand-50 px-2.5 py-1 text-[14px] font-bold text-brand-600">
            ระดับสถานะ
          </span>
          <h2
            id="levels-title"
            className="m-0 font-display text-[30px] font-bold leading-snug md:text-[36px]"
          >
            แจ้งผลชัดเจน <span className="marker">3 ระดับ</span>
          </h2>
          <p className="m-0 text-ink-muted">
            สรุปและระดับความเสี่ยงสร้างโดย AI (Amazon Bedrock) ร่วมกับกฎความปลอดภัย ใช้ประกอบการตัดสินใจของคน
            ไม่ใช่การวินิจฉัย
          </p>
          <p className="m-0 flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[15px] text-ink">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
            ถ้าไม่แน่ใจระหว่างสองระดับ ระบบเลือกระดับที่สูงกว่าเสมอ
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {LEVELS.map((l) => {
            const m = STATUS_META[l.status];
            const I = m.icon;
            return (
              <li key={l.status} className="flex gap-4 rounded-[20px] border border-line p-5">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${m.tint}`}
                >
                  <I aria-hidden className="size-6" strokeWidth={2.25} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-[20px] font-bold">{l.name}</span>
                  <span className="text-[15px] text-ink-muted">{l.body}</span>
                  <span className="mt-1 flex items-start gap-2 text-[15px] font-semibold">
                    <Check
                      aria-hidden
                      className={`mt-1 size-4 shrink-0 ${m.text}`}
                      strokeWidth={3}
                    />
                    {l.then}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ how it works

const STEPS: { title: string; body: string; foot: ReactNode }[] = [
  {
    title: "โทรตามเวลาที่เลือก",
    body: "เช่น 09:00 ทุกวัน ผู้สูงอายุแค่รับสาย ใช้มือถือปุ่มกดก็ได้",
    foot: (
      <span className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-1.5 text-[14px]">
        <Clock aria-hidden className="size-4 text-brand-600" /> 09:00 น.
      </span>
    ),
  },
  {
    title: "แนะนำตัวว่าเป็น AI",
    body: "ไม่แอบอ้างเป็นคน เจ้าหน้าที่ หรือแพทย์ และบอกให้หยุดได้ทุกเมื่อ",
    foot: (
      <span className="rounded-2xl rounded-bl-sm bg-[#f8eeee] px-3 py-1.5 text-[14px]">
        หนูน้องหลาน ผู้ช่วย AI นะคะ
      </span>
    ),
  },
  {
    title: "ชวนคุย เตือนกินยา",
    body: "ถามไถ่ความเป็นอยู่ 3–5 นาที และถามเรื่องยาตามตาราง",
    foot: (
      <span className="rounded-2xl rounded-br-sm bg-brand-100 px-3 py-1.5 text-[14px] text-brand-900">
        กินแล้วจ้า
      </span>
    ),
  },
  {
    title: "สรุปภายใน 5 นาที",
    body: "ลูกหลานได้การ์ดใน LINE อสม. เห็นบน Dashboard เรียงตามความเสี่ยง",
    foot: (
      <span className="flex flex-wrap gap-1.5">
        <Badge status="green" />
        <Badge status="yellow" />
        <Badge status="red" />
      </span>
    ),
  },
];

function How() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-24 bg-white px-5 py-16 md:px-6"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
        <SectionTitle id="how-title">
          ทำงานอย่างไร <span className="marker">4 ขั้น</span>
        </SectionTitle>
        <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="relative flex flex-col gap-3 rounded-[24px] border border-brand-100 bg-white p-6"
            >
              <span
                aria-hidden
                className="font-display text-[44px] font-bold leading-none text-brand-600/25"
              >
                0{i + 1}
              </span>
              <h3 className="m-0 font-display text-[22px] font-bold">{s.title}</h3>
              <p className="m-0 text-ink-muted">{s.body}</p>
              <div aria-hidden className="mt-auto flex min-h-[56px] items-end">
                {s.foot}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ safety

const WONT = [
  "แนะนำยา ขนาดยา หรือการรักษา",
  "วินิจฉัยโรค",
  "ถามเรื่องเงิน เลขบัญชี หรือ OTP",
  "เรียกรถพยาบาลเอง (แนะนำให้โทร 1669)",
];
const PRIVACY = [
  "ขอความยินยอมแยก 4 ข้อตาม PDPA",
  "ผู้สูงอายุยืนยันด้วยเสียงในสายแรก",
  "เก็บเฉพาะผลสรุป ไม่เก็บบทสนทนาเต็ม",
  "เรื่องคัดกรองสุขภาพใจแจ้งเฉพาะ อสม.",
];

function Safety() {
  return (
    <section
      id="safety"
      aria-labelledby="safety-title"
      className="scroll-mt-24 bg-brand-50 px-5 py-16 md:px-6"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
        <SectionTitle id="safety-title" sub="ผู้ช่วยที่รู้ขอบเขตของตัวเอง">
          สิ่งที่ <span className="marker">AI จะไม่ทำ</span>
        </SectionTitle>
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            { icon: Ban, title: "AI จะไม่ทำ", items: WONT },
            { icon: Lock, title: "ความเป็นส่วนตัว", items: PRIVACY },
          ].map(({ icon: I, title, items }) => (
            <article
              key={title}
              className="flex flex-col gap-4 rounded-[24px] border border-brand-100 bg-white p-6 shadow-[0_6px_20px_rgba(120,20,30,.05)]"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <I aria-hidden className="size-6" />
              </span>
              <h3 className="m-0 font-display text-[22px] font-bold">{title}</h3>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {items.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              {title === "ความเป็นส่วนตัว" && (
                <Link
                  href="/privacy"
                  className="mt-auto font-semibold text-brand-600 underline underline-offset-4"
                >
                  อ่านนโยบายความเป็นส่วนตัว
                </Link>
              )}
            </article>
          ))}
          <article className="flex flex-col gap-3 rounded-[24px] bg-brand-600 p-6 text-white shadow-[0_18px_30px_rgba(225,29,46,.25)]">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <Siren aria-hidden className="size-6" />
            </span>
            <h3 className="m-0 font-display text-[22px] font-bold">บริการนี้ไม่ใช่สายด่วน</h3>
            <p className="m-0 text-white/85">
              ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค หากเกิดเหตุฉุกเฉินโปรดโทร
            </p>
            <a
              href="tel:1669"
              className="mt-auto pt-4 font-display text-7xl font-bold text-white hover:text-brand-100"
            >
              1669
            </a>
            <span className="text-white/75">สายด่วนการแพทย์ฉุกเฉิน</span>
          </article>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ pricing

const INCLUDED: [string, string][] = [
  ["ผู้ช่วย AI โทรถามไถ่ตามความถี่ที่เลือก", "คุยภาษาไทย เข้าใจภาษาถิ่นทุกภาค จำเรื่องเดิมได้"],
  ["เตือนกินยาตามตาราง", "สูงสุด 8 รายการ ไม่แนะนำยาหรือขนาดยา"],
  ["สรุปเข้า LINE ลูกหลานทุกสาย", "พร้อมสถานะ และปุ่มแจ้ง อสม."],
  ["อสม. ในพื้นที่ช่วยติดตาม", "เมื่อมีเรื่องควรติดตามหรือเร่งด่วน"],
];

function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-24 bg-white px-5 py-16 md:px-6"
    >
      <div className="mx-auto flex max-w-[920px] flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Mascot pose="hug" className="h-28 w-auto" />
          <div className="flex flex-col gap-2">
            <h2
              id="pricing-title"
              className="m-0 font-display text-[30px] font-bold leading-tight md:text-[38px]"
            >
              เลือก<span className="text-brand-600">ความถี่</span>ที่เหมาะกับครอบครัว
            </h2>
            <p className="m-0 text-ink-muted">
              ราคาต่อเดือน ต่อผู้สูงอายุ 1 ท่าน · เริ่มสมัครโดยติดต่อ อสม. ในพื้นที่
            </p>
          </div>
        </div>
        <article className="w-full max-w-[820px] drop-shadow-[0_18px_30px_rgba(120,20,30,.12)]">
          <div className="relative grid overflow-hidden rounded-[24px] bg-white md:grid-cols-[1fr_1fr]">
            <div className="relative flex flex-col gap-3 bg-brand-50 px-7 pb-7 pt-8 md:px-9">
              <span className="absolute right-5 top-5 rotate-[8deg] rounded-lg border-2 border-dashed border-brand-600 px-2.5 py-0.5 text-[13px] font-bold tracking-wide text-brand-600">
                ต่อเดือน
              </span>
              <h3 className="m-0 font-display text-[26px] font-bold">แพ็กเกจ</h3>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {PLANS.map((p) => {
                  const hot = p.id === "standard";
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${hot ? "bg-brand-600 text-white" : "bg-white"}`}
                    >
                      <span className="flex flex-col leading-snug">
                        <span className="font-bold">
                          {p.name}
                          {hot && (
                            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[12px] font-bold text-brand-600">
                              แนะนำ
                            </span>
                          )}
                        </span>
                        <span className={`text-[14px] ${hot ? "text-white/85" : "text-ink-muted"}`}>
                          {p.detail}
                        </span>
                      </span>
                      <span className="whitespace-nowrap font-display text-[20px] font-bold">
                        {p.price.replace("/เดือน", "")}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link href="/register" className={`${btnRed} mt-2`}>
                สมัครบริการ
              </Link>
            </div>
            <div className="flex flex-col gap-1 border-t-2 border-dashed border-line px-7 py-7 md:border-l-2 md:border-t-0 md:px-9 md:py-8">
              <span className="mb-3 text-[13px] font-bold tracking-wide text-ink-muted">สิ่งที่ได้</span>
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {INCLUDED.map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold">{t}</span>
                      <span className="text-[14px] text-ink-muted">{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-auto pt-6 text-[13px] text-ink-muted">
                ช่วงทดลองยังไม่เปิดรับชำระเงิน
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ FAQ

const FAQ: [string, string][] = [
  [
    "คนที่โทรไปเป็นคนจริงหรือ AI",
    "เป็นผู้ช่วย AI ค่ะ และบอกตั้งแต่ต้นสายทุกครั้งว่าเป็น AI ไม่แอบอ้างเป็นลูกหลาน เจ้าหน้าที่ หรือแพทย์",
  ],
  ["ผู้สูงอายุต้องมีสมาร์ทโฟนไหม", "ไม่ต้องค่ะ แค่รับสายโทรศัพท์ธรรมดา มือถือปุ่มกดก็ใช้ได้ ส่วนลูกหลานรับสรุปทาง LINE"],
  [
    "ถ้าเกิดเหตุฉุกเฉินระหว่างสายจะทำอย่างไร",
    "ผู้ช่วย AI จะแนะนำให้โทร 1669 ทันที แล้วส่งการ์ดเร่งด่วนถึงลูกหลานและ อสม. แต่ระบบเรียกรถพยาบาลเองไม่ได้ และไม่ใช่สายด่วน",
  ],
  [
    "สถานะสีเขียวแปลว่าปลอดภัยใช่ไหม",
    "ไม่ใช่ค่ะ สีเขียวแปลว่าไม่พบสัญญาณผิดปกติในสายนั้นเท่านั้น ไม่ได้ยืนยันว่าปลอดภัย และไม่ใช่การวินิจฉัย",
  ],
  [
    "เก็บข้อมูลอะไรบ้าง",
    "เก็บเฉพาะผลสรุปของแต่ละสาย ไม่เก็บบทสนทนาเต็มเป็นค่าเริ่มต้น ขอความยินยอมแยก 4 ข้อ และผู้สูงอายุยืนยันด้วยเสียงในสายแรก",
  ],
  [
    "ทำไมต้องสมัครผ่าน อสม.",
    "อสม. จะอธิบายบริการให้ผู้สูงอายุฟังตัวต่อตัวก่อน และเป็นคนในพื้นที่ที่ช่วยติดตามเมื่อมีเรื่องควรดูแล ใช้รหัส อสม. ตอนสมัคร",
  ],
  ["หยุดบริการได้ไหม", "ได้ทุกเมื่อค่ะ ผู้สูงอายุบอกให้หยุดระหว่างสายได้ หรือลูกหลานแจ้งผ่าน อสม. ในพื้นที่"],
];

function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-24 bg-brand-50 px-5 py-16 md:px-6"
    >
      <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col items-start gap-3">
          <h2
            id="faq-title"
            className="m-0 font-display text-[30px] font-bold leading-tight md:text-[40px]"
          >
            คำถามที่พบบ่อย
          </h2>
          <p className="m-0 text-ink-muted">ไม่เจอคำตอบ สอบถาม อสม. ในพื้นที่ได้เลยค่ะ</p>
          <span className="relative mt-2 max-lg:hidden">
            <Mascot pose="headset" className="h-36 w-auto animate-bob" />
            <Sparkle className="-right-4 top-0 size-6" />
            <Sparkle className="-left-4 bottom-4 size-4" delay={700} />
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => (
            <details
              key={q}
              className="group rounded-2xl border border-brand-100 bg-white open:shadow-[0_6px_20px_rgba(120,20,30,.06)]"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="m-0 flex gap-2.5 px-5 pb-4 text-ink-muted">
                <BrandMark className="size-7 rounded-full" />
                <span>{a}</span>
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ page

export default function Home() {
  return (
    <div
      className={`theme-public ${anuphan.variable} flex flex-1 flex-col overflow-x-clip bg-white text-[17px] leading-relaxed text-ink`}
    >
      {/* floating pill nav */}
      <header className="pointer-events-none sticky top-0 z-20 px-3 pt-3 md:px-6">
        <div className="pointer-events-auto mx-auto flex max-w-[1120px] items-center justify-between gap-2 rounded-full border border-brand-100 bg-white/90 py-1.5 pl-3 pr-1.5 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] backdrop-blur md:pl-4">
          <Link
            href="/"
            aria-label="หลานโทรหา หน้าแรก"
            className="flex shrink-0 items-center gap-2 rounded-full"
          >
            <Logo priority className="h-11 w-auto" />
          </Link>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-0.5 text-[15px] lg:flex">
            {NAV.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3.5 font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-600"
              >
                {label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 font-bold text-white hover:bg-brand-900"
          >
            <UserRound aria-hidden className="size-5" />
            <span className="max-sm:sr-only">เข้าสู่ระบบ อสม.</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section aria-labelledby="hero-title" className="relative bg-white">
          <div className="mx-auto grid max-w-[1200px] items-center gap-x-10 gap-y-12 px-5 pb-16 pt-10 md:px-6 lg:min-h-[min(calc(100svh-66px),780px)] lg:grid-cols-[1.05fr_1fr] lg:py-10">
            <div className="relative flex min-w-0 flex-col items-center gap-5 text-center sm:items-stretch sm:text-left">
              <span className="max-lg:hidden">
                <Sparkle className="left-[-3%] top-[8%] size-6" delay={200} />
                <Sparkle className="bottom-[4%] left-[40%] size-4" delay={1400} />
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-[15px] font-semibold text-brand-600 sm:self-start">
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-600 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand-600" />
                </span>
                ผู้ช่วย AI โทรถามไถ่ผู้สูงอายุที่อยู่คนเดียว
              </span>
              <h1
                id="hero-title"
                className="m-0 font-display text-[34px] font-bold leading-[1.3] tracking-tight sm:text-[42px] lg:text-[50px]"
              >
                <span className="block">มีคนถามไถ่ทุกวัน</span>
                <span className="block text-brand-600">แม้ลูกหลานจะอยู่ไกล</span>
              </h1>
              <p className="m-0 max-w-[540px] text-[17px] leading-[1.7] text-ink-muted sm:text-lg">
                โทรคุยกับผู้สูงอายุวันละครั้งด้วยเสียงภาษาไทย เตือนกินยา แล้วส่งสรุปเข้า LINE ลูกหลาน พร้อมช่วยให้ อสม.
                ในพื้นที่รู้ว่าควรเยี่ยมใครก่อน
              </p>
              <p className="m-0 w-full max-w-[540px] rounded-2xl bg-brand-50 px-4 py-3 font-bold text-ink sm:bg-transparent sm:p-0 sm:text-lg">
                ผู้สูงอายุแค่รับสาย มือถือปุ่มกดก็ใช้ได้
              </p>
              <div className="mt-1 flex w-full flex-wrap items-center gap-3 max-sm:flex-col">
                <Link href="/register" className={`${btnRed} max-sm:w-full`}>
                  สมัครบริการ
                </Link>
                {LINE_OA_URL && (
                  <a
                    href={LINE_OA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btnLine} max-sm:w-full`}
                  >
                    เพิ่มเพื่อน LINE
                  </a>
                )}
              </div>
              <p className="m-0 text-[14px] text-ink-muted">
                เริ่มต้น ฿199/เดือน · สมัครผ่าน อสม. ในพื้นที่ · หยุดได้ทุกเมื่อ
              </p>
            </div>
            <HeroFlow />
          </div>
        </section>

        <Audience />

        <Interlude
          tint
          ask="ทำงานอยู่กรุงเทพฯ ไม่รู้เลยว่าวันนี้แม่กินยาหรือยัง"
          reply="เดี๋ยวหนูโทรถามให้ แล้วสรุปส่ง LINE นะคะ"
        />

        <section
          id="line"
          aria-labelledby="line-title"
          className="relative scroll-mt-24 bg-brand-50 px-5 py-14 md:px-6 lg:py-0"
        >
          <LineDemo />
        </section>

        <Interlude
          ask="ถ้าวันไหนพ่อบอกว่าเจ็บหน้าอกล่ะ?"
          reply="หนูแนะนำให้โทร 1669 ทันที แล้วแจ้งคุณกับ อสม. ในพื้นที่ค่ะ"
        />

        <AiSection />

        <Levels />
        <How />
        <Safety />
        <Pricing />
        <Faq />

        {/* closing CTA */}
        <section className="px-5 py-16 md:px-6">
          <div className="relative mx-auto flex max-w-[1100px] flex-col items-center gap-5 overflow-hidden rounded-[28px] bg-brand-600 px-6 py-14 text-center text-white">
            <span
              aria-hidden
              className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10"
            />
            <span
              aria-hidden
              className="absolute -bottom-24 -left-10 size-60 rounded-full bg-white/5"
            />
            <span className="relative flex size-28 animate-bob items-center justify-center rounded-full bg-white shadow-lg">
              <Mascot pose="wink" className="h-24 w-auto" />
            </span>
            <h2 className="relative m-0 font-display text-[30px] font-bold leading-snug md:text-[38px]">
              ให้ทุกวันมีคนถามไถ่
            </h2>
            <p className="relative m-0 max-w-xl text-white/85">
              ขอรหัส อสม. ในพื้นที่ แล้วลูกหลานสมัครออนไลน์ได้ในไม่กี่นาที สายแรกจะขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียง
            </p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex min-h-[52px] items-center rounded-full bg-white px-7 text-[17px] font-bold text-brand-600 hover:bg-brand-50"
              >
                สมัครบริการ
              </Link>
              {LINE_OA_URL && (
                <a href={LINE_OA_URL} target="_blank" rel="noopener noreferrer" className={btnLine}>
                  เพิ่มเพื่อน LINE
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-6">
          <div className="flex flex-col gap-2">
            <Logo className="h-14 w-auto self-start" />
            <p className="m-0 max-w-sm text-[15px] text-ink-muted">
              ผู้ช่วย AI โทรถามไถ่ผู้สูงอายุ เชื่อมครอบครัวและ อสม. ในพื้นที่
            </p>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px]">
            <li>
              <Link href="/register" className="hover:text-brand-600">
                สมัครบริการ
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-brand-600">
                เข้าสู่ระบบ อสม.
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-brand-600">
                นโยบายความเป็นส่วนตัว (ร่าง)
              </Link>
            </li>
            <li>
              <a href="tel:1323" className="hover:text-brand-600">
                สายด่วนสุขภาพจิต 1323
              </a>
            </li>
          </ul>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto m-0 max-w-[1100px] px-5 py-5 text-[14px] text-ink-muted md:px-6">
            ไม่ใช่สายด่วน ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค · เหตุฉุกเฉินโทร{" "}
            <a href="tel:1669" className="font-bold text-brand-600 underline">
              1669
            </a>{" "}
            · © 2569 หลานโทรหา · AI for All Hackathon
          </p>
        </div>
      </footer>
    </div>
  );
}
