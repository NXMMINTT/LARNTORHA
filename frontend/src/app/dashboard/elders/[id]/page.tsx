import {
  ArrowLeft,
  Bot,
  Check,
  CircleHelp,
  Frown,
  Hourglass,
  Meh,
  MessageSquareQuote,
  Mic,
  Minus,
  ShieldAlert,
  Smile,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, RiskBadge, StatusDot, Tag } from "@/components/Badge";
import { Notice } from "@/components/Notice";
import { ApiError, getElderDaily } from "@/lib/api";
import { PLANS } from "@/lib/constants";
import { bangkokDateKey, formatThaiDate, formatThaiTime, formatThaiWeekday } from "@/lib/format";
import type { DailyEntry, ElderStatus, Mood } from "@/lib/types";

export const metadata: Metadata = { title: "สรุปการโทรรายวัน", robots: { index: false } };

const MOOD: Record<Mood, { label: string; icon: LucideIcon }> = {
  good: { label: "อารมณ์ดี", icon: Smile },
  neutral: { label: "อารมณ์ปกติ", icon: Meh },
  low: { label: "ซึม/เหงา", icon: Frown },
  unclear: { label: "อารมณ์ไม่ชัดเจน", icon: CircleHelp },
};

const CONSENTS = [
  ["record_conversation", "(1) บันทึกและประมวลผลบทสนทนา"],
  ["family_summary", "(2) ส่งสรุปให้ลูกหลาน"],
  ["osm_share", "(3) แบ่งปันกับ อสม."],
  ["screening_2q", "(4) คัดกรอง 2Q"],
] as const;

function dotFor(e: DailyEntry | undefined): { status: ElderStatus | null; label: string } {
  if (!e) return { status: null, label: "ไม่มีสาย" };
  if (e.outcome === "no_answer" || !e.risk_level)
    return { status: "unreachable", label: "ไม่รับสาย" };
  return {
    red: { status: "red" as const, label: "เสี่ยงสูง" },
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
  const byDate = new Map(days.map((d) => [d.date, d]));
  const strip = lastNDays(14, days[0]?.date ?? bangkokDateKey(new Date()));
  const plan = PLANS.find((p) => p.id === elder.plan);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-brand-900 underline underline-offset-4"
      >
        <ArrowLeft aria-hidden className="size-4" /> กลับไปภาพรวม
      </Link>

      <header className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-900">
            {elder.name} <span className="font-normal text-ink-muted">· {elder.age} ปี</span>
          </h1>
          <Badge status={data.status} />
        </div>
        <ul className="mt-2 space-y-0.5">
          {data.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium text-ink-muted">เวลาโทร</dt>
            <dd className="text-base">
              {elder.call_time} น. · {plan?.name} ({plan?.detail})
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-muted">ยาตามตาราง</dt>
            <dd className="text-base">
              {elder.medications.length === 0
                ? "—"
                : elder.medications.map((m) => (
                    <div key={m.name}>
                      {m.name} · {m.times.join(", ")}
                    </div>
                  ))}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-muted">ความยินยอม</dt>
            <dd className="space-y-0.5 text-base">
              {CONSENTS.map(([k, label]) => (
                <div key={k} className="flex items-center gap-1.5">
                  {elder.consents[k] ? (
                    <Check
                      aria-label="ยินยอม"
                      className="size-4 shrink-0 text-ok"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <X
                      aria-label="ไม่ยินยอม"
                      className="size-4 shrink-0 text-ink-muted"
                      strokeWidth={2.5}
                    />
                  )}
                  {label}
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                {elder.consents.voice_confirmed_at ? (
                  <>
                    <Mic aria-hidden className="size-4 shrink-0 text-ok" />
                    ยืนยันด้วยเสียงแล้ว {formatThaiDate(elder.consents.voice_confirmed_at)}
                  </>
                ) : (
                  <>
                    <Hourglass aria-hidden className="size-4 shrink-0 text-yellow-700" />
                    รอยืนยันความยินยอมด้วยเสียง
                  </>
                )}
              </div>
            </dd>
          </div>
        </dl>
      </header>

      <Notice variant="info">
        สรุปและระดับความเสี่ยงสร้างโดย AI (Amazon Bedrock) ใช้ประกอบการตัดสินใจของ อสม. ไม่ใช่การวินิจฉัย
      </Notice>

      <section aria-labelledby="trend-title">
        <h2 id="trend-title" className="text-lg font-bold text-brand-900">
          แนวโน้ม 14 วัน
        </h2>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="ระดับรายวัน จากเก่าไปใหม่">
          {strip.map((date) => {
            const d = dotFor(byDate.get(date));
            return (
              <li key={date} title={`${formatThaiDate(date)}: ${d.label}`}>
                {d.status ? (
                  <StatusDot status={d.status} size="size-8" iconSize="size-4" />
                ) : (
                  <span
                    aria-hidden
                    className="block size-8 rounded-full border-2 border-dashed border-line"
                  />
                )}
                <span className="sr-only">
                  {formatThaiDate(date)} {d.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="timeline-title" className="space-y-3">
        <h2 id="timeline-title" className="text-lg font-bold text-brand-900">
          สรุปการโทรรายวัน
        </h2>
        {days.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-6 text-ink-muted">ยังไม่มีสายแรก</p>
        )}
        <ol className="space-y-3">
          {days.map((d) => (
            <DayCard key={d.date} d={d} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function DayCard({ d }: { d: DailyEntry }) {
  const tone =
    d.risk_level === "red"
      ? "border-danger/40"
      : d.risk_level === "yellow" || d.outcome === "no_answer"
        ? "border-warn/40"
        : "border-line";
  const ruleWords = d.rule_flags.filter((f) => !f.startsWith("negated:"));
  const negated = d.rule_flags.filter((f) => f.startsWith("negated:")).map((f) => f.slice(8));
  return (
    <li className={`rounded-2xl border-2 bg-white p-5 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {formatThaiWeekday(d.started_at)} {formatThaiDate(d.started_at)}{" "}
          <span className="font-normal text-ink-muted">{formatThaiTime(d.started_at)} น.</span>
        </p>
        <RiskBadge level={d.risk_level} outcome={d.outcome} />
      </div>

      {d.outcome === "no_answer" ? (
        <p className="mt-2 text-ink-muted">ไม่รับสาย 2 ครั้ง (ระบบไม่ได้ตีความว่าเกิดเหตุ)</p>
      ) : (
        <>
          {d.summary_osm && <p className="mt-2 leading-relaxed">{d.summary_osm}</p>}
          {d.risk_reasons.length > 0 && (
            <p className="mt-2 text-sm">
              <span className="font-medium text-ink-muted">เหตุผล:</span>{" "}
              {d.risk_reasons.join(" · ")}
            </p>
          )}
          {d.evidence.length > 0 && (
            <div className="mt-3 space-y-1">
              <Tag tone="neutral" icon={MessageSquareQuote}>
                จากบทสนทนา
              </Tag>
              {d.evidence.map((q) => (
                <blockquote key={q} className="border-l-4 border-brand-100 pl-3 italic text-ink">
                  “{q}”
                </blockquote>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
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
        </>
      )}
    </li>
  );
}
