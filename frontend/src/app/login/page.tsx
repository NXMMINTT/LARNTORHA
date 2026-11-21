import type { Metadata } from "next";

import { Mascot } from "@/components/Brand";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ อสม.", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { expired } = await searchParams;
  return (
    <div className="theme-public flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <div className="flex items-end gap-3">
          <Mascot pose="laptop" priority className="h-24 w-auto shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-brand-900">เข้าสู่ระบบ อสม.</h1>
            <p className="mt-1 text-ink-muted">ใช้เบอร์โทรที่ลงทะเบียนไว้กับระบบ</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <LoginForm expired={expired === "1"} />
        </div>
        {process.env.DEMO_MODE === "true" && (
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-ink-muted">
            โหมดเดโม — ข้อมูลสมมติ: เบอร์ 0812345678 · รหัสผ่าน demo-password
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
