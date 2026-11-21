"use client";

// Signup form (CLAUDE.md §7.1), laid out from the team's "Senior & Medication Setup" design:
// header → 3-step strip → form sections (left) + live call preview and submit (right).
// All §7.1 rules stay: every field, unticked consents, honeypot, values kept on error,
// aria-invalid/aria-describedby, "AI จะไม่แนะนำยาหรือขนาดยา". Unbuilt options are "เร็ว ๆ นี้".
import {
  BadgeCheck,
  BatteryFull,
  Camera,
  Check as CheckIcon,
  CirclePlus,
  Headset,
  Ear,
  HeartPulse,
  Mic,
  Moon,
  PartyPopper,
  Phone,
  PhoneCall,
  Pill,
  Power,
  ScanLine,
  ShieldCheck,
  Signal,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  Volume2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import { Face, Mascot } from "@/components/Brand";
import { Sample, Soon, SoonBadge } from "@/components/console/bits";
import { FieldError, fieldAria } from "@/components/Field";
import { BrandMark } from "@/components/SiteChrome";
import { MAX_MEDICATIONS, PLANS, RELATIONS } from "@/lib/constants";
import { CALL_TIME_OPTIONS, formatThaiDate } from "@/lib/format";
import { EMPTY_REGISTER_VALUES, type RegisterErrors } from "@/lib/register-validation";
import type { RegisterResult } from "@/lib/types";

import { registerAction, type RegisterState } from "./actions";

const initial: RegisterState = {
  submission: 0,
  values: EMPTY_REGISTER_VALUES,
  errors: {},
  formError: null,
  result: null,
};

const input =
  "block h-14 w-full rounded-xl bg-console-low px-4 text-base text-ink placeholder:text-ink-muted/60 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-900 aria-[invalid=true]:bg-[#ffdad6]/60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#ba1a1a]";
const card = "space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6";

const CONSENTS = [
  {
    name: "consent_record",
    required: true,
    title: "(1) บันทึกและประมวลผลบทสนทนา",
    body: "ให้ระบบบันทึกเสียงสนทนาและแปลงเป็นข้อความ เพื่อสรุปผลด้วย AI (Amazon Bedrock) ระบบเก็บเฉพาะผลสรุป ไม่เก็บข้อความบทสนทนาฉบับเต็ม",
  },
  {
    name: "consent_family",
    required: true,
    title: "(2) ส่งสรุปการโทรให้ลูกหลานทาง LINE",
    body: "ส่งสรุปสั้น ๆ และสถานะ (ปกติ / ควรติดตาม / เร่งด่วน) ของแต่ละสายไปที่ LINE ของผู้สมัคร",
  },
  {
    name: "consent_osm",
    required: false,
    title: "(3) แบ่งปันสรุปและระดับความเสี่ยงกับ อสม. ในพื้นที่",
    body: "ให้ อสม. เห็นข้อมูลบน Dashboard และได้รับแจ้งเมื่อควรติดตาม ถ้าไม่ยินยอม อสม. จะไม่เห็นข้อมูลของผู้สูงอายุท่านนี้",
  },
  {
    name: "consent_2q",
    required: false,
    title: "(4) คัดกรองภาวะอารมณ์ด้วยคำถาม 2 ข้อ (2Q)",
    body: "เป็นการคัดกรองเพื่อส่งต่อให้ อสม. ประเมินต่อ ไม่ใช่การวินิจฉัย ผลจะแจ้งเฉพาะ อสม. และไม่แสดงให้ลูกหลานเห็น",
  },
] as const;

type Preview = { name: string; med: string; time: string };

export function RegisterForm({ lineOaUrl }: { lineOaUrl: string | null }) {
  const [state, action, pending] = useActionState(registerAction, initial);
  const v = state.values;
  const e = state.errors;
  const [preview, setPreview] = useState<Preview>({
    name: v.elder_name,
    med: v.meds[0]?.name ?? "",
    time: v.call_time,
  });

  if (state.result) return <Success result={state.result} lineOaUrl={lineOaUrl} />;

  const errIn = (keys: string[]) => keys.some((k) => Object.keys(e).some((x) => x.startsWith(k)));
  const steps = [
    {
      n: 1,
      title: "ข้อมูลผู้สูงอายุ & เบอร์โทร",
      href: "#step-1",
      err: errIn(["elder_", "referral_code"]),
    },
    { n: 2, title: "ตารางยา & เวลาโทร", href: "#step-2", err: errIn(["med", "call_time", "plan"]) },
    {
      n: 3,
      title: "ผู้ติดต่อ & ความยินยอม",
      href: "#step-3",
      err: errIn(["guardian_", "relation", "consent_", "osm_explained"]),
    },
  ];

  return (
    <form
      action={action}
      noValidate
      className="space-y-6"
      onChange={(ev) => {
        const f = ev.currentTarget;
        const val = (n: string) => {
          const el = f.elements.namedItem(n);
          if (el instanceof RadioNodeList)
            return (el[0] as HTMLInputElement | undefined)?.value ?? "";
          return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.value : "";
        };
        setPreview({ name: val("elder_name"), med: val("med_name"), time: val("call_time") });
      }}
    >
      {/* ---------------------------------------------------------- title bar */}
      <div className="flex flex-col justify-between gap-4 pb-1 md:flex-row md:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[12px] font-medium tracking-wide text-brand-900">
            <BadgeCheck aria-hidden className="size-[18px]" />
            <span>True 5G Enterprise Cloud Telephony • Intelligent Elder Care</span>
          </div>
          <h1 className="m-0 text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[36px]">
            ตั้งค่าเริ่มต้นผู้สูงอายุและตารางเตือนทานยา
          </h1>
          <p className="m-0 max-w-3xl text-ink-muted">
            เริ่มต้นเปิดใช้งานบริการ &ldquo;หลานโทรหา&rdquo; ใน 3 ขั้นตอน โดยที่ผู้สูงอายุไม่ต้องโหลดแอป
            ไม่ต้องใช้อินเทอร์เน็ต ใช้แค่มือถือปุ่มกดเดิมได้ทันที · ต้องมีรหัส อสม. ในพื้นที่ก่อนสมัคร
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full bg-white px-4 py-2.5 shadow-sm md:self-auto">
          <span aria-hidden className="size-3 animate-ping rounded-full bg-console-green" />
          <span className="flex flex-col">
            <span className="text-[11px] leading-none text-ink-muted">True Network Readiness</span>
            <span className="text-[12px] font-bold text-console-green">
              5G VoLTE EVS-WB Core Active
            </span>
          </span>
          <Sample />
        </div>
      </div>

      {state.formError && (
        <p
          role="alert"
          className="m-0 rounded-2xl bg-[#ffdad6] px-4 py-3 font-semibold text-[#93000a]"
        >
          {state.formError}
        </p>
      )}

      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">เว็บไซต์</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* ---------------------------------------------------------- stepper */}
      <nav aria-label="ขั้นตอนการตั้งค่า" className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n}>
              <a
                href={s.href}
                className={`flex items-center gap-2 rounded-xl p-2 ${s.err ? "bg-[#ffdad6]/50" : s.n === 1 ? "bg-brand-900/5 shadow-sm" : "bg-console-low/60"}`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${s.err ? "bg-[#ba1a1a] text-white" : s.n === 1 ? "bg-brand-900 text-white shadow-md shadow-brand-900/25" : "bg-console-line text-ink-muted"}`}
                >
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span
                    className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${s.err ? "text-[#ba1a1a]" : s.n === 1 ? "text-brand-900" : "text-ink-muted"}`}
                  >
                    ขั้นตอนที่ {s.n}
                    {s.err && (
                      <span className="rounded-full bg-[#ba1a1a] px-1.5 text-[10px] text-white">
                        ต้องแก้ไข
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[18px] font-bold text-ink">{s.title}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ---------------------------------------------------------- workspace */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* ---- 1. elder */}
          <section id="step-1" className={`${card} scroll-mt-28`}>
            <SectionHead
              icon={UserRound}
              tone="brand"
              title="1. ข้อมูลผู้สูงอายุ & เบอร์รับสาย"
              sub="ข้อมูลโปรไฟล์สำหรับให้ผู้ช่วย AI ทักทายและเตือนยาเฉพาะบุคคล"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F
                id="elder_name"
                label="ชื่อที่ให้ AI เรียก"
                hint="เช่น ยายมาลี, คุณตาสมชาย"
                error={e.elder_name}
              >
                <input
                  {...fieldAria("elder_name", e.elder_name, true)}
                  name="elder_name"
                  defaultValue={v.elder_name}
                  className={input}
                />
              </F>
              <F id="elder_age" label="อายุ (ปี)" error={e.elder_age}>
                <input
                  {...fieldAria("elder_age", e.elder_age)}
                  name="elder_age"
                  type="number"
                  inputMode="numeric"
                  min={60}
                  max={120}
                  defaultValue={v.elder_age}
                  className={input}
                />
              </F>
              <div className="sm:col-span-2">
                <F
                  id="elder_phone"
                  label="เบอร์โทรศัพท์เครื่องผู้สูงอายุ (สำหรับรับสาย AI)"
                  hint="มือถือปุ่มกดก็ได้ ไม่ต้องต่อ Wi-Fi ไม่ต้องติดตั้งแอป"
                  error={e.elder_phone}
                >
                  <input
                    {...fieldAria("elder_phone", e.elder_phone, true)}
                    name="elder_phone"
                    type="tel"
                    inputMode="tel"
                    defaultValue={v.elder_phone}
                    placeholder="089-123-4567"
                    className={`${input} text-[17px] font-bold tracking-wider`}
                  />
                </F>
              </div>
              <F
                id="referral_code"
                label="รหัส อสม. ในพื้นที่"
                hint="ขอรหัสจาก อสม. รูปแบบ OSM-XXXX"
                error={e.referral_code}
              >
                <input
                  {...fieldAria("referral_code", e.referral_code, true)}
                  name="referral_code"
                  defaultValue={v.referral_code}
                  placeholder="OSM-XXXX"
                  autoCapitalize="characters"
                  className={`${input} font-mono uppercase tracking-wider`}
                />
              </F>
              <div className="space-y-1.5">
                <span className="block text-[13px] font-bold text-ink">ภาษาที่ผู้ช่วย AI เข้าใจ</span>
                <div className="flex h-14 items-center gap-2 rounded-xl bg-brand-900 px-4 text-[14px] font-bold text-white shadow-sm">
                  <Mic aria-hidden className="size-[18px] shrink-0" /> ภาษากลาง + ภาษาถิ่นทุกภาค
                </div>
                <p className="m-0 text-[12px] text-ink-muted">
                  เหนือ · อีสาน · ใต้ — ไม่ต้องเลือก ผู้สูงอายุพูดแบบที่ถนัดได้เลย
                </p>
              </div>
            </div>
          </section>

          {/* ---- 2. meds + schedule + plan */}
          <section id="step-2" className={`${card} scroll-mt-28`}>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <SectionHead
                icon={Pill}
                tone="green"
                title="2. ตารางยาประจำตัว & เวลาโทร"
                sub="ใส่ชื่อยาและเวลา เพื่อให้ AI ถามว่ากินยาแล้วหรือยัง"
              />
              <Soon className="min-h-11 shrink-0 gap-2 rounded-xl bg-console-high px-4 text-[13px] font-bold text-brand-900 shadow-sm">
                <ScanLine aria-hidden className="size-5" /> ถ่ายรูปซองยา (AI OCR)
              </Soon>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-console-low p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-900 shadow-sm">
                <Camera aria-hidden className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink">
                  True AI Smart Vision OCR <SoonBadge />
                </span>
                <p className="m-0 text-[12px] text-ink-muted">
                  อ่านชื่อยาและเวลากินจากซองยาโรงพยาบาลได้ในอนาคต ตอนนี้ให้พิมพ์เอง
                </p>
              </div>
            </div>
            <p className="m-0 flex items-start gap-2 rounded-xl bg-brand-900/5 px-4 py-3 text-[15px] text-ink">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-900" />
              <span>
                ใช้เพื่อเตือนให้กินยาตามตารางที่ใส่ไว้เท่านั้น <strong>AI จะไม่แนะนำยาหรือขนาดยา</strong>
              </span>
            </p>
            <MedRows key={state.submission} initial={v.meds} errors={e} />

            {/* call schedule */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[18px] font-bold text-ink">
                  ตารางรอบเวลาโทรอัตโนมัติ (True Smart Cron Call)
                </span>
                <span className="rounded bg-console-green-bg px-2 py-0.5 text-[12px] font-bold text-console-green">
                  ความถี่ตามแพ็กเกจ
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  htmlFor="call_time"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-console-low p-4"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded-xl bg-white p-2.5 text-console-coral">
                      <Sun aria-hidden className="size-[22px]" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold text-ink">
                        สายประจำวัน (ถามไถ่ & เตือนยา)
                      </span>
                      <span className="block text-[12px] text-ink-muted">เลือกเวลา 07:00–18:00</span>
                    </span>
                  </span>
                  <select
                    {...fieldAria("call_time", e.call_time)}
                    name="call_time"
                    defaultValue={v.call_time}
                    className="min-h-11 rounded-xl bg-white px-2 text-[18px] font-bold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900"
                  >
                    {CALL_TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t} น.
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl bg-console-low p-4 opacity-60"
                  title="เร็ว ๆ นี้ — ยังไม่เปิดใช้งาน"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded-xl bg-white p-2.5 text-console-dark">
                      <Moon aria-hidden className="size-[22px]" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold text-ink">
                        สายรอบเย็น (ชวนคุย) <SoonBadge />
                      </span>
                      <span className="block text-[12px] text-ink-muted">
                        เล่าเรื่องวันเก่า คลายเหงา
                      </span>
                    </span>
                  </span>
                  <span className="text-[18px] font-bold text-ink-muted">18:30 น.</span>
                </div>
              </div>
              <FieldError id="call_time" error={e.call_time} />
            </div>

            {/* plan */}
            <fieldset
              aria-describedby={e.plan ? "plan-error" : undefined}
              className="space-y-2 pt-2"
            >
              <legend className="text-[18px] font-bold text-ink">แพ็กเกจ</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PLANS.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer flex-col gap-1 rounded-2xl bg-console-low p-4 ring-brand-900 has-checked:bg-brand-900/5 has-checked:ring-2 has-focus-visible:ring-2"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        defaultChecked={v.plan === p.id}
                        className="size-5 accent-brand-900"
                      />
                      {p.name}
                    </span>
                    <span className="text-xl font-bold text-brand-900">{p.price}</span>
                    <span className="text-[14px] text-ink-muted">{p.detail}</span>
                  </label>
                ))}
              </div>
              <FieldError id="plan" error={e.plan} />
            </fieldset>
          </section>

          {/* ---- 3. persona, contacts, consents */}
          <section id="step-3" className={`${card} scroll-mt-28`}>
            <SectionHead
              icon={Headset}
              tone="coral"
              title="3. บุคลิกหลาน AI ผู้ติดต่อ และความยินยอม"
              sub="ผู้สมัครจะเป็นผู้รับสรุปทาง LINE และเป็นเบอร์ติดต่อหลัก"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative rounded-2xl bg-brand-900/5 p-4 ring-2 ring-brand-900">
                <div className="flex items-center gap-2">
                  <BrandMark className="size-14 shadow-sm" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[18px] font-bold text-ink">น้องหลาน (ค่าเริ่มต้น)</span>
                      <span className="rounded-full bg-brand-900 px-1.5 text-[10px] font-bold text-white">
                        เลือกอยู่
                      </span>
                    </div>
                    <p className="m-0 text-[12px] text-ink-muted">อบอุ่น ใส่ใจ เป็นมิตร บอกชัดว่าเป็น AI</p>
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl bg-console-low p-4 opacity-60"
                title="เร็ว ๆ นี้ — ยังไม่เปิดใช้งาน"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-14 items-center justify-center rounded-full bg-console text-xl font-bold text-ink-muted shadow-sm">
                    ต
                  </span>
                  <div>
                    <span className="flex items-center text-[18px] font-bold text-ink">
                      น้องต้นกล้า <SoonBadge />
                    </span>
                    <p className="m-0 text-[12px] text-ink-muted">เสียงหลานชายร่าเริง ชวนหัวเราะ</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="block text-[18px] font-bold text-ink">ผู้ติดต่อเมื่อมีเรื่องควรติดตาม</span>
              {/* contact 1 = guardian (the applicant) */}
              <div className="space-y-3 rounded-2xl bg-console-low p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-900/10 text-[13px] font-bold text-brand-900">
                    1
                  </span>
                  <span className="text-[16px] font-bold text-ink">
                    ผู้สมัคร (ลูกหลาน) — รับสรุปทาง LINE
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <F id="guardian_name" label="ชื่อผู้สมัคร" error={e.guardian_name}>
                    <input
                      {...fieldAria("guardian_name", e.guardian_name)}
                      name="guardian_name"
                      defaultValue={v.guardian_name}
                      autoComplete="name"
                      className={`${input} bg-white`}
                    />
                  </F>
                  <F id="guardian_phone" label="เบอร์โทรผู้สมัคร" error={e.guardian_phone}>
                    <input
                      {...fieldAria("guardian_phone", e.guardian_phone)}
                      name="guardian_phone"
                      type="tel"
                      inputMode="tel"
                      defaultValue={v.guardian_phone}
                      placeholder="081-234-5678"
                      autoComplete="tel"
                      className={`${input} bg-white`}
                    />
                  </F>
                  <F id="relation" label="ความสัมพันธ์กับผู้สูงอายุ" error={e.relation}>
                    <select
                      {...fieldAria("relation", e.relation)}
                      name="relation"
                      defaultValue={v.relation}
                      className={`${input} bg-white`}
                    >
                      <option value="">— เลือก —</option>
                      {RELATIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </F>
                </div>
              </div>
              {/* contact 2 = อสม. + 1669 guidance (the system never dials 1669 itself) */}
              <div className="flex flex-col justify-between gap-2 rounded-2xl bg-console-low p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="flex size-10 items-center justify-center rounded-full bg-console-line text-[13px] font-bold text-ink-muted">
                    2
                  </span>
                  <div>
                    <span className="block text-[16px] font-bold text-ink">
                      อสม. ในพื้นที่ & สายด่วน 1669
                    </span>
                    <span className="block text-[13px] text-ink-muted">
                      ถ้าเร่งด่วน AI จะแนะนำให้โทร 1669 ทันที แล้วแจ้งลูกหลานและ อสม.
                      (ระบบไม่ได้เรียกรถพยาบาลเอง)
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-console-green-bg px-2.5 py-1 text-[12px] font-bold text-console-green">
                  แจ้ง อสม. ทาง LINE
                </span>
              </div>
            </div>

            {/* consents (PDPA) */}
            <div className="space-y-3 pt-2">
              <span className="block text-[18px] font-bold text-ink">ความยินยอม (PDPA)</span>
              <p className="m-0 text-[14px] text-ink-muted">
                กรุณาอ่านและเลือกทีละข้อ ผู้สูงอายุจะได้รับการขอให้ยืนยันความยินยอมด้วยเสียงอีกครั้งในสายแรก
              </p>
              {CONSENTS.map((c) => (
                <Consent
                  key={c.name}
                  name={c.name}
                  defaultChecked={v[c.name]}
                  error={e[c.name]}
                  title={c.title}
                  body={c.body}
                  badge={c.required ? "จำเป็นต่อการให้บริการ" : "ไม่บังคับ"}
                  required={c.required}
                />
              ))}
              <Consent
                name="osm_explained"
                defaultChecked={v.osm_explained}
                error={e.osm_explained}
                title="อสม. ได้อธิบายบริการให้ผู้สูงอายุฟังตัวต่อตัวแล้ว"
                badge="จำเป็น"
                required
              />
            </div>
          </section>
        </div>

        {/* ---------------------------------------------------------- right: preview + submit */}
        <div className="space-y-4 lg:sticky lg:top-28 lg:col-span-5">
          <div className="relative space-y-4 overflow-hidden rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <span
                  aria-hidden
                  className="size-2.5 animate-pulse rounded-full bg-console-green"
                />
                จำลองสิ่งที่ผู้สูงอายุจะได้ยิน (Live Call Sim)
              </span>
              <span className="rounded-md bg-console-low px-2 py-1 text-[11px] font-bold text-brand-900">
                True VoLTE HD
              </span>
            </div>

            <div
              aria-hidden
              className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-console-dark p-6 text-center text-[#edf0ff] shadow-inner"
            >
              <span className="absolute -right-8 -top-8 size-32 rounded-full bg-brand-900/20 blur-2xl" />
              <div className="flex w-full items-center justify-between pb-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Signal className="size-3.5" />
                  <span className="font-bold tracking-wider text-white">TRUE-H 5G</span>
                </span>
                <span className="font-bold text-white">{preview.time || "09:00"} น.</span>
                <span className="flex items-center gap-1">
                  <span className="font-bold text-[#4edea3]">HD Voice</span>
                  <BatteryFull className="size-3.5" />
                </span>
              </div>
              <div className="relative my-2">
                <span className="flex size-24 animate-pulse items-center justify-center rounded-full bg-gradient-to-tr from-brand-900 to-[#fd6e60] p-1 shadow-lg">
                  <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-[#FFF1EA]">
                    <Face className="size-[92%] translate-y-[3%]" />
                  </span>
                </span>
                <span className="absolute -bottom-1 -right-1 rounded-full bg-console-green p-1.5 text-white shadow-md">
                  <Phone className="size-4" />
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <p className="m-0 text-[24px] font-bold tracking-tight text-white">
                  หลานโทรหา (น้องหลาน)
                </p>
                <p className="m-0 text-[11px] font-bold tracking-wider text-[#4edea3]">
                  สายเรียกเข้า • ผู้สูงอายุแค่กดรับสาย
                </p>
              </div>
              <div className="my-4 flex w-full items-center justify-center gap-1 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md">
                {["h-3", "h-6", "h-8", "h-10", "h-7", "h-4", "h-8"].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 ${h} animate-bounce rounded-full bg-[#ffdad7]`}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="w-full space-y-2 rounded-xl bg-white/95 p-4 text-left text-ink shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-900">
                    <Volume2 className="size-4" /> บทสนทนาจำลอง (อัปเดตตามที่กรอก)
                  </span>
                </div>
                <p className="m-0 font-medium leading-relaxed">
                  &ldquo;สวัสดีค่ะ{preview.name ? preview.name : "คุณยาย"} หนูน้องหลาน ผู้ช่วย AI
                  จากหลานโทรหานะคะ
                  {preview.med
                    ? ` ถึงเวลา${preview.med}แล้ว ทานเรียบร้อยหรือยังคะ`
                    : " วันนี้เป็นอย่างไรบ้างคะ"}
                  &rdquo;
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-ink-muted">
                  <span>ถามเรื่องยาเท่านั้น ไม่แนะนำยา</span>
                  <span className="flex items-center gap-1 font-bold text-console-green">
                    <Mic className="size-3.5" /> บอกหยุดได้ทุกเมื่อ
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/80">
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                  <PhoneCall className="size-4 text-[#6ffbbe]" /> กดปุ่มเขียว: รับสาย
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                  <Volume2 className="size-4 text-[#ffdad7]" /> พูดคุยได้เลย
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="m-0 text-[13px] font-bold text-ink">
                จุดเด่นนวัตกรรมสำหรับผู้สูงอายุ (Zero Barrier Tech)
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    [Smartphone, "Zero App Needed", "ไม่ต้องติดตั้งแอปพลิเคชัน", "text-console-green"],
                    [Zap, "VoLTE Low Latency", "โต้ตอบลื่นไหล ไม่ต้องรอสาย", "text-brand-900"],
                    [Ear, "EVS-WB Audio", "เสียงคมชัดสูง ฟังง่าย", "text-console-green"],
                    [HeartPulse, "แนะนำ 1669 ทันที", "เมื่อพบอาการเร่งด่วน", "text-brand-900"],
                  ] as const
                ).map(([I, t, d, cls]) => (
                  <div key={t} className="flex items-start gap-2 rounded-xl bg-console-low p-2">
                    <I aria-hidden className={`size-5 shrink-0 ${cls}`} />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-bold text-ink">{t}</span>
                      <span className="block truncate text-[11px] text-ink-muted">{d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Soon className="h-14 w-full justify-center gap-2 rounded-full bg-console-high text-[13px] font-bold text-brand-900 shadow-sm">
                <Phone aria-hidden className="size-5" /> ทดสอบโทรสายจำลอง (Test Call)
              </Soon>
              <button
                type="submit"
                disabled={pending}
                className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 text-[15px] font-bold text-white shadow-lg shadow-brand-900/30 transition-all hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
              >
                <Power aria-hidden className="size-6" />
                {pending ? "กำลังสมัคร…" : "สมัครบริการและเปิดใช้งานระบบโทรอัตโนมัติ"}
              </button>
              <p className="m-0 text-center text-[12px] text-ink-muted">
                หลังสมัคร ลูกหลานจะได้รหัสเชื่อม LINE และสายแรกเวลา {preview.time || "09:00"} น.
                จะขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียงก่อน
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-console-low p-4">
            <span className="flex items-center gap-2">
              <Mascot pose="headset" className="h-14 w-auto shrink-0" />
              <span>
                <span className="block text-[13px] font-bold text-ink">ต้องการให้ช่วยตั้งค่า?</span>
                <span className="block text-[12px] text-ink-muted">
                  ติดต่อ อสม. ในพื้นที่ที่ให้รหัส OSM กับคุณ
                </span>
              </span>
            </span>
            <Soon className="min-h-11 rounded-full bg-white px-4 text-[12px] font-bold text-ink shadow-sm">
              ติดต่อทันที
            </Soon>
          </div>
        </div>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ pieces

const TONES = {
  brand: "bg-brand-900/10 text-brand-900",
  green: "bg-console-green/10 text-console-green",
  coral: "bg-console-coral/10 text-console-coral",
} as const;

function SectionHead({
  icon: I,
  tone,
  title,
  sub,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <span className={`shrink-0 rounded-xl p-2.5 ${TONES[tone]}`}>
        <I aria-hidden className="size-6" />
      </span>
      <div>
        <h2 className="m-0 text-[20px] font-bold leading-snug text-ink sm:text-[24px]">{title}</h2>
        <p className="m-0 text-[12px] text-ink-muted">{sub}</p>
      </div>
    </div>
  );
}

function F({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-bold text-ink">
        {label} <span className="text-brand-900">*</span>
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="m-0 text-[12px] text-ink-muted">
          {hint}
        </p>
      )}
      <FieldError id={id} error={error} />
    </div>
  );
}

function Consent({
  name,
  defaultChecked,
  error,
  title,
  body,
  badge,
  required,
}: {
  name: string;
  defaultChecked: boolean;
  error?: string;
  title: string;
  body?: string;
  badge: string;
  required: boolean;
}) {
  const descId = body ? `${name}-desc` : null;
  const errId = error ? `${name}-error` : null;
  return (
    <div
      className={`rounded-2xl p-4 ${error ? "bg-[#ffdad6]/60 ring-2 ring-[#ba1a1a]" : "bg-console-low"}`}
    >
      <label htmlFor={name} className="flex cursor-pointer items-start gap-3">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={[descId, errId].filter(Boolean).join(" ") || undefined}
          className="mt-1 size-5 shrink-0 accent-brand-900"
        />
        <span className="space-y-1">
          <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
            {title}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${required ? "bg-brand-900 text-white" : "bg-white text-ink-muted"}`}
            >
              {badge}
            </span>
          </span>
          {body && (
            <span id={descId ?? undefined} className="block text-[14px] text-ink-muted">
              {body}
            </span>
          )}
        </span>
      </label>
      <div className="mt-1 pl-8">
        <FieldError id={name} error={error} />
      </div>
    </div>
  );
}

function MedRows({
  initial,
  errors,
}: {
  initial: { name: string; times: string }[];
  errors: RegisterErrors;
}) {
  // Row keys only; values stay uncontrolled and come back via defaultValue after each submit.
  const [rows, setRows] = useState(() =>
    initial.map((m, i) => ({ key: `r${i}`, ...m, errIndex: i as number | null })),
  );
  const [next, setNext] = useState(initial.length);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const err = row.errIndex !== null ? errors[`med_${row.errIndex}`] : undefined;
        const nameId = `med_name_${row.key}`;
        const timeId = `med_times_${row.key}`;
        return (
          <div key={row.key} className="space-y-2 rounded-2xl bg-console-low p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-900 shadow-sm md:mb-2 md:flex">
                <Pill aria-hidden className="size-[22px]" />
              </span>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={nameId} className="block text-[13px] font-bold text-ink">
                    ชื่อยา {i + 1}
                  </label>
                  <input
                    id={nameId}
                    name="med_name"
                    defaultValue={row.name}
                    maxLength={60}
                    placeholder="เช่น ยาความดัน"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${nameId}-error` : undefined}
                    className={`${input} bg-white`}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={timeId} className="block text-[13px] font-bold text-ink">
                    เวลากิน (คั่นด้วย ,)
                  </label>
                  <input
                    id={timeId}
                    name="med_times"
                    defaultValue={row.times}
                    placeholder="8.00, 18.00"
                    inputMode="decimal"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${nameId}-error` : undefined}
                    className={`${input} bg-white`}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                aria-label={`ลบยาแถวที่ ${i + 1}`}
                className="flex size-11 shrink-0 items-center justify-center self-end rounded-xl bg-white text-ink-muted shadow-sm hover:bg-[#ffdad6] hover:text-[#ba1a1a] md:mb-1.5"
              >
                <Trash2 aria-hidden className="size-5" />
              </button>
            </div>
            <FieldError id={nameId} error={err} />
          </div>
        );
      })}
      <FieldError id="meds" error={errors.meds} />
      {rows.length < MAX_MEDICATIONS && (
        <button
          type="button"
          onClick={() => {
            setRows((r) => [...r, { key: `r${next}`, name: "", times: "", errIndex: null }]);
            setNext((n) => n + 1);
          }}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e6bdba] bg-white text-[13px] font-bold text-brand-900 transition-all hover:border-brand-900 hover:bg-brand-900/5"
        >
          <CirclePlus aria-hidden className="size-[22px]" /> เพิ่มรายการยา ({rows.length}/
          {MAX_MEDICATIONS})
        </button>
      )}
    </div>
  );
}

function Success({ result, lineOaUrl }: { result: RegisterResult; lineOaUrl: string | null }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-2xl bg-white p-6 text-center shadow-xl sm:p-10">
      <span
        aria-hidden
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-console-green-bg text-console-green"
      >
        <PartyPopper className="size-8" />
      </span>
      <h1 className="m-0 text-[28px] font-bold text-ink">สมัครให้ {result.elder_name} เรียบร้อยแล้ว</h1>
      <div className="rounded-2xl bg-console-low p-6">
        <p className="m-0 text-ink-muted">รหัสเชื่อม LINE ของคุณ</p>
        <p
          data-testid="link-code"
          className="m-0 mt-2 font-mono text-4xl font-bold tracking-[0.15em] text-brand-900 sm:text-5xl"
        >
          {result.link_code}
        </p>
        <p className="m-0 mt-2 text-sm text-ink-muted">
          ใช้ได้ครั้งเดียว ภายใน {formatThaiDate(result.expires_at)}
        </p>
      </div>
      <ol className="mx-auto max-w-md space-y-2 text-left">
        <li className="flex gap-2">
          <CheckIcon aria-hidden className="mt-1 size-4 shrink-0 text-console-green" />{" "}
          กดปุ่มด้านล่างเพื่อเพิ่มเพื่อน LINE OA หลานโทรหา
        </li>
        <li className="flex gap-2">
          <CheckIcon aria-hidden className="mt-1 size-4 shrink-0 text-console-green" /> พิมพ์รหัส{" "}
          <strong className="font-mono">{result.link_code}</strong> ในแชต
        </li>
        <li className="flex gap-2">
          <CheckIcon aria-hidden className="mt-1 size-4 shrink-0 text-console-green" /> หลังเชื่อมแล้ว
          คุณจะได้รับสรุปทุกครั้งที่ระบบโทรหา
        </li>
      </ol>
      {lineOaUrl && (
        <a
          href={lineOaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#06c755] px-8 text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(6,199,85,.3)] hover:bg-[#05b34c]"
        >
          เพิ่มเพื่อน LINE
        </a>
      )}
      <p className="m-0 flex items-start gap-2 rounded-2xl bg-brand-900/5 px-4 py-3 text-left text-[15px] text-ink">
        <Mic aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-900" />
        สายแรก ผู้ช่วย AI จะขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียงก่อนเริ่มพูดคุย
      </p>
    </div>
  );
}
