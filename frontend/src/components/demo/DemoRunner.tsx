"use client";
// /demo form + result (CLAUDE.md §7.6): pick an elder and a scenario (or type a transcript),
// run it through the real pipeline, then show transcript · CallAnalysis · LINE cards.
import { Bot, Loader2, MessageSquareQuote, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { runDemoAction, type DemoState } from "@/app/demo/actions";
import { RiskBadge, STATUS_META } from "@/components/Badge";
import type { CallAnalysis, DemoScenario, TranscriptTurn } from "@/lib/types";

import { FlexPreview } from "./FlexPreview";

const panel = "rounded-2xl border border-console-line/80 bg-white p-5 shadow-sm";
const RISK_TH = { red: "เร่งด่วน", yellow: "ต้องติดตาม", green: "ปกติ" } as const;
const MOOD_TH = { good: "อารมณ์ดี", neutral: "ปกติ", low: "ซึม/เหงา", unclear: "ไม่ชัด" } as const;
const TWO_Q_TH = { not_asked: "ไม่ได้ถาม", negative: "ผลลบ", positive: "ผลบวก" } as const;
const SAMPLE = `AI: สวัสดีค่ะคุณยาย หนูเป็นผู้ช่วย AI ที่ลูกหลานสมัครไว้ วันนี้เป็นยังไงบ้างคะ
ผู้สูงอายุ: สบายดีจ้ะหลาน เมื่อเช้ารดน้ำผักบุ้ง
AI: กินยาความดันตอนเช้าแล้วหรือยังคะ
ผู้สูงอายุ: กินแล้วจ้ะ`;

/** Splits `text` so evidence quotes can be highlighted. */
function highlight(text: string, evidence: string[]) {
  const quotes = evidence.map((e) => e.replace(/^["“”']+|["“”']+$/g, "").trim()).filter(Boolean);
  const hit = quotes.find((q) => text.includes(q));
  if (!hit) return text;
  const i = text.indexOf(hit);
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-200 px-0.5">{hit}</mark>
      {text.slice(i + hit.length)}
    </>
  );
}

function Transcript({ turns, evidence }: { turns: TranscriptTurn[]; evidence: string[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {turns.map((t, i) => {
        const ai = t.speaker === "ai";
        return (
          <li key={i} className={`flex ${ai ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14px] ${ai ? "bg-console-low text-ink" : "bg-brand-900 text-white"}`}
            >
              <div className={`text-[11px] ${ai ? "text-ink-muted" : "text-white/80"}`}>
                {ai ? "AI หลาน" : t.speaker === "elder" ? "ผู้สูงอายุ" : "คนอื่น"}
              </div>
              {ai ? t.text : highlight(t.text, evidence)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Analysis({ a }: { a: CallAnalysis }) {
  const rows: [string, string][] = [
    ["ทานยา", a.med_taken === null ? "ไม่ทราบ" : a.med_taken ? "ทานแล้ว" : "ยังไม่ทาน"],
    ["อารมณ์", MOOD_TH[a.mood]],
    ["2Q", TWO_Q_TH[a.two_q]],
    ["คุณภาพเสียง/ข้อความ", a.transcript_quality === "good" ? "ดี" : "ไม่ชัด"],
    ["โมเดล", a.model_id ?? "—"],
    ["เวลาวิเคราะห์", `${(a.latency_ms / 1000).toFixed(1)} วินาที`],
  ];
  return (
    <div className="flex flex-col gap-3 text-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={a.risk_level} outcome="answered" />
        <span className="text-ink-muted">ระดับ: {RISK_TH[a.risk_level]}</span>
        {a.ai_status === "fallback" && (
          <span className="rounded-full bg-warn-bg px-2 text-[12px] text-yellow-800">
            สรุปอัตโนมัติไม่สำเร็จ ใช้กฎแทน
          </span>
        )}
      </div>
      {a.risk_reasons.length > 0 && (
        <div>
          <div className="text-[12px] font-semibold text-ink-muted">เหตุผล</div>
          <ul className="m-0 list-disc pl-5">
            {a.risk_reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {a.rule_flags.length > 0 && (
        <div className="text-[13px] text-ink">
          <span className="font-semibold">กฎความปลอดภัย:</span> {a.rule_flags.join(", ")}
        </div>
      )}
      <div>
        <div className="text-[12px] font-semibold text-ink-muted">สรุปสำหรับ อสม.</div>
        <p className="m-0">{a.summary_osm}</p>
      </div>
      <div>
        <div className="text-[12px] font-semibold text-ink-muted">สรุปสำหรับลูกหลาน</div>
        <p className="m-0">{a.summary_family}</p>
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="m-0 break-all text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DemoRunner({
  elders,
  scenarios,
}: {
  elders: { id: string; name: string }[];
  scenarios: DemoScenario[];
}) {
  const [state, action, pending] = useActionState<DemoState, FormData>(runDemoAction, {
    kind: "idle",
  });
  const [mode, setMode] = useState<"scenario" | "typed">("scenario");

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className={`${panel} flex flex-col gap-4`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            ผู้สูงอายุ
            <select
              name="elder_id"
              required
              defaultValue={elders[0]?.id}
              className="min-h-11 rounded-xl border border-console-line bg-white px-3 font-normal"
            >
              {elders.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="mb-1 text-[14px] font-semibold text-ink">บทสนทนา</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["scenario", "ใช้สถานการณ์ตัวอย่าง"],
                  ["typed", "พิมพ์เอง"],
                ] as const
              ).map(([id, label]) => (
                <label
                  key={id}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] ${mode === id ? "bg-brand-900 font-bold text-white" : "bg-console-low text-ink-muted"}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={id}
                    checked={mode === id}
                    onChange={() => setMode(id)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {mode === "scenario" ? (
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            สถานการณ์
            <select
              name="scenario_id"
              defaultValue={scenarios[0]?.id}
              className="min-h-11 rounded-xl border border-console-line bg-white px-3 font-normal"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — คาดว่า {RISK_TH[s.expected_risk]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            พิมพ์ทีละบรรทัด ขึ้นต้นด้วย “AI:” หรือ “ผู้สูงอายุ:” (ถ้าไม่ใส่ จะสลับกันโดยเริ่มที่ AI)
            <textarea
              name="transcript"
              rows={8}
              defaultValue={SAMPLE}
              className="rounded-xl border border-console-line bg-white p-3 font-normal leading-relaxed"
            />
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-[14px] font-bold text-white hover:bg-brand-600 disabled:opacity-70"
          >
            {pending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <PhoneCall aria-hidden className="size-4" />
            )}
            จำลองสายนี้
          </button>
          <span aria-live="polite" className="text-[14px] text-ink-muted">
            {pending ? "Amazon Bedrock กำลังสรุปสาย…" : ""}
          </span>
        </div>
        {state.kind === "error" && (
          <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
            {state.message}
          </p>
        )}
      </form>

      {state.kind === "done" && (
        <section aria-label="ผลการจำลองสาย" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xl font-bold text-ink">
              ผลสายของ{state.elderName} · สถานะตอนนี้:{" "}
              <span className={STATUS_META[state.result.status].text}>
                {STATUS_META[state.result.status].label}
              </span>
            </h2>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-full border border-console-line px-4 text-[14px] font-semibold text-brand-900 hover:bg-console-low"
            >
              ดูลำดับใน Dashboard →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={panel}>
              <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
                <MessageSquareQuote aria-hidden className="size-4" /> บทสนทนา
              </h3>
              <Transcript
                turns={state.result.transcript}
                evidence={state.result.analysis?.evidence ?? []}
              />
            </div>
            <div className={panel}>
              <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
                <Bot aria-hidden className="size-4" /> ผลวิเคราะห์ (CallAnalysis)
              </h3>
              {state.result.analysis ? (
                <Analysis a={state.result.analysis} />
              ) : (
                <p className="m-0 text-ink-muted">ไม่มีผลวิเคราะห์</p>
              )}
            </div>
            <div className={`${panel} flex flex-col gap-4`}>
              <h3 className="m-0 text-[15px] font-bold text-ink">การ์ด LINE ที่ส่ง</h3>
              {state.result.cards.length === 0 ? (
                <p className="m-0 text-ink-muted">ไม่มีการ์ด (ผู้สูงอายุไม่ได้ยินยอมให้ส่ง)</p>
              ) : (
                state.result.cards.map((c, i) => (
                  <FlexPreview
                    key={i}
                    message={c.message}
                    label={c.to === "guardian" ? "ถึงลูกหลาน" : "ถึง อสม."}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
