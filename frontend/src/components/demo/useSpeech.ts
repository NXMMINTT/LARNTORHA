"use client";
// Browser speech-to-text for the /demo voice call (Web Speech API, lang th-TH).
// Chrome/Edge send the audio to their cloud recogniser: use with made-up demo content only.
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

// Minimal types: SpeechRecognition is not in TypeScript's lib.dom.
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

const ERRORS: Record<string, string> = {
  "not-allowed": "เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้ไมค์ กดอนุญาตที่แถบที่อยู่ แล้วลองใหม่",
  "service-not-allowed": "เบราว์เซอร์ไม่อนุญาตให้ใช้ระบบแปลงเสียง",
  "no-speech": "ไม่ได้ยินเสียง ลองกดพูดใหม่",
  "audio-capture": "ไม่พบไมโครโฟน",
  network: "แปลงเสียงไม่ได้ เพราะเชื่อมต่ออินเทอร์เน็ตไม่ได้",
};

/**
 * Press to talk: listen() records one utterance; onFinal gets the text when the speaker stops.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const supported = useSyncExternalStore(
    noop,
    () => getCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);

  const listen = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.lang = "th-TH";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim((finalText + live).trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? `แปลงเสียงไม่สำเร็จ (${e.error})`);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) onFinal(text);
    };
    recRef.current = rec;
    setError(null);
    setInterim("");
    setListening(true);
    rec.start();
  }, [onFinal]);

  /** Stop listening and use what was heard so far. */
  const stop = useCallback(() => recRef.current?.stop(), []);
  /** Stop listening and drop what was heard. */
  const cancel = useCallback(() => recRef.current?.abort(), []);

  return { supported, listening, interim, error, listen, stop, cancel };
}
