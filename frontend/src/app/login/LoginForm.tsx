"use client";

import { useActionState } from "react";

import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { Notice } from "@/components/Notice";

import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: null, phone: "" };

export function LoginForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? (
        <Notice variant="danger" role="alert">
          {state.error}
        </Notice>
      ) : (
        expired && <Notice variant="info">หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง</Notice>
      )}
      <Field id="phone" label="เบอร์โทร">
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          defaultValue={state.phone}
          placeholder="081-234-5678"
          className={inputClass}
          required
        />
      </Field>
      <Field id="password" label="รหัสผ่าน">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
