// Header of the console pages (now /register); the footer is HomeFooter, from the team's design.
// Header kept minimal: logo, the pages that exist and login (1669 lives in the footer). Features that are not built
// yet stay out of the header (they are listed as "เร็ว ๆ นี้" where they belong).
import { UserRound } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/Brand";

type Section = "home" | "register";

const NAV: { label: string; href: string; id: Section }[] = [
  { label: "หน้าแรก", href: "/", id: "home" },
  { label: "สมัครบริการ", href: "/register", id: "register" },
];

export function ConsoleHeader({ current }: { current: Section }) {
  return (
    // Floating pill, same language as the home page nav.
    <header className="pointer-events-none sticky top-0 z-50 w-full px-3 pt-3 md:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-[1120px] items-center gap-2 rounded-full border border-brand-100 bg-white/90 py-1.5 pl-3 pr-1.5 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] backdrop-blur md:pl-4">
        <Link
          href="/"
          aria-label="หลานโทรหา หน้าแรก"
          className="flex shrink-0 items-center rounded-full focus-visible:bg-brand-50 focus-visible:outline-none"
        >
          <Logo priority className="h-11 w-auto" />
        </Link>
        <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-0.5 md:flex">
          {NAV.map((n) => {
            const active = n.id === current;
            return (
              <Link
                key={n.id}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-[15px] transition-colors ${active ? "bg-brand-50 font-bold text-brand-900" : "font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-600"}`}
              >
                {n.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand-600"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/login"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 text-[15px] font-bold text-white shadow-[0_8px_20px_-8px_rgb(228_30_49/0.6)] hover:bg-brand-900 md:ml-2"
        >
          <UserRound aria-hidden className="size-[18px]" />
          <span className="max-sm:sr-only">เข้าสู่ระบบ</span>
        </Link>
      </div>
    </header>
  );
}
