import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "line" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-brand-900 text-white hover:bg-brand-600",
  secondary: "border border-line bg-white text-brand-900 hover:bg-brand-50",
  danger: "bg-danger text-white hover:bg-red-700",
  line: "bg-[#06c755] text-white hover:bg-[#05b14c]",
  ghost: "text-brand-900 underline-offset-4 hover:underline",
};

export function buttonClass(variant: Variant = "primary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
