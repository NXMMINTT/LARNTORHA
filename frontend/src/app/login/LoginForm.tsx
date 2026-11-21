"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { Notice } from "@/components/Notice";

import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: null, phone: "" };

export function LoginForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [show, setShow] = useState(false);
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
          autoComplete="tel"
          defaultValue={state.phone}
          placeholder="081-234-5678"
          className={inputClass}
          required
        />
      </Field>
      <Field id="password" label="รหัสผ่าน">
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className={`${inputClass} pr-12`}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-muted hover:text-ink"
          >
            {show ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
