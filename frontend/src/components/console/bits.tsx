// Shared bits for the อสม. console (team design, 2026-11-21).
// - Soon: a control for a feature that is not built yet. Always disabled and labelled.
// - Sample: marks a figure the system does not measure yet (shown as example data only).
import type { ReactNode } from "react";

export const SOON_TITLE = "เร็ว ๆ นี้ — ยังไม่เปิดใช้งาน";

export function SoonBadge() {
  return (
    <span className="ml-1 whitespace-nowrap rounded-full bg-black/10 px-1.5 py-px text-[10px] font-semibold leading-tight">
      เร็ว ๆ นี้
    </span>
  );
}

export function Soon({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name when the button shows only an icon. */
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-label={label ? `${label} (เร็ว ๆ นี้)` : undefined}
      title={SOON_TITLE}
      className={`inline-flex cursor-not-allowed items-center opacity-60 ${className}`}
    >
      {children}
      {!label && <SoonBadge />}
    </button>
  );
}

export function Sample({ className = "" }: { className?: string }) {
  return (
    <span
      title="ระบบยังไม่ได้วัดค่านี้จริง แสดงเพื่อเป็นตัวอย่างเท่านั้น"
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-dashed border-console-outline/60 px-1.5 py-px text-[10px] font-semibold text-console-outline ${className}`}
    >
      ข้อมูลตัวอย่าง
    </span>
  );
}
