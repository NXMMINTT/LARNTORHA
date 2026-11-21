// Extra panels for the อสม. overview (2026-11-21). All data comes from /v1/osm/dashboard; nothing
// here is estimated. Server components except where noted.
import {
  Activity,
  CalendarClock,
  ChartColumn,
  Clock,
  MessageCircleWarning,
  Phone,
  Siren,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatThaiDate, formatThaiTime } from "@/lib/format";
import type { AreaTrend, FamilyUnlinked, ScheduleItem, StreakItem } from "@/lib/types";

const card = "rounded-2xl border border-slate-200 bg-white";

/** Same frame for the three side panels: title + count, a divided list, an optional note. */
function Panel({
  icon: I,
  title,
  count,
  sub,
  note,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
  sub?: ReactNode;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${card} flex h-full flex-col`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="m-0 flex items-center gap-2 text-[17px] font-bold text-ink">
          <I aria-hidden className="size-5 text-ink-muted" />
          <span className="flex-1">{title}</span>
          {count !== undefined && (
            <span className="text-[15px] font-semibold tabular-nums text-ink-muted">{count}</span>
          )}
        </h2>
        {sub && <p className="m-0 mt-1 text-[14px] text-ink-muted">{sub}</p>}
      </div>
      <div className="flex-1 px-5 py-2">{children}</div>
      {note && (
        <p className="m-0 border-t border-slate-100 px-5 py-3 text-[14px] text-ink-muted">{note}</p>
      )}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 py-3 text-[15px] text-ink-muted">{children}</p>;
}

const row = "flex min-h-12 items-center justify-between gap-3 py-2.5";

// ------------------------------------------------------------------ today's calls

const STATE: Record<ScheduleItem["state"], { label: string; cls: string }> = {
  done: { label: "คุยแล้ว", cls: "text-ink-muted" },
  no_answer: { label: "ไม่รับสาย 2 ครั้ง", cls: "font-semibold text-danger" },
  unclear: { label: "ฟังไม่ชัด", cls: "font-semibold text-yellow-800" },
  pending: { label: "รอโทร", cls: "text-ink-muted" },
};

export function SchedulePanel({ items }: { items: ScheduleItem[] }) {
  const n = (s: ScheduleItem["state"][]) => items.filter((i) => s.includes(i.state)).length;
  return (
    <Panel
      icon={CalendarClock}
      title="สายวันนี้"
      count={items.length}
      sub={`คุยแล้ว ${n(["done"])} · ไม่รับ/ไม่ชัด ${n(["no_answer", "unclear"])} · รอโทร ${n(["pending"])}`}
    >
      {items.length === 0 ? (
        <Empty>วันนี้ไม่มีสายตามตาราง</Empty>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {items.map((i) => {
            const s = STATE[i.state];
            return (
              <li key={i.elder_id} className={row}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="w-12 shrink-0 text-[15px] tabular-nums text-ink-muted">
                    {i.call_time}
                  </span>
                  <Link
                    href={`/dashboard/elders/${i.elder_id}`}
                    className="truncate text-[15px] font-semibold text-ink hover:underline"
                  >
                    {i.name}
                  </Link>
                </span>
                <span className={`shrink-0 text-right text-[14px] ${s.cls}`}>
                  {s.label}
                  {i.state === "done" && i.duration_sec
                    ? ` ${Math.max(1, Math.round(i.duration_sec / 60))} นาที`
                    : ""}
                  {i.state === "pending" && i.first_call ? " (สายแรก)" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ multi-day signals

const STREAK: Record<StreakItem["kind"], { label: string; unit: string }> = {
  unreachable: { label: "ติดต่อไม่ได้", unit: "วันติด" },
  meds: { label: "ลืมยา", unit: "สายติด" },
  mood: { label: "ซึม/เหงา", unit: "สายติด" },
};

export function StreaksPanel({ items }: { items: StreakItem[] }) {
  return (
    <Panel
      icon={Activity}
      title="เกิดซ้ำหลายวัน"
      count={items.length}
      sub="เรื่องที่เกิดซ้ำน่าห่วงกว่าเรื่องวันเดียว"
    >
      {items.length === 0 ? (
        <Empty>ไม่มีเรื่องที่เกิดซ้ำหลายวันติด</Empty>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {items.map((s) => {
            const m = STREAK[s.kind];
            return (
              <li key={`${s.elder_id}-${s.kind}`} className={row}>
                <span className="min-w-0">
                  <Link
                    href={`/dashboard/elders/${s.elder_id}`}
                    className="text-[15px] font-semibold text-ink hover:underline"
                  >
                    {s.name}
                  </Link>
                  <span className="block text-[14px] text-ink-muted">{m.label}</span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums text-yellow-800">
                  {s.count} {m.unit}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ families not receiving

export function FamilyPanel({ items }: { items: FamilyUnlinked[] }) {
  return (
    <Panel
      icon={MessageCircleWarning}
      title="ลูกหลานยังไม่เชื่อม LINE"
      count={items.length}
      sub="ยังไม่ได้รับสรุปหลังวางสาย"
      note={items.length ? "ช่วยบอกให้เพิ่มเพื่อน LINE OA แล้วพิมพ์รหัส LTH ที่ได้ตอนสมัคร" : undefined}
    >
      {items.length === 0 ? (
        <Empty>ลูกหลานทุกคนเชื่อม LINE แล้ว</Empty>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {items.slice(0, 5).map((f) => (
            <li key={`${f.elder_id}-${f.guardian_name}`} className={row}>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{f.elder_name}</span>
                <span className="block text-[14px] text-ink-muted">
                  คุณ{f.guardian_name} ({f.relation}) ·{" "}
                  {f.code_expires_at ? (
                    `รหัสใช้ได้ถึง ${formatThaiDate(f.code_expires_at)}`
                  ) : (
                    <span className="font-semibold text-danger">รหัสหมดอายุแล้ว</span>
                  )}
                </span>
              </span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="py-2.5 text-[14px] text-ink-muted">และอีก {items.length - 5} ครอบครัว</li>
          )}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ 14-day area trend (real data)
// Plain bar chart (user decision 2026-11-21): one bar per day = number of people who needed care
// (urgent + follow-up + no answer). Hover shows the breakdown.

const dayNum = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function AreaTrendPanel({ trend }: { trend: AreaTrend }) {
  const days = trend.days;
  const last = days.length - 1;
  const care = (d: AreaTrend["days"][number]) => d.red + d.yellow + d.unreachable;
  const top = Math.max(4, ...days.map(care));
  const ticks = Array.from({ length: top + 1 }, (_, i) => top - i).filter(
    (t) => top <= 5 || t % Math.ceil(top / 5) === 0,
  );
  const recent = days.slice(-7).reduce((a, d) => a + care(d), 0);
  const before = days.slice(0, -7).reduce((a, d) => a + care(d), 0);

  return (
    <section className={`${card} flex flex-col gap-5 p-4 lg:p-6`}>
      <div>
        <h2 className="m-0 flex items-center gap-2 text-[17px] font-bold text-ink">
          <ChartColumn aria-hidden className="size-5 text-ink-muted" /> คนที่ต้องดูแล 14 วันที่ผ่านมา
        </h2>
        <p className="m-0 mt-1 text-[15px] text-ink-muted">
          นับคนที่เร่งด่วน ควรติดตาม หรือไม่รับสาย · 7 วันล่าสุดรวม {recent} ครั้ง (7 วันก่อนหน้า {before} ครั้ง)
        </p>
      </div>

      <div className="flex gap-2">
        {/* y axis */}
        <div
          aria-hidden
          className="relative h-48 w-5 shrink-0 text-right text-[12px] text-ink-muted"
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${((top - t) / top) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            {ticks.map((t) => (
              <span
                key={t}
                aria-hidden
                className={`absolute inset-x-0 border-t ${t === 0 ? "border-slate-300" : "border-slate-100"}`}
                style={{ top: `${((top - t) / top) * 100}%` }}
              />
            ))}
            <ol
              aria-label="จำนวนคนที่ต้องดูแลต่อวัน"
              className="relative m-0 flex h-full list-none items-end gap-1 p-0 sm:gap-2"
            >
              {days.map((d, i) => {
                const n = care(d);
                const label = `${formatThaiDate(d.date)}: ต้องดูแล ${n} คน (เร่งด่วน ${d.red}, ควรติดตาม ${d.yellow}, ไม่รับสาย ${d.unreachable}) · ปกติ ${d.green} คน`;
                return (
                  <li
                    key={d.date}
                    title={label}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <span className="sr-only">{label}</span>
                    {n > 0 && (
                      <span
                        aria-hidden
                        className={`mx-auto block w-full max-w-8 rounded-t ${i === last ? "bg-brand-600" : "bg-brand-600/55"}`}
                        style={{ height: `${(n / top) * 100}%` }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          {/* x axis */}
          <div
            aria-hidden
            className="mt-1.5 flex gap-1 text-center text-[12px] text-ink-muted sm:gap-2"
          >
            {days.map((d, i) => (
              <span
                key={d.date}
                className={`flex-1 truncate ${i === last ? "font-bold text-ink" : ""} ${i % 2 === last % 2 ? "" : "max-sm:invisible"}`}
              >
                {i === last ? (
                  "วันนี้"
                ) : (
                  <>
                    <span className="sm:hidden">{Number(d.date.slice(8))}</span>
                    <span className="max-sm:hidden">
                      {dayNum.format(new Date(`${d.date}T00:00:00Z`))}
                    </span>
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <dl className="m-0 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          [
            "รับสาย",
            trend.answered_pct === null ? "ยังไม่มีข้อมูล" : `${trend.answered_pct}%`,
            "ของสายทั้งหมดใน 14 วัน",
          ],
          [
            "กินยาตามตาราง",
            trend.med_pct === null ? "ยังไม่มีข้อมูล" : `${trend.med_pct}%`,
            "ของสายที่ถามเรื่องยา",
          ],
          [
            "ติดตามเคสเร่งด่วน",
            trend.avg_red_followup_min === null
              ? "ยังไม่มีข้อมูล"
              : `ใน ${formatMinutes(trend.avg_red_followup_min)}`,
            trend.avg_red_followup_min === null ? "ยังไม่มีเคสเร่งด่วนที่กด “ติดตามแล้ว”" : "เฉลี่ยหลังวางสาย",
          ],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
            <dt className="text-[14px] text-ink-muted">{label}</dt>
            <dd className="m-0 text-[22px] font-bold tabular-nums text-ink">{value}</dd>
            <dd className="m-0 text-[13px] text-ink-muted">{note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} นาที`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ชม. ${m} น.` : `${h} ชม.`;
}

// ------------------------------------------------------------------ emergency guide (no JS)

export function EmergencyGuide({ name, callAt }: { name: string; callAt: string | null }) {
  const steps: [string, string][] = [
    [`โทรหา${name}`, "ถามว่ายังมีอาการอยู่ไหม อยู่กับใคร"],
    ["ยังมีอาการ → โทร 1669", "บอกชื่อ อายุ อาการ และที่อยู่ ระบบไม่ได้เรียกรถพยาบาลเอง"],
    ["โทรแจ้งลูกหลาน", "เล่าสิ่งที่เกิดขึ้นและสิ่งที่ทำไปแล้ว"],
    ["บันทึกแล้วกด “ติดตามแล้ว”", "เช่น “โทร 1669 แล้ว รถออก 09:20”"],
  ];
  return (
    <details className="group mt-3 rounded-xl border border-[#fecaca] bg-[#fff7f7] text-[13px]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 font-bold text-[#991b1b] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          <Siren aria-hidden className="size-4" /> คู่มือเคสเร่งด่วน 4 ขั้น
        </span>
        <span className="text-[11px] font-medium text-ink-muted">
          {callAt ? (
            <>
              <Clock aria-hidden className="mr-0.5 inline size-3" />
              สายเมื่อ {formatThaiTime(callAt)} น.
            </>
          ) : null}
          <span className="ml-2 group-open:hidden">เปิด</span>
          <span className="ml-2 hidden group-open:inline">ปิด</span>
        </span>
      </summary>
      <ol className="m-0 flex list-none flex-col gap-2 p-3 pt-0">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-2.5 rounded-lg bg-white p-2.5">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 1 ? "bg-[#dc2626] text-white" : "bg-slate-100 text-ink"}`}
            >
              {i + 1}
            </span>
            <span>
              <b className="block text-ink">{t}</b>
              <span className="text-ink-muted">{d}</span>
              {i === 1 && (
                <a
                  href="tel:1669"
                  className="mt-1.5 flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#dc2626] font-bold text-white"
                >
                  <Phone aria-hidden className="size-4" /> โทร 1669
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
