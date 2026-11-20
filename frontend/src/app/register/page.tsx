import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "สมัครบริการ" };

export default function RegisterPage() {
  return (
    <div className="theme-public flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-brand-900">สมัครบริการหลานโทรหา</h1>
        <p className="mt-2 text-ink-muted">
          สำหรับลูกหลานที่ต้องการให้มีคนโทรถามไถ่คุณพ่อคุณแม่ทุกวัน ต้องมีรหัส อสม. ในพื้นที่ก่อนสมัคร
        </p>
        <div className="mt-8">
          <RegisterForm lineOaUrl={process.env.NEXT_PUBLIC_LINE_OA_URL ?? null} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
