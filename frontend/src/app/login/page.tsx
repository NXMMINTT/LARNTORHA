// /login (CLAUDE.md §7.2). One door for both groups:
// - อสม. sign in here (accounts are created by staff with scripts/create_osm.py, no self sign-up)
// - families who are new are sent to /register to sign an elder up for the service
import { ArrowRight, HeartHandshake, ShieldCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Face, Mascot } from "@/components/Brand";
import { SiteHeader } from "@/components/SiteChrome";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { expired } = await searchParams;

  return (
    <div className="theme-public flex flex-1 flex-col bg-[#fffaf8]">
      <SiteHeader>
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand-100 bg-white px-4 text-[14px] font-semibold text-brand-600 hover:bg-brand-50"
        >
          <UserPlus aria-hidden className="size-4" /> สมัครบริการ
        </Link>
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10 md:py-16">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-brand-100 bg-white shadow-[0_24px_60px_-28px_rgba(120,30,30,.35)] md:grid-cols-[1fr_1.1fr]">
          {/* left: who this page is for */}
          <section className="relative hidden flex-col gap-5 overflow-hidden bg-brand-600 p-10 text-white md:flex">
            <span
              aria-hidden
              className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10"
            />
            <span
              aria-hidden
              className="absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10"
            />
            <div className="relative">
              <p className="m-0 text-[13px] font-bold uppercase tracking-wider text-white/80">
                หลานโทรหา
              </p>
              <h2 className="m-0 mt-1 text-[28px] font-extrabold leading-tight">
                ดูแลผู้สูงอายุในพื้นที่
                <br />
                ได้ทันทุกวัน
              </h2>
            </div>
            <ul className="relative m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
              {[
                "เห็นทันทีว่าควรเยี่ยมใครก่อน",
                "อ่านสรุปการโทรรายวันของแต่ละคน",
                "รับแจ้งเตือนทาง LINE เมื่อมีเรื่องด่วน",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <ShieldCheck aria-hidden className="size-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            {/* The laptop pose is only 140px wide and its cut-out leaves a white fringe on red, so the
                panel uses the 256px face on a cream disc: sharp on retina, no visible edge. */}
            <span className="relative mt-auto flex size-36 items-center justify-center self-end overflow-hidden rounded-full bg-[#FFF1EA] shadow-[0_14px_30px_rgba(0,0,0,.25)] ring-8 ring-white/20">
              <Face className="size-[92%] translate-y-[4%]" />
            </span>
          </section>

          {/* right: sign in + sign up, one panel */}
          <div className="flex flex-col gap-5 p-6 sm:p-10">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Mascot pose="laptop" className="h-16 w-auto md:hidden" />
                <div>
                  <h1 className="m-0 text-[26px] font-extrabold text-[#3b2420]">เข้าสู่ระบบ</h1>
                  <p className="m-0 mt-1 text-[15px] text-ink-muted">
                    สำหรับ อสม. ใช้เบอร์โทรที่ลงทะเบียนไว้กับระบบ
                  </p>
                </div>
              </div>
              <LoginForm expired={expired === "1"} />
              <p className="m-0 mt-3 text-center text-[13px] text-ink-muted">
                ลืมรหัสผ่าน หรือ อสม. ที่ยังไม่มีบัญชี ติดต่อ รพ.สต. ในพื้นที่
              </p>
            </div>

            {/* no account yet */}
            <div className="flex items-center gap-3 text-[13px] text-ink-muted">
              <span className="h-px flex-1 bg-brand-100" /> ยังไม่มีบัญชี
              <span className="h-px flex-1 bg-brand-100" />
            </div>
            <Link
              href="/register"
              className="group flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 transition hover:border-brand-600 hover:shadow-md"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <HeartHandshake aria-hidden className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-[#3b2420]">ลูกหลาน: สมัครบริการให้ผู้สูงอายุ</span>
                <span className="block text-[13px] text-ink-muted">
                  ใช้รหัส อสม. ในพื้นที่ สมัครเสร็จรับสรุปทาง LINE ไม่ต้องเข้าสู่ระบบ
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="size-5 shrink-0 text-brand-600 transition group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
