// /family — dashboard for guardians (ลูกหลาน), opened from the LINE rich menu via LIFF.
// Family-safe view only (CLAUDE.md §0, §8): status, summary_family, medication — never 2Q/9Q,
// risk reasons, transcript evidence, the อสม. summary or mood.
import { Bot, CalendarClock, Mic, Phone, Pill, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { STATUS_META } from "@/components/Badge";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ApiError, getFamilyDashboard } from "@/lib/api";
import { FAMILY_COOKIE, PLANS } from "@/lib/constants";
import { formatThaiDate, formatThaiTime, formatThaiWeekday } from "@/lib/format";
import type {
  ElderStatus,
  FamilyDashboard,
  FamilyDay,
  FamilyElder,
  FamilyLevel,
} from "@/lib/types";

import { FamilyLiffLogin } from "./FamilyLiffLogin";

export const metadata: Metadata = { title: "ข้อมูลผู้สูงอายุของครอบครัว", robots: { index: false } };

const LEVEL: Record<FamilyLevel | "pending", { label: string; status: ElderStatus }> = {
  green: { label: "ปกติ", status: "green" },
  followup: { label: "ควรติดตาม", status: "yellow" },
  unreachable: { label: "ยังติดต่อไม่ได้", status: "unreachable" },
  red: { label: "เร่งด่วน", status: "red" },
  pending: { label: "รอสายแรก", status: "pending" },
};

const card = "rounded-3xl border border-line bg-white p-5 shadow-sm";

function LevelBadge({ level }: { level: FamilyLevel | "pending" }) {
  const { label, status } = LEVEL[level];
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-base font-semibold ${m.pill}`}
    >
      <Icon aria-hidden className="size-4" /> {label}
    </span>
  );
}

function med(d: FamilyDay): string {
  if (d.med_taken === true) return "กินยาแล้ว";
  if (d.med_taken === false) return "ยังไม่ได้กินยา";
  return "ไม่ได้ยืนยัน";
}

export default async function FamilyPage() {
  const liffId = process.env.LIFF_ID ?? "";
  let data: FamilyDashboard | null = null;
  if ((await cookies()).has(FAMILY_COOKIE)) {
    try {
      data = await getFamilyDashboard();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) throw e;
    }
  }

  return (
    <div className="theme-public flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-brand-900">ข้อมูลผู้สูงอายุของครอบครัว</h1>
        {data ? (
          data.elders.length ? (
            data.elders.map((e) => <ElderSection key={e.elder.id} data={e} />)
          ) : (
            <p className={card}>ยังไม่มีผู้สูงอายุที่เชื่อมกับ LINE นี้</p>
          )
        ) : liffId ? (
          <FamilyLiffLogin liffId={liffId} />
        ) : (
          <p className="rounded-2xl bg-slate-100 p-4 text-ink-muted">
            หน้านี้เปิดได้จากเมนู &quot;ข้อมูลผู้สูงอายุ&quot; ใน LINE หลานโทรหาเท่านั้น
          </p>
        )}
        <p className="text-sm text-ink-muted">
          สรุปสร้างโดย AI ใช้ประกอบการดูแล ไม่ใช่การวินิจฉัย · สถานะ &quot;ปกติ&quot;
          หมายถึงไม่พบสัญญาณผิดปกติในสาย ไม่ได้ยืนยันว่าปลอดภัย
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function ElderSection({ data }: { data: FamilyElder }) {
  const { elder, osm, days } = data;
  const latest = days[0];
  const plan = PLANS.find((p) => p.id === elder.plan);
  const strip = [...days].reverse();

  return (
    <section aria-labelledby={`elder-${elder.id}`} className="flex flex-col gap-4">
      <header className={`${card} flex flex-col gap-3`}>
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-900">
            <UserRound aria-hidden className="size-7" />
          </span>
          <div className="min-w-0">
            <h2 id={`elder-${elder.id}`} className="text-xl font-bold text-ink">
              {elder.name}
            </h2>
            <p className="text-ink-muted">อายุ {elder.age} ปี</p>
          </div>
          <span className="ml-auto">
            <LevelBadge level={data.status} />
          </span>
        </div>
        <p className="text-ink-muted">
          {latest
            ? `สายล่าสุด ${formatThaiWeekday(latest.started_at)} ${formatThaiDate(latest.started_at)} ${formatThaiTime(latest.started_at)} น.`
            : "ยังไม่มีสายแรก"}
        </p>
        {data.status === "red" && (
          <p className="rounded-2xl bg-danger-bg p-3 font-semibold text-red-800">
            ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว ระบบไม่สามารถเรียกรถพยาบาลหรือยืนยันอาการได้ กรุณาติดต่อทันที ·{" "}
            <a href="tel:1669" className="underline">
              โทร 1669
            </a>
          </p>
        )}
        {strip.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{strip.length} วันล่าสุด</p>
            <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {strip.map((d) => {
                const { label, status } = LEVEL[d.level];
                const Icon = STATUS_META[status].icon;
                return (
                  <li
                    key={d.date}
                    title={`${formatThaiDate(d.started_at)} · ${label}`}
                    className={`flex size-9 items-center justify-center rounded-full ${STATUS_META[status].solid}`}
                  >
                    <Icon aria-hidden className="size-4" />
                    <span className="sr-only">
                      {formatThaiDate(d.started_at)} {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </header>

      <div className={`${card} flex flex-col gap-3`}>
        <h3 className="text-lg font-bold text-ink">ข้อมูลการดูแล</h3>
        <dl className="m-0 grid gap-2">
          <Info icon={CalendarClock} label="เวลาโทร" value={`${elder.call_time} น.`} />
          <Info
            icon={Phone}
            label="แพ็กเกจ"
            value={plan ? `${plan.name} (${plan.detail})` : elder.plan}
          />
          <Info
            icon={Mic}
            label="ความยินยอมด้วยเสียง"
            value={elder.voice_confirmed ? "ยืนยันแล้ว" : "รอยืนยันในสายแรก"}
          />
          {osm && <Info icon={Users} label="อสม. ที่ดูแล" value={`${osm.name} ${osm.tambon}`} />}
        </dl>
        <div>
          <p className="flex items-center gap-2 font-semibold text-ink">
            <Pill aria-hidden className="size-4 text-brand-600" /> ตารางยาที่ให้ AI เตือน
          </p>
          {elder.medications.length ? (
            <ul className="mt-1 list-disc pl-6 text-ink">
              {elder.medications.map((m) => (
                <li key={m.name}>
                  {m.name} ({m.times.join(", ")} น.)
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ink-muted">ไม่มีตารางยา</p>
          )}
          <p className="mt-1 text-sm text-ink-muted">AI จะไม่แนะนำยาหรือขนาดยา</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-ink">สรุปการโทร</h3>
        {days.length === 0 && <p className={card}>ยังไม่มีสาย</p>}
        {days.map((d) => (
          <article key={d.date} className={`${card} flex flex-col gap-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">
                {formatThaiWeekday(d.started_at)} {formatThaiDate(d.started_at)} ·{" "}
                {formatThaiTime(d.started_at)} น.
              </p>
              <LevelBadge level={d.level} />
            </div>
            {d.summary && <p className="text-ink">{d.summary}</p>}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              {d.level !== "unreachable" && (
                <span className="flex items-center gap-1.5">
                  <Pill aria-hidden className="size-4" /> {med(d)}
                </span>
              )}
              {d.ai_summary && (
                <span className="flex items-center gap-1.5">
                  <Bot aria-hidden className="size-4" /> สรุปโดย AI
                </span>
              )}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3">
      <dt className="flex items-center gap-2 text-ink-muted">
        <Icon aria-hidden className="size-4" /> {label}
      </dt>
      <dd className="m-0 font-semibold text-ink">{value}</dd>
    </div>
  );
}
