import {
  CircleCheck,
  Hourglass,
  PhoneOff,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { CallOutcome, ElderStatus, RiskLevel } from "@/lib/types";

// Never colour-only: every status carries an icon AND a text label (CLAUDE.md §12).
export const STATUS_META: Record<
  ElderStatus,
  { label: string; icon: LucideIcon; pill: string; solid: string; tint: string; text: string }
> = {
  red: {
    label: "เร่งด่วน",
    icon: Siren,
    pill: "bg-danger-bg text-red-800 border-danger/30",
    solid: "bg-danger text-white",
    tint: "bg-danger-bg text-danger",
    text: "text-danger",
  },
  yellow: {
    label: "ต้องติดตาม",
    icon: TriangleAlert,
    pill: "bg-warn-bg text-yellow-800 border-warn/30",
    solid: "bg-warn text-white",
    tint: "bg-warn-bg text-yellow-700",
    text: "text-yellow-700",
  },
  unreachable: {
    label: "ติดต่อไม่ได้",
    icon: PhoneOff,
    pill: "bg-warn-bg text-yellow-800 border-warn/30",
    solid: "bg-yellow-700 text-white",
    tint: "bg-warn-bg text-yellow-700",
    text: "text-yellow-700",
  },
  green: {
    label: "ปกติ",
    icon: CircleCheck,
    pill: "bg-ok-bg text-green-800 border-ok/30",
    solid: "bg-ok text-white",
    tint: "bg-ok-bg text-ok",
    text: "text-ok",
  },
  pending: {
    label: "รอสายแรก",
    icon: Hourglass,
    pill: "bg-slate-100 text-ink-muted border-line",
    solid: "bg-slate-400 text-white",
    tint: "bg-slate-100 text-ink-muted",
    text: "text-ink-muted",
  },
};

/** Per-call risk wording (elder detail timeline); visuals reuse the status palette. */
export const RISK_META: Record<RiskLevel, { label: string; status: ElderStatus }> = {
  red: { label: "เสี่ยงสูง", status: "red" },
  yellow: { label: "ควรติดตาม", status: "yellow" },
  green: { label: "ไม่พบสัญญาณผิดปกติ", status: "green" },
};

const pill =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-semibold";

export function Badge({ status }: { status: ElderStatus }) {
  const s = STATUS_META[status];
  const I = s.icon;
  return (
    <span className={`${pill} ${s.pill}`}>
      <I aria-hidden className="size-3.5" strokeWidth={2.5} />
      {s.label}
    </span>
  );
}

export function RiskBadge({ level, outcome }: { level: RiskLevel | null; outcome: CallOutcome }) {
  if (outcome === "no_answer" || level === null) {
    const s = STATUS_META.unreachable;
    return (
      <span className={`${pill} ${s.pill}`}>
        <PhoneOff aria-hidden className="size-3.5" strokeWidth={2.5} />
        ไม่รับสาย
      </span>
    );
  }
  const r = RISK_META[level];
  const s = STATUS_META[r.status];
  const I = s.icon;
  return (
    <span className={`${pill} ${s.pill}`}>
      <I aria-hidden className="size-3.5" strokeWidth={2.5} />
      {r.label}
    </span>
  );
}

/** Small solid circle with the status icon — for compact indicators (counts, trend strip). */
export function StatusDot({
  status,
  size = "size-6",
  iconSize = "size-3.5",
}: {
  status: ElderStatus;
  size?: string;
  iconSize?: string;
}) {
  const s = STATUS_META[status];
  const I = s.icon;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${size} ${s.solid}`}
    >
      <I className={iconSize} strokeWidth={2.5} />
    </span>
  );
}

const TAG_TONES = {
  neutral: "bg-slate-100 text-ink-muted border-line",
  warn: "bg-warn-bg text-yellow-800 border-warn/30",
  brand: "bg-brand-50 text-brand-900 border-brand-100",
  danger: "bg-danger-bg text-red-800 border-danger/30",
  ok: "bg-ok-bg text-green-800 border-ok/30",
} as const;

export function Tag({
  children,
  tone = "neutral",
  icon: I,
}: {
  children: ReactNode;
  tone?: keyof typeof TAG_TONES;
  icon?: LucideIcon;
}) {
  return (
    <span className={`${pill} font-medium ${TAG_TONES[tone]}`}>
      {I && <I aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
