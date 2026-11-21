"use client";
// Navigation of the อสม. console (/dashboard/*, /demo), option B chosen by the team on
// 2026-11-21: sidebar on desktop (lg+), top bar + drawer on mobile. Only real pages are listed.
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MapPinHouse,
  Menu,
  MessageCircle,
  Settings,
  Users,
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

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** "alert" = red count (needs action), default = neutral count. */
  tone?: "alert";
};
type NavGroup = { title: string; items: NavItem[] };

const PAGES: [prefix: string, title: string][] = [
  ["/dashboard/visit", "ควรเยี่ยมก่อน"],
  ["/dashboard/tasks", "งาน 9Q"],
  ["/dashboard/elders/", "สรุปรายวันผู้สูงอายุ"],
  ["/dashboard/elders", "ผู้สูงอายุทั้งหมด"],
  ["/dashboard/digest", "สรุปรายวันย้อนหลัง"],
  ["/dashboard/guide", "คู่มือ อสม."],
  ["/dashboard/settings", "ตั้งค่า"],
  ["/demo", "โหมดเดโม"],
];

function pageTitle(pathname: string): string {
  return PAGES.find(([p]) => pathname.startsWith(p))?.[1] ?? "ภาพรวมวันนี้";
}

/** Every nav item is its own page; the longest matching prefix owns the current page. */
const NAV_PAGES = [
  "/dashboard/visit",
  "/dashboard/tasks",
  "/dashboard/elders", // list and /dashboard/elders/[id]
  "/dashboard/digest",
  "/dashboard/guide",
  "/dashboard/settings",
  "/demo",
];

function activeHref(pathname: string): string {
  return NAV_PAGES.find((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? "/dashboard";
}

export function ConsoleNav({
  user,
  counts,
  demo,
}: {
  user: ConsoleUser;
  counts: { visitFirst: number; tasks: number; elders: number };
  demo: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const groups: NavGroup[] = [
    {
      title: "งานวันนี้",
      items: [
        { label: "ภาพรวมวันนี้", href: "/dashboard", icon: LayoutDashboard },
        {
          label: "ควรเยี่ยมก่อน",
          href: "/dashboard/visit",
          icon: MapPinHouse,
          badge: counts.visitFirst,
          tone: "alert",
        },
        {
          label: "งาน 9Q",
          href: "/dashboard/tasks",
          icon: ClipboardList,
          badge: counts.tasks,
          tone: "alert",
        },
        { label: "ผู้สูงอายุทั้งหมด", href: "/dashboard/elders", icon: Users, badge: counts.elders },
      ],
    },
    {
      title: "ย้อนหลัง",
      items: [{ label: "สรุปรายวัน", href: "/dashboard/digest", icon: CalendarDays }],
    },
    {
      title: "เครื่องมือ",
      items: [
        ...(demo ? [{ label: "โหมดเดโม", href: "/demo", icon: FlaskConical }] : []),
        { label: "คู่มือ อสม.", href: "/dashboard/guide", icon: BookOpen },
        { label: "ตั้งค่า / เชื่อม LINE", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];
  const current = activeHref(pathname);

  return (
    <>
      {/* ---------------------------------------------------------- mobile top bar */}
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="console-sidebar"
          aria-label="เปิดเมนู"
          className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-slate-100"
        >
          <Menu aria-hidden className="size-6" />
        </button>
        <Link href="/dashboard" aria-label="หลานโทรหา ภาพรวมวันนี้" className="flex items-center">
          <Logo priority className="h-9 w-auto" />
        </Link>
        <span aria-hidden className="size-11" />
      </header>

      {/* ---------------------------------------------------------- desktop top bar */}
      <div className="sticky top-0 z-30 hidden min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-10 backdrop-blur lg:ml-64 lg:flex">
        <span className="text-[15px] font-semibold text-ink-muted">{pageTitle(pathname)}</span>
      </div>

      {/* ---------------------------------------------------------- overlay (mobile) */}
      {open && (
        <div aria-hidden onClick={close} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
      )}

      {/* ---------------------------------------------------------- sidebar / drawer */}
      <aside
        id="console-sidebar"
        aria-label="เมนูคอนโซล อสม."
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-slate-200 bg-white lg:flex`}
      >
        <div className="flex min-h-16 items-center justify-between gap-2 px-4">
          <Link href="/dashboard" onClick={close} aria-label="หลานโทรหา ภาพรวมวันนี้">
            <Logo className="h-11 w-auto" />
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="ปิดเมนู"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-slate-100 lg:hidden"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <nav aria-label="เมนูหลัก" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pt-1">
          {groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-0.5">
              <div className="px-3 pb-1 text-[11px] font-semibold text-ink-muted/80">{g.title}</div>
              {g.items.map(({ label, href, icon: I, badge, tone }) => {
                const on = href === current;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors ${on ? "bg-brand-50 font-bold text-brand-900" : "font-medium text-ink-muted hover:bg-slate-100 hover:text-ink"}`}
                  >
                    <I aria-hidden className="size-5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge ? (
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-bold ${tone === "alert" ? "bg-brand-900 text-white" : "bg-slate-100 text-ink-muted"}`}
                      >
                        {badge}
                        <span className="sr-only"> รายการ</span>
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-1.5 border-t border-slate-200 px-4 py-3 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">รหัสให้ครอบครัวสมัคร</span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[13px] font-bold tracking-wider text-brand-900">
              {user.referralCode}
            </span>
          </div>
          <Link
            href="/dashboard/settings"
            onClick={close}
            className="flex min-h-8 items-center gap-1.5 hover:underline"
          >
            <MessageCircle
              aria-hidden
              className={`size-4 ${user.lineLinked ? "text-[#06c755]" : "text-ink-muted"}`}
            />
            <span className={user.lineLinked ? "text-ink" : "text-ink-muted"}>
              {user.lineLinked ? "เชื่อม LINE แล้ว" : "ยังไม่ได้เชื่อม LINE"}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
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
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-slate-100 hover:text-ink"
            >
              <LogOut aria-hidden className="size-[18px]" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
