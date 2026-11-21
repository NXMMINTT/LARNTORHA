// /dashboard/settings — LINE link and the referral code families use on /register.
import { LogOut, MessageCircle, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { getMe } from "@/lib/api";

import { createLineLinkCodeAction } from "../actions";

const panel = "rounded-2xl border border-console-line/80 bg-white p-5 shadow-sm";
const LINE_OA_URL = process.env.NEXT_PUBLIC_LINE_OA_URL ?? null;

export default async function SettingsPage() {
  const me = await getMe();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-10">
      <h1 className="m-0 text-[26px] font-extrabold text-ink">ตั้งค่า</h1>

      <section aria-labelledby="line-title" className={panel}>
        <h2 id="line-title" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
          <MessageCircle aria-hidden className="size-5 text-[#06c755]" /> แจ้งเตือนทาง LINE
        </h2>
        {me.line_linked ? (
          <p className="m-0 mt-2 text-ink">
            เชื่อม LINE แล้ว ระบบจะส่งแจ้งเตือนเมื่อมีผู้สูงอายุที่เร่งด่วน ต้องติดตาม หรือติดต่อไม่ได้
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="m-0 text-ink-muted">
              ยังไม่ได้เชื่อม LINE เชื่อมแล้วจะได้รับแจ้งเตือนทันทีเมื่อมีเคสที่ต้องดู
            </p>
            <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-ink">
              <li>
                เพิ่มเพื่อน LINE OA หลานโทรหา
                {LINE_OA_URL && (
                  <>
                    {" "}
                    <a
                      href={LINE_OA_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#06c755] underline underline-offset-4"
                    >
                      เปิด LINE OA
                    </a>
                  </>
                )}
              </li>
              <li>พิมพ์รหัสเชื่อมด้านล่างในแชต</li>
            </ol>
            {me.line_link_code ? (
              <div className="self-start rounded-xl bg-console-low px-4 py-3 font-mono text-2xl font-bold tracking-widest text-brand-900">
                {me.line_link_code}
              </div>
            ) : (
              <form action={createLineLinkCodeAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-full bg-[#06c755] px-5 text-[14px] font-bold text-white"
                >
                  สร้างรหัสเชื่อม LINE
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="ref-title" className={panel}>
        <h2 id="ref-title" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
          <UserPlus aria-hidden className="size-5 text-brand-900" /> รหัสให้ครอบครัวใช้สมัคร
        </h2>
        <p className="m-0 mt-2 text-ink-muted">
          ให้ลูกหลานสมัครที่หน้า{" "}
          <Link href="/register" className="font-semibold text-brand-900 underline">
            สมัครบริการ
          </Link>{" "}
          แล้วใส่รหัสนี้ ผู้สูงอายุจะเข้ามาอยู่ในรายชื่อของคุณ
        </p>
        <div className="mt-3 inline-block rounded-xl bg-console-low px-4 py-3 font-mono text-2xl font-bold tracking-widest text-brand-900">
          {me.referral_code}
        </div>
        <p className="m-0 mt-3 text-[13px] text-ink-muted">
          ก่อนสมัคร ควรอธิบายความยินยอม 4 ข้อให้ผู้สูงอายุฟังตัวต่อตัว (ดู{" "}
          <Link href="/dashboard/guide#consent" className="underline">
            คู่มือ อสม.
          </Link>
          )
        </p>
      </section>

      <section aria-labelledby="acct-title" className={panel}>
        <h2 id="acct-title" className="m-0 flex items-center gap-2 text-lg font-bold text-ink">
          <UserRound aria-hidden className="size-5 text-ink-muted" /> บัญชี
        </h2>
        <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink">
          <dt className="text-ink-muted">ชื่อ</dt>
          <dd className="m-0 font-semibold">{me.name}</dd>
          <dt className="text-ink-muted">พื้นที่</dt>
          <dd className="m-0 font-semibold">{me.tambon}</dd>
        </dl>
        <form action={logoutAction} className="mt-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-console-line px-4 text-[14px] font-semibold text-ink hover:bg-console-low"
          >
            <LogOut aria-hidden className="size-4" /> ออกจากระบบ
          </button>
        </form>
      </section>
    </div>
  );
}
