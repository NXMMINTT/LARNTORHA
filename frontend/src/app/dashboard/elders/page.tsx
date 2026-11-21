// /dashboard/elders — "ผู้สูงอายุทั้งหมด": risk-ordered table (CLAUDE.md §7.3) with status
// filters and name search. Each name opens /dashboard/elders/[id].
import { Search } from "lucide-react";
import Link from "next/link";

import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader, StatusDisclaimer, pageWrap } from "@/components/console/PageHeader";
import { ElderTable } from "@/components/ElderTable";
import { getDashboard } from "@/lib/api";
import type { DashboardRow, ElderStatus } from "@/lib/types";

export const metadata = { title: "ผู้สูงอายุทั้งหมด" };

type FilterId = "all" | ElderStatus | "meds";
const FILTERS: { id: FilterId; label: string; test: (r: DashboardRow) => boolean }[] = [
  { id: "all", label: "ทั้งหมด", test: () => true },
  { id: "red", label: "เร่งด่วน", test: (r) => r.status === "red" },
  { id: "yellow", label: "ต้องติดตาม", test: (r) => r.status === "yellow" },
  { id: "unreachable", label: "ติดต่อไม่ได้", test: (r) => r.status === "unreachable" },
  { id: "green", label: "ปกติ", test: (r) => r.status === "green" },
  { id: "pending", label: "รอสายแรก", test: (r) => r.status === "pending" },
  { id: "meds", label: "ยังไม่ทานยา", test: (r) => r.med_taken === false },
];

export default async function EldersPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const data = await getDashboard();
  const rows = data.rows;
  const active = FILTERS.find((f) => f.id === sp.f) ?? FILTERS[0];
  const q = (sp.q ?? "").trim();
  const shown = rows.filter((r) => active.test(r) && r.name.includes(q));

  const href = (f: FilterId, query = q) => {
    const p = new URLSearchParams();
    if (f !== "all") p.set("f", f);
    if (query) p.set("q", query);
    const s = p.toString();
    return `/dashboard/elders${s ? `?${s}` : ""}`;
  };

  return (
    <div className={pageWrap}>
      <AutoRefresh seconds={60} />
      <PageHeader
        title="ผู้สูงอายุทั้งหมด"
        sub={`เรียงตามความเสี่ยง ที่ยังไม่ได้ติดตามขึ้นก่อน · แสดง ${shown.length} จาก ${rows.length} ราย`}
        aside={
          <form action="/dashboard/elders" className="relative w-full sm:w-72">
            {active.id !== "all" && <input type="hidden" name="f" value={active.id} />}
            <label htmlFor="seniorSearch" className="sr-only">
              ค้นหาชื่อผู้สูงอายุ
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
            />
            <input
              id="seniorSearch"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="ค้นหาชื่อ แล้วกด Enter"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-600/15"
            />
          </form>
        }
      />

      <div className="flex flex-col gap-4">
        <nav aria-label="กรองตามสถานะ" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = f.id === active.id;
            return (
              <Link
                key={f.id}
                href={href(f.id)}
                aria-current={on ? "true" : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-[15px] transition ${on ? "bg-ink font-semibold text-white" : "border border-slate-200 bg-white text-ink-muted hover:text-ink"}`}
              >
                {f.label}
                <span className={`tabular-nums ${on ? "text-white/70" : "text-slate-400"}`}>
                  {rows.filter(f.test).length}
                </span>
              </Link>
            );
          })}
          {q && (
            <Link
              href={href(active.id, "")}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold text-brand-600 hover:bg-brand-50"
            >
              ล้างคำค้น “{q}”
            </Link>
          )}
        </nav>
        <ElderTable rows={shown} />
      </div>

      <StatusDisclaimer />
    </div>
  );
}
