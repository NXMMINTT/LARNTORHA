import { CircleCheck, Info, Siren, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "info" | "warn" | "danger" | "ok";

const styles: Record<Variant, { cls: string; icon: LucideIcon }> = {
  info: { cls: "border-brand-100 bg-brand-50 text-brand-900", icon: Info },
  warn: { cls: "border-warn/30 bg-warn-bg text-yellow-900", icon: TriangleAlert },
  danger: { cls: "border-danger/30 bg-danger-bg text-red-900", icon: Siren },
  ok: { cls: "border-ok/30 bg-ok-bg text-green-900", icon: CircleCheck },
};

export function Notice({
  variant = "info",
  title,
  children,
  role,
}: {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  const s = styles[variant];
  const I = s.icon;
  return (
    <div role={role} className={`flex gap-3 rounded-2xl border p-4 ${s.cls}`}>
      <I aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
