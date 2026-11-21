import type { Plan } from "./types";

export const PLANS: readonly { id: Plan; name: string; price: string; detail: string }[] = [
  { id: "light", name: "เบา", price: "฿199/เดือน", detail: "โทร 3 ครั้งต่อสัปดาห์" },
  { id: "standard", name: "มาตรฐาน", price: "฿299/เดือน", detail: "โทรวันเว้นวัน" },
  { id: "premium", name: "พรีเมียม", price: "฿699–799/เดือน", detail: "โทรทุกวัน วันละ 5 นาที" },
];

export const RELATIONS: readonly string[] = ["ลูกสาว", "ลูกชาย", "หลาน", "ญาติ", "อื่นๆ"];

export const MAX_MEDICATIONS = 8;

export const SESSION_COOKIE = "ltr_session";
export const FAMILY_COOKIE = "ltr_family";
