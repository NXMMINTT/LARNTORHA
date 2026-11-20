import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";

import "./globals.css";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "หลานโทรหา", template: "%s · หลานโทรหา" },
  description: "มีคนถามไถ่ทุกวัน แม้ลูกหลานจะอยู่ไกล",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={notoThai.variable}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
