import { CircleCheck, ClipboardList, FileText, PhoneOff, Siren, TriangleAlert } from "lucide-react";

import { AutoRefresh } from "@/components/AutoRefresh";
import { StatusDot } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ElderTable } from "@/components/ElderTable";
import { NineQBox } from "@/components/NineQBox";
import { Notice } from "@/components/Notice";
import { StatCard } from "@/components/StatCard";
import { getDailyDigest, getDashboard, getMe } from "@/lib/api";
import { formatThaiDateTime } from "@/lib/format";
import type { DailyDigest } from "@/lib/types";

import { createLineLinkCodeAction } from "./actions";

function DigestBar({ d }: { d: DailyDigest }) {
  return (
    <section
      aria-label="สรุปวันนี้"
      className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-brand-900"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
        <FileText aria-hidden className="size-5" />
        <span>สรุปวันนี้: โทร {d.total_calls} ราย</span>
        <span className="inline-flex items-center gap-1">
          <StatusDot status="red" size="size-5" iconSize="size-3" /> เร่งด่วน {d.counts.red}
        </span>
        <span className="inline-flex items-center gap-1">
          <StatusDot status="yellow" size="size-5" iconSize="size-3" /> ติดตาม {d.counts.yellow}
        </span>
        <span className="inline-flex items-center gap-1">
          <StatusDot status="unreachable" size="size-5" iconSize="size-3" /> ติดต่อไม่ได้{" "}
          {d.counts.unreachable}
        </span>
      </p>
      {d.visit_first.length > 0 && (
        <p className="mt-1">
          ควรเยี่ยมก่อน: {d.visit_first.map((v) => `${v.name} (${v.reason})`).join(", ")}
        </p>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const [me, data, digest] = await Promise.all([getMe(), getDashboard(), getDailyDigest()]);
  const now = new Date();

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{me.name}</h1>
          <p className="text-ink-muted">{me.tambon}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            รหัส อสม. สำหรับให้ครอบครัวสมัคร:{" "}
            <strong className="font-mono text-base tracking-wider text-brand-900">
              {me.referral_code}
            </strong>
          </p>
          <p className="text-ink-muted">อัปเดตล่าสุด {formatThaiDateTime(data.generated_at)}</p>
        </div>
      </header>

      {!me.line_linked && (
        <Notice variant="info" title="เชื่อม LINE เพื่อรับแจ้งเตือนเมื่อมีผู้สูงอายุที่ควรติดตาม">
          {me.line_link_code ? (
            <p>
              เพิ่มเพื่อน LINE OA หลานโทรหา แล้วพิมพ์รหัส{" "}
              <strong className="font-mono text-lg tracking-wider">{me.line_link_code}</strong>{" "}
              ในแชต
            </p>
          ) : (
            <form action={createLineLinkCodeAction} className="mt-2">
              <Button type="submit">สร้างรหัสเชื่อม LINE</Button>
            </form>
          )}
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Siren} label="เร่งด่วน" value={data.counts.red} tone="danger" />
        <StatCard icon={TriangleAlert} label="ต้องติดตาม" value={data.counts.yellow} tone="warn" />
        <StatCard
          icon={PhoneOff}
          label="ติดต่อไม่ได้"
          value={data.counts.unreachable}
          tone="unreachable"
        />
        <StatCard icon={CircleCheck} label="ปกติ" value={data.counts.green} tone="ok" />
        <StatCard
          icon={ClipboardList}
          label="งาน 9Q ค้าง"
          value={data.counts.tasks_open}
          tone="brand"
        />
      </div>

      <DigestBar d={digest} />

      <section aria-labelledby="elders-title" className="space-y-3">
        <h2 id="elders-title" className="text-lg font-bold text-brand-900">
          ผู้สูงอายุในความดูแล ({data.rows.length})
        </h2>
        <ElderTable rows={data.rows} />
      </section>

      <NineQBox tasks={data.tasks} now={now} />
    </div>
  );
}
