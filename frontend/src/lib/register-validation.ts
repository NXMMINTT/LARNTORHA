// Pure validation for the /register form (CLAUDE.md §7.1). The backend re-validates everything.

import { MAX_MEDICATIONS, PLANS, RELATIONS } from "./constants";
import { CALL_TIME_OPTIONS, normalizePhone, normalizeTime } from "./format";
import type { Plan, RegisterPayload } from "./types";

export interface RegisterValues {
  guardian_name: string;
  guardian_phone: string;
  relation: string;
  elder_name: string;
  elder_age: string;
  elder_phone: string;
  call_time: string;
  referral_code: string;
  plan: string;
  meds: { name: string; times: string }[];
  consent_record: boolean;
  consent_family: boolean;
  consent_osm: boolean;
  consent_2q: boolean;
  osm_explained: boolean;
}

export type RegisterErrors = Partial<Record<string, string>>;

export const EMPTY_REGISTER_VALUES: RegisterValues = {
  guardian_name: "",
  guardian_phone: "",
  relation: "",
  elder_name: "",
  elder_age: "",
  elder_phone: "",
  call_time: "09:00",
  referral_code: "",
  plan: "standard",
  meds: [{ name: "", times: "" }],
  consent_record: false,
  consent_family: false,
  consent_osm: false,
  consent_2q: false,
  osm_explained: false,
};

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export function readRegisterForm(fd: FormData): RegisterValues {
  const names = fd.getAll("med_name").map((v) => (typeof v === "string" ? v : ""));
  const times = fd.getAll("med_times").map((v) => (typeof v === "string" ? v : ""));
  const meds = names.map((name, i) => ({ name, times: times[i] ?? "" }));
  return {
    guardian_name: str(fd, "guardian_name"),
    guardian_phone: str(fd, "guardian_phone"),
    relation: str(fd, "relation"),
    elder_name: str(fd, "elder_name"),
    elder_age: str(fd, "elder_age"),
    elder_phone: str(fd, "elder_phone"),
    call_time: str(fd, "call_time"),
    referral_code: str(fd, "referral_code"),
    plan: str(fd, "plan"),
    meds: meds.length ? meds : [{ name: "", times: "" }],
    consent_record: fd.get("consent_record") === "on",
    consent_family: fd.get("consent_family") === "on",
    consent_osm: fd.get("consent_osm") === "on",
    consent_2q: fd.get("consent_2q") === "on",
    osm_explained: fd.get("osm_explained") === "on",
  };
}

export function validateRegister(v: RegisterValues): {
  errors: RegisterErrors;
  payload: RegisterPayload | null;
} {
  const e: RegisterErrors = {};

  const guardianName = v.guardian_name.trim();
  if (!guardianName) e.guardian_name = "กรุณากรอกชื่อผู้สมัคร";
  else if (guardianName.length > 80) e.guardian_name = "ชื่อยาวเกินไป (ไม่เกิน 80 ตัวอักษร)";

  const guardianPhone = normalizePhone(v.guardian_phone);
  if (!guardianPhone) e.guardian_phone = "เบอร์โทรไม่ถูกต้อง (เช่น 081-234-5678)";

  if (!RELATIONS.includes(v.relation)) e.relation = "กรุณาเลือกความสัมพันธ์";

  const elderName = v.elder_name.trim();
  if (!elderName) e.elder_name = "กรุณากรอกชื่อที่ให้ AI เรียก";
  else if (elderName.length > 60) e.elder_name = "ชื่อยาวเกินไป (ไม่เกิน 60 ตัวอักษร)";

  const age = Number(v.elder_age);
  if (!v.elder_age.trim() || !Number.isInteger(age)) e.elder_age = "กรุณากรอกอายุเป็นตัวเลข";
  else if (age < 60 || age > 120) e.elder_age = "บริการนี้สำหรับผู้สูงอายุ 60–120 ปี";

  const elderPhone = normalizePhone(v.elder_phone);
  if (!elderPhone) e.elder_phone = "เบอร์โทรไม่ถูกต้อง (เช่น 089-123-4567)";

  if (!CALL_TIME_OPTIONS.includes(v.call_time)) e.call_time = "กรุณาเลือกเวลาโทร";

  const referral = v.referral_code.trim().toUpperCase();
  // Generated codes avoid 0/O/1/I, but accept any A-Z0-9 on input (seed code is OSM-DEMO).
  if (!/^OSM-[A-Z0-9]{4}$/.test(referral)) e.referral_code = "รหัส อสม. ต้องเป็นรูปแบบ OSM-XXXX";

  const meds: { name: string; times: string[] }[] = [];
  const filled = v.meds.filter((m) => m.name.trim() || m.times.trim());
  if (filled.length > MAX_MEDICATIONS) e.meds = `ใส่ยาได้ไม่เกิน ${MAX_MEDICATIONS} รายการ`;
  v.meds.forEach((m, i) => {
    const name = m.name.trim();
    const rawTimes = m.times.trim();
    if (!name && !rawTimes) return;
    if (!name) {
      e[`med_${i}`] = "กรุณากรอกชื่อยา";
      return;
    }
    if (name.length > 60) {
      e[`med_${i}`] = "ชื่อยายาวเกินไป (ไม่เกิน 60 ตัวอักษร)";
      return;
    }
    const parts = rawTimes
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const times = parts.map(normalizeTime);
    if (parts.length === 0 || parts.length > 4 || times.some((t) => t === null)) {
      e[`med_${i}`] = "เวลากินยาไม่ถูกต้อง ใส่ 1–4 เวลา คั่นด้วย , (เช่น 8.00, 18.00)";
      return;
    }
    meds.push({ name, times: [...new Set(times as string[])].sort() });
  });

  if (!PLANS.some((p) => p.id === v.plan)) e.plan = "กรุณาเลือกแพ็กเกจ";

  if (!v.consent_record) e.consent_record = "ต้องยินยอมข้อนี้จึงจะให้บริการได้";
  if (!v.consent_family) e.consent_family = "ต้องยินยอมข้อนี้จึงจะให้บริการได้";
  if (!v.osm_explained) e.osm_explained = "ต้องให้ อสม. อธิบายบริการให้ผู้สูงอายุฟังก่อนสมัคร";

  if (Object.keys(e).length > 0 || !guardianPhone || !elderPhone) {
    return { errors: e, payload: null };
  }

  return {
    errors: {},
    payload: {
      guardian: { name: guardianName, phone: guardianPhone, relation: v.relation },
      elder: { name: elderName, age, phone: elderPhone, call_time: v.call_time },
      referral_code: referral,
      medications: meds,
      plan: v.plan as Plan,
      consents: {
        record_conversation: v.consent_record,
        family_summary: v.consent_family,
        osm_share: v.consent_osm,
        screening_2q: v.consent_2q,
      },
      osm_explained: true,
    },
  };
}
