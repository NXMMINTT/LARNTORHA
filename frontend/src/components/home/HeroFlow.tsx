// Home hero figure (team pick 2026-11-21): a phone on a soft circle showing น้องหลาน's call with
// คุณยาย, the mascot on the phone beside it. Decorative (aria-hidden); the hero text carries the
// meaning. Seed content only.
import { Heart, Mic, PhoneOff, Sparkle, Volume2 } from "lucide-react";
import type { ReactNode } from "react";

import { Face, Mascot } from "@/components/Brand";

function Ai({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-1.5">
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFF1EA]">
        <Face className="size-[92%] translate-y-[3%]" />
      </span>
      <span className="max-w-[78%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] leading-snug text-[#1e293b] shadow-sm">
        {children}
      </span>
    </div>
  );
}

function Elder({ children }: { children: ReactNode }) {
  return (
    <span className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-brand-600 px-3 py-2 text-[13px] leading-snug text-white">
      {children}
    </span>
  );
}

function CallButton({
  icon: I,
  label,
  tone,
}: {
  icon: typeof Mic;
  label: string;
  tone: "soft" | "end";
}) {
  return (
    <span className="flex flex-col items-center gap-1 text-[10px] text-[#8a6f69]">
      <span
        className={`flex items-center justify-center rounded-full ${tone === "end" ? "size-12 bg-[#dc2626] text-white shadow-[0_6px_14px_rgba(220,38,38,.35)]" : "size-10 bg-[#f6eeec] text-[#5b3a31]"}`}
      >
        <I className="size-5" />
      </span>
      {label}
    </span>
  );
}

export function HeroFlow() {
  return (
    <div aria-hidden className="relative mx-auto h-[620px] w-full max-w-[520px]">
      {/* backdrop */}
      <span className="absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br max-sm:size-[360px] sm:-translate-x-[55%] from-[#fff1ea] to-[#ffe4dc]" />
      <Sparkle className="absolute right-16 top-12 size-9 fill-brand-600 text-brand-600" />
      <Sparkle className="absolute right-10 top-28 size-4 fill-brand-600/70 text-brand-600/70" />
      <Sparkle className="absolute left-4 top-1/3 size-5 fill-brand-100 text-brand-100" />
      <Sparkle className="absolute bottom-10 left-10 size-6 fill-brand-100 text-brand-100" />
      <Heart className="absolute left-8 top-[58%] size-6 fill-brand-600/80 text-brand-600/80" />

      {/* phone */}
      <div className="absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[46px] sm:-translate-x-[62%] bg-[#2b1a17] p-2.5 shadow-[0_30px_60px_-20px_rgba(80,20,25,.45)]">
        <div className="flex h-[560px] flex-col overflow-hidden rounded-[38px] bg-[#fffaf8]">
          {/* caller */}
          <div className="flex flex-col items-center gap-1.5 bg-gradient-to-b from-[#fff1ea] to-[#fffaf8] px-4 pb-3 pt-6">
            <span className="mb-1 h-1.5 w-16 rounded-full bg-[#2b1a17]/15" />
            <span className="relative flex size-20 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-600/15 [animation-duration:2.4s]" />
              <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-white ring-4 ring-white">
                <Face className="size-[92%] translate-y-[3%]" />
              </span>
            </span>
            <span className="text-[18px] font-extrabold text-[#3b2420]">น้องหลาน</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#15803d] shadow-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" /> กำลังคุยกับคุณยาย ·
              03:12
            </span>
          </div>

          {/* conversation */}
          <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-3">
            <Ai>สวัสดีครับคุณยาย ผมน้องหลานเองครับ</Ai>
            <Ai>เมื่อวานยายปลูกผักบุ้ง ขึ้นแล้วไหมครับ</Ai>
            <Elder>ขึ้นแล้วจ้า งามหลายเลยหลาน</Elder>
            <Ai>กินยาความดันเช้านี้แล้วหรือยังครับ</Ai>
            <Elder>กินแล้วจ้า หลังข้าวเช้า</Elder>
          </div>

          {/* controls */}
          <div className="flex items-end justify-center gap-7 border-t border-[#f3e4e0] bg-white px-4 pb-5 pt-3">
            <CallButton icon={Mic} label="ไมค์" tone="soft" />
            <CallButton icon={PhoneOff} label="วางสาย" tone="end" />
            <CallButton icon={Volume2} label="ลำโพง" tone="soft" />
          </div>
        </div>
      </div>

      {/* mascot on the phone */}
      <Mascot
        pose="call"
        priority
        className="absolute bottom-8 right-0 h-48 w-auto max-sm:hidden drop-shadow-[0_16px_20px_rgba(80,20,25,.22)]"
      />
      <span className="absolute bottom-[248px] right-2 rounded-2xl max-sm:hidden rounded-br-md bg-white px-3 py-2 text-[13px] font-bold text-[#3b2420] shadow-[0_10px_24px_rgba(80,20,25,.14)]">
        ฮัลโหล คุณยาย~
      </span>
    </div>
  );
}
