// /dashboard — อสม. console, laid out from the team's "Caregiver & Staff Command Center" design
// (user decision 2026-11-21: follow the design as-is). Real data wherever the system has it;
// figures the system does not measure are tagged "ข้อมูลตัวอย่าง"; unbuilt actions are disabled
// "เร็ว ๆ นี้" controls. Keeps CLAUDE.md §7.3 behaviour: risk order, follow-up, 9Q, LINE link,
// daily digest, auto refresh, mobile cards.
import {
  ArrowRight,
  AudioLines,
  CalendarCheck,
  CircleCheck,
  Download,
  Footprints,
  HeartPulse,
  Lock,
  MapPin,
  MessageCircle,
  Network,
  Pill,
  RadioTower,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  TriangleAlert,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AutoRefresh } from "@/components/AutoRefresh";
import { Badge, STATUS_META } from "@/components/Badge";
import { Mascot } from "@/components/Brand";
import { Sample, Soon } from "@/components/console/bits";
import {
  AreaTrendPanel,
  EmergencyGuide,
  FamilyPanel,
  SchedulePanel,
  StreaksPanel,
} from "@/components/console/OverviewPanels";
import { ElderTable } from "@/components/ElderTable";
import { NineQBox } from "@/components/NineQBox";
import { getDailyDigest, getDashboard, getMe } from "@/lib/api";
import { bangkokDateKey, formatThaiDateTime, formatThaiTime } from "@/lib/format";
import type { DashboardRow } from "@/lib/types";

import { createLineLinkCodeAction } from "./actions";

const panel = "rounded-2xl border border-console-line/80 bg-white shadow-sm";

type FilterId = "all" | "urgent" | "meds" | "safe";
const FILTERS: Record<FilterId, (r: DashboardRow) => boolean> = {
  all: () => true,
  urgent: (r) => r.status === "red" || r.status === "unreachable",
  meds: (r) => r.med_taken === false,
  safe: (r) => r.status === "green",
};

// ------------------------------------------------------------------ KPI card

function Kpi({
  label,
  icon: I,
  iconClass,
  value,
  unit,
  valueClass = "text-ink",
  sub,
  pct,
  barClass,
  sample = false,
  ring = false,
}: {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  value: string;
  unit: string;
  valueClass?: string;
  sub: ReactNode;
  pct: number;
  barClass: string;
  sample?: boolean;
  ring?: boolean;
}) {
  return (
    <div
      className={`${panel} flex flex-col justify-between p-4 transition-shadow hover:shadow-md ${ring ? "ring-1 ring-brand-900/20" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[12px] ${ring ? "font-bold text-brand-900" : "font-medium text-ink-muted"}`}
        >
          {label}
        </span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
        >
          <I aria-hidden className="size-[18px]" />
        </span>
      </div>
      <div className="mt-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={`text-4xl font-black ${valueClass}`}>{value}</span>
          <span className={`text-[12px] ${ring ? "font-bold text-brand-900" : "text-ink-muted"}`}>
            {unit}
          </span>
          {sample && <Sample />}
        </div>
        <div className="mt-1 text-[12px] text-ink-muted">{sub}</div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-console-low">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ page

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [me, data, digest] = await Promise.all([getMe(), getDashboard(), getDailyDigest()]);
  const now = new Date();
  const today = bangkokDateKey(now);
  const rows = data.rows;
  const total = rows.length;
  const c = data.counts;

  const filter: FilterId = sp.f && sp.f in FILTERS ? (sp.f as FilterId) : "all";
  const q = (sp.q ?? "").trim();
  const shown = rows.filter((r) => FILTERS[filter](r) && r.name.includes(q));
  const count = (f: FilterId) => rows.filter(FILTERS[f]).length;

  const calledToday = rows.filter(
    (r) => r.latest_call_at && bangkokDateKey(r.latest_call_at) === today,
  );
  const checkedIn = calledToday.filter((r) => r.latest_outcome !== "no_answer").length;
  const checkedPct = total ? Math.round((checkedIn / total) * 100) : 0;
  const medKnown = rows.filter((r) => r.med_taken !== null);
  const medYes = medKnown.filter((r) => r.med_taken === true).length;
  const medPct = medKnown.length ? Math.round((medYes / medKnown.length) * 1000) / 10 : 0;
  const urgent = c.red + c.unreachable;
  const callSuccess = digest.total_calls
    ? Math.round(((digest.total_calls - digest.counts.unreachable) / digest.total_calls) * 1000) /
      10
    : 0;

  const byId = new Map(rows.map((r) => [r.elder_id, r]));
  const triage = digest.visit_first
    .map((v) => ({ v, row: byId.get(v.elder_id) }))
    .filter((x) => x.row && !x.row.resolved);
  const osmShort = me.name.replace(/\s*\(.*\)$/, "");

  const href = (f: FilterId) => {
    const p = new URLSearchParams();
    if (f !== "all") p.set("f", f);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/dashboard?${s}#cohort` : "/dashboard#cohort";
  };

  return (
    <div className="flex w-full flex-col">
      <AutoRefresh seconds={60} />

      {/* ================================================================ hero band */}
      <section className="relative w-full bg-white px-4 py-6 lg:px-10">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4">
          {/* who / title / main actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-console-green" />
                <span>
                  อสม. <strong className="text-ink">{me.name}</strong>
                </span>
                <span aria-hidden>·</span>
                <span>{me.tambon}</span>
                <span aria-hidden>·</span>
                <span>อัปเดต {formatThaiDateTime(data.generated_at)}</span>
              </p>
              <h1 className="m-0 flex items-center gap-2 text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
                <HeartPulse aria-hidden className="size-7 shrink-0 text-brand-900" />
                ศูนย์บัญชาการดูแลผู้สูงอายุ
              </h1>
              <p className="m-0 text-[14px] text-ink-muted">
                Caregiver &amp; Staff Command Center · AI สรุปสายด้วย Amazon Bedrock
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {/* LINE link (CLAUDE.md §7.3: shown until the อสม. links LINE) */}
              {!me.line_linked &&
                (me.line_link_code ? (
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] text-ink shadow-sm">
                    <MessageCircle aria-hidden className="size-4 text-[#06c755]" />
                    พิมพ์รหัส
                    <strong className="font-mono text-[15px] tracking-wider text-brand-900">
                      {me.line_link_code}
                    </strong>
                    ใน LINE OA เพื่อรับแจ้งเตือน
                  </span>
                ) : (
                  <form action={createLineLinkCodeAction}>
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#06c755] px-4 text-[13px] font-bold text-white shadow-sm hover:bg-[#05b34c]"
                    >
                      <MessageCircle aria-hidden className="size-4" /> เชื่อม LINE รับแจ้งเตือน
                    </button>
                  </form>
                ))}
              <a
                href="tel:1669"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-900 px-4 text-[13px] font-bold text-white shadow-[0_6px_16px_-4px_rgba(187,0,32,.5)] hover:bg-brand-600"
              >
                <Siren aria-hidden className="size-[18px]" /> สายด่วน 1669
              </a>
            </div>
          </div>

          {/* one quiet status line + upcoming tools */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-console-line/70 pt-3 text-[12px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <RadioTower aria-hidden className="size-4 text-console-green" />
              True 5G Health Mesh <strong className="text-console-green">ปกติ 99.98%</strong>
              <Sample />
            </span>
            <span>
              ระบบโทรเช้าสำเร็จ <strong className="text-ink">{callSuccess}%</strong>
            </span>
            <span className="hidden flex-wrap gap-1.5 sm:ml-auto sm:flex">
              <Soon className="min-h-10 gap-1.5 rounded-full border border-console-line bg-white/60 px-3 text-[12px] font-semibold text-ink-muted">
                <Network aria-hidden className="size-4" /> AI โทรรอบพิเศษ
              </Soon>
              <Soon className="min-h-10 gap-1.5 rounded-full border border-console-line bg-white/60 px-3 text-[12px] font-semibold text-ink-muted">
                <Download aria-hidden className="size-4" /> ส่งออก สสจ. / MorDee
              </Soon>
            </span>
          </div>

          {/* filter bar */}
          <div className="mt-1 flex flex-col items-center justify-between gap-4 rounded-2xl border border-console-line/80 bg-white p-4 shadow-sm md:flex-row">
            <nav
              aria-label="กลุ่มเป้าหมาย"
              className="flex w-full flex-wrap items-center gap-1 md:w-auto"
            >
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                กลุ่มเป้าหมาย:
              </span>
              {(
                [
                  ["all", `ทั้งหมด (${count("all")})`, null],
                  ["urgent", `เคสด่วนต้องเข้าตรวจ (${count("urgent")})`, Siren],
                  ["meds", `ขาดยา / ยังไม่ทาน (${count("meds")})`, Pill],
                  ["safe", `สุขภาวะปกติ (${count("safe")})`, CircleCheck],
                ] as const
              ).map(([id, label, I]) => {
                const on = filter === id;
                return (
                  <Link
                    key={id}
                    href={href(id)}
                    aria-current={on ? "true" : undefined}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[12px] transition-all ${on ? "bg-brand-900 font-bold text-white shadow-sm" : "bg-console-low font-medium text-ink-muted hover:text-ink"}`}
                  >
                    {I && <I aria-hidden className="size-3.5" />}
                    {label}
                  </Link>
                );
              })}
              <Soon className="min-h-11 gap-1.5 rounded-full bg-console-low px-3.5 text-[12px] font-medium text-ink-muted">
                <TriangleAlert aria-hidden className="size-3.5" /> เสียงผิดปกติ / สั่นเครือ
              </Soon>
            </nav>
            <div className="flex w-full items-center gap-1 md:w-auto">
              <form action="/dashboard" className="relative w-full md:w-64">
                {filter !== "all" && <input type="hidden" name="f" value={filter} />}
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
                  placeholder="ค้นหาชื่อผู้สูงอายุ…"
                  className="min-h-11 w-full rounded-full bg-console-low pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-muted/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                />
              </form>
              <div className="flex shrink-0 items-center rounded-full bg-console-low p-1 text-[11px] text-ink-muted">
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-ink shadow-sm">
                  วันนี้
                </span>
                <Soon className="rounded-full px-2 py-1">7 วัน</Soon>
                <Soon className="rounded-full px-2 py-1 max-sm:hidden">เดือนนี้</Soon>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ KPI cards */}
      <section aria-label="ภาพรวมชุมชน" className="relative z-10 mb-6 w-full px-4 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi
            label="ผู้สูงอายุในระบบ"
            icon={Users}
            iconClass="bg-console-low text-brand-900"
            value={String(total)}
            unit="คน"
            sub={
              <span className="flex items-center gap-1.5 font-semibold text-console-green">
                <CircleCheck aria-hidden className="size-3.5" /> เช็กอินวันนี้ {checkedIn} คน (
                {checkedPct}%)
              </span>
            }
            pct={checkedPct}
            barClass="bg-console-green"
          />
          <Kpi
            label="ความสม่ำเสมอทานยา"
            icon={Pill}
            iconClass="bg-console-green-bg text-console-green"
            value={`${medPct}%`}
            unit="ทานแล้ว"
            valueClass="text-console-green"
            sub={`ทานแล้ว ${medYes} คน | ยังไม่ทาน ${medKnown.length - medYes} คน`}
            pct={medPct}
            barClass="bg-console-green"
          />
          <Kpi
            label="AI เสียงสั่น/ความจำช้า"
            icon={AudioLines}
            iconClass="bg-console-coral-bg text-console-coral"
            value="6"
            unit="เคสเฝ้าระวัง"
            valueClass="text-console-coral"
            sub="Acoustic Tremor > 1.8%"
            pct={25}
            barClass="bg-console-coral"
            sample
          />
          <Kpi
            label="ต้องช่วยเหลือเร่งด่วน"
            icon={Siren}
            iconClass="bg-brand-900/10 text-brand-900"
            value={String(urgent)}
            unit="เคส"
            valueClass="text-brand-900"
            sub={
              <span className="font-medium text-brand-900/80">
                เร่งด่วน {c.red} · ไม่รับสาย 2 ครั้ง {c.unreachable}
              </span>
            }
            pct={total ? (urgent / total) * 100 : 0}
            barClass="bg-brand-900"
            ring
          />
          <Kpi
            label="VoLTE & อสม. ประจำการ"
            icon={UserRound}
            iconClass="bg-console-low text-ink"
            value="48/48"
            unit="อสม."
            sub={
              <span className="flex items-center gap-1 font-semibold text-console-green">
                <MapPin aria-hidden className="size-3.5" /> ครอบคลุมครบ 15 หมู่บ้าน
              </span>
            }
            pct={100}
            barClass="bg-console-green"
            sample
          />
        </div>
      </section>

      {/* ================================================================ urgent triage */}
      <section
        id="visit-first"
        aria-labelledby="triage-title"
        className="mb-6 w-full scroll-mt-24 px-4 lg:px-10"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-brand-900/10 p-1.5 text-brand-900">
                <Siren aria-hidden className="size-5" />
              </span>
              <div>
                <h2 id="triage-title" className="m-0 text-[20px] font-bold text-ink">
                  เคสเร่งด่วนที่ต้องดำเนินการทันที (Urgent Triages &amp; Live Alerts)
                </h2>
                {/* §7.3.2 daily digest */}
                <p className="m-0 text-[13px] text-ink-muted" aria-label="สรุปวันนี้">
                  วันนี้โทร {digest.total_calls} ราย · เร่งด่วน {digest.counts.red} · ต้องติดตาม{" "}
                  {digest.counts.yellow} · ติดต่อไม่ได้ {digest.counts.unreachable} —
                  ต้องการการยืนยันหรือการเข้าพื้นที่ของ อสม.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-brand-900/10 px-3 py-1 text-[12px] font-bold text-brand-900">
              {triage.length} แจ้งเตือนค้างดำเนินการ
            </span>
          </div>
          {triage.length === 0 ? (
            <p className={`${panel} m-0 flex items-center gap-2 p-4 text-ink-muted`}>
              <Mascot pose="happy" className="h-14 w-auto" /> ไม่มีเคสค้างดำเนินการ —
              วันนี้ทุกคนได้รับการติดตามแล้ว
            </p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
              {triage.slice(0, 3).map(({ v, row }) => {
                const red = v.status === "red";
                const missed = v.status === "unreachable";
                const I = STATUS_META[v.status].icon;
                return (
                  <li
                    key={v.elder_id}
                    className={`${panel} flex flex-col justify-between p-4 transition-all hover:shadow-md`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-console text-lg font-bold text-ink-muted ring-2 ${missed ? "ring-[#ba1a1a]/30" : red ? "ring-brand-900/30" : "ring-console-coral/30"}`}
                          >
                            {v.name.replace(/^(ยาย|ตา)/, "").slice(0, 1)}
                          </span>
                          <div>
                            <h3 className="m-0 text-[18px] font-bold text-ink">{v.name}</h3>
                            <div className="text-[12px] text-ink-muted">
                              อายุ {row?.age} ปี • {row?.phone_masked}
                            </div>
                          </div>
                        </div>
                        <Badge status={v.status} />
                      </div>
                      <div
                        className={`mt-2 flex flex-col gap-1 rounded-xl p-2 text-[13px] ${missed ? "bg-[#ffdad6]/30" : "bg-console-low"}`}
                      >
                        <div
                          className={`flex items-start gap-1.5 font-bold ${missed ? "text-[#ba1a1a]" : red ? "text-brand-900" : "text-console-coral"}`}
                        >
                          <I aria-hidden className="mt-0.5 size-4 shrink-0" />
                          <span>
                            {row?.latest_call_at
                              ? `สรุปสาย ${formatThaiTime(row.latest_call_at)} น.: `
                              : ""}
                            {v.reason}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-console-line/40 pt-1 text-[11px] text-ink-muted">
                          <span>
                            {row?.family_requested_osm ? "ลูกหลานขอให้ช่วยดู" : "แจ้งผ่านระบบหลานโทรหา"}
                          </span>
                          <span className="font-bold text-console-green">อสม. {osmShort}</span>
                        </div>
                      </div>
                    </div>
                    {red && <EmergencyGuide name={v.name} callAt={row?.latest_call_at ?? null} />}
                    <div className="mt-4 flex items-center gap-2 pt-2">
                      <Link
                        href={`/dashboard/elders/${v.elder_id}`}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-white transition-colors ${missed ? "bg-[#ba1a1a]" : red ? "bg-brand-900 hover:bg-brand-600" : "bg-console-coral"}`}
                      >
                        ดูสรุปรายวัน <ArrowRight aria-hidden className="size-4" />
                      </Link>
                      <Soon
                        label="ฟังผลวิเคราะห์เสียง"
                        className="size-11 justify-center rounded-full bg-console text-ink-muted"
                      >
                        <AudioLines aria-hidden className="size-[18px]" />
                      </Soon>
                      {red || missed ? (
                        <a
                          href="tel:1669"
                          title="1669 ฉุกเฉิน"
                          aria-label="โทร 1669 ฉุกเฉิน"
                          className="inline-flex size-11 items-center justify-center rounded-full bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white"
                        >
                          <Siren aria-hidden className="size-[18px]" />
                        </a>
                      ) : (
                        <Soon
                          label="ส่งต่อ รพ.สต."
                          className="size-11 justify-center rounded-full bg-console text-ink-muted"
                        >
                          <Share2 aria-hidden className="size-[18px]" />
                        </Soon>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ================================================================ today / signals / families */}
      <section aria-label="งานที่ควรรู้วันนี้" className="mb-6 w-full px-4 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <SchedulePanel items={data.schedule} />
          <StreaksPanel items={data.streaks} />
          <FamilyPanel items={data.family_unlinked} />
        </div>
      </section>

      {/* ================================================================ cohort table */}
      <section
        id="cohort"
        aria-labelledby="cohort-title"
        className="mb-6 w-full scroll-mt-24 px-4 lg:px-10"
      >
        <div className={`${panel} mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:p-6`}>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="cohort-title" className="m-0 text-[20px] font-bold text-ink">
                  ทะเบียนผู้สูงอายุ &amp; สถานะมอนิเตอร์รายบุคคล (Community Cohort)
                </h2>
                <span className="rounded-full bg-console px-2.5 py-0.5 font-mono text-[11px] text-ink-muted">
                  กำลังแสดง {shown.length} จาก {total} ราย
                </span>
              </div>
              <p className="m-0 text-[13px] text-ink-muted">
                เรียงตามความเสี่ยง ที่ยังไม่ได้ติดตามขึ้นก่อน · รีเฟรชอัตโนมัติทุก 60 วินาที
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-console-low px-3 text-[12px] font-semibold text-ink">
                <SlidersHorizontal aria-hidden className="size-4" /> จัดเรียง: ความเร่งด่วนสูงสุด
              </span>
              <Link
                href={href(filter)}
                title="รีเฟรชข้อมูล"
                aria-label="รีเฟรชข้อมูล"
                className="inline-flex size-11 items-center justify-center rounded-full bg-console-low text-ink-muted hover:bg-console"
              >
                <RefreshCw aria-hidden className="size-[18px]" />
              </Link>
            </div>
          </div>
          <ElderTable rows={shown} osmName={osmShort} />
          <div className="flex flex-col items-center justify-between gap-2 border-t border-console pt-2 sm:flex-row">
            <span className="text-[12px] text-ink-muted">
              แสดงรายการที่ {shown.length ? 1 : 0} ถึง {shown.length} จากทั้งหมด {total} คน ({me.tambon})
            </span>
            <div className="flex items-center gap-1 text-[12px]">
              <span className="rounded-full bg-console-low px-3 py-1.5 font-semibold text-ink-muted opacity-60">
                ย้อนกลับ
              </span>
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-900 font-bold text-white">
                1
              </span>
              <span className="rounded-full bg-console-low px-3 py-1.5 font-semibold text-ink-muted opacity-60">
                ถัดไป
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ area trend (real) + field map (sample) */}
      <section className="mb-6 w-full px-4 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AreaTrendPanel trend={data.trend} total={total} />
          </div>

          <div className={`${panel} flex flex-col justify-between p-4 lg:col-span-5 lg:p-6`}>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 text-[20px] font-bold text-ink">แผนผังลงพื้นที่ อสม. (Field GPS)</h3>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-900/10 px-2 py-0.5 text-[11px] font-bold text-brand-900">
                    <span aria-hidden className="size-2 animate-ping rounded-full bg-brand-900" />{" "}
                    Live GPS
                  </span>
                  <Sample />
                </span>
              </div>
              <p className="m-0 text-[13px] text-ink-muted">{me.tambon} (15 หมู่บ้าน • อสม. 48 คน)</p>
            </div>
            {/* stylised map, decorative */}
            <div
              aria-hidden
              className="relative my-2 flex h-52 w-full flex-col justify-between overflow-hidden rounded-xl bg-[#e7efe3] p-3 shadow-inner"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, transparent 46%, #fff 46%, #fff 49%, transparent 49%), linear-gradient(20deg, transparent 60%, #f5f0e1 60%, #f5f0e1 62%, transparent 62%), radial-gradient(circle at 75% 30%, #cfe0c6 0 18%, transparent 19%), radial-gradient(circle at 20% 75%, #d6e6cf 0 22%, transparent 23%), linear-gradient(#dfe9d9 1px, transparent 1px), linear-gradient(90deg, #dfe9d9 1px, transparent 1px)",
                backgroundSize: "100% 100%, 100% 100%, 100% 100%, 100% 100%, 24px 24px, 24px 24px",
              }}
            >
              {[
                ["left-[30%] top-[40%]", "bg-brand-900"],
                ["left-[58%] top-[55%]", "bg-brand-900"],
                ["left-[70%] top-[28%]", "bg-console-green"],
                ["left-[18%] top-[62%]", "bg-console-green"],
              ].map(([pos, bg]) => (
                <span
                  key={pos}
                  className={`absolute ${pos} size-3 rounded-full ring-4 ring-white/70 ${bg}`}
                />
              ))}
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-ink shadow-sm backdrop-blur-md">
                <MapPin className="size-3.5 text-console-green" /> โซน 3: ม.3 &amp; ม.7
              </span>
              <span className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                  <Footprints className="size-3.5" /> อสม. กำลังเข้าเยี่ยม 3 จุด
                </span>
                <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm">
                  VoLTE Cell Site: ครอบคลุม 100%
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t border-console pt-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-ink-muted">ความคืบหน้าการลงเยี่ยมบ้านวันนี้:</span>
                <span className="font-bold text-ink">34 / 42 หลังคาเรือน (81%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-console-low">
                <div className="h-full w-[81%] rounded-full bg-brand-900" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>เจ้าหน้าที่ประจำ รพ.สต.: 4 คน</span>
                <span className="font-bold text-console-green">ระบบวิทยุฉุกเฉิน 1669 เชื่อมต่อพร้อม</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ 9Q tasks (CLAUDE.md §7.3) */}
      <section className="mb-6 w-full px-4 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <NineQBox tasks={data.tasks} now={now} />
        </div>
      </section>

      {/* ================================================================ integration bar */}
      <section className="mb-6 w-full px-4 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 rounded-2xl bg-console-low p-4 md:flex-row">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-900 shadow-sm">
              <Network aria-hidden className="size-7" />
            </span>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="m-0 text-[17px] font-bold text-ink">
                  บูรณาการระบบบริการสุขภาพปฐมภูมิร่วม (True 5G Health Ecosystem)
                </h4>
                <span className="rounded-full bg-console-green-bg px-2 py-0.5 text-[11px] font-bold text-console-green">
                  Official Integration · เร็ว ๆ นี้
                </span>
              </div>
              <p className="m-0 text-[13px] text-ink-muted">
                เชื่อมต่อ API ปลอดภัยร่วมกับ กระทรวงสาธารณสุข (สธ.), กรมกิจการผู้สูงอายุ (ผส.), ระบบ MorDee
                Telemedicine และระบบนำร่อง รพ.สต. ยุค 5G
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-ink">
            {(
              [
                [Lock, "PDPA Health Protected", "text-console-green"],
                [ShieldCheck, "HL7 / FHIR Standard", "text-brand-900"],
                [Zap, "True VoLTE Ultra-Low Latency", "text-console-green"],
              ] as const
            ).map(([I, t, cls]) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"
              >
                <I aria-hidden className={`size-4 ${cls}`} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <p className="mx-auto mb-6 flex w-full max-w-7xl items-start gap-2 px-4 text-[13px] text-ink-muted lg:px-10">
        <CalendarCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        สรุปและระดับความเสี่ยงสร้างโดย AI (Amazon Bedrock) ใช้ประกอบการตัดสินใจของ อสม. ไม่ใช่การวินิจฉัย ·
        ระบบไม่ได้เรียกรถพยาบาลเอง · “ติดต่อไม่ได้” แปลว่าไม่รับสาย 2 ครั้ง ระบบไม่ได้ตีความว่าเกิดเหตุ · ตัวเลขที่มีป้าย
        “ข้อมูลตัวอย่าง” ยังไม่ได้วัดจริง
      </p>
    </div>
  );
}
