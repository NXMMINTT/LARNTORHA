"use client";
// Navigation of the อสม. console (/dashboard/*), option B chosen by the team on 2026-11-21:
// sidebar on desktop (lg+), top bar + drawer on mobile. Only real pages are listed; add
// "โหมดเดโม" (/demo, CLAUDE.md §7.6) here once that page exists.
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Siren,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAction } from "@/app/login/actions";
import { Logo } from "@/components/Brand";

export interface ConsoleUser {
  name: string;
  tambon: string;
  referralCode: string;
  lineLinked: boolean;
}

type NavItem = { label: string; href: string; icon: LucideIcon; badge?: number };

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/elders/")) return "สรุปรายวันผู้สูงอายุ";
  return "ภาพรวมวันนี้";
}

function Sos({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="tel:1669"
      aria-label={compact ? "โทร 1669 ฉุกเฉิน" : undefined}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-brand-900 px-3 text-[13px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(238,39,55,0.35)] hover:bg-brand-600 sm:px-4"
    >
      <Siren aria-hidden className="size-4" />
      {!compact && <span>1669 ฉุกเฉิน</span>}
    </a>
  );
}

export function ConsoleNav({ user, tasksOpen }: { user: ConsoleUser; tasksOpen: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items: NavItem[] = [
    { label: "ภาพรวมวันนี้", href: "/dashboard", icon: LayoutDashboard },
    { label: "งาน 9Q", href: "/dashboard#ninq", icon: ClipboardList, badge: tasksOpen },
  ];
  // Elder detail pages belong to "ภาพรวมวันนี้"; 9Q is a section of the same page.
  const activeHref = pathname.startsWith("/dashboard") ? "/dashboard" : null;

  return (
    <>
      {/* ---------------------------------------------------------- mobile top bar */}
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-console-line/70 bg-white/95 px-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="console-sidebar"
          aria-label="เปิดเมนู"
          className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-console-low"
        >
          <Menu aria-hidden className="size-6" />
        </button>
        <Link href="/dashboard" aria-label="หลานโทรหา ภาพรวมวันนี้" className="flex items-center">
          <Logo priority className="h-9 w-auto" />
        </Link>
        <Sos compact />
      </header>

      {/* ---------------------------------------------------------- desktop top bar */}
      <div className="sticky top-0 z-30 hidden min-h-16 items-center justify-between gap-4 border-b border-console-line/70 bg-white/95 px-10 backdrop-blur lg:ml-64 lg:flex">
        <span className="text-[15px] font-semibold text-ink-muted">{pageTitle(pathname)}</span>
        <Sos />
      </div>

      {/* ---------------------------------------------------------- overlay (mobile) */}
      {open && (
        <div aria-hidden onClick={close} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
      )}

      {/* ---------------------------------------------------------- sidebar / drawer */}
      <aside
        id="console-sidebar"
        aria-label="เมนูคอนโซล อสม."
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-console-line/70 bg-white lg:flex`}
      >
        <div className="flex min-h-16 items-center justify-between gap-2 px-4">
          <Link href="/dashboard" onClick={close} aria-label="หลานโทรหา ภาพรวมวันนี้">
            <Logo className="h-11 w-auto" />
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="ปิดเมนู"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-console-low lg:hidden"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <nav aria-label="เมนูหลัก" className="flex flex-col gap-1 px-3 pt-2">
          {items.map(({ label, href, icon: I, badge }) => {
            const on = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${on ? "bg-console-high font-bold text-brand-900" : "font-medium text-ink-muted hover:bg-console-low hover:text-ink"}`}
              >
                <I aria-hidden className="size-5 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-900 px-1.5 text-[12px] font-bold text-white">
                    {badge}
                    <span className="sr-only"> งานค้าง</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 my-4 border-t border-console-line/70" />

        <div className="flex flex-col gap-3 px-4">
          <div>
            <div className="text-[12px] text-ink-muted">รหัส อสม. ให้ครอบครัวใช้สมัคร</div>
            <div className="mt-1 rounded-lg bg-console-low px-3 py-2 font-mono text-[15px] font-bold tracking-wider text-brand-900">
              {user.referralCode}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <MessageCircle
              aria-hidden
              className={`size-4 ${user.lineLinked ? "text-[#06c755]" : "text-ink-muted"}`}
            />
            <span className={user.lineLinked ? "text-ink" : "text-ink-muted"}>
              {user.lineLinked ? "เชื่อม LINE แล้ว" : "ยังไม่ได้เชื่อม LINE"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-console-line/70 px-4 py-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-900"
          >
            {user.name.replace(/^พี่/, "").slice(0, 1)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-bold text-ink">{user.name}</span>
            <span className="truncate text-[12px] text-ink-muted">อสม. {user.tambon}</span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-console-low hover:text-ink"
            >
              <LogOut aria-hidden className="size-[18px]" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
