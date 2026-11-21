// /dashboard/elders/[id] — daily call summaries for one elder (CLAUDE.md §7.3.1).
// Layout follows the team's "per-person dashboard" mock: profile hero → 4 stat tiles →
// latest AI summary + 14-day strip + history (left) · schedule, medications, consents (right).
// Only data the backend really has is shown — no invented scores.
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  Check,
  CircleHelp,
  Frown,
  Hourglass,
  Meh,
  MessageSquareQuote,
  Mic,
  Minus,
  Phone,
  PhoneCall,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Smile,
  TriangleAlert,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge, RiskBadge, STATUS_META, StatusDot, Tag } from "@/components/Badge";
import { ApiError, getElderDaily } from "@/lib/api";
import { PLANS } from "@/lib/constants";
import { bangkokDateKey, formatThaiDate, formatThaiTime, formatThaiWeekday } from "@/lib/format";
import type { DailyEntry, ElderStatus, Mood } from "@/lib/types";

export const metadata: Metadata = { title: "สรุปการโทรรายวัน", robots: { index: false } };

const MOOD: Record<Mood, { label: string; icon: LucideIcon }> = {
  good: { label: "อารมณ์ดี", icon: Smile },
  neutral: { label: "อารมณ์ปกติ", icon: Meh },
  low: { label: "ซึม/เหงา", icon: Frown },
  unclear: { label: "ไม่ชัดเจน", icon: CircleHelp },
};

const CONSENTS = [
  ["record_conversation", "(1) บันทึกและประมวลผลบทสนทนา"],
  ["family_summary", "(2) ส่งสรุปให้ลูกหลาน"],
  ["osm_share", "(3) แบ่งปันกับ อสม."],
  ["screening_2q", "(4) คัดกรอง 2Q"],
] as const;

const card = "rounded-3xl border border-line bg-white shadow-sm";

function dayStatus(e: DailyEntry | undefined): { status: ElderStatus | null; label: string } {
  if (!e) return { status: null, label: "ไม่มีสาย" };
  if (e.outcome === "no_answer" || !e.risk_level)
    return { status: "unreachable", label: "ไม่รับสาย" };
  return {
    red: { status: "red" as const, label: "เร่งด่วน" },
    yellow: { status: "yellow" as const, label: "ควรติดตาม" },
    green: { status: "green" as const, label: "ไม่พบสัญญาณผิดปกติ" },
  }[e.risk_level];
}

function lastNDays(n: number, from: string): string[] {
  const base = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) =>
    new Date(base - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

const shortWeekday = new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "UTC" });
const dayOfMonth = new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "UTC" });

// ------------------------------------------------------------------ page

export default async function ElderDailyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await getElderDaily(id, 14);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { elder, days } = data;
  const latest = days[0];
  const history = days.slice(1);
  const plan = PLANS.find((p) => p.id === elder.plan);

  // 14-day figures, all derived from real call records
  const answered = days.filter((d) => d.outcome !== "no_answer");
  const medKnown = days.filter((d) => d.med_taken !== null);
  const medYes = medKnown.filter((d) => d.med_taken === true).length;
  const moodCount = (m: Mood) => answered.filter((d) => d.mood === m).length;
  const riskCount = (s: ElderStatus) => days.filter((d) => dayStatus(d).status === s).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-10">
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-brand-900 underline underline-offset-4"
      >
        <ArrowLeft aria-hidden className="size-4" /> กลับไปภาพรวม
      </Link>

      {/* ---------------------------------------------------------- profile hero */}
      <header
        className={`${card} relative flex flex-col justify-between gap-6 overflow-hidden p-6 lg:flex-row lg:items-center`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-50 blur-3xl"
        />
        <div className="relative flex min-w-0 items-start gap-4 sm:items-center">
          <span className="relative shrink-0">
            <span className="flex size-20 items-center justify-center rounded-full bg-brand-50 text-brand-900 sm:size-24">
              <UserRound aria-hidden className="size-10 sm:size-12" />
            </span>
            <span className="absolute -bottom-1 -right-1 rounded-full ring-4 ring-white">
              <StatusDot status={data.status} size="size-8" iconSize="size-4" />
            </span>
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-ink sm:text-3xl">{elder.name}</h1>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-sm font-medium text-ink-muted">
                อายุ {elder.age} ปี
              </span>
              <Badge status={data.status} />
            </div>
            <ul className="m-0 list-none p-0 text-ink">
              {data.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5">
                <PhoneCall aria-hidden className="size-4 text-brand-600" />
                {latest
                  ? `สายล่าสุด ${formatThaiWeekday(latest.started_at)} ${formatThaiDate(latest.started_at)} ${formatThaiTime(latest.started_at)} น.`
                  : "ยังไม่มีสายแรก"}
              </span>
              {latest?.mood && (
                <span className="flex items-center gap-1.5">
                  {(() => {
                    const M = MOOD[latest.mood].icon;
                    return <M aria-hidden className="size-4 text-brand-600" />;
                  })()}
                  อารมณ์ในสายล่าสุด: {MOOD[latest.mood].label}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="relative flex shrink-0 flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-sm lg:w-64">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <CalendarClock aria-hidden className="size-4 text-brand-600" /> โทรทุก {elder.call_time}{" "}
            น.
          </span>
          <span className="text-ink-muted">
            แพ็กเกจ{plan?.name} · {plan?.detail}
          </span>
        </div>
      </header>

      <p className="m-0 flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <Bot aria-hidden className="mt-0.5 size-4 shrink-0" />
        สรุปและระดับความเสี่ยงสร้างโดย AI (Amazon Bedrock) ใช้ประกอบการตัดสินใจของ อสม. ไม่ใช่การวินิจฉัย
      </p>

      {/* ---------------------------------------------------------- stat tiles */}
      <section aria-label="ภาพรวม 14 วัน" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Pill} label="การกินยา (14 วัน)">
          {medKnown.length === 0 ? (
            <Big>—</Big>
          ) : (
            <>
              <Big>
                {medYes}
                <span className="text-lg font-semibold text-ink-muted">/{medKnown.length} วัน</span>
              </Big>
              <p className="m-0 text-sm text-ink-muted">ตอบว่ากินยาแล้ว จากวันที่ได้ถาม</p>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`กินยา ${medYes} จาก ${medKnown.length} วัน`}
              >
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${(medYes / medKnown.length) * 100}%` }}
                />
              </div>
            </>
          )}
        </StatTile>

        <StatTile icon={Phone} label="รับสาย (14 วัน)">
          <Big>
            {answered.length}
            <span className="text-lg font-semibold text-ink-muted">/{days.length} วัน</span>
          </Big>
          <p className="m-0 text-sm text-ink-muted">
            {days.length - answered.length > 0
              ? `ไม่รับสาย ${days.length - answered.length} วัน`
              : "รับสายครบทุกวันที่โทร"}
          </p>
        </StatTile>

        <StatTile icon={Smile} label="อารมณ์จากบทสนทนา">
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {(["good", "neutral", "low"] as const).map((m) => {
              const M = MOOD[m].icon;
              return (
                <li key={m} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-ink">
                    <M aria-hidden className="size-4 text-ink-muted" /> {MOOD[m].label}
                  </span>
                  <b className="text-ink">{moodCount(m)} วัน</b>
                </li>
              );
            })}
          </ul>
          <p className="m-0 text-xs text-ink-muted">ประเมินจากคำพูดในสาย ไม่ใช่การวินิจฉัย</p>
        </StatTile>

        <StatTile icon={ShieldCheck} label="ระดับรายวัน (14 วัน)">
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {(["red", "yellow", "unreachable", "green"] as const).map((s) => {
              const I = STATUS_META[s].icon;
              return (
                <li key={s} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-ink">
                    <I aria-hidden className={`size-4 ${STATUS_META[s].text}`} />
                    {dayStatusLabel(s)}
                  </span>
                  <b className="text-ink">{riskCount(s)} วัน</b>
                </li>
              );
            })}
          </ul>
        </StatTile>
      </section>

      {/* ---------------------------------------------------------- main grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* latest summary */}
          <section aria-labelledby="latest-title" className={`${card} flex flex-col gap-4 p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <h2 id="latest-title" className="m-0 text-lg font-bold text-ink">
                สรุปสายล่าสุด
              </h2>
              {latest && (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-ink-muted">
                    {formatThaiDate(latest.started_at)} · {formatThaiTime(latest.started_at)} น.
                  </span>
                  <RiskBadge level={latest.risk_level} outcome={latest.outcome} />
                </span>
              )}
            </div>
            {latest ? (
              <DayBody d={latest} large />
            ) : (
              <p className="m-0 text-ink-muted">ยังไม่มีสายแรก</p>
            )}
          </section>

          <TrendStrip days={days} />

          {/* history */}
          {history.length > 0 && (
            <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
              <h2 id="timeline-title" className="m-0 text-lg font-bold text-ink">
                สรุปการโทรรายวันย้อนหลัง
              </h2>
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {history.map((d) => (
                  <DayCard key={d.date} d={d} />
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* right column */}
        <aside className="flex flex-col gap-6 lg:col-span-4">
          <SideCard icon={Pill} title="ยาตามตาราง">
            {elder.medications.length === 0 ? (
              <p className="m-0 text-ink-muted">ไม่มีรายการยา</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {elder.medications.map((m) => (
                  <li
                    key={m.name}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-sm text-ink-muted">{m.times.join(", ")} น.</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 text-xs text-ink-muted">AI ถามว่ากินยาแล้วหรือยัง ไม่แนะนำยาหรือขนาดยา</p>
          </SideCard>

          <SideCard icon={ShieldCheck} title="ความยินยอม (PDPA)">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {CONSENTS.map(([k, label]) => (
                <li key={k} className="flex items-start gap-2">
                  {elder.consents[k] ? (
                    <Check
                      aria-label="ยินยอม"
                      className="mt-1 size-4 shrink-0 text-ok"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <X
                      aria-label="ไม่ยินยอม"
                      className="mt-1 size-4 shrink-0 text-ink-muted"
                      strokeWidth={2.5}
                    />
                  )}
                  {label}
                </li>
              ))}
              <li className="flex items-start gap-2">
                {elder.consents.voice_confirmed_at ? (
                  <>
                    <Mic aria-hidden className="mt-1 size-4 shrink-0 text-ok" />
                    ยืนยันด้วยเสียงแล้ว {formatThaiDate(elder.consents.voice_confirmed_at)}
                  </>
                ) : (
                  <>
                    <Hourglass aria-hidden className="mt-1 size-4 shrink-0 text-yellow-700" />
                    รอยืนยันความยินยอมด้วยเสียง
                  </>
                )}
              </li>
            </ul>
          </SideCard>

          <div className="flex flex-col gap-2 rounded-3xl bg-danger-bg p-5 text-red-900">
            <b>เหตุฉุกเฉิน</b>
            <p className="m-0 text-sm">ระบบไม่ได้เรียกรถพยาบาลเอง หากพบอาการอันตรายให้โทร</p>
            <a
              href="tel:1669"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-danger px-5 font-bold text-white"
            >
              โทร 1669
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pieces

function dayStatusLabel(s: ElderStatus): string {
  return {
    red: "เร่งด่วน",
    yellow: "ควรติดตาม",
    unreachable: "ไม่รับสาย",
    green: "ไม่พบสิ่งผิดปกติ",
    pending: "—",
  }[s];
}

function Big({ children }: { children: ReactNode }) {
  return <p className="m-0 text-4xl font-extrabold leading-none text-ink">{children}</p>;
}

function StatTile({
  icon: I,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`${card} flex flex-col gap-3 p-5`}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-muted">{label}</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <I aria-hidden className="size-4" />
        </span>
      </span>
      {children}
    </div>
  );
}

function SideCard({
  icon: I,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5`}>
      <h2 className="m-0 flex items-center gap-2 border-b border-line pb-3 text-lg font-bold text-ink">
        <I aria-hidden className="size-5 text-brand-600" /> {title}
      </h2>
      {children}
    </section>
  );
}

/** 14 columns, oldest → newest. Status icon + colour; label in tooltip and for screen readers. */
function TrendStrip({ days }: { days: DailyEntry[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const strip = lastNDays(14, days[0]?.date ?? bangkokDateKey(new Date()));
  return (
    <section aria-labelledby="trend-title" className={`${card} flex flex-col gap-4 p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="trend-title" className="m-0 text-lg font-bold text-ink">
          แนวโน้ม 14 วัน
        </h2>
        <span className="text-sm text-ink-muted">ระดับรายวัน จากเก่าไปใหม่</span>
      </div>
      <ol className="m-0 grid list-none grid-cols-7 gap-y-4 p-0 sm:grid-cols-14">
        {strip.map((date) => {
          const d = dayStatus(byDate.get(date));
          const label = `${formatThaiDate(date)}: ${d.label}`;
          return (
            <li key={date} title={label} className="flex flex-col items-center gap-1.5">
              {d.status ? (
                <StatusDot status={d.status} size="size-9" iconSize="size-4" />
              ) : (
                <span
                  aria-hidden
                  className="block size-9 rounded-full border-2 border-dashed border-line"
                />
              )}
              <span aria-hidden className="text-center text-xs leading-tight text-ink-muted">
                {shortWeekday.format(new Date(`${date}T00:00:00Z`))}
                <br />
                <b className="text-ink">{dayOfMonth.format(new Date(`${date}T00:00:00Z`))}</b>
              </span>
              <span className="sr-only">{label}</span>
            </li>
          );
        })}
      </ol>
      <ul
        aria-hidden
        className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 border-t border-line p-0 pt-3 text-sm text-ink-muted"
      >
        {(["red", "yellow", "unreachable", "green"] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <StatusDot status={s} size="size-4" iconSize="size-2.5" /> {dayStatusLabel(s)}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="block size-4 rounded-full border-2 border-dashed border-line" /> ไม่มีสาย
        </li>
      </ul>
    </section>
  );
}

function DayBody({ d, large = false }: { d: DailyEntry; large?: boolean }) {
  if (d.outcome === "no_answer") {
    return <p className="m-0 text-ink-muted">ไม่รับสาย 2 ครั้ง (ระบบไม่ได้ตีความว่าเกิดเหตุ)</p>;
  }
  const ruleWords = d.rule_flags.filter((f) => !f.startsWith("negated:"));
  const negated = d.rule_flags.filter((f) => f.startsWith("negated:")).map((f) => f.slice(8));
  return (
    <div className="flex flex-col gap-3">
      {d.summary_osm && (
        <p className={`m-0 leading-relaxed ${large ? "text-lg" : ""}`}>{d.summary_osm}</p>
      )}
      {d.risk_reasons.length > 0 && (
        <div className={large ? "rounded-2xl bg-slate-50 p-4" : ""}>
          <span className="text-sm font-semibold text-ink-muted">เหตุผล</span>
          <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
            {d.risk_reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.evidence.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="self-start">
            <Tag tone="neutral" icon={MessageSquareQuote}>
              จากบทสนทนา
            </Tag>
          </span>
          {d.evidence.map((q) => (
            <blockquote key={q} className="m-0 border-l-4 border-brand-100 pl-3 italic text-ink">
              “{q}”
            </blockquote>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {d.med_taken === true ? (
          <Tag tone="ok" icon={Check}>
            กินยาแล้ว
          </Tag>
        ) : d.med_taken === false ? (
          <Tag tone="danger" icon={X}>
            ยังไม่กินยา
          </Tag>
        ) : (
          <Tag icon={Minus}>ไม่ทราบเรื่องยา</Tag>
        )}
        {d.mood && <Tag icon={MOOD[d.mood].icon}>{MOOD[d.mood].label}</Tag>}
        {d.ai_status === "fallback" ? (
          <Tag tone="warn" icon={TriangleAlert}>
            สรุปอัตโนมัติไม่สำเร็จ
          </Tag>
        ) : (
          <Tag tone="brand" icon={Bot}>
            สรุปโดย AI
          </Tag>
        )}
        {ruleWords.length > 0 && (
          <Tag tone="danger" icon={ShieldAlert}>
            กฎความปลอดภัย: {ruleWords.join(", ")}
          </Tag>
        )}
        {negated.length > 0 && <Tag>คำปฏิเสธ: {negated.join(", ")}</Tag>}
      </div>
    </div>
  );
}

function DayCard({ d }: { d: DailyEntry }) {
  const accent =
    d.risk_level === "red"
      ? "border-l-danger"
      : d.risk_level === "yellow" || d.outcome === "no_answer"
        ? "border-l-warn"
        : "border-l-ok";
  return (
    <li className={`${card} border-l-[6px] p-5 ${accent}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 font-semibold">
          {formatThaiWeekday(d.started_at)} {formatThaiDate(d.started_at)}{" "}
          <span className="font-normal text-ink-muted">{formatThaiTime(d.started_at)} น.</span>
        </p>
        <RiskBadge level={d.risk_level} outcome={d.outcome} />
      </div>
      <DayBody d={d} />
    </li>
  );
}
