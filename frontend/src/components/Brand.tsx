// Brand assets from the team's character sheet (น้องหลาน) and logo, 2026-11-21.
// Mascot poses are cut out of the sheet with a transparent background.
import Image, { type StaticImageData } from "next/image";

import face from "@/assets/brand/face.png";
import logo from "@/assets/brand/logo.png";
import alert from "@/assets/mascot/alert.png";
import call from "@/assets/mascot/call.png";
import care from "@/assets/mascot/care.png";
import front from "@/assets/mascot/front.png";
import happy from "@/assets/mascot/happy.png";
import headset from "@/assets/mascot/headset.png";
import hug from "@/assets/mascot/hug.png";
import laptop from "@/assets/mascot/laptop.png";
import meds from "@/assets/mascot/meds.png";
import phone from "@/assets/mascot/phone.png";
import report from "@/assets/mascot/report.png";
import screen from "@/assets/mascot/screen.png";
import wink from "@/assets/mascot/wink.png";

const POSES = {
  alert, // แจ้งเตือนเมื่อมีความเสี่ยง (siren)
  call, // โทรพูดคุยให้กำลังใจ
  care, // ห่วงใย
  front, // full body, front view
  happy, // ดีใจ
  headset, // headset (support)
  hug, // ดูแลเหมือนหลานจริง ๆ (hugging grandma)
  laptop, // laptop
  meds, // เตือนกินยา
  phone, // on the phone
  report, // ส่งรายงานให้ลูกหลาน/อสม.
  screen, // คัดกรอง (clipboard)
  wink, // อบอุ่น (heart)
} satisfies Record<string, StaticImageData>;

export type Pose = keyof typeof POSES;

/** Full logo (mascot face + หลานโทรหา / LarnTorHa). Use on light backgrounds. */
export function Logo({
  className = "h-11 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return <Image src={logo} alt="หลานโทรหา LarnTorHa" className={className} priority={priority} />;
}

/** Mascot face, for avatars. Decorative unless `alt` is given. */
export function Face({ className = "size-9", alt = "" }: { className?: string; alt?: string }) {
  return (
    <Image
      src={face}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`object-contain ${className}`}
    />
  );
}

/** A mascot pose. Decorative unless `alt` is given. */
export function Mascot({
  pose,
  className = "h-40 w-auto",
  alt = "",
  priority = false,
}: {
  pose: Pose;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={POSES[pose]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      priority={priority}
      className={`select-none object-contain ${className}`}
    />
  );
}
