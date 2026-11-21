// Builds the LINE card header images (hero) and the footer wave from the น้องหลาน stickers.
//   node scripts/build-line-card-images.mjs        (run from frontend/, needs Playwright + internet for fonts)
// Inputs : backend/app/static/cards/sticker-{green,unreachable,followup,red}.png, src/assets/brand/logo.png
// Outputs: backend/app/static/cards/{green,unreachable,followup,red}.jpg (1024x640) and wave.png (1024x64)
// LINE limits: HTTPS, JPEG/PNG, <= 1024x1024 px, <= 10 MB (1 MB recommended). After changing images,
// bump CARD_IMAGE_VERSION in backend/app/domain/line_cards.py (LINE caches images by URL).
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const cards = resolve(here, "../../backend/app/static/cards");
const dataUrl = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
const logo = dataUrl(resolve(here, "../src/assets/brand/logo.png"));

// tint = background, accent = soft circle, pill = only for followup (its sticker has no label)
const KINDS = {
  green: { tint: "#E9F8EE", accent: "#BFEBCD" },
  unreachable: { tint: "#FFF7DA", accent: "#FDE68A" },
  followup: { tint: "#FFF1E3", accent: "#FED7AA", pill: { text: "ควรติดตาม", color: "#EA7A0C" } },
  red: { tint: "#FDECEC", accent: "#FCC9C9" },
};

const refreshIcon = `<svg viewBox="0 0 24 24" width="58" height="58" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>`;

function page(kind) {
  const k = KINDS[kind];
  const sticker = dataUrl(`${cards}/sticker-${kind}.png`);
  const pill = k.pill
    ? `<div class="pill" style="background:${k.pill.color}"><span class="ic" style="background:${k.pill.color}">${refreshIcon}</span><span>สถานะ : <b>${k.pill.text}</b></span></div>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@600;700&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:1024px;height:640px;overflow:hidden}
  .bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 60% 40%, #fff 0%, ${k.tint} 62%)}
  .accent{position:absolute;width:720px;height:720px;border-radius:50%;background:${k.accent};opacity:.45;left:200px;top:40px}
  .logo{position:absolute;left:34px;top:30px;height:96px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.08))}
  .sticker{position:absolute;left:50%;transform:translateX(-50%);bottom:${k.pill ? "118px" : "14px"};height:${k.pill ? "470px" : "586px"}}
  .pill{position:absolute;left:50%;transform:translateX(-50%);bottom:34px;display:flex;align-items:center;gap:22px;
        padding:14px 54px 14px 14px;border-radius:999px;border:7px solid #fff;color:#fff;
        font:600 50px Kanit,sans-serif;white-space:nowrap;box-shadow:0 10px 24px rgba(0,0,0,.18)}
  .pill b{font-weight:700;font-size:62px}
  .ic{display:flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;
      border:6px solid #fff;box-shadow:inset 0 0 0 4px rgba(255,255,255,.35)}
</style></head><body>
<div class="bg"></div><div class="accent"></div>
<img class="logo" src="${logo}">
<img class="sticker" src="${sticker}">
${pill}
</body></html>`;
}

const wave = `<!doctype html><html><body style="margin:0;width:1024px;height:64px;background:#fff">
<svg width="1024" height="64" viewBox="0 0 1024 64"><path d="M0 34 C 220 70, 380 4, 600 30 S 900 60, 1024 22 L1024 64 L0 64 Z" fill="#F7B5B8"/>
<path d="M0 46 C 240 74, 420 18, 640 42 S 920 70, 1024 38 L1024 64 L0 64 Z" fill="#D71920"/></svg></body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1024, height: 640 } });
for (const kind of Object.keys(KINDS)) {
  await p.setContent(page(kind), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const out = `${cards}/${kind}.jpg`;
  await p.screenshot({ path: out, type: "jpeg", quality: 88 });
  console.log(out, `${Math.round(statSync(out).size / 1024)} KB`);
}
await p.setViewportSize({ width: 1024, height: 64 });
await p.setContent(wave);
await p.screenshot({ path: `${cards}/wave.png` });
console.log(`${cards}/wave.png`);
await browser.close();
