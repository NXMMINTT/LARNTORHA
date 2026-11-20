import type { LucideIcon } from "lucide-react";

const TONES = {
  danger: { card: "border-danger/30 bg-danger-bg", icon: "bg-danger text-white" },
  warn: { card: "border-warn/30 bg-warn-bg", icon: "bg-warn text-white" },
  unreachable: { card: "border-warn/30 bg-warn-bg", icon: "bg-yellow-700 text-white" },
  ok: { card: "border-ok/30 bg-ok-bg", icon: "bg-ok text-white" },
  brand: { card: "border-brand-100 bg-brand-50", icon: "bg-brand-900 text-white" },
} as const;

export function StatCard({
  icon: I,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-2xl border p-4 ${t.card}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <span
          aria-hidden
          className={`flex size-7 items-center justify-center rounded-full ${t.icon}`}
        >
          <I className="size-4" strokeWidth={2.5} />
        </span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}
