"use client";

import { PartyPopper } from "lucide-react";
import { useActionState, useState } from "react";

import { Button, buttonClass } from "@/components/Button";
import { Field, FieldError, fieldAria, inputClass } from "@/components/Field";
import { Notice } from "@/components/Notice";
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
  if (state.result) return <Success result={state.result} lineOaUrl={lineOaUrl} />;

  const v = state.values;
  const e = state.errors;

  return (
    <form action={action} noValidate className="space-y-8">
      {state.formError && (
        <Notice variant="danger" role="alert">
          {state.formError}
        </Notice>
      )}

      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">เว็บไซต์</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Section title="ข้อมูลผู้สมัคร (ลูกหลาน)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="guardian_name" label="ชื่อผู้สมัคร" error={e.guardian_name} required>
            <input
              {...fieldAria("guardian_name", e.guardian_name)}
              name="guardian_name"
              defaultValue={v.guardian_name}
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field id="guardian_phone" label="เบอร์โทรผู้สมัคร" error={e.guardian_phone} required>
            <input
              {...fieldAria("guardian_phone", e.guardian_phone)}
              name="guardian_phone"
              type="tel"
              inputMode="tel"
              defaultValue={v.guardian_phone}
              placeholder="081-234-5678"
              autoComplete="tel"
              className={inputClass}
            />
          </Field>
          <Field id="relation" label="ความสัมพันธ์กับผู้สูงอายุ" error={e.relation} required>
            <select
              {...fieldAria("relation", e.relation)}
              name="relation"
              defaultValue={v.relation}
              className={inputClass}
            >
              <option value="">— เลือก —</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="ข้อมูลผู้สูงอายุ">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="elder_name"
            label="ชื่อที่ให้ AI เรียก"
            hint="เช่น ยายมาลี, คุณตาสมชาย"
            error={e.elder_name}
            required
          >
            <input
              {...fieldAria("elder_name", e.elder_name, true)}
              name="elder_name"
              defaultValue={v.elder_name}
              className={inputClass}
            />
          </Field>
          <Field id="elder_age" label="อายุ (ปี)" error={e.elder_age} required>
            <input
              {...fieldAria("elder_age", e.elder_age)}
              name="elder_age"
              type="number"
              inputMode="numeric"
              min={60}
              max={120}
              defaultValue={v.elder_age}
              className={inputClass}
            />
          </Field>
          <Field id="elder_phone" label="เบอร์โทรผู้สูงอายุ" error={e.elder_phone} required>
            <input
              {...fieldAria("elder_phone", e.elder_phone)}
              name="elder_phone"
              type="tel"
              inputMode="tel"
              defaultValue={v.elder_phone}
              placeholder="089-123-4567"
              className={inputClass}
            />
          </Field>
          <Field id="call_time" label="เวลาโทร" error={e.call_time} required>
            <select
              {...fieldAria("call_time", e.call_time)}
              name="call_time"
              defaultValue={v.call_time}
              className={inputClass}
            >
              {CALL_TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t} น.
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="referral_code"
            label="รหัส อสม."
            hint="ขอรหัสจาก อสม. ในพื้นที่ รูปแบบ OSM-XXXX"
            error={e.referral_code}
            required
          >
            <input
              {...fieldAria("referral_code", e.referral_code, true)}
              name="referral_code"
              defaultValue={v.referral_code}
              placeholder="OSM-XXXX"
              autoCapitalize="characters"
              className={`${inputClass} font-mono uppercase tracking-wider`}
            />
          </Field>
        </div>
      </Section>

      <Section title="ตารางยา (ถ้ามี)">
        <Notice variant="info">
          ใช้เพื่อเตือนให้กินยาตามตารางที่ใส่ไว้เท่านั้น <strong>AI จะไม่แนะนำยาหรือขนาดยา</strong>
        </Notice>
        <MedRows key={state.submission} initial={v.meds} errors={e} />
      </Section>

      <Section title="แพ็กเกจ">
        <fieldset aria-describedby={e.plan ? "plan-error" : undefined}>
          <legend className="sr-only">เลือกแพ็กเกจ</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-line bg-white p-4 has-checked:border-brand-600 has-checked:bg-brand-50 has-focus-visible:ring-2 has-focus-visible:ring-brand-600"
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
                <span className="text-ink-muted">{p.detail}</span>
              </label>
            ))}
          </div>
          <FieldError id="plan" error={e.plan} />
        </fieldset>
      </Section>

      <Section title="ความยินยอม (PDPA)">
        <p className="text-ink-muted">
          กรุณาอ่านและเลือกทีละข้อ ผู้สูงอายุจะได้รับการขอให้ยืนยันความยินยอมด้วยเสียงอีกครั้งในสายแรก
        </p>
        <div className="space-y-3">
          {CONSENTS.map((c) => (
            <Check
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
          <Check
            name="osm_explained"
            defaultChecked={v.osm_explained}
            error={e.osm_explained}
            title="อสม. ได้อธิบายบริการให้ผู้สูงอายุฟังตัวต่อตัวแล้ว"
            badge="จำเป็น"
            required
          />
        </div>
      </Section>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "กำลังสมัคร…" : "สมัครบริการ"}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-xl font-bold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}

function Check({
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
      className={`rounded-xl border p-4 ${error ? "border-danger bg-danger-bg/40" : "border-line"}`}
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
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {title}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${required ? "bg-brand-900 text-white" : "bg-slate-100 text-ink-muted"}`}
            >
              {badge}
            </span>
          </span>
          {body && (
            <span id={descId ?? undefined} className="block text-sm text-ink-muted">
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
    <div className="space-y-3">
      {rows.map((row, i) => {
        const err = row.errIndex !== null ? errors[`med_${row.errIndex}`] : undefined;
        const nameId = `med_name_${row.key}`;
        const timeId = `med_times_${row.key}`;
        return (
          <div key={row.key} className="rounded-xl border border-line p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1">
                <label htmlFor={nameId} className="block text-sm font-medium">
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
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={timeId} className="block text-sm font-medium">
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
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                className={buttonClass("ghost", "text-danger")}
                aria-label={`ลบยาแถวที่ ${i + 1}`}
              >
                ลบ
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
          className={buttonClass("secondary")}
        >
          + เพิ่มยา ({rows.length}/{MAX_MEDICATIONS})
        </button>
      )}
    </div>
  );
}

function Success({ result, lineOaUrl }: { result: RegisterResult; lineOaUrl: string | null }) {
  return (
    <div className="space-y-6 rounded-2xl border border-ok/30 bg-white p-6 text-center">
      <span
        aria-hidden
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-ok-bg text-ok"
      >
        <PartyPopper className="size-8" />
      </span>
      <h2 className="text-2xl font-bold text-brand-900">สมัครให้ {result.elder_name} เรียบร้อยแล้ว</h2>
      <div>
        <p className="text-ink-muted">รหัสเชื่อม LINE ของคุณ</p>
        <p
          data-testid="link-code"
          className="mt-2 font-mono text-4xl font-bold tracking-[0.15em] text-brand-900 sm:text-5xl"
        >
          {result.link_code}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          ใช้ได้ครั้งเดียว ภายใน {formatThaiDate(result.expires_at)}
        </p>
      </div>
      <ol className="mx-auto max-w-md space-y-2 text-left">
        <li>1. กดปุ่มด้านล่างเพื่อเพิ่มเพื่อน LINE OA หลานโทรหา</li>
        <li>
          2. พิมพ์รหัส <strong className="font-mono">{result.link_code}</strong> ในแชต
        </li>
        <li>3. หลังเชื่อมแล้ว คุณจะได้รับสรุปทุกครั้งที่ระบบโทรหา</li>
      </ol>
      {lineOaUrl && (
        <a
          href={lineOaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("line")}
        >
          เพิ่มเพื่อน LINE
        </a>
      )}
      <Notice variant="info">สายแรก ผู้ช่วย AI จะขอให้ผู้สูงอายุยืนยันความยินยอมด้วยเสียงก่อนเริ่มพูดคุย</Notice>
    </div>
  );
}
