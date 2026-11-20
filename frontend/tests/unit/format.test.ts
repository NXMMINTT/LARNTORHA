import { describe, expect, it } from "vitest";

import {
  bangkokDateKey,
  CALL_TIME_OPTIONS,
  daysUntil,
  formatThaiDate,
  formatThaiDateTime,
  maskPhone,
  normalizePhone,
  normalizeTime,
} from "@/lib/format";

describe("Thai date formatting", () => {
  it("uses Buddhist-era year and Bangkok time", () => {
    // 2026-11-20T02:00Z = 09:00 in Bangkok
    const s = formatThaiDateTime("2026-11-20T02:00:00Z");
    expect(s).toContain("2569");
    expect(s).toContain("09:00");
    expect(formatThaiDate("2026-11-20T02:00:00Z")).toContain("พ.ย.");
  });

  it("rolls the calendar day over at Bangkok midnight, not UTC", () => {
    expect(bangkokDateKey("2026-11-19T16:59:00Z")).toBe("2026-11-19");
    expect(bangkokDateKey("2026-11-19T17:00:00Z")).toBe("2026-11-20");
  });

  it("counts days until a due date in Bangkok calendar days", () => {
    const now = new Date("2026-11-20T02:00:00Z");
    expect(daysUntil("2026-11-27T02:00:00Z", now)).toBe(7);
    expect(daysUntil("2026-11-20T15:00:00Z", now)).toBe(0);
    expect(daysUntil("2026-11-18T02:00:00Z", now)).toBe(-2);
  });
});

describe("maskPhone", () => {
  it("hides the middle digits", () => {
    expect(maskPhone("0891231234")).toBe("089-xxx-1234");
  });
  it("hides everything when the number is malformed", () => {
    expect(maskPhone("12345")).toBe("xxx-xxx-xxxx");
  });
});

describe("normalizePhone", () => {
  it.each([
    ["081-234-5678", "0812345678"],
    ["081 234 5678", "0812345678"],
    ["+66812345678", "0812345678"],
    ["+66 81 234 5678", "0812345678"],
    ["66812345678", "0812345678"],
  ])("%s → %s", (input, out) => {
    expect(normalizePhone(input)).toBe(out);
  });
  it.each(["", "12345", "1812345678", "08123456789", "abc"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("normalizeTime", () => {
  it.each([
    ["8.00", "08:00"],
    ["8:00", "08:00"],
    ["08:30", "08:30"],
    ["18.00", "18:00"],
    ["7", "07:00"],
  ])("%s → %s", (input, out) => {
    expect(normalizeTime(input)).toBe(out);
  });
  it.each(["24:00", "8.60", "8.5", "x", ""])("rejects %s", (input) => {
    expect(normalizeTime(input)).toBeNull();
  });
});

describe("CALL_TIME_OPTIONS", () => {
  it("covers 07:00–18:00 every 30 minutes", () => {
    expect(CALL_TIME_OPTIONS[0]).toBe("07:00");
    expect(CALL_TIME_OPTIONS.at(-1)).toBe("18:00");
    expect(CALL_TIME_OPTIONS).toHaveLength(23);
    expect(CALL_TIME_OPTIONS).toContain("09:00");
  });
});
