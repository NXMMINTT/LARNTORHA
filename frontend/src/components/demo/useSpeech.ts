"use client";
// Speech-to-text for the /demo voice call with Amazon Transcribe (th-TH), user decision
// 2026-11-21: AWS only. The browser records the mic as 16 kHz mono 16-bit PCM, stops after a
// pause (or when the user presses stop), and posts it to /demo/transcribe → backend → Transcribe.
// Use with made-up demo content only.
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

const RATE = 16_000;
const MAX_SECONDS = 30;
const SILENCE_MS = 1500; // stop after this long a pause once speech was heard
const SPEECH_RMS = 0.02; // above this a frame counts as speech

const noop = () => () => {};
const canRecord = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window.AudioContext !== "undefined";

/** Float samples at `from` Hz → 16-bit PCM at 16 kHz (simple averaging downsampler). */
function toPcm16(chunks: Float32Array[], from: number): ArrayBuffer {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    input.set(c, o);
    o += c.length;
  }
  const ratio = from / RATE;
  const out = new Int16Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out.buffer;
}

type Rec = { stop: (keep: boolean) => void };

/**
 * Press to talk: listen() records one utterance; onFinal gets the text from Amazon Transcribe.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const supported = useSyncExternalStore(noop, canRecord, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Rec | null>(null);

  const listen = useCallback(async () => {
    if (recRef.current) return;
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setError("เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้ไมค์ กดอนุญาตที่แถบที่อยู่ แล้วลองใหม่");
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    const started = performance.now();
    let heard = false;
    let lastVoice = started;
    let done = false;

    const finish = async (keep: boolean) => {
      if (done) return;
      done = true;
      node.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      const rate = ctx.sampleRate;
      void ctx.close();
      recRef.current = null;
      setListening(false);
      if (!keep || !heard) {
        setInterim("");
        if (keep) setError("ไม่ได้ยินเสียง ลองกดพูดใหม่");
        return;
      }
      setInterim("กำลังแปลงเสียงด้วย Amazon Transcribe…");
      try {
        const res = await fetch("/demo/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: toPcm16(chunks, rate),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { text } = (await res.json()) as { text: string };
        if (text.trim()) onFinal(text.trim());
        else setError("ฟังไม่ออก ลองพูดใหม่อีกครั้ง");
      } catch {
        setError("แปลงเสียงไม่สำเร็จ ลองใหม่อีกครั้ง หรือพิมพ์แทน");
      } finally {
        setInterim("");
      }
    };

    node.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const now = performance.now();
      if (Math.sqrt(sum / data.length) > SPEECH_RMS) {
        heard = true;
        lastVoice = now;
      }
      if ((heard && now - lastVoice > SILENCE_MS) || now - started > MAX_SECONDS * 1000) {
        void finish(true);
      }
    };
    source.connect(node);
    node.connect(ctx.destination);
    recRef.current = { stop: (keep) => void finish(keep) };
    setInterim("กำลังฟัง…");
    setListening(true);
  }, [onFinal]);

  /** Stop listening and transcribe what was heard so far. */
  const stop = useCallback(() => recRef.current?.stop(true), []);
  /** Stop listening and drop what was heard. */
  const cancel = useCallback(() => recRef.current?.stop(false), []);

  return { supported, listening, interim, error, listen, stop, cancel };
}
