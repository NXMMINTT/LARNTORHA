// /demo — demo mode (CLAUDE.md §7.6). Only when DEMO_MODE=true and logged in as อสม.
import { FlaskConical, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";

import { DemoRunner } from "@/components/demo/DemoRunner";
import { getDashboard, getDemoScenarios, isDemoMode } from "@/lib/api";

import { resetDemoAction } from "./actions";

export default async function DemoPage() {
  if (!isDemoMode()) notFound();
  const [data, scenarios] = await Promise.all([getDashboard(), getDemoScenarios()]);
  const elders = data.rows.map((r) => ({ id: r.elder_id, name: r.name }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-warn bg-warn-bg px-3 py-1 text-[13px] font-bold text-yellow-800">
            <FlaskConical aria-hidden className="size-4" /> โหมดเดโม — ข้อมูลสมมติ
          </span>
          <h1 className="m-0 mt-2 text-[26px] font-extrabold text-ink">จำลองสาย</h1>
          <p className="m-0 mt-1 text-ink-muted">
            ส่งบทสนทนาเข้าระบบเดียวกับสายจริง (Amazon Bedrock → สถานะ → การ์ด LINE → Dashboard)
          </p>
        </div>
        <form action={resetDemoAction}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-console-line px-4 text-[14px] font-semibold text-ink hover:bg-console-low"
          >
            <RotateCcw aria-hidden className="size-4" /> ล้างข้อมูลเดโม
          </button>
        </form>
      </header>
      <DemoRunner elders={elders} scenarios={scenarios} />
    </div>
  );
}
