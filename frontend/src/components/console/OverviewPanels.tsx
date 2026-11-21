// Extra panels for the อสม. overview (2026-11-21). All data comes from /v1/osm/dashboard; nothing
// here is estimated. Server components except where noted.
import {
  Activity,
  CalendarClock,
  ChartColumn,
  CircleCheck,
  Clock,
  Frown,
  MessageCircleWarning,
  Phone,
  PhoneOff,
  Pill,
  Siren,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatThaiDate, formatThaiTime } from "@/lib/format";
import type { AreaTrend, FamilyUnlinked, ScheduleItem, StreakItem } from "@/lib/types";

const card = "rounded-2xl border border-console-line/80 bg-white shadow-sm";

function Panel({
  icon: I,
  title,
  aside,
  children,
}: {
  icon: LucideIcon;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-4 lg:p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 text-[17px] font-bold text-ink">
          <I aria-hidden className="size-5 text-brand-900" /> {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ today's calls

const STATE: Record<ScheduleItem["state"], { label: string; dot: string; text: string }> = {
  done: { label: "คุยแล้ว", dot: "bg-console-green", text: "text-console-green" },
  no_answer: { label: "ไม่รับสาย 2 ครั้ง", dot: "bg-warn", text: "text-yellow-800" },
  unclear: { label: "ฟังไม่ชัด", dot: "bg-warn", text: "text-yellow-800" },
  pending: { label: "รอโทร", dot: "bg-white ring-2 ring-brand-900", text: "text-ink-muted" },
};

export function SchedulePanel({ items }: { items: ScheduleItem[] }) {
  const n = (s: ScheduleItem["state"][]) => items.filter((i) => s.includes(i.state)).length;
  return (
    <Panel icon={CalendarClock} title="ตารางสายวันนี้">
      <div className="grid grid-cols-3 gap-2 text-center text-[13px]">
        <div className="rounded-xl bg-console-green-bg p-2">
          <b className="block text-xl text-console-green">{n(["done"])}</b>คุยแล้ว
        </div>
        <div className="rounded-xl bg-warn-bg p-2">
          <b className="block text-xl text-yellow-800">{n(["no_answer", "unclear"])}</b>ไม่รับ/ไม่ชัด
        </div>
        <div className="rounded-xl bg-console-low p-2">
          <b className="block text-xl text-ink">{n(["pending"])}</b>รอโทร
        </div>
      </div>
      <ol className="relative m-0 ml-1.5 flex list-none flex-col gap-2.5 border-l-2 border-console-line p-0 pl-4">
        {items.map((i) => {
          const s = STATE[i.state];
          return (
            <li key={i.elder_id} className="relative text-[14px] leading-snug">
              <span
                aria-hidden
                className={`absolute -left-[23px] top-1.5 size-3 rounded-full ${s.dot}`}
              />
              <b className="tabular-nums">{i.call_time}</b>{" "}
              <Link
                href={`/dashboard/elders/${i.elder_id}`}
                className="font-semibold text-ink hover:underline"
              >
                {i.name}
              </Link>
              <span className={`block text-[12px] ${s.text}`}>
                {s.label}
                {i.state === "done" && i.duration_sec
                  ? ` · ${Math.max(1, Math.round(i.duration_sec / 60))} นาที`
                  : ""}
                {i.state === "pending" && i.first_call ? " · สายแรก (ขอยืนยันความยินยอมด้วยเสียง)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ------------------------------------------------------------------ multi-day signals

const STREAK: Record<StreakItem["kind"], { label: string; unit: string; icon: LucideIcon }> = {
  unreachable: { label: "ติดต่อไม่ได้", unit: "วันติด", icon: PhoneOff },
  meds: { label: "ลืมยา", unit: "สายติด", icon: Pill },
  mood: { label: "อารมณ์ซึม/เหงา", unit: "สายติด", icon: Frown },
};

export function StreaksPanel({ items }: { items: StreakItem[] }) {
  return (
    <Panel icon={Activity} title="สัญญาณต่อเนื่องหลายวัน">
      {items.length === 0 ? (
        <p className="m-0 flex items-center gap-2 text-[14px] text-ink-muted">
          <CircleCheck aria-hidden className="size-4 text-console-green" /> ไม่มีเรื่องที่เกิดซ้ำหลายวันติด
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((s) => {
            const m = STREAK[s.kind];
            const I = m.icon;
            return (
              <li key={`${s.elder_id}-${s.kind}`}>
                <Link
                  href={`/dashboard/elders/${s.elder_id}`}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-console-low px-3 py-2 text-[14px] hover:bg-console"
                >
                  <span className="flex items-center gap-2">
                    <I aria-hidden className="size-4 text-yellow-700" />
                    <b>{s.name}</b> · {m.label}
                  </span>
                  <b className="whitespace-nowrap text-yellow-800">
                    {s.count} {m.unit}
                  </b>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="m-0 text-[12px] text-ink-muted">เรื่องที่เกิดซ้ำหลายวันน่าห่วงกว่าเรื่องวันเดียว</p>
    </Panel>
  );
}

// ------------------------------------------------------------------ families not receiving

export function FamilyPanel({ items }: { items: FamilyUnlinked[] }) {
  return (
    <Panel
      icon={MessageCircleWarning}
      title="ลูกหลานยังไม่ได้รับสรุป"
      aside={
        items.length > 0 ? (
          <span className="rounded-full bg-[#e7f9ee] px-2 py-0.5 text-[12px] font-bold text-[#057a36]">
            {items.length}
          </span>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="m-0 flex items-center gap-2 text-[14px] text-ink-muted">
          <CircleCheck aria-hidden className="size-4 text-console-green" /> ลูกหลานทุกคนเชื่อม LINE แล้ว
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.slice(0, 4).map((f) => (
            <li
              key={`${f.elder_id}-${f.guardian_name}`}
              className="rounded-xl bg-console-low px-3 py-2 text-[14px]"
            >
              <b>{f.elder_name}</b> — คุณ{f.guardian_name} ({f.relation})
              <span className="block text-[12px] text-ink-muted">
                ยังไม่ได้เชื่อม LINE
                {f.code_expires_at
                  ? ` · รหัสเชื่อมหมดอายุ ${formatThaiDate(f.code_expires_at)}`
                  : " · รหัสเชื่อมหมดอายุแล้ว"}
              </span>
            </li>
          ))}
          {items.length > 4 && (
            <li className="px-1 text-[13px] font-semibold text-ink-muted">
              และอีก {items.length - 4} ครอบครัว
            </li>
          )}
        </ul>
      )}
      <p className="m-0 text-[12px] text-ink-muted">
        ถ้ายังไม่เชื่อม ลูกหลานจะไม่รู้ผลการโทรเลย ช่วยบอกให้เพิ่มเพื่อน LINE OA แล้วพิมพ์รหัส LTH
      </p>
    </Panel>
  );
}

// ------------------------------------------------------------------ 14-day area trend (real data)

const SERIES = [
  { key: "red", label: "เร่งด่วน", color: "#dc2626" },
  { key: "yellow", label: "ควรติดตาม", color: "#ca8a04" },
  { key: "unreachable", label: "ไม่รับสาย", color: "#a8a29e" },
  { key: "green", label: "ปกติ", color: "#006947" },
] as const;

const shortDay = new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "UTC" });

export function AreaTrendPanel({ trend, total }: { trend: AreaTrend; total: number }) {
  const max = Math.max(1, total);
  return (
    <section className={`${card} flex flex-col gap-3 p-4 lg:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-[20px] font-bold text-ink">
          <ChartColumn aria-hidden className="size-5 text-brand-900" /> แนวโน้มพื้นที่ 14 วัน
        </h3>
        <span className="rounded-full bg-console-green-bg px-2.5 py-0.5 text-[11px] font-bold text-console-green">
          ข้อมูลจริงจากระบบ
        </span>
      </div>
      <p className="m-0 text-[13px] text-ink-muted">
        จำนวนผู้สูงอายุแต่ละระดับต่อวัน (ใช้สายที่ร้ายแรงที่สุดของแต่ละคนในวันนั้น)
      </p>
      <ol
        aria-label="จำนวนผู้สูงอายุแต่ละระดับต่อวัน"
        className="m-0 flex h-44 list-none items-end gap-1.5 border-b border-console-line p-0 pb-1"
      >
        {trend.days.map((d) => {
          const label = `${formatThaiDate(d.date)}: ${SERIES.map((s) => `${s.label} ${d[s.key]}`).join(", ")}${d.none ? `, ไม่มีสาย ${d.none}` : ""}`;
          return (
            <li
              key={d.date}
              title={label}
              className="flex h-full flex-1 flex-col-reverse gap-[2px]"
            >
              <span className="sr-only">{label}</span>
              {[...SERIES]
                .reverse()
                .map((s) =>
                  d[s.key] ? (
                    <span
                      key={s.key}
                      aria-hidden
                      className="block w-full first:rounded-b-[3px] last:rounded-t-[4px]"
                      style={{ height: `${(d[s.key] / max) * 100}%`, background: s.color }}
                    />
                  ) : null,
                )}
            </li>
          );
        })}
      </ol>
      <div aria-hidden className="-mt-1 flex gap-1.5 text-center text-[10px] text-ink-muted">
        {trend.days.map((d) => (
          <span key={d.date} className="flex-1">
            {shortDay.format(new Date(`${d.date}T00:00:00Z`))}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-[13px] text-ink">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm" style={{ background: s.color }} />{" "}
            {s.label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [
            "รับสาย (14 วัน)",
            trend.answered_pct === null ? "—" : `${trend.answered_pct}%`,
            "text-ink",
          ],
          [
            "กินยาตามตาราง",
            trend.med_pct === null ? "—" : `${trend.med_pct}%`,
            "text-console-green",
          ],
          [
            "ติดตามเคสเร่งด่วนเฉลี่ย",
            trend.avg_red_followup_min === null ? "—" : formatMinutes(trend.avg_red_followup_min),
            "text-ink",
          ],
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-xl bg-console-low p-3">
            <b className={`block text-2xl ${cls}`}>{value}</b>
            <span className="text-[12px] text-ink-muted">{label}</span>
          </div>
        ))}
      </div>
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
    ["บันทึกแล้วกด “ติดตามแล้ว”", "เช่น “โทร 1669 แล้ว รถออก 09:20” ในตารางด้านล่าง"],
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
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 1 ? "bg-[#dc2626] text-white" : "bg-console-low text-ink"}`}
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
