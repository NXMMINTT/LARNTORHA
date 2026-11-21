// /dashboard/tasks — "งาน 9Q": open 9Q assessments that came from a positive 2Q screen.
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader, pageWrap } from "@/components/console/PageHeader";
import { NineQBox } from "@/components/NineQBox";
import { getDashboard } from "@/lib/api";

export const metadata = { title: "งาน 9Q" };

export default async function TasksPage() {
  const data = await getDashboard();
  return (
    <div className={pageWrap.replace("max-w-6xl", "max-w-3xl")}>
      <AutoRefresh seconds={60} />
      <PageHeader title="งาน 9Q" sub="ประเมินภายใน 7 วันหลังคัดกรอง 2Q ผลบวก · ไม่ต้องบันทึกคะแนน" />
      <NineQBox tasks={data.tasks} now={new Date()} />
    </div>
  );
}
