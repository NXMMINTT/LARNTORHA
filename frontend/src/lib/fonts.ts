import { Kanit } from "next/font/google";

// Heading font for the public home page only (keeps Dashboard light).
export const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});
