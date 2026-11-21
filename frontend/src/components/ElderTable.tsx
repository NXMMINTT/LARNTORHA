// "ทะเบียนผู้สูงอายุ" table of the อสม. console (team design). ≥640px: table; <640px: each row
// becomes a card of label/value pairs (CLAUDE.md §7.3) — no horizontal scrolling.
import {
  AudioLines,
  Check,
  CheckCheck,
  CircleHelp,
  Clock,
  Frown,
  HandHelping,
  Hourglass,
  Meh,
  Mic,
  Minus,
  PhoneCall,
  PhoneOff,
  Smile,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { resolveCallAction } from "@/app/dashboard/actions";
import { formatThaiTime } from "@/lib/format";
import type { DashboardRow, Mood } from "@/lib/types";

import { Badge, STATUS_META, Tag } from "./Badge";
import { Soon } from "./console/bits";

const NEEDS_FOLLOWUP = new Set(["red", "yellow", "unreachable"]);

const MOOD: Record<Mood, { label: string; icon: LucideIcon; dot: string }> = {
  good: { label: "อารมณ์ดี", icon: Smile, dot: "bg-console-green" },
  neutral: { label: "อารมณ์ปกติ", icon: Meh, dot: "bg-console-green/60" },
  low: { label: "ซึม/เหงา", icon: Frown, dot: "bg-console-coral" },
  unclear: { label: "ไม่ชัดเจน", icon: CircleHelp, dot: "bg-console-outline" },
};

const td =
  "px-4 py-4 align-top max-sm:flex max-sm:items-start max-sm:justify-between max-sm:gap-4 max-sm:px-0 max-sm:py-1.5 max-sm:text-right max-sm:before:shrink-0 max-sm:before:text-left max-sm:before:text-sm max-sm:before:font-medium max-sm:before:text-ink-muted max-sm:before:content-[attr(data-label)]";

function CallCell({ r }: { r: DashboardRow }) {
  if (!r.latest_outcome) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-console-low px-2.5 py-1 text-[13px] font-semibold text-ink-muted">
        <Hourglass aria-hidden className="size-3.5" /> ยังไม่มีสายแรก
      </span>
    );
  }
  const pill =
    r.latest_outcome === "no_answer" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdad6] px-2.5 py-1 text-[13px] font-bold text-[#93000a]">
        <PhoneOff aria-hidden className="size-3.5" /> ไม่รับสาย (2 ครั้ง)
      </span>
    ) : r.latest_outcome === "unclear" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-1 text-[13px] font-bold text-yellow-800">
        <AudioLines aria-hidden className="size-3.5" /> ฟังไม่ชัด
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-console-green-bg px-2.5 py-1 text-[13px] font-bold text-console-green">
        <PhoneCall aria-hidden className="size-3.5" /> คุยสำเร็จ{" "}
        {Math.max(1, Math.round((r.latest_duration_sec ?? 0) / 60))} นาที
      </span>
    );
  return (
    <div className="flex flex-col items-start gap-1 max-sm:items-end">
      {pill}
      {r.latest_call_at && (
        <span className="flex items-center gap-1 text-[12px] text-ink-muted">
          <Clock aria-hidden className="size-3" /> ล่าสุด {formatThaiTime(r.latest_call_at)} น.
        </span>
      )}
    </div>
  );
}

function MedCell({ taken }: { taken: boolean | null }) {
  if (taken === true)
    return (
      <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-console-green">
        <Check aria-hidden className="size-4" strokeWidth={2.5} /> ทานยาแล้ว
      </span>
    );
  if (taken === false)
    return (
      <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-console-coral">
        <X aria-hidden className="size-4" strokeWidth={2.5} /> ยังไม่ทานยา
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[14px] text-ink-muted">
      <Minus aria-hidden className="size-4" /> ไม่ทราบ
    </span>
  );
}

function AiCell({ r }: { r: DashboardRow }) {
  const m = r.latest_mood ? MOOD[r.latest_mood] : null;
  return (
    <div className="flex flex-col gap-1 max-sm:items-end">
      {m ? (
        <span className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <span aria-hidden className={`size-2.5 rounded-full ${m.dot}`} /> {m.label}
        </span>
      ) : (
        <span className="text-[14px] text-ink-muted">ไม่มีข้อมูลเสียงสนทนา</span>
      )}
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[13px] text-ink-muted">
        {r.reasons.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function ElderTable({ rows, osmName }: { rows: DashboardRow[]; osmName: string }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-console-low p-6 text-center text-ink-muted">
        ไม่พบรายชื่อที่ตรงกับตัวกรอง
      </p>
    );
  }
  return (
    <table className="w-full border-separate border-spacing-0 text-left max-sm:block">
      <caption className="sr-only">ผู้สูงอายุในความดูแล เรียงตามความเสี่ยง</caption>
      <thead className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted max-sm:hidden">
        <tr className="bg-console-low">
          {[
            "ผู้สูงอายุ / สถานะ",
            "สถานะการโทรวันนี้",
            "การทานยาประจำวัน",
            "AI สรุป & อารมณ์",
            "อสม. รับผิดชอบ",
            "การจัดการ / Action",
          ].map((h, i, a) => (
            <th
              key={h}
              scope="col"
              className={`px-4 py-3 font-semibold ${i === 0 ? "rounded-l-2xl" : ""} ${i === a.length - 1 ? "rounded-r-2xl text-center" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-sm:block max-sm:space-y-3">
        {rows.map((r) => {
          const s = STATUS_META[r.status];
          return (
            <tr
              key={r.elder_id}
              data-testid="elder-row"
              data-status={r.status}
              className={`transition-colors hover:bg-console-low/50 [&>td]:border-b [&>td]:border-console max-sm:block max-sm:rounded-2xl max-sm:border max-sm:border-console-line max-sm:p-4 max-sm:[&>td]:border-0 ${r.resolved ? "opacity-60" : ""}`}
            >
              <td
                className={`${td} max-sm:text-left max-sm:before:content-none`}
                data-label="ผู้สูงอายุ"
              >
                <div className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    <span className="flex size-10 items-center justify-center rounded-full bg-console text-[15px] font-bold text-ink-muted">
                      {r.name.replace(/^(ยาย|ตา)/, "").slice(0, 1)}
                    </span>
                    <span
                      aria-hidden
                      className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white ${s.solid.split(" ")[0]}`}
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/dashboard/elders/${r.elder_id}`}
                        className="text-[16px] font-bold text-ink underline-offset-4 hover:text-brand-900 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <Badge status={r.status} />
                    </span>
                    <span className="text-[13px] tabular-nums text-ink-muted">
                      อายุ {r.age} ปี • {r.phone_masked}
                    </span>
                    {r.family_requested_osm && (
                      <span>
                        <Tag tone="brand" icon={HandHelping}>
                          ลูกหลานขอให้ช่วยดู
                        </Tag>
                      </span>
                    )}
                    {!r.voice_confirmed && (
                      <span>
                        <Tag tone="warn" icon={Mic}>
                          รอยืนยันความยินยอมด้วยเสียง
                        </Tag>
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className={td} data-label="การโทรวันนี้">
                <CallCell r={r} />
              </td>
              <td className={td} data-label="การทานยา">
                <MedCell taken={r.med_taken} />
              </td>
              <td className={`${td} max-w-64`} data-label="AI สรุป & อารมณ์">
                <AiCell r={r} />
              </td>
              <td className={td} data-label="อสม. รับผิดชอบ">
                <div className="flex flex-col max-sm:items-end">
                  <span className="text-[14px] font-bold text-ink">{osmName}</span>
                  <span
                    className={`text-[12px] ${r.resolved ? "text-console-green" : NEEDS_FOLLOWUP.has(r.status) ? "text-brand-900" : "text-ink-muted"}`}
                  >
                    {r.resolved
                      ? "ติดตามแล้ว"
                      : NEEDS_FOLLOWUP.has(r.status)
                        ? "รอติดตาม"
                        : "ติดตามปกติ"}
                  </span>
                </div>
              </td>
              <td className={td} data-label="การจัดการ">
                <Action r={r} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Action({ r }: { r: DashboardRow }) {
  const detail = (
    <Link
      href={`/dashboard/elders/${r.elder_id}`}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-console px-4 text-[13px] font-bold text-ink hover:bg-console-high"
    >
      ดูสรุป
    </Link>
  );
  if (r.resolved) {
    return (
      <div className="flex flex-col items-start gap-1.5 max-sm:items-end">
        <Tag tone="ok" icon={CheckCheck}>
          ติดตามแล้ว
        </Tag>
        {r.resolve_note && <p className="m-0 text-sm text-ink-muted">{r.resolve_note}</p>}
        {detail}
      </div>
    );
  }
  if (!NEEDS_FOLLOWUP.has(r.status) || !r.latest_call_id) {
    return (
      <div className="flex items-center justify-center gap-1 max-sm:justify-end">
        {detail}
        <Soon label="ฟังคลิปเสียง" className="size-11 justify-center rounded-full text-ink-muted">
          <AudioLines aria-hidden className="size-4" />
        </Soon>
      </div>
    );
  }
  return (
    <form
      action={resolveCallAction.bind(null, r.elder_id, r.latest_call_id)}
      className="flex min-w-48 flex-col gap-2 max-sm:w-full max-sm:min-w-0"
    >
      <label className="sr-only" htmlFor={`note-${r.elder_id}`}>
        บันทึกการติดตามของ {r.name}
      </label>
      <input
        id={`note-${r.elder_id}`}
        name="note"
        maxLength={300}
        placeholder="บันทึก (ถ้ามี)"
        className="min-h-11 w-full rounded-full bg-console-low px-4 text-[15px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-900/20"
      />
      <span className="flex gap-2">
        <button
          type="submit"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand-900 px-4 text-[13px] font-bold text-white hover:bg-brand-600"
        >
          ติดตามแล้ว
        </button>
        {detail}
      </span>
    </form>
  );
}
