import type { Metadata } from "next";

import { ConsoleFooter, ConsoleHeader } from "@/components/console/ConsoleChrome";
import { jakarta, sarabun } from "@/lib/fonts";

import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "สมัครบริการ" };

// Onboarding page, laid out from the team's "Senior & Medication Setup" design (2026-11-21).
export default function RegisterPage() {
  return (
    <div
      className={`theme-console ${jakarta.variable} ${sarabun.variable} flex min-h-screen flex-col bg-white text-ink antialiased`}
    >
      <ConsoleHeader current="register" />
      <main className="relative w-full flex-1 overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-32 size-96 rounded-full bg-brand-900/5 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-80 size-80 rounded-full bg-console-green/5 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
          <RegisterForm lineOaUrl={process.env.NEXT_PUBLIC_LINE_OA_URL ?? null} />
        </div>
      </main>
      <ConsoleFooter />
    </div>
  );
}
