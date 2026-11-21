// /dashboard/digest — daily digest (CLAUDE.md §7.3.2) for any past day, from /v1/osm/daily-digest?date=
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { STATUS_META, StatusDot } from "@/components/Badge";
import { getDailyDigest } from "@/lib/api";
import { bangkokDateKey, formatThaiDate, formatThaiWeekday } from "@/lib/format";
import type { ElderStatus } from "@/lib/types";

const panel = "rounded-2xl border border-console-line/80 bg-white p-5 shadow-sm";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORDER: Exclude<ElderStatus, "pending">[] = ["red", "yellow", "unreachable", "green"];

/** YYYY-MM-DD ± n days (calendar arithmetic, no time zone involved). */
function shift(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD key shown as a Thai date (noon UTC keeps the same day in Asia/Bangkok). */
const asDate = (day: string) => new Date(`${day}T12:00:00Z`);

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const today = bangkokDateKey(new Date());
  const wanted = sp.date && DATE_RE.test(sp.date) && sp.date <= today ? sp.date : today;
  const digest = await getDailyDigest(wanted);
  const day = digest.date || wanted;
  const last7 = Array.from({ length: 7 }, (_, i) => shift(today, -i));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-10">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[26px] font-extrabold text-ink">สรุปรายวัน</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/digest?date=${shift(day, -1)}`}
            aria-label="วันก่อนหน้า"
            className="inline-flex size-11 items-center justify-center rounded-full bg-console-low text-ink hover:bg-console"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="min-w-48 text-center">
            <div className="text-lg font-bold text-ink">{formatThaiDate(asDate(day))}</div>
            <div className="text-[13px] text-ink-muted">
              {formatThaiWeekday(asDate(day))}
              {day === today && " · วันนี้"}
            </div>
          </div>
          {day < today ? (
            <Link
              href={`/dashboard/digest?date=${shift(day, 1)}`}
              aria-label="วันถัดไป"
              className="inline-flex size-11 items-center justify-center rounded-full bg-console-low text-ink hover:bg-console"
            >
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          ) : (
            <span className="size-11" />
          )}
          <form action="/dashboard/digest" className="ml-auto flex items-center gap-2">
            <label htmlFor="digest-date" className="sr-only">
              เลือกวันที่
            </label>
            <input
              id="digest-date"
              type="date"
              name="date"
              defaultValue={day}
              max={today}
              className="min-h-11 rounded-full border border-console-line bg-white px-3 text-[14px] text-ink"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full bg-brand-900 px-4 text-[13px] font-bold text-white"
            >
              ดู
            </button>
          </form>
        </div>
        <nav aria-label="7 วันล่าสุด" className="flex flex-wrap gap-1.5">
          {last7.map((d) => (
            <Link
              key={d}
              href={`/dashboard/digest?date=${d}`}
              aria-current={d === day ? "date" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full px-3 text-[12px] ${d === day ? "bg-brand-900 font-bold text-white" : "bg-console-low text-ink-muted hover:text-ink"}`}
            >
              {d === today ? "วันนี้" : formatThaiDate(asDate(d)).replace(/\s*\d{4}$/, "")}
            </Link>
          ))}
        </nav>
      </header>

      <section aria-label="จำนวนสาย" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className={`${panel} !p-4`}>
          <div className="text-[13px] text-ink-muted">โทรทั้งหมด</div>
          <div className="mt-1 text-3xl font-black tabular-nums text-ink">{digest.total_calls}</div>
        </div>
        {ORDER.map((s) => (
          <div key={s} className={`${panel} !p-4`}>
            <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
              <StatusDot status={s} size="size-5" iconSize="size-3" /> {STATUS_META[s].label}
            </div>
            <div className={`mt-1 text-3xl font-black tabular-nums ${STATUS_META[s].text}`}>
              {digest.counts[s]}
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="digest-visit" className={panel}>
        <h2 id="digest-visit" className="m-0 text-lg font-bold text-ink">
          ควรเยี่ยมก่อน ({digest.visit_first.length})
        </h2>
        {digest.visit_first.length === 0 ? (
          <p className="m-0 mt-3 text-ink-muted">
            {digest.total_calls === 0 ? "ไม่มีการโทรในวันนี้" : "ไม่มีเคสที่ต้องเยี่ยมก่อน"}
          </p>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {digest.visit_first.map((v) => (
              <li key={v.elder_id}>
                <Link
                  href={`/dashboard/elders/${v.elder_id}`}
                  className="flex items-center gap-3 rounded-xl border border-console-line/80 p-3 hover:bg-console-low"
                >
                  <StatusDot status={v.status} size="size-8" iconSize="size-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{v.name}</span>
                    <span className="block text-[13px] text-ink-muted">{v.reason}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="m-0 text-[13px] text-ink-muted">
        สถานะ “ปกติ” หมายถึงไม่พบสัญญาณผิดปกติในสาย ไม่ได้ยืนยันว่าปลอดภัย · ข้อมูลจากระบบหลานโทรหาเท่านั้น
        ไม่ใช่การวินิจฉัย
      </p>
    </div>
  );
}
