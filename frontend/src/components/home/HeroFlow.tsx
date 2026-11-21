// Home hero figure (option A "เส้นทางของหนึ่งสาย", chosen 2026-11-21): น้องหลานโทรหา → Amazon
// Bedrock summarises and grades risk → family (LINE) and อสม. (Dashboard). Decorative (aria-hidden);
// the hero text next to it carries the meaning.
import { ArrowDown, Bot, Check, CircleCheck, Phone, Siren, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Mascot } from "@/components/Brand";

// ------------------------------------------------------------------ shared minis

function LineCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-left text-[#1e293b] shadow-[0_12px_30px_rgba(80,20,25,.14)] ring-1 ring-black/5">
      <div className="flex items-center gap-1.5 bg-[#16a34a] px-3 py-2 text-[13px] font-bold text-white">
        <CircleCheck className="size-4" strokeWidth={2.5} /> ยายสมศรี — ปกติ
      </div>
      <div
        className={`flex flex-col gap-1 px-3 ${compact ? "py-2 text-[12px]" : "py-2.5 text-[13px]"} leading-snug`}
      >
        <span className="text-[11px] text-[#64748b]">วันนี้ 09:04 น. · คุย 4 นาที</span>
        <span>
          <b>วันนี้เล่าว่า</b> ผักบุ้งที่ปลูกไว้ขึ้นแล้ว ดีใจมาก
        </span>
        <span className="flex items-center gap-1">
          <Check className="size-3.5 text-[#16a34a]" strokeWidth={3} /> กินยาเช้าแล้ว
        </span>
      </div>
      <div className="border-t border-[#e2e8f0] py-1.5 text-center text-[12px] font-bold text-[#06c755]">
        รับทราบ
      </div>
    </div>
  );
}

function DashMini() {
  const rows = [
    ["ตาสมชาย", "เร่งด่วน", "bg-[#fee2e2] text-[#991b1b]", Siren],
    ["ยายสำลี", "ติดตาม", "bg-[#fef9c3] text-[#854d0e]", TriangleAlert],
    ["ยายสมศรี", "ปกติ", "bg-[#dcfce7] text-[#166534]", CircleCheck],
  ] as const;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-white p-3 text-[12px] text-[#1e293b] shadow-[0_12px_30px_rgba(80,20,25,.14)] ring-1 ring-black/5">
      <b className="text-[11px] text-[#64748b]">Dashboard อสม. · ควรเยี่ยมก่อน</b>
      {rows.map(([n, s, cls, I]) => (
        <span key={n} className="flex items-center justify-between gap-2">
          <span className="font-semibold">{n}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}
          >
            <I className="size-3" /> {s}
          </span>
        </span>
      ))}
    </div>
  );
}

function Bubble({ who, children }: { who: "ai" | "elder"; children: ReactNode }) {
  return who === "ai" ? (
    <span className="max-w-[16rem] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[14px] leading-snug text-[#1e293b] shadow-[0_6px_18px_rgba(80,20,25,.10)]">
      {children}
    </span>
  ) : (
    <span className="max-w-[16rem] self-end rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-[14px] leading-snug text-white shadow-[0_6px_18px_rgba(215,25,32,.25)]">
      {children}
    </span>
  );
}

const TAG_TONE = {
  white: "bg-white text-[#5b3a31]",
  soft: "bg-brand-50 text-brand-600",
} as const;

function Tag({
  children,
  className = "",
  tone = "white",
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof TAG_TONE;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold shadow-sm ${TAG_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ figure

export function HeroFlow() {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex w-full max-w-[480px] flex-col items-center gap-2 text-[#1e293b]"
    >
      <span className="absolute inset-x-6 top-10 bottom-10 -z-10 rounded-[40px] bg-brand-50" />
      {/* step 1 — the call */}
      <div className="relative flex w-full items-end gap-3 rounded-3xl bg-white p-4 pl-24 sm:pl-28 shadow-[0_12px_30px_rgba(80,20,25,.12)] ring-1 ring-black/5">
        <Mascot pose="call" priority className="absolute -left-3 bottom-0 h-28 w-auto sm:h-32" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Tag tone="soft" className="self-start">
            <Phone className="size-3.5" /> 1 · น้องหลานโทรหา 09:00 น.
          </Tag>
          <Bubble who="ai">กินยาความดันเช้านี้แล้วหรือยังคะยาย</Bubble>
          <Bubble who="elder">กินแล้วจ้า ผักบุ้งขึ้นแล้วเด้อ</Bubble>
        </div>
      </div>
      <ArrowDown className="size-6 text-brand-600" />
      {/* step 2 — AI */}
      <div className="flex items-center gap-2 rounded-full bg-[#5b3a31] px-4 py-2 text-center text-[13px] font-bold text-white shadow-md">
        <Bot className="size-4" /> 2 · Amazon Bedrock สรุปสาย + จัดระดับความเสี่ยง
      </div>
      <ArrowDown className="size-6 text-brand-600" />
      {/* step 3 — recipients */}
      <div className="grid w-full grid-cols-1 gap-3 min-[460px]:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Tag className="self-start">3 · ลูกหลาน (LINE)</Tag>
          <LineCard compact />
        </div>
        <div className="flex flex-col gap-1.5">
          <Tag className="self-start">3 · อสม. (Dashboard)</Tag>
          <DashMini />
        </div>
      </div>
    </div>
  );
}
