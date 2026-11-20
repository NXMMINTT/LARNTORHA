"use server";

import { ApiError, register } from "@/lib/api";
import {
  readRegisterForm,
  validateRegister,
  type RegisterErrors,
  type RegisterValues,
} from "@/lib/register-validation";
import type { RegisterResult } from "@/lib/types";

export interface RegisterState {
  /** Bumped on every submit so client-side rows re-sync with the returned values. */
  submission: number;
  values: RegisterValues;
  errors: RegisterErrors;
  formError: string | null;
  result: RegisterResult | null;
}

export async function registerAction(prev: RegisterState, fd: FormData): Promise<RegisterState> {
  const values = readRegisterForm(fd);
  const base = { submission: prev.submission + 1, values, result: null };

  // Honeypot: real users never see or fill this field.
  if (String(fd.get("website") ?? "") !== "") {
    return { ...base, errors: {}, formError: "ไม่สามารถสมัครได้ กรุณาลองใหม่อีกครั้ง" };
  }

  const { errors, payload } = validateRegister(values);
  if (!payload) {
    return { ...base, errors, formError: "กรุณาแก้ไขข้อมูลที่แจ้งไว้ด้านล่าง" };
  }

  try {
    const result = await register(payload);
    return { ...base, errors: {}, formError: null, result };
  } catch (e) {
    if (e instanceof ApiError && e.code === "referral_not_found") {
      return {
        ...base,
        errors: { referral_code: "ไม่พบรหัส อสม. นี้ กรุณาตรวจสอบกับ อสม. ในพื้นที่" },
        formError: "กรุณาแก้ไขข้อมูลที่แจ้งไว้ด้านล่าง",
      };
    }
    if (e instanceof ApiError && e.status === 429) {
      return { ...base, errors: {}, formError: "สมัครหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }
    if (e instanceof ApiError && e.status === 422) {
      return { ...base, errors: {}, formError: "ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
    }
    return { ...base, errors: {}, formError: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" };
  }
}
