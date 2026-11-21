import { AlarmClock, ClipboardList } from "lucide-react";
import Link from "next/link";

import { completeTaskAction } from "@/app/dashboard/actions";
import { daysUntil, formatThaiDate } from "@/lib/format";
import type { NineQTaskView } from "@/lib/types";

import { Button } from "./Button";

function DueLabel({ due, now }: { due: string; now: Date }) {
  const n = daysUntil(due, now);
  const urgent = n <= 2;
  const text = n < 0 ? `เลยกำหนด ${-n} วัน` : n === 0 ? "ครบกำหนดวันนี้" : `เหลือ ${n} วัน`;
  return (
    <span className={urgent ? "font-semibold text-danger" : "text-ink-muted"}>
      {urgent && <AlarmClock aria-hidden className="mr-1 inline size-4 align-[-2px]" />}
      {text}
    </span>
  );
}

export function NineQBox({ tasks, now }: { tasks: NineQTaskView[]; now: Date }) {
  return (
    <section
      id="ninq"
      aria-labelledby="ninq-title"
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 id="ninq-title" className="m-0 flex items-center gap-2 text-[20px] font-bold text-ink">
        <ClipboardList aria-hidden className="size-5" /> งานประเมิน 9Q ({tasks.length})
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        มาจากการคัดกรอง 2Q ผลบวก — เป็นการคัดกรองเพื่อส่งต่อ ไม่ใช่การวินิจฉัย
      </p>
      {tasks.length === 0 ? (
        <p className="mt-4 text-ink-muted">ไม่มีงานค้าง</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/dashboard/elders/${t.elder_id}`}
                  className="font-semibold text-brand-900 underline-offset-4 hover:underline"
                >
                  {t.elder_name}
                </Link>
                <DueLabel due={t.due_at} now={now} />
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                คัดกรองเมื่อ {formatThaiDate(t.screened_at)} · ครบกำหนด {formatThaiDate(t.due_at)}
              </p>
              <form
                action={completeTaskAction.bind(null, t.elder_id, t.id)}
                className="mt-3 flex flex-col gap-2"
              >
                <label htmlFor={`task-${t.id}`} className="sr-only">
                  บันทึกการประเมินของ {t.elder_name}
                </label>
                <input
                  id={`task-${t.id}`}
                  name="note"
                  maxLength={300}
                  placeholder="บันทึก (ไม่ต้องใส่คะแนน)"
                  className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base placeholder:text-slate-400"
                />
                <Button type="submit" variant="secondary">
                  ประเมินแล้ว
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
