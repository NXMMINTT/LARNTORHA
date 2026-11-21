import { Anuphan, Plus_Jakarta_Sans, Sarabun } from "next/font/google";

// Heading font for the public home page only (keeps Dashboard light).
export const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-anuphan",
  display: "swap",
});

// อสม. console (dashboard) fonts, from the team's design.
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});
