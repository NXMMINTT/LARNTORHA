import { expect, test, type Page } from "@playwright/test";

async function fillRegister(page: Page, age: string) {
  await page.goto("/register");
  await page.fill('[name="guardian_name"]', "สุดา ทดสอบ");
  await page.fill('[name="guardian_phone"]', "081-234-5678");
  await page.selectOption('[name="relation"]', "ลูกสาว");
  await page.fill('[name="elder_name"]', "ยายทดสอบ");
  await page.fill('[name="elder_age"]', age);
  await page.fill('[name="elder_phone"]', "0891234567");
  await page.fill('[name="referral_code"]', "osm-demo");
  await page.fill('[name="med_name"]', "ยาความดัน");
  await page.fill('[name="med_times"]', "8.00");
  for (const n of ["consent_record", "consent_family", "osm_explained"]) {
    await page.check(`[name="${n}"]`);
  }
}

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('[name="phone"]', "081-234-5678");
  await page.fill('[name="password"]', "demo-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL("**/dashboard");
}

test.beforeEach(async ({ request }) => {
  // Fresh seed for every test: call the backend demo reset directly (DEMO_MODE only).
  await request.post(`${process.env.E2E_BACKEND_URL ?? "http://localhost:8000"}/v1/demo/reset`, {
    headers: { "X-Internal-Token": process.env.INTERNAL_API_TOKEN ?? "" },
  });
});

test("register: invalid input keeps values", async ({ page }) => {
  await fillRegister(page, "59");
  await page.getByRole("button", { name: "สมัครบริการ" }).click();
  await expect(page.locator('[name="elder_age"]')).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('[name="guardian_name"]')).toHaveValue("สุดา ทดสอบ");
  await expect(page.locator('[name="med_name"]')).toHaveValue("ยาความดัน");
  await expect(page.locator('[name="consent_record"]')).toBeChecked();
});

test("register: success shows LTH code", async ({ page }) => {
  await fillRegister(page, "74");
  await page.getByRole("button", { name: "สมัครบริการ" }).click();
  await expect(page.getByText(/LTH-\d{6}/).first()).toBeVisible();
});

test("login: wrong then right", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="phone"]', "0812345678");
  await page.fill('[name="password"]', "wrong");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page.getByText("เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
  await login(page);
  await expect(page.getByText("พี่แดง (ตัวอย่าง)").first()).toBeVisible();
});

test("dashboard: risk order and resolve", async ({ page }) => {
  await login(page);
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("ตาสมชาย");
  await expect(rows.last()).toContainText("ยายคำ");
  const first = rows.first();
  await first.locator('[name="note"]').fill("โทรหาแล้ว");
  await first.getByRole("button", { name: "ติดตามแล้ว" }).click();
  // Only red row, so it stays first; it is now marked resolved and faded.
  const somchai = page.locator("tbody tr", { hasText: "ตาสมชาย" });
  await expect(somchai).toHaveClass(/opacity-60/, { timeout: 15_000 });
  await expect(somchai.locator('[name="note"]')).toHaveCount(0);
});

test("dashboard: 390px shows cards, no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await expect(page.locator("thead")).toBeHidden();
});
