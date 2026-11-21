"use client";

// Logs a guardian in with LINE (LIFF): LIFF ID token -> server action -> family session cookie.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { familyLoginAction } from "./actions";

export function FamilyLiffLogin({ liffId }: { liffId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        const res = await familyLoginAction(liff.getIDToken() ?? "");
        if (cancelled) return;
        if (res.ok) router.refresh();
        else setError(res.error);
      } catch {
        if (!cancelled) setError('เปิดผ่าน LINE ไม่สำเร็จ กรุณากดเมนู "ข้อมูลผู้สูงอายุ" ใน LINE อีกครั้ง');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liffId, router]);

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-danger/30 bg-danger-bg p-4 text-red-800">
        {error}
      </p>
    );
  }
  return (
    <p aria-live="polite" className="rounded-2xl bg-slate-100 p-4 text-ink-muted">
      กำลังยืนยันตัวตนกับ LINE…
    </p>
  );
}
