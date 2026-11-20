import { Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function BrandMark({
  className = "size-9",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl ${inverted ? "bg-white text-brand-600" : "bg-brand-600 text-white"} ${className}`}
    >
      <Phone className="size-[55%]" strokeWidth={2.25} />
    </span>
  );
}

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-brand-900">
          <BrandMark /> หลานโทรหา
        </Link>
        {children && <nav className="flex flex-wrap items-center gap-2">{children}</nav>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-slate-50">
      <div className="mx-auto w-full max-w-6xl space-y-2 px-4 py-6 text-sm text-ink-muted">
        <p>
          ไม่ใช่สายด่วน ไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง และไม่ใช่การวินิจฉัยโรค · เหตุฉุกเฉินโทร{" "}
          <a href="tel:1669" className="font-bold text-danger underline">
            1669
          </a>
        </p>
        <p>
          <Link href="/privacy" className="underline underline-offset-4 hover:text-brand-900">
            นโยบายความเป็นส่วนตัว (ร่าง)
          </Link>
        </p>
      </div>
    </footer>
  );
}
