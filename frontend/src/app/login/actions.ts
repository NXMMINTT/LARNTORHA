"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, login } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";

export interface LoginState {
  error: string | null;
  phone: string;
}

const GENERIC_ERROR = "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง";

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const rawPhone = String(fd.get("phone") ?? "");
  const password = String(fd.get("password") ?? "");
  const phone = normalizePhone(rawPhone);
  // Same message for every failure so the form never reveals which part was wrong.
  if (!phone || !password) return { error: GENERIC_ERROR, phone: rawPhone };

  let result;
  try {
    result = await login(phone, password);
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      return { error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่", phone: rawPhone };
    }
    if (e instanceof ApiError && e.status < 500) return { error: GENERIC_ERROR, phone: rawPhone };
    return { error: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง", phone: rawPhone };
  }

  (await cookies()).set(SESSION_COOKIE, result.session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
