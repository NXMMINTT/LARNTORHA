"use server";

import { cookies } from "next/headers";

import { ApiError, familyLogin } from "@/lib/api";
import { FAMILY_COOKIE } from "@/lib/constants";

export type FamilyLoginResult = { ok: true } | { ok: false; error: string };

/** LIFF ID token -> backend verifies it with LINE -> family session cookie. */
export async function familyLoginAction(idToken: string): Promise<FamilyLoginResult> {
  if (!idToken) return { ok: false, error: "ไม่สามารถยืนยันตัวตนกับ LINE ได้ กรุณาลองใหม่" };
  let result;
  try {
    result = await familyLogin(idToken);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return {
        ok: false,
        error:
          "บัญชี LINE นี้ยังไม่ได้เชื่อมกับผู้สูงอายุ กรุณาพิมพ์รหัสเชื่อม LINE (เช่น LTH-123456) ในแชตหลานโทรหาก่อน",
      };
    }
    if (e instanceof ApiError && e.status === 429) {
      return { ok: false, error: "ลองเข้าใช้หลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }
    if (e instanceof ApiError && e.status < 500) {
      return { ok: false, error: "ไม่สามารถยืนยันตัวตนกับ LINE ได้ กรุณาเปิดจากเมนูใน LINE อีกครั้ง" };
    }
    return { ok: false, error: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" };
  }
  (await cookies()).set(FAMILY_COOKIE, result.session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/family",
    expires: new Date(result.expires_at),
  });
  return { ok: true };
}
