import type { Metadata } from "next";
import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { Button, buttonClass } from "@/components/Button";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Dashboard อสม.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader>
        <Link href="/dashboard" className={buttonClass("ghost")}>
          ภาพรวม
        </Link>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            ออกจากระบบ
          </Button>
        </form>
      </SiteHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 text-sm text-ink-muted">
        ข้อมูลจากระบบหลานโทรหาเท่านั้น ไม่ใช่การวินิจฉัย · สถานะ “ปกติ” หมายถึงไม่พบสัญญาณผิดปกติในสาย
        ไม่ได้ยืนยันว่าปลอดภัย
      </div>
      <SiteFooter />
    </>
  );
}
