// Display helpers. Storage is UTC; display is Asia/Bangkok with Buddhist-era years (CLAUDE.md §4).

const TZ = "Asia/Bangkok";

const dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  dateStyle: "medium",
  timeStyle: "short",
});
const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, timeStyle: "short" });
const weekdayFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, weekday: "short" });
const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "20 พ.ย. 2569" */
export function formatThaiDate(iso: string | Date): string {
  return dateFmt.format(new Date(iso));
}

/** "20 พ.ย. 2569 09:00" */
export function formatThaiDateTime(iso: string | Date): string {
  return dateTimeFmt.format(new Date(iso));
}

/** "09:00" */
export function formatThaiTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso));
}

/** "พฤ." */
export function formatThaiWeekday(iso: string | Date): string {
  return weekdayFmt.format(new Date(iso));
}

/** Calendar date in Bangkok as "YYYY-MM-DD". */
export function bangkokDateKey(iso: string | Date): string {
  return keyFmt.format(new Date(iso));
}

/** Whole Bangkok calendar days from `now` until `due` (negative = overdue). */
export function daysUntil(due: string | Date, now: Date = new Date()): number {
  const a = Date.parse(`${bangkokDateKey(now)}T00:00:00Z`);
  const b = Date.parse(`${bangkokDateKey(due)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "0891231234" → "089-xxx-1234". Anything that is not a 10-digit number is fully hidden. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return "xxx-xxx-xxxx";
  return `${digits.slice(0, 3)}-xxx-${digits.slice(6)}`;
}

/**
 * Accepts "081-234-5678", "081 234 5678", "+66812345678", "66812345678".
 * Returns the 10-digit local form "0812345678", or null when invalid.
 */
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("+66")) s = `0${s.slice(3)}`;
  else if (/^66\d{9}$/.test(s)) s = `0${s.slice(2)}`;
  return /^0\d{9}$/.test(s) ? s : null;
}

/** "8.00" / "8:00" / "08:00" / "8" → "08:00"; null when invalid. */
export function normalizeTime(input: string): string | null {
  const s = input.trim();
  const m = /^(\d{1,2})(?:[.:](\d{2}))?$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "07:00", "07:30", … "18:00" */
export const CALL_TIME_OPTIONS: readonly string[] = Array.from({ length: 23 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
