// /dashboard/visit — "ควรเยี่ยมก่อน": today's cases that still need the อสม., most urgent first.
import { ArrowRight, Phone } from "lucide-react";
import Link from "next/link";

import { AutoRefresh } from "@/components/AutoRefresh";
import { Badge } from "@/components/Badge";
import { EmergencyGuide } from "@/components/console/OverviewPanels";
import { FollowUp } from "@/components/FollowUp";
import { PageHeader, StatusDisclaimer, pageWrap } from "@/components/console/PageHeader";
import { getDailyDigest, getDashboard } from "@/lib/api";
import { formatThaiTime } from "@/lib/format";

export const metadata = { title: "ควรเยี่ยมก่อน" };

export default async function VisitPage() {
  const [data, digest] = await Promise.all([getDashboard(), getDailyDigest()]);
  const byId = new Map(data.rows.map((r) => [r.elder_id, r]));
  const list = digest.visit_first
    .map((v) => ({ v, row: byId.get(v.elder_id) }))
    .filter((x) => x.row && !x.row.resolved);

  return (
    <div className={pageWrap}>
      <AutoRefresh seconds={60} />
      <PageHeader
        title="ควรเยี่ยมก่อน"
        sub={`${list.length} ราย · เรียงจากเร่งด่วนที่สุด · ติดตามแล้วกด “ติดตามแล้ว” รายชื่อจะหายจากหน้านี้`}
      />

      {list.length === 0 ? (
        <p className="m-0 rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-ink-muted">
          ไม่มีเคสค้าง ทุกคนได้รับการติดตามแล้ว
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0">
          {list.map(({ v, row }) => (
            <li key={v.elder_id} className="flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/elders/${v.elder_id}`}
                      className="text-[18px] font-bold text-ink hover:underline"
                    >
                      {v.name}
                    </Link>
                    <Badge status={v.status} />
                  </div>
                  <p className="m-0 mt-1 text-[16px] text-ink">{v.reason}</p>
                  <p className="m-0 mt-0.5 text-[14px] text-ink-muted">
                    {row?.latest_call_at
                      ? `สายล่าสุด ${formatThaiTime(row.latest_call_at)} น. · `
                      : ""}
                    {row?.phone_masked}
                    {row?.family_requested_osm ? " · ลูกหลานขอให้ช่วยดู" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {v.status === "red" && (
                    <a
                      href="tel:1669"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger px-4 text-[15px] font-bold text-white hover:bg-red-700"
                    >
                      <Phone aria-hidden className="size-4" /> 1669
                    </a>
                  )}
                  <Link
                    href={`/dashboard/elders/${v.elder_id}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-[15px] font-semibold text-ink hover:bg-slate-50"
                  >
                    ดูสรุป <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </div>
              </div>
              {v.status === "red" && (
                <EmergencyGuide name={v.name} callAt={row?.latest_call_at ?? null} />
              )}
              {row && (
                <div className="sm:max-w-md">
                  <FollowUp r={row} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <StatusDisclaimer />
    </div>
  );
}
