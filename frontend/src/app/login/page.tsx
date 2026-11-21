// /login (CLAUDE.md §7.2). One door for both groups:
// - อสม. sign in here (accounts are created by staff with scripts/create_osm.py, no self sign-up)
// - families who are new are sent to /register to sign an elder up for the service
import {
  ArrowRight,
  BellRing,
  CalendarHeart,
  Heart,
  HeartHandshake,
  MapPinHouse,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Mascot } from "@/components/Brand";
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
          {/* left: who this page is for — cream so the mascot cut-outs blend in (no white fringe) */}
          <section className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#fff1ea] via-[#ffe6df] to-[#ffd9d3] p-10 md:flex">
            <span
              aria-hidden
              className="absolute -right-20 -top-24 size-72 rounded-full bg-white/50"
            />
            <span
              aria-hidden
              className="absolute -bottom-24 -left-16 size-64 rounded-full bg-white/40"
            />
            <Heart
              aria-hidden
              className="absolute right-12 top-24 size-6 animate-bob fill-brand-600 text-brand-600"
            />
            <Sparkles
              aria-hidden
              className="absolute bottom-40 left-10 size-5 animate-sparkle text-brand-600/60"
            />
            <Heart
              aria-hidden
              className="absolute bottom-28 right-1/3 size-4 animate-bob fill-[#f9a8a8] text-[#f9a8a8] [animation-delay:1.2s]"
            />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-brand-600 shadow-sm">
                <Sparkles aria-hidden className="size-3.5" /> สำหรับ อสม.
              </span>
              <h2 className="m-0 mt-3 text-[28px] font-extrabold leading-tight text-[#3b2420]">
                ดูแลผู้สูงอายุในพื้นที่
                <br />
                <span className="text-brand-600">ได้ทันทุกวัน</span>
              </h2>
            </div>

            <ul className="relative m-0 mt-5 flex list-none flex-col gap-2.5 p-0 text-[15px] text-[#3b2420]">
              {(
                [
                  [MapPinHouse, "เห็นทันทีว่าควรเยี่ยมใครก่อน", "bg-[#fee2e2] text-[#dc2626]"],
                  [CalendarHeart, "อ่านสรุปการโทรรายวันของแต่ละคน", "bg-[#fef3c7] text-[#b45309]"],
                  [BellRing, "รับแจ้งเตือนทาง LINE เมื่อมีเรื่องด่วน", "bg-[#dcfce7] text-[#15803d]"],
                ] as const
              ).map(([I, t, tone]) => (
                <li
                  key={t}
                  className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${tone}`}
                  >
                    <I aria-hidden className="size-4" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            {/* mascot greeting */}
            <div className="relative mt-auto flex items-end justify-end gap-2 pt-6">
              <span className="mb-16 rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-[14px] font-bold text-[#3b2420] shadow-[0_8px_20px_rgba(120,30,30,.12)]">
                สวัสดีครับพี่ อสม.
                <br />
                <span className="font-medium text-ink-muted">วันนี้ผมช่วยดูให้แล้วนะครับ</span>
              </span>
              <Mascot
                pose="wink"
                priority
                className="h-[140px] w-auto animate-bob drop-shadow-[0_12px_16px_rgba(120,30,30,.18)]"
              />
            </div>
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
