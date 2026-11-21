import type { Metadata } from "next";

import { ConsoleFooter } from "@/components/console/ConsoleChrome";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { getDashboard, getMe } from "@/lib/api";
import { jakarta, sarabun } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Dashboard อสม.",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Both calls are deduplicated with the page's own calls (React cache in lib/api.ts).
  const [me, data] = await Promise.all([getMe(), getDashboard()]);
  return (
    <div
      className={`theme-console ${jakarta.variable} ${sarabun.variable} flex min-h-screen flex-col bg-white text-ink antialiased`}
    >
      <ConsoleNav
        user={{
          name: me.name,
          tambon: me.tambon,
          referralCode: me.referral_code,
          lineLinked: me.line_linked,
        }}
        tasksOpen={data.counts.tasks_open}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <main className="w-full flex-1">{children}</main>
        <ConsoleFooter />
      </div>
    </div>
  );
}
