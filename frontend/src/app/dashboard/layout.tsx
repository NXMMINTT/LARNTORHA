import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console/ConsoleShell";

export const metadata: Metadata = {
  title: "Dashboard อสม.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
