// Elder table of the อสม. overview (CLAUDE.md §7.3). ≥1280px: table; below that (phones, and
// laptops where the sidebar leaves too little room) each row becomes a card of label/value pairs —
// no horizontal scrolling. Row tint: red → light red, yellow/unreachable → light yellow, resolved → faded.
import { ChevronRight, HandHelping, Mic } from "lucide-react";
import Link from "next/link";

import { formatThaiTime } from "@/lib/format";
import type { DashboardRow, Mood } from "@/lib/types";

import { Badge, Tag } from "./Badge";
import { FollowUp } from "./FollowUp";

// Light tint + a coloured bar on the left edge (table: first cell's left border; cards: the card's).
const ROW_TINT: Record<DashboardRow["status"], string> = {
  red: "bg-danger-bg/40 [&>td:first-child]:border-l-danger max-xl:border-l-danger",
  yellow: "bg-warn-bg/40 [&>td:first-child]:border-l-warn max-xl:border-l-warn",
  unreachable: "bg-warn-bg/40 [&>td:first-child]:border-l-warn max-xl:border-l-warn",
  green: "[&>td:first-child]:border-l-transparent max-xl:border-l-slate-200",
  pending: "[&>td:first-child]:border-l-transparent max-xl:border-l-slate-200",
};

const MOOD: Record<Mood, string> = {
  good: "อารมณ์ดี",
  neutral: "อารมณ์ปกติ",
  low: "ซึม/เหงา",
  unclear: "อารมณ์ไม่ชัดเจน",
};

const td =
  "px-4 py-4 align-top max-xl:flex max-xl:items-start max-xl:justify-between max-xl:gap-4 max-xl:px-0 max-xl:py-1.5 max-xl:text-right max-xl:before:shrink-0 max-xl:before:text-left max-xl:before:text-sm max-xl:before:font-medium max-xl:before:text-ink-muted max-xl:before:content-[attr(data-label)]";

function CallCell({ r }: { r: DashboardRow }) {
  if (!r.latest_outcome) return <span className="text-[15px] text-ink-muted">ยังไม่มีสายแรก</span>;
  const [text, cls] =
    r.latest_outcome === "no_answer"
      ? ["ไม่รับสาย 2 ครั้ง", "font-semibold text-danger"]
      : r.latest_outcome === "unclear"
        ? ["ฟังไม่ชัด", "font-semibold text-yellow-800"]
        : [`คุยแล้ว ${Math.max(1, Math.round((r.latest_duration_sec ?? 0) / 60))} นาที`, "text-ink"];
  return (
    <div className="flex flex-col max-xl:items-end">
      <span className={`text-[15px] ${cls}`}>{text}</span>
      {r.latest_call_at && (
        <span className="text-[14px] text-ink-muted">{formatThaiTime(r.latest_call_at)} น.</span>
      )}
    </div>
  );
}

function MedCell({ taken }: { taken: boolean | null }) {
  if (taken === true) return <span className="text-[15px] text-ink">กินแล้ว</span>;
  if (taken === false) return <span className="text-[15px] font-semibold text-danger">ยังไม่กิน</span>;
  return <span className="text-[15px] text-ink-muted">ไม่ทราบ</span>;
}

function AiCell({ r }: { r: DashboardRow }) {
  return (
    <div className="flex flex-col gap-0.5 max-xl:items-end">
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[15px] text-ink max-xl:items-end max-xl:text-right">
        {r.reasons.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {r.latest_mood && <span className="text-[14px] text-ink-muted">{MOOD[r.latest_mood]}</span>}
    </div>
  );
}

export function ElderTable({ rows }: { rows: DashboardRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="m-0 rounded-2xl border border-slate-200 bg-white p-6 text-center text-ink-muted">
        ไม่พบรายชื่อที่ตรงกับตัวกรอง
      </p>
    );
  }
  return (
    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left max-xl:block max-xl:overflow-visible max-xl:rounded-none max-xl:border-0 max-xl:bg-transparent">
      <caption className="sr-only">ผู้สูงอายุในความดูแล เรียงตามความเสี่ยง</caption>
      <thead className="text-[14px] text-ink-muted max-xl:hidden">
        <tr>
          {["ผู้สูงอายุ", "สายล่าสุด", "ยา", "เหตุผล / สรุปจาก AI", "การติดตาม"].map((h, i) => (
            <th
              key={h}
              scope="col"
              className={`border-b border-slate-200 px-4 py-3 font-semibold ${i === 0 ? "border-l-4 border-l-transparent" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-xl:block max-xl:space-y-3">
        {rows.map((r) => (
          <tr
            key={r.elder_id}
            data-testid="elder-row"
            data-status={r.status}
            className={`[&>td]:border-b [&>td]:border-slate-100 last:[&>td]:border-b-0 [&>td:first-child]:border-l-4 max-xl:block max-xl:rounded-2xl max-xl:border max-xl:border-l-4 max-xl:border-slate-200 max-xl:bg-white max-xl:p-4 max-xl:[&>td]:border-0 ${ROW_TINT[r.status]} ${r.resolved ? "opacity-60" : ""}`}
          >
            <td
              className={`${td} max-xl:block max-xl:border-l-0! max-xl:pb-2 max-xl:text-left max-xl:before:content-none`}
              data-label="ผู้สูงอายุ"
            >
              <div className="flex flex-col items-start gap-1 text-left">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/elders/${r.elder_id}`}
                    className="inline-flex items-center gap-0.5 text-[16px] font-bold text-ink underline-offset-4 hover:underline"
                  >
                    {r.name}
                    <ChevronRight aria-hidden className="size-4 text-ink-muted" />
                  </Link>
                  <Badge status={r.status} />
                </span>
                <span className="text-[14px] tabular-nums text-ink-muted">
                  {r.age} ปี · {r.phone_masked}
                </span>
                {(r.family_requested_osm || !r.voice_confirmed) && (
                  <span className="flex flex-wrap gap-1.5 pt-0.5">
                    {r.family_requested_osm && (
                      <Tag tone="brand" icon={HandHelping}>
                        ลูกหลานขอให้ช่วยดู
                      </Tag>
                    )}
                    {!r.voice_confirmed && (
                      <Tag tone="warn" icon={Mic}>
                        รอยืนยันความยินยอมด้วยเสียง
                      </Tag>
                    )}
                  </span>
                )}
              </div>
            </td>
            <td className={td} data-label="สายล่าสุด">
              <CallCell r={r} />
            </td>
            <td className={td} data-label="ยา">
              <MedCell taken={r.med_taken} />
            </td>
            <td className={`${td} max-w-72`} data-label="เหตุผล">
              <AiCell r={r} />
            </td>
            <td className={td} data-label="การติดตาม">
              <FollowUp r={r} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
