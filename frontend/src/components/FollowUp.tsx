// Follow-up control for one elder (CLAUDE.md §7.3): note + "ติดตามแล้ว" for red/yellow/unreachable
// that are not resolved yet, or the "ติดตามแล้ว" tag. Used by ElderTable and /dashboard/visit.
import { CheckCheck } from "lucide-react";

import { resolveCallAction } from "@/app/dashboard/actions";
import type { DashboardRow } from "@/lib/types";

import { Tag } from "./Badge";

const NEEDS_FOLLOWUP = new Set(["red", "yellow", "unreachable"]);

export function FollowUp({ r }: { r: DashboardRow }) {
  if (r.resolved) {
    return (
      <div className="flex flex-col items-start gap-1 max-xl:items-end">
        <Tag tone="ok" icon={CheckCheck}>
          ติดตามแล้ว
        </Tag>
        {r.resolve_note && <p className="m-0 text-[14px] text-ink-muted">{r.resolve_note}</p>}
      </div>
    );
  }
  if (!NEEDS_FOLLOWUP.has(r.status) || !r.latest_call_id) {
    return <span className="text-[15px] text-ink-muted">—</span>;
  }
  return (
    <form
      action={resolveCallAction.bind(null, r.elder_id, r.latest_call_id)}
      className="flex min-w-60 gap-2 max-xl:w-full max-xl:min-w-0"
    >
      <label className="sr-only" htmlFor={`note-${r.elder_id}`}>
        บันทึกการติดตามของ {r.name}
      </label>
      <input
        id={`note-${r.elder_id}`}
        name="note"
        maxLength={300}
        placeholder="บันทึก (ถ้ามี)"
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[15px] placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-600/15"
      />
      <button
        type="submit"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink/85"
      >
        ติดตามแล้ว
      </button>
    </form>
  );
}
