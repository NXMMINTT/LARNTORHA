import type { Metadata } from "next";

import { ConsoleHeader } from "@/components/console/ConsoleChrome";
import { HomeFooter } from "@/components/home/HomeFooter";
import { jakarta, sarabun } from "@/lib/fonts";

import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "สมัครบริการ" };

// Onboarding page: clean single-column form (user decision 2026-11-21).
export default function RegisterPage() {
  return (
    <div
      className={`theme-console ${jakarta.variable} ${sarabun.variable} flex min-h-screen flex-col bg-white text-ink antialiased`}
    >
      <ConsoleHeader current="register" />
      <main className="w-full flex-1 bg-[#fbf7f5]">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <RegisterForm lineOaUrl={process.env.NEXT_PUBLIC_LINE_OA_URL ?? null} />
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
