"use client";
// Chat-bubble interlude on the home page, animated each time it scrolls into view:
// 1. the family member's question slides in from the left
// 2. น้องหลาน "types" (bouncing dots, mascot bobbing)
// 3. her reply types out letter by letter
// 4. a small chip appears, e.g. "กำลังโทรหาแม่" with a ringing phone
// With prefers-reduced-motion the final state shows straight away. Decorative (aria-hidden).
import { BellRing, Phone, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/SiteChrome";

type Step = 0 | 1 | 2 | 3 | 4; // hidden · question · typing · reply typing out · done

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Thai-safe letters: never split a vowel or tone mark from its consonant. */
function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

const CHAR_MS = 38;
const CHIP_ICONS = { phone: Phone, bell: BellRing } satisfies Record<string, LucideIcon>;

export function ChatInterlude({
  ask,
  reply,
  tint = false,
  chip,
  chipIcon = "phone",
}: {
  ask: string;
  reply: string;
  tint?: boolean;
  /** Shown after the reply, e.g. "กำลังโทรหาแม่…". */
  chip?: string;
  /** A name, not a component: this is a Client Component used from a Server Component. */
  chipIcon?: keyof typeof CHIP_ICONS;
}) {
  const ChipIcon = CHIP_ICONS[chipIcon];
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(0);
  const [typed, setTyped] = useState(0);
  const letters = useMemo(() => graphemes(reply), [reply]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timers: number[] = [];
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    const play = () => {
      clear();
      if (reducedMotion()) {
        setTyped(letters.length);
        setStep(4);
        return;
      }
      setTyped(0);
      setStep(1);
      at(650, () => setStep(2));
      const startType = 1900;
      at(startType, () => setStep(3));
      letters.forEach((_, i) => at(startType + i * CHAR_MS, () => setTyped(i + 1)));
      at(startType + letters.length * CHAR_MS + 250, () => setStep(4));
    };
    const reset = () => {
      clear();
      setStep(0);
      setTyped(0);
    };

    // Replays whenever it comes back into view; resets once it is fully out of view.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.6) play();
        else if (e.intersectionRatio === 0) reset();
      },
      { threshold: [0, 0.6] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [letters]);

  const shown = (s: Step, from = "translate-y-3") =>
    step >= s ? "translate-x-0 translate-y-0 opacity-100" : `pointer-events-none ${from} opacity-0`;

  return (
    <div
      ref={ref}
      aria-hidden
      className={`flex min-h-[132px] flex-col items-center gap-2.5 px-5 py-10 text-[16px] md:text-[17px] ${tint ? "bg-brand-50" : ""}`}
    >
      {/* question */}
      <div
        className={`flex max-w-full items-end gap-2.5 self-start transition-all duration-500 ease-out sm:self-auto md:-ml-28 ${shown(1, "-translate-x-6")}`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <UserRound className="size-5" />
        </span>
        <span className="rounded-[20px] rounded-bl-md bg-white px-[18px] py-2.5 shadow-[0_4px_14px_rgba(120,20,30,.08)]">
          {ask}
        </span>
      </div>

      {/* reply */}
      <div
        className={`flex max-w-full items-end gap-2.5 self-end transition-all duration-300 ease-out sm:self-auto md:ml-28 ${shown(2)}`}
      >
        {step <= 2 ? (
          // Same width as the reply (invisible copy) so the mascot does not jump when it appears.
          <span className="grid rounded-[20px] rounded-br-md bg-brand-600 px-[18px] py-2.5 text-white">
            <span className="invisible col-start-1 row-start-1">{reply}</span>
            <span className="col-start-1 row-start-1 flex items-center gap-1.5">
              {[0, 0.15, 0.3].map((d) => (
                <span
                  key={d}
                  className="size-2 animate-bounce rounded-full bg-white/90"
                  style={{ animationDelay: `${d}s`, animationDuration: "0.9s" }}
                />
              ))}
            </span>
          </span>
        ) : (
          <span className="animate-pop rounded-[20px] rounded-br-md bg-brand-600 px-[18px] py-2.5 text-white shadow-[0_8px_20px_rgba(215,25,32,.25)]">
            {/* full text reserves the size; the typed part sits on top */}
            <span className="grid">
              <span className="invisible col-start-1 row-start-1">{reply}</span>
              <span className="col-start-1 row-start-1">
                {letters.slice(0, typed).join("")}
                {step === 3 && (
                  <span className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 animate-pulse bg-white/80" />
                )}
              </span>
            </span>
          </span>
        )}
        <span className="relative shrink-0">
          <BrandMark className={`size-10 rounded-full ${step >= 2 ? "animate-bob" : ""}`} />
          {step >= 4 && chip && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#16a34a] ring-2 ring-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#16a34a]/60" />
              <ChipIcon className="relative size-2.5 text-white" strokeWidth={3} />
            </span>
          )}
        </span>
      </div>

      {/* chip */}
      {chip && (
        <div
          className={`self-end transition-all duration-500 ease-out sm:self-auto md:ml-28 ${shown(4)}`}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-[14px] font-semibold text-[#3b2420] shadow-[0_6px_16px_rgba(120,20,30,.10)]">
            <span className="relative flex size-7 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
              {step >= 4 && (
                <span className="absolute inset-0 animate-ping rounded-full bg-[#22c55e]/30" />
              )}
              <ChipIcon className={`relative size-4 ${step >= 4 ? "animate-ring" : ""}`} />
            </span>
            {chip}
          </span>
        </div>
      )}
    </div>
  );
}
