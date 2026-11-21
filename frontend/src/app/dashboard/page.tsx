// /dashboard — "ภาพรวมวันนี้": summary only (user decision 2026-11-21: one page per nav item).
// The lists live on their own pages: /dashboard/visit, /dashboard/tasks, /dashboard/elders.
import {
  ArrowRight,
  ClipboardList,
  MapPinHouse,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { AutoRefresh } from "@/components/AutoRefresh";
import { STATUS_META } from "@/components/Badge";
import {
  AreaTrendPanel,
  FamilyPanel,
  SchedulePanel,
  StreaksPanel,
} from "@/components/console/OverviewPanels";
import { PageHeader, StatusDisclaimer, pageWrap } from "@/components/console/PageHeader";
import { getDailyDigest, getDashboard, getMe } from "@/lib/api";
import { formatThaiDateTime } from "@/lib/format";

import { createLineLinkCodeAction } from "./actions";

export default async function DashboardPage() {
  const [me, data, digest] = await Promise.all([getMe(), getDashboard(), getDailyDigest()]);
  const c = data.counts;
  const unresolved = new Set(data.rows.filter((r) => !r.resolved).map((r) => r.elder_id));
  const visitFirst = digest.visit_first.filter((v) => unresolved.has(v.elder_id));

  const stats: { href: string; label: string; value: number; icon: LucideIcon; tone: string }[] = [
    {
      href: "/dashboard/elders?f=red",
      label: "เร่งด่วน",
      value: c.red,
      icon: STATUS_META.red.icon,
      tone: "text-danger",
    },
    {
      href: "/dashboard/elders?f=yellow",
      label: "ต้องติดตาม",
      value: c.yellow,
      icon: STATUS_META.yellow.icon,
      tone: "text-yellow-700",
    },
    {
      href: "/dashboard/elders?f=unreachable",
      label: "ติดต่อไม่ได้",
      value: c.unreachable,
      icon: STATUS_META.unreachable.icon,
      tone: "text-yellow-700",
    },
    {
      href: "/dashboard/elders?f=green",
      label: "ปกติ",
      value: c.green,
      icon: STATUS_META.green.icon,
      tone: "text-ok",
    },
    {
      href: "/dashboard/tasks",
      label: "งาน 9Q ค้าง",
      value: c.tasks_open,
      icon: ClipboardList,
      tone: "text-ink",
    },
  ];

  return (
    <div className={pageWrap}>
      <AutoRefresh seconds={60} />

      <PageHeader
        title={`สวัสดี ${me.name}`}
        sub={`${me.tambon} · อัปเดต ${formatThaiDateTime(data.generated_at)} · รีเฟรชเองทุก 1 นาที`}
        aside={
          !me.line_linked &&
          (me.line_link_code ? (
            <p className="m-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[15px] text-ink">
              <MessageCircle aria-hidden className="size-5 shrink-0 text-[#06c755]" />
              <span>
                พิมพ์รหัส{" "}
                <strong className="font-mono tracking-wider text-brand-900">
                  {me.line_link_code}
                </strong>{" "}
                ใน LINE OA เพื่อรับแจ้งเตือน
              </span>
            </p>
          ) : (
            <form action={createLineLinkCodeAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#06c755] px-4 text-[15px] font-bold text-white hover:bg-[#05b34c]"
              >
                <MessageCircle aria-hidden className="size-5" /> เชื่อม LINE รับแจ้งเตือน
              </button>
            </form>
          ))
        }
      />

      {/* §7.3.2 "สรุปวันนี้" */}
      <section aria-label="สรุปวันนี้" className="flex flex-col gap-3">
        <p className="m-0 text-[15px] text-ink-muted">
          วันนี้โทร <strong className="text-ink">{digest.total_calls}</strong> ราย · กดการ์ดเพื่อดูรายชื่อ
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ href, label, value, icon: I, tone }, i) => (
            <li key={href} className={i === stats.length - 1 ? "max-sm:col-span-2" : undefined}>
              <Link
                href={href}
                className="flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <span className={`flex items-center gap-1.5 text-[15px] font-semibold ${tone}`}>
                  <I aria-hidden className="size-4" /> {label}
                </span>
                <span className="text-[32px] font-bold leading-none tabular-nums text-ink">
                  {value}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard/visit"
          className={`flex items-center gap-3 rounded-2xl border p-4 transition sm:p-5 ${visitFirst.length ? "border-danger/30 bg-danger-bg/40 hover:bg-danger-bg/60" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        >
          <MapPinHouse
            aria-hidden
            className={`size-6 shrink-0 ${visitFirst.length ? "text-danger" : "text-ink-muted"}`}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-bold text-ink">
              {visitFirst.length ? `ควรเยี่ยมก่อน ${visitFirst.length} ราย` : "ไม่มีเคสที่ต้องเยี่ยมก่อน"}
            </span>
            {visitFirst.length > 0 && (
              <span className="block truncate text-[15px] text-ink-muted">
                {visitFirst
                  .slice(0, 3)
                  .map((v) => `${v.name} (${v.reason.split(" — ")[0]})`)
                  .join(", ")}
                {visitFirst.length > 3 ? " …" : ""}
              </span>
            )}
          </span>
          <ArrowRight aria-hidden className="size-5 shrink-0 text-ink-muted" />
        </Link>
      </section>

      <section aria-label="เรื่องที่ควรรู้วันนี้" className="grid items-stretch gap-4 lg:grid-cols-3">
        <SchedulePanel items={data.schedule} />
        <StreaksPanel items={data.streaks} />
        <FamilyPanel items={data.family_unlinked} />
      </section>

      <AreaTrendPanel trend={data.trend} />

      <StatusDisclaimer />
    </div>
  );
}
