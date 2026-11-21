"use client";

// Home page "LINE demo": three steps on the left, a phone showing the matching family card
// (CLAUDE.md §8 wording) on the right. Sample data only.
import { Bot, CircleCheck, Siren, TriangleAlert, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/SiteChrome";

type Kind = "green" | "followup" | "red";

const STEPS: { kind: Kind; icon: LucideIcon; title: string; body: string }[] = [
  {
    kind: "green",
    icon: CircleCheck,
    title: "วันปกติ ได้สรุปสั้น ๆ ทุกวัน",
    body: "เล่าว่าวันนี้คุยเรื่องอะไร กินยาหรือยัง กด “รับทราบ” ได้ในการ์ด",
  },
  {
    kind: "followup",
    icon: TriangleAlert,
    title: "มีเรื่องควรติดตาม",
    body: "เช่น ลืมกินยาหลายวัน ไม่สบาย หรือฟังไม่ชัด อสม. ในพื้นที่ได้รับแจ้งด้วย",
  },
  {
    kind: "red",
    icon: Siren,
    title: "เร่งด่วน รู้ทันที",
    body: "ถ้าพูดถึงอาการอันตราย AI แนะนำให้โทร 1669 แล้วส่งการ์ดถึงลูกหลานและ อสม. ทันที",
  },
];

const HEAD: Record<Kind, { color: string; icon: LucideIcon; text: string }> = {
  green: { color: "bg-[#16a34a]", icon: CircleCheck, text: "ยายสมศรี — ปกติ" },
  followup: { color: "bg-[#ca8a04]", icon: TriangleAlert, text: "ยายสำลี — ควรติดตาม" },
  red: { color: "bg-[#dc2626]", icon: Siren, text: "เร่งด่วน — ตาสมชาย" },
};

function CardButton({ children, solid = false }: { children: string; solid?: boolean }) {
  return (
    <span
      className={`block rounded-lg py-1.5 text-center text-[11.5px] font-bold ${solid ? "bg-[#dc2626] text-white" : "text-[#06c755]"}`}
    >
      {children}
    </span>
  );
}

function FamilyCard({ kind }: { kind: Kind }) {
  const h = HEAD[kind];
  const I = h.icon;
  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-[#1e293b] shadow-[0_2px_8px_rgba(0,0,0,.08)]">
      <div className={`flex items-center gap-1.5 px-3 py-2 text-white ${h.color}`}>
        <I aria-hidden className="size-3.5" strokeWidth={2.5} />
        <b className="text-[12.5px]">{h.text}</b>
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {kind === "green" && (
          <>
            <span className="text-[10.5px] text-[#64748b]">21 พ.ย. 2569 · 09:02 น. · คุย 4 นาที</span>
            <span>
              <b>วันนี้เล่าว่า</b> ผักบุ้งที่ปลูกไว้ขึ้นแล้ว ดีใจมาก หลานคนเล็กโทรมาเมื่อวาน
            </span>
            <span className="flex items-center gap-1 text-[10.5px] text-[#64748b]">
              <Bot aria-hidden className="size-3" /> สรุปโดย AI
            </span>
            <span>
              <b>ยา</b> กินยาเช้าแล้ว
            </span>
            <span className="text-[10px] leading-snug text-[#64748b]">
              ไม่พบสัญญาณผิดปกติในสายนี้ (ไม่ได้หมายความว่าปลอดภัยแน่นอน)
            </span>
          </>
        )}
        {kind === "followup" && (
          <>
            <span className="text-[10.5px] text-[#64748b]">21 พ.ย. 2569 · 10:01 น.</span>
            <span>
              <b>ยา</b> ยังไม่ได้กินยาเช้า
            </span>
            <span>บอกว่าช่วงนี้ลืมกินยาบ่อย แต่ยังเดินไปตลาดได้ตามปกติ</span>
            <span className="rounded-md bg-[#fef9c3] px-1.5 py-1 text-[10.5px] leading-snug text-[#854d0e]">
              มีบางเรื่องที่ควรได้รับการติดตาม อสม. ในพื้นที่ได้รับแจ้งแล้ว
            </span>
          </>
        )}
        {kind === "red" && (
          <>
            <span className="text-[10.5px] text-[#64748b]">21 พ.ย. 2569 · 09:04 น.</span>
            <span>เล่าว่าเจ็บแน่นหน้าอกตั้งแต่เช้า</span>
            <span className="rounded-md bg-[#fee2e2] px-1.5 py-1 font-bold text-[#991b1b]">
              ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว
            </span>
            <span className="text-[10.5px] leading-snug text-[#64748b]">
              ระบบไม่สามารถเรียกรถพยาบาลหรือยืนยันอาการได้ กรุณาติดต่อทันที
            </span>
          </>
        )}
      </div>
      <div className="flex flex-col gap-0.5 border-t border-[#e2e8f0] px-2 py-1.5">
        {kind === "green" && <CardButton>รับทราบ</CardButton>}
        {kind === "followup" && (
          <>
            <CardButton>โทรหายายสำลี</CardButton>
            <CardButton>รับทราบ</CardButton>
          </>
        )}
        {kind === "red" && (
          <>
            <CardButton solid>โทร 1669</CardButton>
            <CardButton>โทรหาตาสมชาย</CardButton>
            <CardButton>แจ้ง อสม.</CardButton>
          </>
        )}
      </div>
    </div>
  );
}

function Phone({ kind }: { kind: Kind }) {
  return (
    <div className="box-border h-[540px] w-[290px] shrink-0 rounded-[46px] bg-[#2a1215] p-2.5 shadow-[0_24px_50px_rgba(120,20,30,.25)]">
      <div className="flex h-full flex-col overflow-hidden rounded-[37px] bg-[#dfe9f7] text-xs leading-snug">
        <div className="flex items-center gap-2 bg-white px-3.5 pb-2 pt-4 text-sm font-bold text-[#1e293b]">
          <BrandMark className="size-7 rounded-full" /> หลานโทรหา
          <span className="rounded bg-[#06c755] px-1 text-[9px] font-bold text-white">
            OFFICIAL
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden p-2.5">
          <span className="mx-auto rounded-full bg-black/10 px-2.5 py-0.5 text-[10px] text-[#475569]">
            วันนี้
          </span>
          <div key={kind} className="flex animate-pop flex-col gap-2">
            <FamilyCard kind={kind} />
          </div>
          <span className="max-w-[85%] shrink-0 self-end rounded-[14px] rounded-br-sm bg-[#06c755] px-3 py-1.5 text-white">
            {kind === "red" ? "กำลังโทรหาพ่อเดี๋ยวนี้" : "ขอบคุณนะ เดี๋ยวโทรหาแม่"}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2.5 text-[#64748b]">
          <span className="text-lg leading-none">+</span>
          <span className="flex-1 rounded-full bg-[#f1f5f9] px-3 py-1.5">Aa</span>
        </div>
      </div>
    </div>
  );
}

// ≥1024px the section is 3 screens tall and its content sticks: scrolling walks through the
// 3 steps (like the FinLens page). Smaller screens: no pinning, tap a step to switch.
const SCROLL_MQ = "(min-width: 1024px)";

export function LineDemo() {
  const [active, setActive] = useState(0);
  const step = STEPS[active] ?? STEPS[0];
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(SCROLL_MQ);
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = track.current;
      if (!el || !mq.matches) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return;
      const progress = Math.min(1, Math.max(0, -r.top / span));
      setActive(Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const choose = (i: number) => {
    const el = track.current;
    if (el && window.matchMedia(SCROLL_MQ).matches) {
      // jump the page to the middle of that step's scroll range
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = el.offsetHeight - window.innerHeight;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: top + ((i + 0.5) / STEPS.length) * span,
        behavior: reduce ? "auto" : "smooth",
      });
    }
    setActive(i);
  };

  return (
    <div ref={track} className="lg:h-[300vh]">
      <div className="relative isolate lg:sticky lg:top-0 lg:flex lg:h-svh lg:items-center lg:justify-center">
        <span
          aria-hidden
          className="bg-dots absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]"
        />
        <div className="flex flex-wrap items-center justify-center gap-12 lg:flex-nowrap">
          <div className="flex min-w-0 flex-[0_1_480px] flex-col gap-3.5 rounded-[28px] border border-brand-100 bg-white p-7 shadow-[0_12px_32px_rgba(120,20,30,.08)]">
            <span className="text-lg font-bold text-brand-600">
              {active + 1}/{STEPS.length}
            </span>
            <h2
              id="line-title"
              className="m-0 font-display text-[30px] font-bold leading-tight md:text-[38px]"
            >
              สรุปเข้า LINE
              <br />
              <span className="marker">อ่านจบใน 10 วินาที</span>
            </h2>
            <p className="m-0 text-ink-muted">
              ไม่ต้องโหลดแอปใหม่ ลูกหลานเพิ่มเพื่อน LINE OA ครั้งเดียว แล้วได้การ์ดสรุปหลังวางสายทุกครั้ง
            </p>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <li key={s.kind}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => choose(i)}
                      className={`flex min-h-11 w-full cursor-pointer gap-3.5 rounded-[18px] border p-4 text-left transition-colors hover:border-brand-600/40 ${on ? "border-brand-600/40 bg-brand-50" : "border-line bg-white"}`}
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${on ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-600"}`}
                      >
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-bold">{s.title}</span>
                        <span className="block text-[15px] text-ink-muted">{s.body}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <div aria-hidden className="relative">
            <Phone kind={step.kind} />
            <p className="mt-3 text-center text-sm text-ink-muted">ภาพตัวอย่าง · ข้อมูลสมมติ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
