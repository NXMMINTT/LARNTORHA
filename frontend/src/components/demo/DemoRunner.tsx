"use client";
// /demo (CLAUDE.md §7.6 + team decision 21 Nov: live call in scope, typed instead of spoken).
// Step 1 คุยสด: phone mockup + chat. Lines come from a sample scenario (played turn by turn) or are
//   typed by the presenter. The live AI reply endpoint is not built yet, so น้องหลาน's lines are
//   scripted or typed — the screen says so.
// Step 2 วางสาย: the chat goes to POST /v1/demo/calls (same pipeline as real calls, real Bedrock).
// Step 3: links to the dashboard to show the new order.
import {
  ArrowRight,
  Bot,
  Keyboard,
  Loader2,
  MessageSquareQuote,
  Mic,
  Square,
  Pause,
  Phone,
  PhoneOff,
  Play,
  RotateCcw,
  SendHorizontal,
  Siren,
  SkipForward,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { liveTurnAction, runDemoAction, type DemoState } from "@/app/demo/actions";
import { RiskBadge, STATUS_META } from "@/components/Badge";
import { Face } from "@/components/Brand";
import type { CallAnalysis, DemoScenario, TranscriptTurn } from "@/lib/types";

import { FlexPreview } from "./FlexPreview";
import { useSpeech } from "./useSpeech";

type Turn = { speaker: "ai" | "elder"; text: string; urgent?: string | null };
const MAX_AUTO_TURNS = 24; // safety cap on Bedrock calls per demo call
type Phase = "idle" | "live" | "ended";

const panel = "rounded-2xl border border-console-line/80 bg-white p-5 shadow-sm";
const RISK_DOT = { red: "bg-danger", yellow: "bg-warn", green: "bg-ok" } as const;
const MOOD_TH = { good: "อารมณ์ดี", neutral: "ปกติ", low: "ซึม/เหงา", unclear: "ไม่ชัด" } as const;
const TWO_Q_TH = { not_asked: "ไม่ได้ถาม", negative: "ผลลบ", positive: "ผลบวก" } as const;
// TC2: the first line always says it is an AI assistant the family signed up for.
const OPENING = "สวัสดีครับ ผมชื่อน้องหลาน เป็นผู้ช่วย AI ที่ลูกหลานสมัครไว้ให้โทรมาถามไถ่ทุกวันครับ วันนี้เป็นยังไงบ้างครับ";

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ------------------------------------------------------------------ result pieces (step 2)

function highlight(text: string, evidence: string[]) {
  const quotes = evidence.map((e) => e.replace(/^["“”']+|["“”']+$/g, "").trim()).filter(Boolean);
  const hit = quotes.find((q) => text.includes(q));
  if (!hit) return text;
  const i = text.indexOf(hit);
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-200 px-0.5 text-ink">{hit}</mark>
      {text.slice(i + hit.length)}
    </>
  );
}

function ResultTranscript({ turns, evidence }: { turns: TranscriptTurn[]; evidence: string[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {turns.map((t, i) => {
        const ai = t.speaker === "ai";
        return (
          <li key={i} className={`flex ${ai ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14px] ${ai ? "bg-console-low text-ink" : "bg-brand-900 text-white"}`}
            >
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
    ["คุณภาพข้อความ", a.transcript_quality === "good" ? "ดี" : "ไม่ชัด"],
    ["โมเดล", a.model_id ?? "—"],
    ["เวลาวิเคราะห์", `${(a.latency_ms / 1000).toFixed(1)} วินาที`],
  ];
  return (
    <div className="flex flex-col gap-3 text-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={a.risk_level} outcome="answered" />
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

// ------------------------------------------------------------------ step indicator

function Steps({ step }: { step: 1 | 2 | 3 }) {
  const items = ["คุยสด", "วางสาย → AI สรุป", "ดูใน Dashboard"];
  return (
    <ol aria-label="ขั้นตอนเดโม" className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
      {items.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const on = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={on ? "step" : undefined}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[13px] ${on ? "bg-brand-900 font-bold text-white" : done ? "bg-console-high font-semibold text-brand-900" : "bg-console-low text-ink-muted"}`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${on ? "bg-white text-brand-900" : "bg-white/70"}`}
              >
                {n}
              </span>
              {label}
            </span>
            {n < 3 && <ArrowRight aria-hidden className="size-4 text-ink-muted" />}
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ phone mockup

function PhoneMock({
  phase,
  elderName,
  seconds,
  status,
  speaking,
  pending,
  canHangUp,
  onStart,
  onHangUp,
}: {
  phase: Phase;
  elderName: string;
  seconds: number;
  status: string;
  speaking: boolean;
  pending: boolean;
  canHangUp: boolean;
  onStart: () => void;
  onHangUp: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="w-full max-w-[340px] rounded-[44px] bg-[#293040] p-3 shadow-2xl">
        <div className="relative flex h-[600px] flex-col items-center justify-between overflow-hidden rounded-[34px] bg-slate-950 px-6 py-5 text-white">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-brand-900/25 blur-3xl"
          />
          {/* status bar */}
          <div className="z-10 flex w-full items-center justify-between text-[11px] text-white/70">
            <span className="font-semibold">09:00</span>
            <span className="rounded-full bg-black px-3 py-1 text-[10px] font-bold tracking-wide text-white/80">
              {phase === "live" ? "กำลังคุย" : phase === "ended" ? "วางสายแล้ว" : "พร้อมโทร"}
            </span>
            <span>ต้นแบบ</span>
          </div>

          {/* caller */}
          <div className="z-10 flex flex-col items-center gap-2 text-center">
            <div className="relative my-2 flex items-center justify-center">
              {speaking && (
                <span
                  aria-hidden
                  className="absolute size-32 animate-ping rounded-full bg-brand-900/30"
                />
              )}
              <span className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-[#FFF1EA] shadow-2xl">
                <Face className="size-[92%] translate-y-[3%]" />
              </span>
            </div>
            <div className="text-xl font-bold">น้องหลาน</div>
            <div className="text-[12px] text-white/70">ผู้ช่วย AI ที่ลูกหลานสมัครไว้</div>
            <div className="mt-1 font-mono text-[13px] text-white/80">
              {phase === "idle" ? `โทรหา ${elderName}` : `${mmss(seconds)} · ${elderName}`}
            </div>
          </div>

          {/* speaking indicator */}
          <div className="z-10 flex flex-col items-center gap-2">
            <div aria-hidden className="flex h-10 items-center gap-1.5">
              {[5, 8, 11, 9, 6, 10, 7].map((h, i) => (
                <span
                  key={i}
                  className={`w-1.5 rounded-full ${speaking ? "animate-pulse bg-brand-600" : "bg-white/20"}`}
                  style={{ height: `${speaking ? h * 3 : 6}px`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <span aria-live="polite" className="text-center text-[13px] text-white/80">
              {status}
            </span>
          </div>

          {/* call button */}
          <div className="z-10 flex flex-col items-center gap-2 pb-2">
            {phase === "idle" ? (
              <button
                type="button"
                onClick={onStart}
                aria-label="เริ่มสาย"
                className="flex size-16 items-center justify-center rounded-full bg-[#06c755] text-white shadow-lg active:scale-95"
              >
                <Phone aria-hidden className="size-7" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onHangUp}
                disabled={!canHangUp || pending || phase === "ended"}
                aria-label="วางสาย แล้วให้ AI สรุป"
                className="flex size-16 items-center justify-center rounded-full bg-brand-900 text-white shadow-lg active:scale-95 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 aria-hidden className="size-7 animate-spin" />
                ) : (
                  <PhoneOff aria-hidden className="size-7" />
                )}
              </button>
            )}
            <span className="text-[11px] text-white/60">
              {phase === "idle" ? "เริ่มสาย" : phase === "live" ? "วางสาย แล้วให้ AI สรุป" : ""}
            </span>
          </div>
        </div>
      </div>
      <p className="m-0 flex items-center gap-1.5 text-center text-[12px] text-ink-muted">
        <Keyboard aria-hidden className="size-4" /> ต้นแบบบนเว็บ ยังไม่มีการโทรเข้าเบอร์จริง
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ main

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
  const [elderId, setElderId] = useState(elders[0]?.id ?? "");
  const [scenarioId, setScenarioId] = useState<string | null>(scenarios[0]?.id ?? null);
  const [callPhase, setPhase] = useState<"idle" | "live">("idle");
  const [hungUp, setHungUp] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [cursor, setCursor] = useState(0);
  const [typingWho, setTypingWho] = useState<Turn["speaker"] | null>(null);
  const typing = typingWho !== null;
  // voice  = the presenter speaks as the elder (mic → text); น้องหลาน replies via the backend
  // auto   = น้องหลาน and a simulated elder both answer via the backend
  // manual = scripted playback or typing both sides
  const [mode, setMode] = useState<"voice" | "auto" | "manual">("voice");
  const auto = mode === "auto";
  const voice = mode === "voice";
  const turnsRef = useRef<Turn[]>([]); // latest chat for async voice handlers
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [speaker, setSpeaker] = useState<Turn["speaker"]>("elder");
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLOListElement>(null);
  const callGen = useRef(0); // bumps on reset so a pending scripted reply never lands in a new call
  const resultRef = useRef<HTMLElement>(null);

  // "ended" only while the summary runs or after it succeeded; an error leaves the call open to retry.
  const phase: Phase = hungUp && (pending || state.kind === "done") ? "ended" : callPhase;
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? null;
  const script: Turn[] = (scenario?.transcript ?? []).filter(
    (t): t is Turn => t.speaker === "ai" || t.speaker === "elder",
  );
  const elderName = elders.find((e) => e.id === elderId)?.name ?? "";
  const hasMore = cursor < script.length;
  const last = turns.at(-1);
  const step: 1 | 2 | 3 =
    state.kind === "done" && phase === "ended" ? 3 : phase === "ended" ? 2 : 1;

  // call timer
  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // keep the newest line in view
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, typing]);

  useEffect(() => {
    if (state.kind === "done") resultRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state]);

  function reset(nextScenario: string | null = scenarioId) {
    callGen.current += 1;
    setScenarioId(nextScenario);
    setPhase("idle");
    setHungUp(false);
    setTurns([]);
    turnsRef.current = [];
    speech.cancel();
    setCursor(0);
    setTypingWho(null);
    runningRef.current = false;
    setRunning(false);
    setNotice(null);
    setSeconds(0);
    setDraft("");
  }

  /** Lets น้องหลาน and the simulated elder talk turn by turn until น้องหลาน says goodbye. */
  async function runAuto(initial: Turn[]) {
    const gen = callGen.current;
    runningRef.current = true;
    setRunning(true);
    setNotice(null);
    let history = initial;
    let role: Turn["speaker"] = history.at(-1)?.speaker === "ai" ? "elder" : "ai";
    let ended = false;
    for (let i = 0; i < MAX_AUTO_TURNS && runningRef.current; i++) {
      setTypingWho(role);
      const res = await liveTurnAction(elderId, role, scenarioId, history);
      if (gen !== callGen.current) return;
      setTypingWho(null);
      if (!res.ok) {
        setNotice(res.message);
        break;
      }
      if (res.turn.source === "script") setNotice("Amazon Bedrock ไม่พร้อม ใช้บทสำรองแทน");
      history = [
        ...history,
        { speaker: res.turn.speaker, text: res.turn.text, urgent: res.turn.urgent },
      ];
      setTurns(history);
      if (res.turn.end) {
        ended = true;
        break;
      }
      role = role === "ai" ? "elder" : "ai";
      await new Promise((r) => window.setTimeout(r, 600)); // time to read each line
      if (gen !== callGen.current) return;
    }
    runningRef.current = false;
    setRunning(false);
    if (ended) submit(history);
  }

  function stopAuto() {
    runningRef.current = false;
  }

  function commit(next: Turn[]) {
    turnsRef.current = next;
    setTurns(next);
  }

  /** Voice mode: one reply from น้องหลาน for the chat so far; hangs up when she says goodbye. */
  async function askAi(history: Turn[]) {
    const gen = callGen.current;
    setTypingWho("ai");
    const res = await liveTurnAction(elderId, "ai", null, history);
    if (gen !== callGen.current) return;
    setTypingWho(null);
    if (!res.ok) {
      setNotice(res.message);
      return;
    }
    setNotice(res.turn.source === "script" ? "Amazon Bedrock ไม่พร้อม ใช้บทสำรองแทน" : null);
    const next = [
      ...history,
      { speaker: "ai" as const, text: res.turn.text, urgent: res.turn.urgent },
    ];
    commit(next);
    if (res.turn.end) submit(next);
  }

  /** Voice mode: the presenter's words become the elder's line, then น้องหลาน answers. */
  function elderSays(text: string) {
    const next = [...turnsRef.current, { speaker: "elder" as const, text: text.slice(0, 1000) }];
    commit(next);
    void askAi(next);
  }

  const speech = useSpeech(elderSays);

  /** Plays script[from]; an elder line is followed by the AI line after a short "typing". */
  function play(from: number) {
    const t = script[from];
    if (!t) return;
    setTurns((prev) => [...prev, t]);
    setCursor(from + 1);
    const next = script[from + 1];
    if (t.speaker === "elder" && next?.speaker === "ai") {
      setTypingWho("ai");
      const gen = callGen.current;
      window.setTimeout(() => {
        if (gen !== callGen.current) return;
        setTypingWho(null);
        setTurns((prev) => [...prev, next]);
        setCursor(from + 2);
      }, 900);
    }
  }

  function start() {
    setPhase("live");
    if (voice) {
      void askAi([]); // น้องหลาน opens the call; then the presenter presses the mic
    } else if (auto) {
      void runAuto([]);
    } else if (script.length > 0) {
      play(0);
    } else {
      setTurns([{ speaker: "ai", text: OPENING }]);
    }
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    if (voice) {
      // typed fallback for the voice mode (no mic / unsupported browser)
      setDraft("");
      elderSays(text);
      return;
    }
    if (phase === "idle") {
      setPhase("live");
      if (script.length === 0) setTurns([{ speaker: "ai", text: OPENING }]);
    }
    setTurns((prev) => [...prev, { speaker, text }]);
    setDraft("");
    setSpeaker((s) => (s === "elder" ? "ai" : "elder"));
  }

  function submit(history: Turn[]) {
    setHungUp(true);
    setTypingWho(null);
    const fd = new FormData();
    fd.set("elder_id", elderId);
    fd.set("mode", "turns");
    fd.set("turns", JSON.stringify(history.map(({ speaker, text }) => ({ speaker, text }))));
    startTransition(() => action(fd));
  }

  function hangUp() {
    // Drop any line still being generated, then summarise what was said so far.
    callGen.current += 1;
    runningRef.current = false;
    setRunning(false);
    speech.cancel();
    submit(turns);
  }

  const status = pending
    ? "Amazon Bedrock กำลังสรุปสาย…"
    : phase === "idle"
      ? "กดปุ่มเขียวเพื่อเริ่มสาย"
      : phase === "ended"
        ? state.kind === "done"
          ? "สรุปเสร็จแล้ว ดูผลด้านล่าง"
          : "วางสายแล้ว"
        : speech.listening
          ? "น้องหลานกำลังฟัง…"
          : typingWho === "elder"
            ? "ผู้สูงอายุ (จำลอง) กำลังพูด…"
            : typingWho === "ai" || last?.speaker === "ai"
              ? "น้องหลานกำลังพูด…"
              : "รอผู้สูงอายุพูด…";

  return (
    <div className="flex flex-col gap-6">
      <Steps step={step} />

      {/* ---------------------------------------------------------------- setup bar */}
      <div className={`${panel} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1 text-[13px] font-semibold text-ink">
            โทรหา
            <select
              value={elderId}
              onChange={(e) => {
                setElderId(e.target.value);
                reset();
              }}
              disabled={phase === "live" || pending}
              className="min-h-11 rounded-xl border border-console-line bg-white px-3 text-[14px] font-normal"
            >
              {elders.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => reset()}
            disabled={pending}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-console-low px-4 text-[13px] font-semibold text-ink hover:bg-console disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-4" /> เริ่มสายใหม่
          </button>
        </div>
        <div
          role="radiogroup"
          aria-label="วิธีคุย"
          className="inline-flex self-start rounded-full bg-console-low p-1 text-[13px]"
        >
          {(
            [
              ["voice", "พูดเองด้วยเสียง", Mic],
              ["auto", "AI คุยเองทั้งสาย", Sparkles],
              ["manual", "เล่นบท / พิมพ์เอง", Keyboard],
            ] as const
          ).map(([value, label, I]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value);
                reset();
              }}
              disabled={pending}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 ${mode === value ? "bg-white font-bold text-brand-900 shadow-sm" : "text-ink-muted"}`}
            >
              <I aria-hidden className="size-4" /> {label}
            </button>
          ))}
        </div>
        <p className="m-0 text-[13px] text-ink-muted">
          {voice
            ? "คุณเป็นผู้สูงอายุ: กดปุ่มเขียวให้น้องหลานทักก่อน แล้วกดไมค์พูดตอบ น้องหลานจะฟังแล้วตอบเป็นข้อความ"
            : auto
              ? "เลือกเรื่องที่ผู้สูงอายุจำลองจะเล่า แล้วกดปุ่มเขียว น้องหลานกับผู้สูงอายุจำลองจะคุยกันเองจนวางสาย"
              : "เลือกสถานการณ์เพื่อเล่นทีละประโยค หรือพิมพ์เองทั้งสาย"}
        </p>
        <div
          role="radiogroup"
          aria-label="บทสนทนา"
          className={`flex flex-wrap gap-2 ${voice ? "hidden" : ""}`}
        >
          {scenarios.map((s) => {
            const on = s.id === scenarioId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => reset(s.id)}
                disabled={pending}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors ${on ? "bg-brand-900 font-bold text-white" : "bg-console-low text-ink hover:bg-console"}`}
              >
                <span aria-hidden className={`size-2 rounded-full ${RISK_DOT[s.expected_risk]}`} />
                {s.title}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={scenarioId === null}
            onClick={() => reset(null)}
            disabled={pending}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[13px] ${scenarioId === null ? "bg-brand-900 font-bold text-white" : "bg-console-low text-ink hover:bg-console"}`}
          >
            {auto ? (
              <>
                <span aria-hidden className="size-2 rounded-full bg-ok" /> สบายดี (ไม่มีบท)
              </>
            ) : (
              <>
                <Keyboard aria-hidden className="size-4" /> พิมพ์เองทั้งสาย
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- step 1: live call */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <PhoneMock
            phase={phase}
            elderName={elderName}
            seconds={seconds}
            status={status}
            speaking={phase === "live" && (typing || last?.speaker === "ai")}
            pending={pending}
            canHangUp={turns.some((t) => t.speaker === "elder") && (auto || !typing)}
            onStart={start}
            onHangUp={hangUp}
          />
        </div>

        <section
          aria-labelledby="chat-title"
          className={`${panel} flex flex-col gap-3 lg:col-span-7`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="chat-title" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
              <MessageSquareQuote aria-hidden className="size-5 text-brand-900" /> บทสนทนาในสาย
            </h2>
            <span className="rounded-full border border-dashed border-console-line px-2.5 py-0.5 text-[12px] text-ink-muted">
              {voice ? "พูดด้วยเสียง · AI ตอบเป็นข้อความ" : auto ? "AI คุยกันเอง" : "พิมพ์แทนเสียง"} ·
              ข้อมูลสมมติ
            </span>
          </div>

          <ol
            ref={chatRef}
            aria-live="polite"
            className="m-0 flex h-[420px] list-none flex-col gap-3 overflow-y-auto rounded-xl bg-console-low/50 p-4"
          >
            {turns.length === 0 && (
              <li className="m-auto max-w-sm text-center text-[14px] text-ink-muted">
                {voice
                  ? `กดปุ่มเขียวที่โทรศัพท์ น้องหลานจะทัก${elderName}ก่อน แล้วกดไมค์ด้านล่างเพื่อพูดตอบแทน${elderName}`
                  : auto
                    ? `กดปุ่มเขียวที่โทรศัพท์ น้องหลานจะโทรหา${elderName} แล้วคุยกับผู้สูงอายุจำลอง${scenario ? ` ในสถานการณ์ “${scenario.title}”` : ""} จนวางสาย`
                    : scenario && script.length > 0
                      ? `กดปุ่มเขียวที่โทรศัพท์ หรือ “ประโยคถัดไป” เพื่อเล่นสถานการณ์ “${scenario.title}” ทีละประโยค`
                      : "กดปุ่มเขียวเพื่อเริ่มสาย น้องหลานจะแนะนำตัวก่อน แล้วพิมพ์คำพูดของผู้สูงอายุด้านล่าง"}
              </li>
            )}
            {turns.map((t, i) =>
              t.speaker === "ai" ? (
                <li key={i} className="flex items-end gap-2">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFF1EA]"
                  >
                    <Face className="size-[92%] translate-y-[3%]" />
                  </span>
                  <div className="max-w-[80%]">
                    <div className="mb-0.5 text-[11px] font-semibold text-brand-900">
                      น้องหลาน (AI)
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-[15px] text-ink shadow-sm">
                      {t.text}
                    </div>
                    {t.urgent && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger">
                        <Siren aria-hidden className="size-3" /> กฎความปลอดภัยพบ “{t.urgent}” → แนะนำ
                        1669
                      </div>
                    )}
                  </div>
                </li>
              ) : (
                <li key={i} className="flex justify-end">
                  <div className="max-w-[80%] text-right">
                    <div className="mb-0.5 text-[11px] font-semibold text-ink-muted">
                      {elderName}
                      {auto && " · ผู้สูงอายุจำลองโดย AI"}
                      {voice && " · จากเสียงพูด"}
                    </div>
                    <div className="rounded-2xl rounded-br-sm bg-brand-900 px-3.5 py-2.5 text-left text-[15px] text-white shadow-sm">
                      {t.text}
                    </div>
                  </div>
                </li>
              ),
            )}
            {speech.listening && (
              <li className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm border-2 border-dashed border-brand-900/40 bg-white px-3.5 py-2.5 text-[15px] text-ink-muted">
                  <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-brand-900" />
                  {speech.interim || "กำลังฟัง…"}
                </div>
              </li>
            )}
            {typing && (
              <li
                className={`flex items-center gap-2 text-[12px] text-ink-muted ${typingWho === "elder" ? "flex-row-reverse pr-1" : "pl-10"}`}
              >
                <span className="flex gap-1 rounded-full bg-white px-3 py-2 shadow-sm">
                  {[0, 0.15, 0.3].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-brand-900"
                      style={{ animationDelay: `${d}s` }}
                    />
                  ))}
                </span>
                {typingWho === "elder" ? `${elderName} กำลังพูด…` : "น้องหลานกำลังตอบ…"}
              </li>
            )}
          </ol>

          {/* voice controls */}
          {voice && phase === "live" && (
            <div className="flex flex-col items-center gap-2 py-1">
              {speech.supported ? (
                <>
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : speech.listen}
                    disabled={typing || pending}
                    aria-pressed={speech.listening}
                    aria-label={speech.listening ? "พูดจบแล้ว" : "กดแล้วพูด"}
                    className={`flex size-16 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-40 ${speech.listening ? "animate-pulse bg-danger ring-8 ring-danger/20" : "bg-brand-900 hover:bg-brand-600"}`}
                  >
                    {speech.listening ? (
                      <Square aria-hidden className="size-6" />
                    ) : (
                      <Mic aria-hidden className="size-7" />
                    )}
                  </button>
                  <span className="text-[13px] font-semibold text-ink">
                    {speech.listening
                      ? "กำลังฟัง… พูดจบแล้วรอสักครู่ หรือกดปุ่มอีกครั้ง"
                      : typing
                        ? "น้องหลานกำลังตอบ…"
                        : `กดไมค์แล้วพูดแทน${elderName}`}
                  </span>
                </>
              ) : (
                <span className="text-[13px] text-yellow-800">
                  เบราว์เซอร์นี้แปลงเสียงไม่ได้ ใช้ Chrome หรือ Edge หรือพิมพ์ด้านล่างแทน
                </span>
              )}
              {speech.error && (
                <span role="alert" className="text-[13px] font-semibold text-danger">
                  {speech.error}
                </span>
              )}
            </div>
          )}

          {/* auto controls */}
          {auto && (
            <div className="flex flex-wrap items-center gap-2">
              {running ? (
                <button
                  type="button"
                  onClick={stopAuto}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-console-low px-4 text-[13px] font-semibold text-ink hover:bg-console"
                >
                  <Pause aria-hidden className="size-4" /> หยุดให้ AI คุยชั่วคราว
                </button>
              ) : phase === "live" ? (
                <button
                  type="button"
                  onClick={() => void runAuto(turns)}
                  disabled={pending}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-900 px-4 text-[13px] font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  <Play aria-hidden className="size-4" /> ให้ AI คุยต่อ
                </button>
              ) : null}
              <span className="text-[12px] text-ink-muted">
                {running
                  ? "กำลังคุย… กดหยุดแล้วพิมพ์แทรกเองได้"
                  : phase === "live"
                    ? "หยุดอยู่ พิมพ์แทรกด้านล่างได้ หรือกดวางสายที่โทรศัพท์"
                    : ""}
              </span>
            </div>
          )}
          {notice && (
            <p role="status" className="m-0 text-[13px] font-semibold text-yellow-800">
              {notice}
            </p>
          )}

          {/* input */}
          <div
            className={`flex flex-col gap-2 ${(auto || voice) && phase !== "live" ? "hidden" : ""}`}
          >
            <div className={`flex flex-wrap items-center gap-2 ${voice ? "hidden" : ""}`}>
              <div
                role="radiogroup"
                aria-label="ใครพูด"
                className="inline-flex rounded-full bg-console-low p-1 text-[12px]"
              >
                {(
                  [
                    ["elder", "ผู้สูงอายุ"],
                    ["ai", "น้องหลาน"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={speaker === id}
                    onClick={() => setSpeaker(id)}
                    className={`min-h-8 rounded-full px-3 ${speaker === id ? "bg-white font-bold text-ink shadow-sm" : "text-ink-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {hasMore && !auto && (
                <button
                  type="button"
                  onClick={() => (phase === "idle" ? start() : play(cursor))}
                  disabled={typing || pending || phase === "ended"}
                  className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-900 px-4 text-[13px] font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  <SkipForward aria-hidden className="size-4" /> ประโยคถัดไป (
                  {script.length - cursor})
                </button>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="demo-line" className="sr-only">
                พิมพ์คำพูด
              </label>
              <input
                id="demo-line"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                disabled={phase === "ended" || pending || running || speech.listening}
                placeholder={
                  voice
                    ? "หรือพิมพ์แทนการพูด"
                    : speaker === "elder"
                      ? "พิมพ์แทนคำพูดผู้สูงอายุ เช่น “เจ็บหน้าอกตั้งแต่เช้า”"
                      : "พิมพ์บทของน้องหลาน"
                }
                className="min-h-11 flex-1 rounded-full border border-console-line bg-white px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!draft.trim() || phase === "ended" || pending}
                aria-label="ส่ง"
                className="inline-flex size-11 items-center justify-center rounded-full bg-brand-900 text-white disabled:opacity-40"
              >
                <SendHorizontal aria-hidden className="size-5" />
              </button>
            </form>
            <p className="m-0 text-[12px] text-ink-muted">
              {voice
                ? "เสียงแปลงเป็นข้อความด้วยระบบของเบราว์เซอร์ (ใช้ข้อมูลสมมติเท่านั้น) น้องหลานตอบด้วย Amazon Bedrock คำเร่งด่วนตรวจด้วยกฎตายตัวเสมอ"
                : auto
                  ? "น้องหลานและผู้สูงอายุจำลองตอบด้วย Amazon Bedrock ทีละประโยค คำเร่งด่วนตรวจด้วยกฎตายตัวเสมอ"
                  : "บทของน้องหลานมาจากสถานการณ์ตัวอย่างหรือพิมพ์เอง ส่วนการสรุปหลังวางสายใช้ Amazon Bedrock จริง"}
            </p>
          </div>

          {state.kind === "error" && (
            <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
              {state.message}
            </p>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------------- step 2 + 3: result */}
      {state.kind === "done" && phase === "ended" && (
        <section
          ref={resultRef}
          aria-label="ผลหลังวางสาย"
          className="flex scroll-mt-24 flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xl font-bold text-ink">
              ผลสายของ{state.elderName} · สถานะตอนนี้:{" "}
              <span className={STATUS_META[state.result.status].text}>
                {STATUS_META[state.result.status].label}
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/elders/${elderId}`}
                className="inline-flex min-h-11 items-center rounded-full border border-console-line px-4 text-[14px] font-semibold text-ink hover:bg-console-low"
              >
                สรุปรายวันของ{state.elderName}
              </Link>
              <Link
                href="/dashboard/elders"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-900 px-4 text-[14px] font-bold text-white hover:bg-brand-600"
              >
                ดูลำดับใน Dashboard <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={panel}>
              <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
                <MessageSquareQuote aria-hidden className="size-4" /> หลักฐานจากบทสนทนา
              </h3>
              <ResultTranscript
                turns={state.result.transcript}
                evidence={state.result.analysis?.evidence ?? []}
              />
            </div>
            <div className={panel}>
              <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
                <Bot aria-hidden className="size-4" /> ผลวิเคราะห์ (Amazon Bedrock)
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
                <p className="m-0 text-ink-muted">ไม่มีการ์ด (สถานะนี้ไม่ต้องแจ้ง หรือไม่ได้ยินยอมให้ส่ง)</p>
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
