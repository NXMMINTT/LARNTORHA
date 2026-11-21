// Shared top of every อสม. console page (one page per nav item, user decision 2026-11-21).
import type { ReactNode } from "react";

export function PageHeader({
  title,
  sub,
  aside,
}: {
  title: string;
  sub?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="m-0 text-[26px] font-bold leading-snug text-ink sm:text-[30px]">{title}</h1>
        {sub && <p className="m-0 mt-1 text-[15px] text-ink-muted">{sub}</p>}
      </div>
      {aside}
    </header>
  );
}

/** CLAUDE.md §7.3 footer line for pages that show statuses. */
export function StatusDisclaimer() {
  return (
    <p className="m-0 border-t border-slate-200 pt-5 text-[14px] text-ink-muted">
      ข้อมูลจากระบบหลานโทรหาเท่านั้น ไม่ใช่การวินิจฉัย · “ปกติ” หมายถึงไม่พบสัญญาณผิดปกติในสาย ไม่ได้ยืนยันว่าปลอดภัย ·
      สรุปและระดับความเสี่ยงสร้างโดย AI (Amazon Bedrock) · ระบบไม่ได้เรียกรถพยาบาลเอง · “ติดต่อไม่ได้”
      แปลว่าไม่รับสาย 2 ครั้ง ไม่ได้แปลว่าเกิดเหตุ
    </p>
  );
}

export const pageWrap = "mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 lg:px-10 lg:py-8";
