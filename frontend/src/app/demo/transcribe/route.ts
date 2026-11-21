// POST /demo/transcribe — voice demo speech-to-text (Amazon Transcribe via the backend).
// The browser never calls the backend directly (CLAUDE.md §3): this route checks DEMO_MODE and
// the อสม. session, then forwards the PCM audio.
import { NextResponse, type NextRequest } from "next/server";

import { ApiError, getMe, isDemoMode, transcribeDemo } from "@/lib/api";

const MAX_BYTES = 16_000 * 2 * 30; // 30 s of 16 kHz 16-bit mono

export async function POST(request: NextRequest) {
  if (!isDemoMode()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await getMe(); // redirects to /login when the session is missing or expired
  const pcm = await request.arrayBuffer();
  if (pcm.byteLength === 0 || pcm.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "bad_audio" }, { status: 422 });
  }
  try {
    return NextResponse.json({ text: await transcribeDemo(pcm) });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    return NextResponse.json({ error: "transcribe_failed" }, { status });
  }
}
