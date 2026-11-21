"use server";
// Demo mode actions (CLAUDE.md §7.6). Runs the same pipeline as POST /v1/calls, including real
// Bedrock calls. Guarded twice: DEMO_MODE must be on here and on the backend, and the elder must
// be one the logged-in อสม. can see.
import { revalidatePath } from "next/cache";

import {
  ApiError,
  getDashboard,
  getDemoScenarios,
  isDemoMode,
  resetDemo,
  runDemoCall,
} from "@/lib/api";
import type { DemoCallResult } from "@/lib/types";

export type DemoState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: DemoCallResult; elderName: string };

const MAX_TURNS = 200; // backend DemoCallIn limit
const MAX_TEXT = 1000; // backend TranscriptTurn.text limit

const AI_PREFIX = /^(ai|หลาน)\s*[:：]\s*/i;
const ELDER_PREFIX = /^(ผู้สูงอายุ|elder|ยาย|ตา)\s*[:：]\s*/i;

/** One turn per line. "AI:"/"หลาน:" and "ผู้สูงอายุ:" set the speaker; otherwise turns alternate. */
function parseTranscript(raw: string): { speaker: "ai" | "elder"; text: string }[] {
  const turns: { speaker: "ai" | "elder"; text: string }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    let text = line.trim();
    if (!text) continue;
    let speaker: "ai" | "elder";
    if (AI_PREFIX.test(text)) {
      speaker = "ai";
      text = text.replace(AI_PREFIX, "");
    } else if (ELDER_PREFIX.test(text)) {
      speaker = "elder";
      text = text.replace(ELDER_PREFIX, "");
    } else {
      speaker = turns.length % 2 === 0 ? "ai" : "elder";
    }
    if (text) turns.push({ speaker, text: text.slice(0, MAX_TEXT) });
  }
  return turns.slice(0, MAX_TURNS);
}

export async function runDemoAction(_prev: DemoState, fd: FormData): Promise<DemoState> {
  if (!isDemoMode()) return { kind: "error", message: "โหมดเดโมปิดอยู่" };

  const elderId = String(fd.get("elder_id") ?? "");
  const elder = (await getDashboard()).rows.find((r) => r.elder_id === elderId);
  if (!elder) return { kind: "error", message: "กรุณาเลือกผู้สูงอายุ" };

  let body: Parameters<typeof runDemoCall>[0];
  if (fd.get("mode") === "typed") {
    const transcript = parseTranscript(String(fd.get("transcript") ?? ""));
    if (!transcript.some((t) => t.speaker === "elder")) {
      return { kind: "error", message: "พิมพ์บทสนทนาอย่างน้อย 2 บรรทัด (AI และผู้สูงอายุ)" };
    }
    body = { elder_id: elderId, transcript };
  } else {
    const scenarioId = String(fd.get("scenario_id") ?? "");
    if (!(await getDemoScenarios()).some((s) => s.id === scenarioId)) {
      return { kind: "error", message: "กรุณาเลือกสถานการณ์" };
    }
    body = { elder_id: elderId, scenario_id: scenarioId };
  }

  try {
    const result = await runDemoCall(body);
    revalidatePath("/dashboard", "layout");
    return { kind: "done", result, elderName: elder.name };
  } catch (e) {
    const code = e instanceof ApiError ? ` (${e.status} ${e.code})` : "";
    return { kind: "error", message: `จำลองสายไม่สำเร็จ${code}` };
  }
}

export async function resetDemoAction(): Promise<void> {
  if (!isDemoMode()) return;
  await resetDemo();
  revalidatePath("/", "layout");
}
