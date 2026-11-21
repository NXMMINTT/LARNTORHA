// Crops the LINE card hero images from the team's 2x2 status banner sheet.
//   node scripts/crop-line-card-banners.mjs        (run from frontend/)
// Input : backend/app/static/cards/banners.png (2172x724: ปกติ | ยังติดต่อไม่ได้ / ควรติดตาม | เร่งด่วน)
// Output: backend/app/static/cards/{green,unreachable,followup,red}.jpg (1024x320, aspectRatio 16:5)
// After changing images, bump CARD_IMAGE_VERSION in backend/app/domain/line_cards.py.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const cards = resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/app/static/cards");
const W = 1056, H = 330; // 16:5 window around each banner
const CROPS = {
  green: { left: 19, top: 23 },
  unreachable: { left: 1098, top: 23 },
  followup: { left: 19, top: 373 },
  red: { left: 1098, top: 373 },
};

for (const [kind, { left, top }] of Object.entries(CROPS)) {
  const out = `${cards}/${kind}.jpg`;
  const info = await sharp(`${cards}/banners.png`)
    .extract({ left, top, width: W, height: H })
    .resize(1024, 320)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out);
  console.log(kind, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
}
