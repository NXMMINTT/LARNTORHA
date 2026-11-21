// Footer of the home page, reused on /register and the อสม. console (team decision 2026-11-21).
import Link from "next/link";

import { Logo } from "@/components/Brand";

const LINKS = [
  ["/register", "สมัครบริการ"],
  ["/login", "เข้าสู่ระบบ"],
  ["/privacy", "นโยบายความเป็นส่วนตัว (ร่าง)"],
] as const;

export function HomeFooter() {
  return (
    <footer className="border-t border-brand-100 bg-white">
      <div className="mx-auto grid max-w-[1100px] gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        {/* brand */}
        <div className="flex flex-col gap-3 sm:col-span-2 md:col-span-1">
          <Logo className="h-14 w-auto self-start" />
          <p className="m-0 max-w-xs text-[15px] leading-relaxed text-ink-muted">
            ผู้ช่วย AI โทรถามไถ่ผู้สูงอายุ เชื่อมครอบครัวและ อสม. ในพื้นที่
          </p>
        </div>

        {/* service links */}
        <nav aria-label="บริการ" className="flex flex-col gap-3">
          <h2 className="m-0 text-[13px] font-bold uppercase tracking-wider text-[#5b3a31]">
            บริการ
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ink hover:text-brand-600">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* hotlines */}
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-[13px] font-bold uppercase tracking-wider text-[#5b3a31]">
            สายด่วน
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            <li>
              <a href="tel:1669" className="text-ink hover:text-brand-600">
                เหตุฉุกเฉิน <b className="text-brand-600">1669</b>
              </a>
            </li>
            <li>
              <a href="tel:1323" className="text-ink hover:text-brand-600">
                สุขภาพจิต <b className="text-brand-600">1323</b>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
