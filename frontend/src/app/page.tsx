// Home page (CLAUDE.md §7.4). Red & white public theme, full-screen hero with a LINE phone mockup,
// then: how it works → for families / for อสม. → status levels → safety → pricing → CTA → footer.
// Icons only (lucide-react) — no emoji anywhere on this page.
import {
  BatteryFull,
  Ban,
  Bot,
  Check,
  ChevronLeft,
  CircleCheck,
  FileText,
  Lock,
  Menu,
  MessageCircleHeart,
  Mic,
  Phone,
  Plus,
  Search,
  Signal,
  Smile,
  Stethoscope,
  TriangleAlert,
  UserRound,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, STATUS_META, StatusDot } from "@/components/Badge";
import { BrandMark } from "@/components/SiteChrome";
import { PLANS } from "@/lib/constants";
import { kanit } from "@/lib/fonts";
import type { ElderStatus } from "@/lib/types";

const LINE_OA_URL = process.env.NEXT_PUBLIC_LINE_OA_URL ?? null;

const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 font-display text-lg font-medium transition";

const NAV = [
  ["#how", "วิธีการทำงาน"],
  ["#family", "สำหรับลูกหลาน"],
  ["#osm", "สำหรับ อสม."],
  ["#plans", "ค่าบริการ"],
] as const;

const STEPS: { icon: LucideIcon; time: string; title: string; body: string }[] = [
  {
    icon: Phone,
    time: "09:00 หรือเวลาที่เลือก",
    title: "โทรหาวันละครั้ง",
    body: "ผู้สูงอายุแค่รับสาย ใช้มือถือปุ่มกดก็ได้",
  },
  {
    icon: Bot,
    time: "ต้นสาย",
    title: "บอกชัดว่าเป็น AI",
    body: "ไม่แอบอ้างเป็นคน ไม่ใช่เจ้าหน้าที่หรือแพทย์",
  },
  {
    icon: MessageCircleHeart,
    time: "3–5 นาที",
    title: "ชวนคุย เตือนกินยา",
    body: "ถามไถ่ความเป็นอยู่ จำเรื่องที่เล่าเมื่อวานได้",
  },
  {
    icon: FileText,
    time: "ภายใน 5 นาที",
    title: "สรุปส่งต่อ",
    body: "ลูกหลานได้สรุปทาง LINE อสม. เห็นบน Dashboard",
  },
];

const LEVELS: { status: ElderStatus; name: string; body: string; then: string }[] = [
  {
    status: "red",
    name: "เร่งด่วน",
    body: "พบอาการที่อาจอันตรายเฉียบพลัน เช่น เจ็บหน้าอก หายใจไม่ออก ล้มศีรษะกระแทก",
    then: "แนะนำให้โทร 1669 แจ้งลูกหลานและ อสม. ทันที",
  },
  {
    status: "yellow",
    name: "ควรติดตาม",
    body: "เช่น ลืมกินยาหลายวัน ไม่สบาย ฟังไม่ชัด หรือโทรแล้วติดต่อไม่ได้",
    then: "แจ้งลูกหลาน และ อสม. ในพื้นที่ช่วยติดตาม",
  },
  {
    status: "green",
    name: "ไม่พบสัญญาณผิดปกติ",
    body: "ไม่พบสัญญาณผิดปกติในสายนี้ — ไม่ได้หมายความว่าปลอดภัยแน่นอน",
    then: "ส่งสรุปประจำวันให้ลูกหลาน",
  },
];

const DASH_ROWS: { name: string; status: ElderStatus; reason: string }[] = [
  { name: "ตาสมชาย", status: "red", reason: "เจ็บหน้าอก — แนะนำ 1669 แล้ว" },
  { name: "ยายสำลี", status: "yellow", reason: "ลืมยาติดกัน 4 วัน" },
  { name: "ยายมาลี", status: "unreachable", reason: "ไม่รับสาย 2 ครั้ง" },
  { name: "ยายสมศรี", status: "green", reason: "ผักบุ้งที่ปลูกขึ้นแล้ว" },
];

// ------------------------------------------------------------------ building blocks

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-display text-2xl font-semibold">
      <BrandMark inverted={inverted} className="size-10" />
      หลานโทรหา
    </span>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-base font-medium tracking-wide text-brand-600">{children}</p>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-2 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
      {children}
    </h2>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-lg leading-relaxed text-ink">
      <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      </span>
      {children}
    </li>
  );
}

/** The LINE card families receive (CLAUDE.md §8), drawn with icons instead of emoji. */
function LineCard({ tone = "ok", compact = false }: { tone?: "ok" | "warn"; compact?: boolean }) {
  const ok = tone === "ok";
  const HeadIcon = ok ? CircleCheck : TriangleAlert;
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-left text-ink shadow-sm ring-1 ring-black/5">
      <div
        className={`flex items-center gap-2 px-4 font-semibold text-white ${compact ? "py-2 text-sm" : "py-2.5"} ${ok ? "bg-ok" : "bg-warn"}`}
      >
        <HeadIcon aria-hidden className="size-4" strokeWidth={2.5} />
        {ok ? "ยายสมศรี — ปกติ" : "ยายสมศรี — ควรติดตาม"}
      </div>
      {ok ? (
        <div className={`space-y-1.5 px-4 ${compact ? "py-2.5 text-[0.8rem]" : "py-4"}`}>
          <p className="text-ink-muted">20 พ.ย. 2569 · 09:02 น. · คุย 4 นาที</p>
          <p>
            <span className="font-semibold">วันนี้เล่าว่า</span> ผักบุ้งที่ปลูกไว้ขึ้นแล้ว ดีใจมาก
          </p>
          <p className="flex items-center gap-1.5">
            <Check aria-hidden className="size-4 text-ok" strokeWidth={2.5} /> กินยาเช้าแล้ว
          </p>
          <p className="flex items-center gap-1 text-[0.7rem] text-ink-muted">
            <Bot aria-hidden className="size-3.5" /> สรุปโดย AI · ไม่พบสัญญาณผิดปกติในสายนี้
          </p>
        </div>
      ) : (
        <p className={`px-4 ${compact ? "py-2.5 text-[0.8rem]" : "py-3"}`}>
          ยังไม่ได้กินยาตอนเช้า · อสม. ในพื้นที่ได้รับแจ้งแล้ว
        </p>
      )}
      {ok && (
        <div
          className={`border-t border-line text-center font-semibold text-[#06c755] ${compact ? "py-2 text-sm" : "py-2.5"}`}
        >
          รับทราบ
        </div>
      )}
    </div>
  );
}

/** Modern smartphone with a LINE chat open. Purely decorative. */
function PhoneMockup() {
  return (
    <div aria-hidden className="relative mx-auto w-[19rem] sm:w-[20.5rem]">
      {/* side buttons */}
      <span className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-[#2a2c31]" />
      <span className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-[#2a2c31]" />
      <span className="absolute -left-[3px] top-56 h-14 w-[3px] rounded-l bg-[#2a2c31]" />
      <span className="absolute -right-[3px] top-44 h-20 w-[3px] rounded-r bg-[#2a2c31]" />

      {/* titanium frame */}
      <div className="rounded-[3.4rem] bg-gradient-to-b from-[#4b4e55] via-[#1f2024] to-[#4b4e55] p-[3px] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.6),0_30px_60px_-30px_rgba(0,0,0,0.5)]">
        <div className="rounded-[3.25rem] bg-black p-[9px]">
          <div className="relative overflow-hidden rounded-[2.75rem] bg-gradient-to-b from-[#b4c7e2] to-[#93add3]">
            {/* status bar + dynamic island */}
            <div className="relative flex h-12 items-center justify-between bg-white px-7 pt-1 text-[0.8rem] font-semibold text-black">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2.5 h-[1.65rem] w-[6.2rem] -translate-x-1/2 rounded-full bg-black" />
              <span className="flex items-center gap-1">
                <Signal className="size-3.5" strokeWidth={2.5} />
                <Wifi className="size-3.5" strokeWidth={2.5} />
                <BatteryFull className="size-5" strokeWidth={2} />
              </span>
            </div>

            {/* LINE chat header */}
            <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 pb-2.5 pt-1">
              <ChevronLeft className="size-5 text-ink" />
              <BrandMark className="size-8 rounded-full" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                  หลานโทรหา
                  <span className="rounded bg-[#06c755] px-1 text-[0.55rem] font-bold text-white">
                    OFFICIAL
                  </span>
                </p>
                <p className="text-[0.7rem] text-ink-muted">LINE Official Account</p>
              </div>
              <Search className="size-4 text-ink" />
              <Menu className="size-4 text-ink" />
            </div>

            {/* messages */}
            <div className="space-y-3 px-3 py-4">
              <p className="mx-auto w-fit rounded-full bg-black/15 px-3 py-0.5 text-[0.7rem] text-white">
                วันนี้
              </p>
              <div className="flex items-end gap-2">
                <BrandMark className="size-7 rounded-full" />
                <div className="w-[13.5rem]">
                  <LineCard compact />
                </div>
                <span className="pb-1 text-[0.6rem] text-white/90">09:07</span>
              </div>
              <div className="flex items-end justify-end gap-1.5">
                <span className="pb-1 text-right text-[0.6rem] leading-tight text-white/90">
                  อ่านแล้ว
                  <br />
                  09:10
                </span>
                <span className="rounded-2xl rounded-br-md bg-[#06c755] px-3.5 py-2 text-sm text-white">
                  ขอบคุณนะ เดี๋ยวโทรหาแม่
                </span>
              </div>
            </div>

            {/* input bar */}
            <div className="flex items-center gap-2.5 bg-white px-3 pb-7 pt-2.5 text-ink-muted">
              <Plus className="size-5" />
              <span className="flex h-8 flex-1 items-center justify-between rounded-full bg-slate-100 px-3 text-sm">
                Aa <Smile className="size-4" />
              </span>
              <Mic className="size-5" />
            </div>
            <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-black/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatChip({
  icon: I,
  children,
  className = "",
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute flex items-center gap-2.5 rounded-2xl bg-white/95 py-2.5 pl-2.5 pr-4 text-sm font-medium text-ink shadow-xl backdrop-blur ${className}`}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <I className="size-4" strokeWidth={2.25} />
      </span>
      {children}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <p className="font-display text-lg font-semibold">Dashboard อสม.</p>
          <p className="text-sm text-ink-muted">เรียงตามความเสี่ยง · อัปเดตอัตโนมัติ</p>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          {(["red", "yellow", "unreachable"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <StatusDot status={s} size="size-5" iconSize="size-3" /> 1
            </span>
          ))}
        </div>
      </div>
      <ul>
        {DASH_ROWS.map((r) => (
          <li
            key={r.name}
            className={`flex items-center gap-4 border-b border-line px-6 py-4 last:border-0 ${r.status === "red" ? "bg-danger-bg/50" : ""}`}
          >
            <span className="w-20 shrink-0 font-semibold">{r.name}</span>
            <Badge status={r.status} />
            <span className="truncate text-ink-muted">{r.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SafetyCard({
  icon: I,
  title,
  items,
  children,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  children?: ReactNode;
}) {
  return (
    <article className="rounded-3xl p-8 ring-1 ring-line">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <I aria-hidden className="size-6" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-lg text-ink-muted">
        {items.map((t) => (
          <li key={t} className="flex gap-3">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
            {t}
          </li>
        ))}
      </ul>
      {children}
    </article>
  );
}

// ------------------------------------------------------------------ page

export default function Home() {
  return (
    <div className={`theme-public ${kanit.variable} flex flex-1 flex-col bg-white`}>
      {/* ============================================================== hero */}
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-brand-600 text-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_85%_40%,rgba(255,255,255,0.18),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgba(0,0,0,0.18),transparent_70%)]"
        />
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-6">
          <Link href="/" aria-label="หลานโทรหา หน้าแรก">
            <Logo inverted />
          </Link>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-8 lg:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="text-lg text-white/90 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-5 font-medium ring-1 ring-white/30 hover:bg-white/25"
          >
            <UserRound aria-hidden className="size-5" />
            <span className="max-sm:sr-only">เข้าสู่ระบบ อสม.</span>
          </Link>
        </header>

        <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-16 px-5 pb-20 pt-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-base ring-1 ring-white/25">
              <Bot aria-hidden className="size-4" /> ผู้ช่วย AI โทรถามไถ่ผู้สูงอายุ
            </p>
            <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.12] sm:text-6xl xl:text-7xl">
              มีคนถามไถ่ทุกวัน
              <span className="block text-white/70">แม้ลูกหลานจะอยู่ไกล</span>
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-relaxed text-white/90">
              โทรคุยกับผู้สูงอายุที่อยู่คนเดียววันละครั้งด้วยเสียงภาษาไทย ส่งสรุปเข้า LINE ลูกหลาน และช่วยให้ อสม.
              ในพื้นที่รู้ว่าควรเยี่ยมใครก่อน
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className={`${btn} bg-white text-brand-600 shadow-lg shadow-black/10 hover:-translate-y-0.5`}
              >
                สมัครบริการ
              </Link>
              <a href="#how" className={`${btn} text-white ring-2 ring-white/60 hover:bg-white/10`}>
                ดูวิธีการทำงาน
              </a>
            </div>
            <p className="mt-10 text-white/75">
              เริ่มต้น <strong className="text-white">฿199/เดือน</strong> · สมัครผ่าน อสม. ในพื้นที่
            </p>
          </div>

          <div className="relative py-6">
            <PhoneMockup />
            <FloatChip icon={Phone} className="left-0 top-16 max-sm:hidden lg:-left-10">
              โทรแล้ว 09:00 · 4 นาที
            </FloatChip>
            <FloatChip icon={Bot} className="right-0 top-1/2 max-sm:hidden lg:-right-6">
              สรุปโดย AI ใน 5 นาที
            </FloatChip>
            <FloatChip icon={Stethoscope} className="bottom-28 left-0 max-sm:hidden lg:-left-12">
              อสม. เห็นบน Dashboard
            </FloatChip>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* ============================================================== how it works */}
        <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-6 px-5 py-24 sm:py-28">
          <div className="max-w-2xl">
            <Eyebrow>วิธีการทำงาน</Eyebrow>
            <H2>ง่ายสำหรับผู้สูงอายุ แค่รับสาย</H2>
          </div>
          <ol className="relative mt-16 grid gap-12 md:grid-cols-4 md:gap-6">
            <span
              aria-hidden
              className="absolute left-7 right-7 top-7 hidden h-0.5 bg-brand-100 md:block"
            />
            {STEPS.map(({ icon: I, ...s }, i) => (
              <li key={s.title} className="relative">
                <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                  <I aria-hidden className="size-7" />
                  <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-600 ring-2 ring-brand-600">
                    {i + 1}
                  </span>
                </span>
                <p className="mt-6 font-medium text-brand-600">{s.time}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ============================================================== for families */}
        <section id="family" className="scroll-mt-6 bg-brand-50">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-5 py-24 sm:py-28 lg:grid-cols-2">
            <div>
              <Eyebrow>สำหรับลูกหลาน</Eyebrow>
              <H2>รู้ทุกวันว่าพ่อแม่เป็นอย่างไร ผ่าน LINE</H2>
              <ul className="mt-8 space-y-4">
                <CheckItem>สรุปสั้น ๆ อบอุ่น พร้อมสถานะ ปกติ / ควรติดตาม / เร่งด่วน</CheckItem>
                <CheckItem>รู้ว่ากินยาตามตารางหรือยัง</CheckItem>
                <CheckItem>
                  ถ้าเร่งด่วนหรือติดต่อไม่ได้ กด &ldquo;แจ้ง อสม.&rdquo; จากการ์ดเพื่อให้ช่วยไปดูได้
                </CheckItem>
                <CheckItem>เรื่องคัดกรองสุขภาพใจจะแจ้งเฉพาะ อสม. ไม่แสดงในการ์ดของลูกหลาน</CheckItem>
              </ul>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className={`${btn} bg-brand-600 text-white hover:bg-brand-900`}
                >
                  สมัครบริการ
                </Link>
                {LINE_OA_URL && (
                  <a
                    href={LINE_OA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btn} bg-[#06c755] text-white hover:bg-[#05b14c]`}
                  >
                    เพิ่มเพื่อน LINE
                  </a>
                )}
              </div>
            </div>
            <div aria-hidden className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-6 rotate-3 rounded-[2.5rem] bg-brand-100" />
              <div className="relative space-y-4 rounded-[2rem] bg-gradient-to-b from-[#b4c7e2] to-[#93add3] p-5 shadow-2xl shadow-slate-900/10">
                <LineCard />
                <LineCard tone="warn" />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== for อสม. */}
        <section
          id="osm"
          className="mx-auto grid w-full max-w-7xl scroll-mt-6 items-center gap-16 px-5 py-24 sm:py-28 lg:grid-cols-2"
        >
          <div className="lg:order-2">
            <Eyebrow>สำหรับ อสม.</Eyebrow>
            <H2>รู้ว่าวันนี้ควรเยี่ยมใครก่อน</H2>
            <ul className="mt-8 space-y-4">
              <CheckItem>เห็นผู้สูงอายุทั้งหมดในความดูแล เรียงตามความเสี่ยง</CheckItem>
              <CheckItem>อ่านสรุปรายวันย้อนหลัง 14 วัน พร้อมหลักฐานจากบทสนทนา</CheckItem>
              <CheckItem>รับแจ้งเตือนทาง LINE เมื่อมีกรณีเร่งด่วนหรือควรติดตาม</CheckItem>
              <CheckItem>บันทึก &ldquo;ติดตามแล้ว&rdquo; ได้ทันทีจากมือถือ</CheckItem>
            </ul>
            <Link href="/login" className={`${btn} mt-10 bg-ink text-white hover:bg-black`}>
              เข้าสู่ระบบ อสม.
            </Link>
          </div>
          <div className="lg:order-1">
            <DashboardMockup />
            <p className="mt-4 text-center text-sm text-ink-muted">ภาพตัวอย่าง · ข้อมูลสมมติ</p>
          </div>
        </section>

        {/* ============================================================== levels */}
        <section id="levels" className="scroll-mt-6 border-y border-line bg-slate-50">
          <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:py-28">
            <div className="max-w-2xl">
              <Eyebrow>ระดับสถานะ</Eyebrow>
              <H2>แจ้งผลชัดเจน 3 ระดับ</H2>
              <p className="mt-4 text-lg leading-relaxed text-ink-muted">
                สรุปและระดับความเสี่ยงสร้างโดย AI (Amazon Bedrock) ร่วมกับกฎความปลอดภัย ใช้ประกอบการตัดสินใจ
                ไม่ใช่การวินิจฉัย
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {LEVELS.map((l) => {
                const m = STATUS_META[l.status];
                const I = m.icon;
                return (
                  <article
                    key={l.name}
                    className="flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5"
                  >
                    <span
                      className={`flex size-14 items-center justify-center rounded-2xl ${m.tint}`}
                    >
                      <I aria-hidden className="size-7" strokeWidth={2.25} />
                    </span>
                    <h3 className="mt-6 font-display text-2xl font-semibold">{l.name}</h3>
                    <p className="mt-3 flex-1 text-lg leading-relaxed text-ink-muted">{l.body}</p>
                    <p className="mt-6 flex items-start gap-3 border-t border-line pt-5 font-medium">
                      <Check
                        aria-hidden
                        className={`mt-1 size-4 shrink-0 ${m.text}`}
                        strokeWidth={3}
                      />
                      {l.then}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================== safety */}
        <section id="safety" className="mx-auto w-full max-w-7xl scroll-mt-6 px-5 py-24 sm:py-28">
          <div className="max-w-2xl">
            <Eyebrow>ความปลอดภัย</Eyebrow>
            <H2>ผู้ช่วยที่รู้ขอบเขตของตัวเอง</H2>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            <SafetyCard
              icon={Ban}
              title="AI จะไม่ทำ"
              items={[
                "แนะนำยา ขนาดยา หรือการรักษา",
                "วินิจฉัยโรค",
                "ถามเรื่องเงิน เลขบัญชี หรือ OTP",
                "เรียกรถพยาบาลเอง",
              ]}
            />
            <SafetyCard
              icon={Lock}
              title="ความเป็นส่วนตัว"
              items={[
                "ขอความยินยอมแยก 4 ข้อตาม PDPA",
                "ผู้สูงอายุยืนยันด้วยเสียงในสายแรก",
                "เก็บเฉพาะผลสรุป ไม่เก็บบทสนทนาเต็ม",
                "บอกให้หยุดได้ทุกเมื่อ",
              ]}
            >
              <Link
                href="/privacy"
                className="mt-5 inline-block font-medium text-brand-600 underline underline-offset-4"
              >
                อ่านนโยบายความเป็นส่วนตัว
              </Link>
            </SafetyCard>
            <article className="flex flex-col rounded-3xl bg-ink p-8 text-white">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
                <Phone aria-hidden className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold">บริการนี้ไม่ใช่สายด่วน</h3>
              <p className="mt-3 text-lg leading-relaxed text-white/75">
                ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค หากเกิดเหตุฉุกเฉินโปรดโทร
              </p>
              <a
                href="tel:1669"
                className="mt-auto pt-8 font-display text-7xl font-semibold text-white hover:text-brand-100"
              >
                1669
              </a>
              <span className="text-white/60">สายด่วนการแพทย์ฉุกเฉิน</span>
            </article>
          </div>
        </section>

        {/* ============================================================== pricing */}
        <section id="plans" className="scroll-mt-6 bg-brand-50">
          <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>ค่าบริการ</Eyebrow>
              <H2>เลือกความถี่ที่เหมาะกับครอบครัว</H2>
              <p className="mt-4 text-lg text-ink-muted">ราคาต่อเดือน ต่อผู้สูงอายุ 1 ท่าน</p>
            </div>
            <div className="mx-auto mt-14 grid max-w-5xl items-center gap-6 md:grid-cols-3">
              {PLANS.map((p) => {
                const hot = p.id === "standard";
                return (
                  <article
                    key={p.id}
                    className={`rounded-3xl p-8 ${hot ? "bg-brand-600 py-12 text-white shadow-2xl shadow-brand-600/30" : "bg-white ring-1 ring-black/5"}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-semibold">แพ็กเกจ{p.name}</h3>
                      {hot && (
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-600">
                          แนะนำ
                        </span>
                      )}
                    </div>
                    <p className="mt-6 font-display text-4xl font-semibold">{p.price}</p>
                    <p
                      className={`mt-4 flex items-center gap-2 text-lg ${hot ? "text-white/90" : "text-ink-muted"}`}
                    >
                      <Check aria-hidden className="size-5 shrink-0" strokeWidth={2.5} />
                      {p.detail}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================== CTA */}
        <section className="mx-auto w-full max-w-7xl px-5 py-24">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-600 px-8 py-14 text-white sm:px-14">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10"
            />
            <div
              aria-hidden
              className="absolute -bottom-32 right-32 size-64 rounded-full bg-white/5"
            />
            <div className="relative max-w-2xl">
              <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                เริ่มต้นใช้บริการผ่าน อสม. ในพื้นที่
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/85">
                ขอรหัส อสม. และให้ อสม. อธิบายบริการให้ผู้สูงอายุฟังตัวต่อตัวก่อน จากนั้นลูกหลานสมัครออนไลน์ได้ในไม่กี่นาที
              </p>
              <Link
                href="/register"
                className={`${btn} mt-8 bg-white text-brand-600 hover:bg-brand-50`}
              >
                สมัครบริการ
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================== footer */}
      <footer className="bg-ink text-slate-300">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs leading-relaxed text-slate-400">
              ผู้ช่วย AI โทรถามไถ่ผู้สูงอายุ เชื่อมครอบครัวและ อสม. ในพื้นที่
            </p>
          </div>
          {[
            {
              head: "บริการ",
              links: [
                ["#how", "วิธีการทำงาน"],
                ["#levels", "ระดับสถานะ"],
                ["#plans", "ค่าบริการ"],
              ],
            },
            {
              head: "สำหรับครอบครัว",
              links: [
                ["/register", "สมัครบริการ"],
                ["/privacy", "นโยบายความเป็นส่วนตัว (ร่าง)"],
              ],
            },
            {
              head: "ติดต่อฉุกเฉิน",
              links: [
                ["tel:1669", "การแพทย์ฉุกเฉิน 1669"],
                ["tel:1323", "สายด่วนสุขภาพจิต 1323"],
              ],
            },
          ].map((col) => (
            <div key={col.head}>
              <p className="font-semibold text-white">{col.head}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto w-full max-w-7xl px-5 py-6 text-sm text-slate-400">
            ไม่ใช่สายด่วน ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค · เหตุฉุกเฉินโทร{" "}
            <a href="tel:1669" className="font-semibold text-white underline">
              1669
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
