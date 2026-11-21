import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console/ConsoleShell";

export const metadata: Metadata = {
  title: "โหมดเดโม",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
