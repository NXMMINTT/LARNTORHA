// Home page (CLAUDE.md §7.4). Red & white public theme, laid out after the team's FinLens page:
// floating pill nav → hero with stacked mockups → what it does (4 cards) → LINE demo (phone) →
// how it works (01–04) → pricing ticket → FAQ → CTA → footer.
// ("AI อ่านทุกสาย", "3 ระดับ" and "สิ่งที่ AI จะไม่ทำ" sections removed 2026-11-21, team decision.)
// Icons only (lucide-react) — no emoji anywhere on this page.
import { Check, Clock, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/Badge";
import { FlexBubble } from "@/components/demo/FlexPreview";
import { ChatInterlude } from "@/components/home/ChatInterlude";
import { HeroFlow } from "@/components/home/HeroFlow";
import { HomeFooter } from "@/components/home/HomeFooter";
import { LineDemo } from "@/components/home/LineDemo";
import { Logo, Mascot, type Pose } from "@/components/Brand";
import { BrandMark } from "@/components/SiteChrome";
import { PLANS } from "@/lib/constants";
import { anuphan } from "@/lib/fonts";
import type { ElderStatus, FlexMessage } from "@/lib/types";

import lineCards from "@/components/home/line-cards.json";

const LINE_OA_URL = process.env.NEXT_PUBLIC_LINE_OA_URL ?? null;

const NAV = [
  ["#features", "ประโยชน์ของบริการ"],
  ["#line", "ตัวอย่างการแจ้งเตือน"],
  ["#how", "หลักการทำงาน"],
  ["#pricing", "อัตราค่าบริการ"],
  ["#faq", "คำถามที่พบบ่อย"],
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

/** Chat-bubble interlude: a family member says something, หลานโทรหา answers (animated). */
const Interlude = ChatInterlude;

// ------------------------------------------------------------------ one call, three people

const panel =
  "flex flex-col gap-2 rounded-2xl border border-[#f0dcdd] bg-white p-4 text-[13px] leading-snug text-[#1e293b] shadow-[0_8px_24px_rgba(80,20,25,.08)]";

// Seed elders (CLAUDE.md §14) with the reason wording compute_status really produces (§5).
const DASH_ROWS: { name: string; status: ElderStatus; reason: string }[] = [
  { name: "ตาสมชาย", status: "red", reason: "เจ็บหน้าอก — แนะนำ 1669 แล้ว" },
  { name: "ยายสำลี", status: "yellow", reason: "ลืมยาติดกัน 4 วัน" },
  { name: "ยายมาลี", status: "unreachable", reason: "ไม่รับสาย 2 ครั้ง — ยังติดต่อไม่ได้" },
  { name: "ยายสมศรี", status: "green", reason: "ไม่พบสัญญาณผิดปกติในสายนี้" },
];

// First turns of the real test transcript backend/app/fixtures/transcripts/green-garden.json
// (the same one /demo plays).
const CALL_TURNS: { ai: boolean; text: string }[] = [
  { ai: true, text: "เมื่อวานคุณยายเล่าว่าปลูกผักบุ้ง ขึ้นแล้วไหมครับ" },
  { ai: false, text: "จ้า ผักบุ้งที่ปลูกขึ้นแล้วเด้อ งามหลาย" },
  { ai: true, text: "ดีใจด้วยครับ วันนี้กินยาเช้าแล้วหรือยังครับ" },
  { ai: false, text: "กินแล้วจ้า กินหลังข้าวเช้า" },
];
// The real green family card, trimmed to banner + summary box + button so it sits level with
// the two neighbouring panels (the full card is in the LINE demo section below).
const GREEN_CARD: FlexMessage = (() => {
  const full = (lineCards as unknown as Record<string, FlexMessage>).green;
  const bubble = full.contents as { body: { contents: { backgroundColor?: string }[] } };
  const summary = bubble.body.contents.filter((c) => c.backgroundColor);
  return { ...full, contents: { ...bubble, body: { ...bubble.body, contents: summary } } };
})();

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
              {CALL_TURNS.map((t) => (
                <span
                  key={t.text}
                  className={
                    t.ai
                      ? "self-start rounded-xl rounded-tl-sm bg-[#f8eeee] px-2.5 py-1.5"
                      : "self-end rounded-xl rounded-tr-sm bg-brand-100 px-2.5 py-1.5 text-brand-900"
                  }
                >
                  {t.text}
                </span>
              ))}
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
            {/* the real family card (backend/scripts/line_cards_demo.py), shrunk to fit */}
            <div style={{ zoom: 0.82 }}>
              <FlexBubble
                message={GREEN_CARD}
                className="border border-[#f0dcdd] shadow-[0_8px_24px_rgba(80,20,25,.08)]"
              />
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
                  <span className="w-14 shrink-0 font-semibold">{r.name}</span>
                  <span className="flex-1 text-[12px] leading-snug text-[#64748b]">{r.reason}</span>
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
        ผมน้องหลาน ผู้ช่วย AI นะครับ
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
  ["คนที่โทรไปเป็นคนจริงหรือ AI", "เป็นผู้ช่วย AI ครับ บอกตั้งแต่ต้นสายทุกครั้ง และไม่แนะนำยาหรือการรักษา"],
  ["ผู้สูงอายุต้องมีสมาร์ทโฟนไหม", "ไม่ต้องครับ มือถือปุ่มกดก็รับสายได้ ลูกหลานรับสรุปทาง LINE"],
  [
    "ถ้าเกิดเหตุฉุกเฉินจะทำอย่างไร",
    "AI แนะนำให้โทร 1669 ทันที และแจ้งลูกหลานกับ อสม. แต่บริการนี้ไม่ใช่สายด่วน ไม่ได้เฝ้าระวัง 24 ชั่วโมง และเรียกรถพยาบาลเองไม่ได้",
  ],
  ["เก็บข้อมูลอะไรบ้าง", "เก็บเฉพาะผลสรุปของแต่ละสาย และขอความยินยอมแยกทีละข้อตาม PDPA"],
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
          <p className="m-0 text-ink-muted">ไม่เจอคำตอบ สอบถาม อสม. ในพื้นที่ได้เลยครับ</p>
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
            // no red focus frame on the logo; keyboard focus shows as a soft cream background
            className="flex shrink-0 items-center gap-2 rounded-full focus-visible:bg-[#FFF1EA] focus-visible:outline-none"
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
            <span className="max-sm:sr-only">เข้าสู่ระบบ</span>
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
            </div>
            <HeroFlow />
          </div>
        </section>

        <Audience />

        <Interlude
          tint
          ask="ทำงานอยู่กรุงเทพฯ ไม่รู้เลยว่าวันนี้แม่กินยาหรือยัง"
          reply="เดี๋ยวผมโทรถามให้ แล้วสรุปส่ง LINE นะครับ"
          chip="กำลังโทรหาคุณแม่…"
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
          reply="ผมแนะนำให้โทร 1669 ทันที แล้วแจ้งคุณกับ อสม. ในพื้นที่ครับ"
          chip="แจ้งลูกหลานและ อสม. ทาง LINE"
          chipIcon="bell"
        />
        <How />
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

      <HomeFooter />
    </div>
  );
}
