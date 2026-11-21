"use client";

// Signup form (CLAUDE.md §7.1). Laid out like a paper form (user decision 2026-11-21):
// intro with น้องหลาน → rows of [title + note | fields] split by rules → submit row.
// All §7.1 rules stay: every field, unticked consents, honeypot, values kept on error,
// aria-invalid/aria-describedby, "AI จะไม่แนะนำยาหรือขนาดยา".
import { Check as CheckIcon, Plus, X } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import { Mascot, type Pose } from "@/components/Brand";
import { FieldError, fieldAria } from "@/components/Field";
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
  "block h-12 w-full rounded-lg border border-[#ddd2ce] bg-white px-3.5 text-base text-ink placeholder:text-[#b3a5a1] transition focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-600/15 aria-[invalid=true]:border-[#ba1a1a] aria-[invalid=true]:bg-[#fff6f5]";

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

export function RegisterForm({ lineOaUrl }: { lineOaUrl: string | null }) {
  const [state, action, pending] = useActionState(registerAction, initial);
  const v = state.values;
  const e = state.errors;

  if (state.result) return <Success result={state.result} lineOaUrl={lineOaUrl} />;

  return (
    <form action={action} noValidate className="leading-relaxed">
      <header className="flex items-end justify-between gap-6 pb-8">
        <div className="max-w-xl">
          <h1 className="m-0 text-[32px] font-bold leading-snug text-ink sm:text-[40px]">
            สมัครให้ผู้ใหญ่ที่บ้าน
            <br className="max-sm:hidden" /> ได้คุยกับน้องหลานทุกวัน
          </h1>
          <p className="m-0 mt-3 text-[17px] text-ink-muted">
            ผู้สูงอายุแค่รับสายจากมือถือเครื่องเดิม ไม่ต้องโหลดแอป ไม่ต้องใช้อินเทอร์เน็ต ก่อนเริ่มกรอก ขอรหัส อสม.
            ในพื้นที่ไว้ให้พร้อม
          </p>
        </div>
        <Mascot pose="hug" className="h-36 w-auto shrink-0 max-md:hidden" />
      </header>

      {state.formError && (
        <p
          role="alert"
          className="m-0 mb-6 border-l-4 border-[#ba1a1a] bg-[#fff6f5] px-4 py-3 font-semibold text-[#93000a]"
        >
          {state.formError}
        </p>
      )}

      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">เว็บไซต์</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="rounded-xl border border-[#ece3df] bg-white px-5 sm:px-10">
        <Row
          id="elder"
          title="ผู้สูงอายุ"
          note="น้องหลานจะเรียกชื่อนี้ตอนทักทาย และเข้าใจภาษาถิ่นทุกภาค"
          pose="call"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_140px]">
            <F
              id="elder_name"
              label="ชื่อที่ให้น้องหลานเรียก"
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
            <F id="elder_age" label="อายุ" error={e.elder_age}>
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
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <F id="elder_phone" label="เบอร์ที่จะให้โทรหา" hint="มือถือปุ่มกดก็ได้" error={e.elder_phone}>
              <input
                {...fieldAria("elder_phone", e.elder_phone, true)}
                name="elder_phone"
                type="tel"
                inputMode="tel"
                defaultValue={v.elder_phone}
                placeholder="089-123-4567"
                className={input}
              />
            </F>
            <F
              id="referral_code"
              label="รหัส อสม."
              hint="ขอได้จาก อสม. ในพื้นที่"
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
          </div>
        </Row>

        <Row
          id="meds"
          title="ยาที่กินประจำ"
          note="น้องหลานจะถามว่ากินยาแล้วหรือยังเท่านั้น AI จะไม่แนะนำยาหรือขนาดยา"
          pose="meds"
        >
          <MedRows key={state.submission} initial={v.meds} errors={e} />
        </Row>

        <Row id="schedule" title="เวลาโทรและแพ็กเกจ" note="โทรตามเวลาที่เลือก ความถี่ขึ้นกับแพ็กเกจ">
          <div className="sm:max-w-[220px]">
            <F id="call_time" label="เวลาโทร" error={e.call_time}>
              <select
                {...fieldAria("call_time", e.call_time)}
                name="call_time"
                defaultValue={v.call_time}
                className={input}
              >
                {CALL_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t} น.
                  </option>
                ))}
              </select>
            </F>
          </div>
          <fieldset
            aria-describedby={e.plan ? "plan-error" : undefined}
            className="m-0 border-0 p-0"
          >
            <legend className="pb-2 text-[15px] font-semibold text-ink">แพ็กเกจ</legend>
            <div className="divide-y divide-[#ece3df] overflow-hidden rounded-lg border border-[#ddd2ce]">
              {PLANS.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition hover:bg-[#fffaf8] has-checked:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    defaultChecked={v.plan === p.id}
                    className="size-5 shrink-0 accent-brand-600"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">{p.name}</span>
                    <span className="block text-[15px] text-ink-muted">{p.detail}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{p.price}</span>
                </label>
              ))}
            </div>
            <FieldError id="plan" error={e.plan} />
          </fieldset>
        </Row>

        <Row
          id="guardian"
          title="ผู้สมัคร"
          note="สรุปหลังวางสายจะส่งเข้า LINE ของคุณ ถ้าเร่งด่วน น้องหลานจะแนะนำให้โทร 1669 แล้วแจ้งคุณและ อสม. (ระบบไม่ได้เรียกรถพยาบาลเอง)"
          pose="report"
        >
          <F id="guardian_name" label="ชื่อของคุณ" error={e.guardian_name}>
            <input
              {...fieldAria("guardian_name", e.guardian_name)}
              name="guardian_name"
              defaultValue={v.guardian_name}
              autoComplete="name"
              className={input}
            />
          </F>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <F id="guardian_phone" label="เบอร์โทรของคุณ" error={e.guardian_phone}>
              <input
                {...fieldAria("guardian_phone", e.guardian_phone)}
                name="guardian_phone"
                type="tel"
                inputMode="tel"
                defaultValue={v.guardian_phone}
                placeholder="081-234-5678"
                autoComplete="tel"
                className={input}
              />
            </F>
            <F id="relation" label="เป็นอะไรกับผู้สูงอายุ" error={e.relation}>
              <select
                {...fieldAria("relation", e.relation)}
                name="relation"
                defaultValue={v.relation}
                className={input}
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
        </Row>

        <Row
          id="consent"
          title="ความยินยอม"
          note="ตาม PDPA ขอแยกเป็นรายข้อ สายแรกน้องหลานจะขอให้ผู้สูงอายุยืนยันด้วยเสียงอีกครั้ง"
        >
          <div className="divide-y divide-[#ece3df]">
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
        </Row>

        <div className="flex flex-col-reverse items-stretch gap-4 border-t border-[#ece3df] py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 max-w-md text-[15px] text-ink-muted">
            สมัครแล้วจะได้รหัสสำหรับเชื่อม LINE ทันที
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-13 min-w-[200px] items-center justify-center rounded-lg bg-brand-600 px-8 text-[17px] font-bold text-white transition hover:bg-brand-900 disabled:opacity-60"
          >
            {pending ? "กำลังสมัคร…" : "สมัครบริการ"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ pieces

/** One form row: title + note (and a small น้องหลาน) on the left, fields on the right. */
function Row({
  id,
  title,
  note,
  pose,
  children,
}: {
  id: string;
  title: string;
  note: string;
  pose?: Pose;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid gap-6 border-t border-[#ece3df] py-8 first:border-t-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10 md:py-10"
    >
      <div>
        <h2 id={`${id}-title`} className="m-0 text-[19px] font-bold leading-snug text-ink">
          {title}
        </h2>
        <p className="m-0 mt-1.5 text-[15px] text-ink-muted">{note}</p>
        {pose && <Mascot pose={pose} className="mt-4 h-20 w-auto max-md:hidden" />}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
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
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label} <span className="text-brand-600">*</span>
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="m-0 text-[14px] text-ink-muted">
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
    <div className="py-4 first:pt-0 last:pb-0">
      <label htmlFor={name} className="flex cursor-pointer items-start gap-3">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={[descId, errId].filter(Boolean).join(" ") || undefined}
          className="mt-1 size-5 shrink-0 accent-brand-600"
        />
        <span>
          <span className={`font-semibold ${error ? "text-[#93000a]" : "text-ink"}`}>{title}</span>{" "}
          <span className={`text-[14px] ${required ? "text-brand-600" : "text-ink-muted"}`}>
            · {badge}
          </span>
          {body && (
            <span id={descId ?? undefined} className="mt-0.5 block text-[15px] text-ink-muted">
              {body}
            </span>
          )}
        </span>
      </label>
      <div className="pl-8">
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
    <div className="space-y-4">
      {rows.map((row, i) => {
        const err = row.errIndex !== null ? errors[`med_${row.errIndex}`] : undefined;
        const nameId = `med_name_${row.key}`;
        const timeId = `med_times_${row.key}`;
        return (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <label htmlFor={nameId} className="block text-[15px] font-semibold text-ink">
                    ชื่อยา {rows.length > 1 ? i + 1 : ""}
                  </label>
                  <input
                    id={nameId}
                    name="med_name"
                    defaultValue={row.name}
                    maxLength={60}
                    placeholder="เช่น ยาความดัน"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${nameId}-error` : undefined}
                    className={input}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={timeId} className="block text-[15px] font-semibold text-ink">
                    เวลากิน
                  </label>
                  <input
                    id={timeId}
                    name="med_times"
                    defaultValue={row.times}
                    placeholder="8.00, 18.00"
                    inputMode="decimal"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${nameId}-error` : undefined}
                    className={input}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                aria-label={`ลบยาแถวที่ ${i + 1}`}
                className="flex size-12 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-[#fff6f5] hover:text-[#ba1a1a]"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <FieldError id={nameId} error={err} />
          </div>
        );
      })}
      <FieldError id="meds" error={errors.meds} />
      <p className="m-0 text-[14px] text-ink-muted">ถ้ากินหลายเวลา คั่นด้วยจุลภาค เช่น 8.00, 18.00</p>
      {rows.length < MAX_MEDICATIONS && (
        <button
          type="button"
          onClick={() => {
            setRows((r) => [...r, { key: `r${next}`, name: "", times: "", errIndex: null }]);
            setNext((n) => n + 1);
          }}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-semibold text-brand-600 transition hover:bg-brand-50"
        >
          <Plus aria-hidden className="size-5" /> เพิ่มยาอีกรายการ
        </button>
      )}
    </div>
  );
}

function Success({ result, lineOaUrl }: { result: RegisterResult; lineOaUrl: string | null }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[#ece3df] bg-white p-6 sm:p-10">
      <Mascot pose="happy" className="h-28 w-auto" />
      <h1 className="m-0 mt-4 text-[28px] font-bold leading-snug text-ink">
        สมัครให้ {result.elder_name} เรียบร้อยแล้ว
      </h1>
      <p className="m-0 mt-2 text-ink-muted">เหลืออีกขั้นเดียว เชื่อม LINE เพื่อรับสรุปหลังวางสาย</p>
      <div className="mt-6 rounded-lg bg-[#fff6f2] px-5 py-5">
        <p className="m-0 text-[15px] text-ink-muted">รหัสเชื่อม LINE</p>
        <p
          data-testid="link-code"
          className="m-0 mt-1 font-mono text-4xl font-bold tracking-[0.12em] text-brand-900 sm:text-5xl"
        >
          {result.link_code}
        </p>
        <p className="m-0 mt-1 text-[15px] text-ink-muted">
          ใช้ได้ครั้งเดียว ภายใน {formatThaiDate(result.expires_at)}
        </p>
      </div>
      <ol className="m-0 mt-6 space-y-2 p-0">
        {[
          "เพิ่มเพื่อน LINE OA หลานโทรหา",
          `พิมพ์รหัส ${result.link_code} ในแชต`,
          "หลังเชื่อมแล้ว คุณจะได้รับสรุปทุกครั้งที่ระบบโทรหา",
        ].map((t) => (
          <li key={t} className="flex list-none gap-2">
            <CheckIcon aria-hidden className="mt-1 size-4 shrink-0 text-console-green" /> {t}
          </li>
        ))}
      </ol>
      {lineOaUrl && (
        <a
          href={lineOaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-[52px] items-center justify-center rounded-lg bg-[#06c755] px-8 text-[17px] font-bold text-white hover:bg-[#05b34c]"
        >
          เพิ่มเพื่อน LINE
        </a>
      )}
      <p className="m-0 mt-6 border-t border-[#ece3df] pt-4 text-[15px] text-ink-muted">
        สายแรก น้องหลานจะขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียงก่อนเริ่มพูดคุย
      </p>
    </div>
  );
}
