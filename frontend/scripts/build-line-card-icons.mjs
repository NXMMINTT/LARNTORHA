// Renders the lucide icons used inside the LINE family cards to PNG (Flex has no SVG support).
//   node scripts/build-line-card-icons.mjs        (run from frontend/)
// Output: backend/app/static/cards/icons/{name}-{color}.png (96x96, transparent)
// Keep ICONS in sync with ICON_FILES in backend/app/domain/line_cards.py, then bump
// CARD_IMAGE_VERSION there (LINE caches images by URL).
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as lucide from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/app/static/cards/icons");
mkdirSync(out, { recursive: true });

const MUTED = "64748b", FAINT = "94a3b8", WHITE = "ffffff", RED = "d71920";
// [lucide component, file name, colours]
const ICONS = [
  ["Calendar", "calendar", [MUTED]],
  ["Clock", "clock", [MUTED]],
  ["Phone", "phone", [MUTED, WHITE, RED]],
  ["Pill", "pill", [MUTED]],
  ["User", "user", [MUTED]],
  ["Bot", "bot", [FAINT]],
  ["MessageCircle", "message-circle", ["16a34a", WHITE, RED]],
  ["TriangleAlert", "triangle-alert", ["ca8a04"]],
  ["Search", "search", ["ea7a0c"]],
  ["Siren", "siren", ["dc2626"]],
  ["Check", "check", [WHITE, RED]],
  ["Users", "users", [WHITE, RED]],
  ["Smartphone", "smartphone", [WHITE, RED]],
];

for (const [comp, name, colors] of ICONS) {
  for (const color of colors) {
    const svg = renderToStaticMarkup(
      createElement(lucide[comp], { size: 96, color: `#${color}`, strokeWidth: 2.25 }),
    );
    await sharp(Buffer.from(svg)).png().toFile(`${out}/${name}-${color}.png`);
  }
}
console.log("icons ->", out);
