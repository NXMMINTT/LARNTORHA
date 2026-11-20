import { Check, CheckCheck, HandHelping, Mic, Minus, X } from "lucide-react";
import Link from "next/link";

import { resolveCallAction } from "@/app/dashboard/actions";
import { formatThaiDateTime } from "@/lib/format";
import type { DashboardRow } from "@/lib/types";

import { Badge, Tag } from "./Badge";
import { Button } from "./Button";

const NEEDS_FOLLOWUP = new Set(["red", "yellow", "unreachable"]);

function rowTone(r: DashboardRow): string {
  if (r.resolved) return "opacity-60";
  if (r.status === "red") return "bg-danger-bg/70";
  if (r.status === "yellow" || r.status === "unreachable") return "bg-warn-bg/70";
  return "bg-white";
}

function Med({ taken }: { taken: boolean | null }) {
  if (taken === true)
    return (
      <span className="inline-flex items-center gap-1.5 text-green-800">
        <Check aria-hidden className="size-4" strokeWidth={2.5} /> กินแล้ว
      </span>
    );
  if (taken === false)
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
        <X aria-hidden className="size-4" strokeWidth={2.5} /> ยังไม่กิน
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-muted">
      <Minus aria-hidden className="size-4" /> ไม่ทราบ
    </span>
  );
}

// ≥640px: a normal table. <640px: each row becomes a card of label/value pairs (CLAUDE.md §7.3).
const td =
  "px-3 py-3 align-top max-sm:flex max-sm:items-start max-sm:justify-between max-sm:gap-4 max-sm:px-0 max-sm:py-1.5 max-sm:text-right max-sm:before:shrink-0 max-sm:before:text-left max-sm:before:font-medium max-sm:before:text-ink-muted max-sm:before:content-[attr(data-label)]";

export function ElderTable({ rows }: { rows: DashboardRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-center text-ink-muted">
        ยังไม่มีผู้สูงอายุในความดูแล
      </p>
    );
  }
  return (
    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-line text-left max-sm:block max-sm:border-0">
      <caption className="sr-only">ผู้สูงอายุในความดูแล เรียงตามความเสี่ยง</caption>
      <thead className="bg-slate-50 text-sm text-ink-muted max-sm:hidden">
        <tr>
          {["ชื่อ", "อายุ", "สถานะ", "เหตุผลที่ติดธง", "ยา", "สายล่าสุด", "การติดตาม"].map((h) => (
            <th key={h} scope="col" className="border-b border-line px-3 py-2 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-sm:block max-sm:space-y-3">
        {rows.map((r) => (
          <tr
            key={r.elder_id}
            data-testid="elder-row"
            data-status={r.status}
            className={`${rowTone(r)} [&>td]:border-b [&>td]:border-line max-sm:block max-sm:rounded-2xl max-sm:border max-sm:border-line max-sm:p-4 max-sm:[&>td]:border-0`}
          >
            <td className={`${td} max-sm:before:content-none max-sm:text-left`} data-label="ชื่อ">
              <div>
                <Link
                  href={`/dashboard/elders/${r.elder_id}`}
                  className="text-lg font-semibold text-brand-900 underline-offset-4 hover:underline"
                >
                  {r.name}
                </Link>
                <div className="text-sm tabular-nums text-ink-muted">{r.phone_masked}</div>
                {!r.voice_confirmed && (
                  <div className="mt-1">
                    <Tag tone="warn" icon={Mic}>
                      รอยืนยันความยินยอมด้วยเสียง
                    </Tag>
                  </div>
                )}
              </div>
            </td>
            <td className={td} data-label="อายุ">
              {r.age}
            </td>
            <td className={td} data-label="สถานะ">
              <div className="flex flex-col items-start gap-1 max-sm:items-end">
                <Badge status={r.status} />
                {r.family_requested_osm && (
                  <Tag tone="brand" icon={HandHelping}>
                    ลูกหลานขอให้ช่วยดู
                  </Tag>
                )}
              </div>
            </td>
            <td className={`${td} max-w-xs`} data-label="เหตุผล">
              <ul className="space-y-0.5">
                {r.reasons.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </td>
            <td className={`${td} whitespace-nowrap`} data-label="ยา">
              <Med taken={r.med_taken} />
            </td>
            <td className={`${td} whitespace-nowrap text-sm`} data-label="สายล่าสุด">
              {r.latest_call_at ? formatThaiDateTime(r.latest_call_at) : "—"}
            </td>
            <td className={td} data-label="การติดตาม">
              <FollowUp row={r} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FollowUp({ row }: { row: DashboardRow }) {
  if (row.resolved) {
    return (
      <div className="space-y-1 max-sm:text-right">
        <Tag tone="ok" icon={CheckCheck}>
          ติดตามแล้ว
        </Tag>
        {row.resolve_note && <p className="text-sm text-ink-muted">{row.resolve_note}</p>}
      </div>
    );
  }
  if (!NEEDS_FOLLOWUP.has(row.status) || !row.latest_call_id) {
    return <span className="text-ink-muted">—</span>;
  }
  return (
    <form
      action={resolveCallAction.bind(null, row.elder_id, row.latest_call_id)}
      className="flex min-w-48 flex-col gap-2 max-sm:w-full max-sm:min-w-0"
    >
      <label className="sr-only" htmlFor={`note-${row.elder_id}`}>
        บันทึกการติดตามของ {row.name}
      </label>
      <input
        id={`note-${row.elder_id}`}
        name="note"
        maxLength={300}
        placeholder="บันทึก (ถ้ามี)"
        className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base"
      />
      <Button type="submit" variant="secondary">
        ติดตามแล้ว
      </Button>
    </form>
  );
}
