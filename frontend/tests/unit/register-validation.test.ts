import { describe, expect, it } from "vitest";

import {
  EMPTY_REGISTER_VALUES,
  validateRegister,
  type RegisterValues,
} from "@/lib/register-validation";

const valid: RegisterValues = {
  ...EMPTY_REGISTER_VALUES,
  guardian_name: "สุดา",
  guardian_phone: "081-234-5678",
  relation: "ลูกสาว",
  elder_name: "ยายมาลี",
  elder_age: "78",
  elder_phone: "+66891234567",
  call_time: "09:00",
  referral_code: "osm-demo",
  plan: "standard",
  meds: [{ name: "ยาความดัน", times: "8.00, 18.00" }],
  consent_record: true,
  consent_family: true,
  osm_explained: true,
};

describe("validateRegister", () => {
  it("normalises phones, times and referral code", () => {
    const { errors, payload } = validateRegister(valid);
    expect(errors).toEqual({});
    expect(payload?.guardian.phone).toBe("0812345678");
    expect(payload?.elder.phone).toBe("0891234567");
    expect(payload?.referral_code).toBe("OSM-DEMO");
    expect(payload?.medications).toEqual([{ name: "ยาความดัน", times: ["08:00", "18:00"] }]);
    expect(payload?.consents.osm_share).toBe(false);
  });

  it("requires consents (1) and (2) and the อสม. explanation", () => {
    const { errors, payload } = validateRegister({
      ...valid,
      consent_record: false,
      consent_family: false,
      osm_explained: false,
    });
    expect(payload).toBeNull();
    expect(errors.consent_record).toBeTruthy();
    expect(errors.consent_family).toBeTruthy();
    expect(errors.osm_explained).toBeTruthy();
  });

  it("does not require consents (3) and (4)", () => {
    expect(
      validateRegister({ ...valid, consent_osm: false, consent_2q: false }).payload,
    ).not.toBeNull();
  });

  it("rejects age under 60", () => {
    expect(validateRegister({ ...valid, elder_age: "59" }).errors.elder_age).toBeTruthy();
    expect(validateRegister({ ...valid, elder_age: "121" }).errors.elder_age).toBeTruthy();
  });

  it("skips blank medication rows and flags bad times per row", () => {
    const r = validateRegister({
      ...valid,
      meds: [
        { name: "", times: "" },
        { name: "ยาเบาหวาน", times: "25.00" },
      ],
    });
    expect(r.errors.med_0).toBeUndefined();
    expect(r.errors.med_1).toBeTruthy();
  });

  it("rejects call times outside the 30-minute grid", () => {
    expect(validateRegister({ ...valid, call_time: "06:30" }).errors.call_time).toBeTruthy();
    expect(validateRegister({ ...valid, call_time: "09:15" }).errors.call_time).toBeTruthy();
  });
});
