// Header + footer of the อสม. console, from the team's design.
import { Bell, LogOut, ShieldCheck, Siren, UserRound } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { Logo } from "@/components/Brand";

import { Sample, SOON_TITLE, SoonBadge } from "./bits";

type Section = "dashboard" | "register";

const NAV: { label: string; href?: string; id?: Section }[] = [
  { label: "หน้าแรก & นวัตกรรม", href: "/" },
  { label: "แดชบอร์ดดูแลครอบครัว" },
  { label: "บันทึกการโทร & AI วิเคราะห์" },
  { label: "แดชบอร์ดเจ้าหน้าที่ / อสม.", href: "/dashboard", id: "dashboard" },
  { label: "รายงานแพทย์ (MorDee)" },
  { label: "ตั้งค่าเริ่มต้น / Onboarding", href: "/register", id: "register" },
];

/** `user` is the logged-in อสม.; omitted on public pages (e.g. /register). */
export function ConsoleHeader({
  user,
  current,
}: {
  user?: { name: string; tambon: string };
  current: Section;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-console-line/70 bg-white/90 shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl">
      <div className="flex min-h-20 w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 lg:px-10">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <Logo priority className="h-12 w-auto" />
            <span className="flex flex-col">
              <span className="flex flex-wrap items-center gap-1">
                <span className="rounded-full border border-brand-900/20 bg-brand-900/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-brand-900 max-sm:hidden">
                  x True 5G Innovation
                </span>
              </span>
              <span className="text-[11px] font-medium tracking-wide text-ink-muted max-sm:hidden">
                AI Companion for Thai Seniors
              </span>
            </span>
          </Link>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 min-[1700px]:flex">
            {NAV.map((n) =>
              n.href ? (
                <Link
                  key={n.label}
                  href={n.href}
                  aria-current={n.id === current ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-[13px] transition-colors ${n.id === current ? "bg-console-high font-bold text-brand-900" : "font-medium text-ink-muted hover:bg-console-low hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              ) : (
                <span
                  key={n.label}
                  title={SOON_TITLE}
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-full px-3 py-2 text-[13px] font-medium text-ink-muted/60"
                >
                  {n.label}
                  <SoonBadge />
                </span>
              ),
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-console-line/80 bg-console-low px-2.5 py-1.5 text-[11px] xl:flex">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-console-green" />
            <span className="font-medium text-ink-muted">Live 5G VoLTE:</span>
            <span className="font-bold text-console-green">ปกติ</span>
            <Sample />
          </span>
          <a
            href="tel:1669"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-900 px-3 text-[13px] sm:px-4 font-bold text-white shadow-[0_4px_16px_-2px_rgba(238,39,55,0.35)] hover:bg-brand-600"
          >
            <Siren aria-hidden className="size-4" />
            <span className="max-sm:sr-only">1669 ฉุกเฉิน</span>
          </a>
          <button
            type="button"
            disabled
            title={SOON_TITLE}
            aria-label="การแจ้งเตือน (เร็ว ๆ นี้)"
            className="relative hidden size-11 cursor-not-allowed items-center justify-center rounded-full text-ink-muted opacity-60 sm:flex"
          >
            <Bell aria-hidden className="size-5" />
            <span
              aria-hidden
              className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-900 ring-2 ring-white"
            />
          </button>
          {user ? (
            <div className="flex items-center gap-2 border-l border-console-line/80 pl-2">
              <span
                aria-hidden
                className="hidden size-9 items-center justify-center rounded-full bg-brand-100 sm:flex text-sm font-bold text-brand-900 ring-2 ring-console-high"
              >
                {user.name.replace(/^พี่/, "").slice(0, 1)}
              </span>
              <span className="hidden flex-col text-left leading-tight lg:flex">
                <span className="text-[12px] font-bold text-ink">{user.name}</span>
                <span className="text-[11px] text-ink-muted">(อสม. {user.tambon})</span>
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-muted hover:bg-console-low hover:text-ink"
                >
                  <LogOut aria-hidden className="size-4" />
                  <span className="max-lg:sr-only">ออกจากระบบ</span>
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-l border-console-line/80 px-3 text-[13px] font-semibold text-ink-muted hover:bg-console-low hover:text-ink"
            >
              <UserRound aria-hidden className="size-4" />
              <span className="max-md:sr-only">เข้าสู่ระบบ อสม.</span>
            </Link>
          )}
        </div>
        <nav
          aria-label="เมนูหลัก (แถวล่าง)"
          className="-mx-1 hidden w-full flex-wrap items-center gap-1 pb-1 lg:flex min-[1700px]:hidden"
        >
          {NAV.map((n) =>
            n.href ? (
              <Link
                key={n.label}
                href={n.href}
                aria-current={n.id === current ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors ${n.id === current ? "bg-console-high font-bold text-brand-900" : "font-medium text-ink-muted hover:bg-console-low hover:text-ink"}`}
              >
                {n.label}
              </Link>
            ) : (
              <span
                key={n.label}
                title={SOON_TITLE}
                aria-disabled="true"
                className="cursor-not-allowed rounded-full px-3 py-2 text-[13px] font-medium text-ink-muted/60"
              >
                {n.label}
                <SoonBadge />
              </span>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

export function ConsoleFooter() {
  return (
    <footer className="w-full border-t border-console-line/80 bg-console-low py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center md:flex-row md:text-left lg:px-10">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-center gap-1 md:justify-start">
            <span className="text-[13px] font-bold text-ink">หลานโทรหา (Grandchild Call)</span>
            <span className="text-[11px] text-console-outline">•</span>
            <span className="text-[11px] font-semibold text-brand-900">
              True 5G Innovation Ecosystem Partner
            </span>
          </div>
          <p className="m-0 text-[13px] text-ink-muted">
            ร่วมสร้างสรรค์เพื่อผู้สูงอายุไทย ณ True Digital Park x True Corporation
          </p>
          <p className="m-0 text-[13px] text-ink-muted">
            ข้อมูลจากระบบหลานโทรหาเท่านั้น ไม่ใช่การวินิจฉัย · สถานะ “ปกติ” หมายถึงไม่พบสัญญาณผิดปกติในสาย
            ไม่ได้ยืนยันว่าปลอดภัย · ไม่ใช่สายด่วน ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง · เหตุฉุกเฉินโทร{" "}
            <a href="tel:1669" className="font-bold text-brand-900 underline">
              1669
            </a>{" "}
            ·{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              นโยบายความเป็นส่วนตัว (ร่าง)
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-console-line/80 bg-white px-2.5 py-1 text-[11px] text-ink-muted">
            <ShieldCheck aria-hidden className="size-4 text-console-green" />
            PDPA &amp; Thailand Health Data Compliant
          </span>
          <span className="text-[11px] text-ink-muted">
            © 2026 True 5G Hackathon Demo. สงวนลิขสิทธิ์ทุกประการ.
          </span>
        </div>
      </div>
    </footer>
  );
}
