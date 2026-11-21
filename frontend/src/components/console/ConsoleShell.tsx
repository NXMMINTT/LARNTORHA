// Layout of every อสม. console page (/dashboard/*, /demo): sidebar nav + content + footer.
// getMe/getDashboard/getDailyDigest are cache()d, so pages calling them again cost nothing.
import { ConsoleFooter } from "@/components/console/ConsoleChrome";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { getDailyDigest, getDashboard, getMe, isDemoMode } from "@/lib/api";
import { jakarta, sarabun } from "@/lib/fonts";

export async function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [me, data, digest] = await Promise.all([getMe(), getDashboard(), getDailyDigest()]);
  const unresolved = new Set(data.rows.filter((r) => !r.resolved).map((r) => r.elder_id));
  const visitFirst = digest.visit_first.filter((v) => unresolved.has(v.elder_id)).length;

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
        counts={{ visitFirst, tasks: data.counts.tasks_open, elders: data.rows.length }}
        demo={isDemoMode()}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <main className="w-full flex-1">{children}</main>
        <ConsoleFooter />
      </div>
    </div>
  );
}
