"""Sample family LINE cards for all 4 statuses: write the JSON, or push them to a LINE user.

    uv run python scripts/line_cards_demo.py                 # write docs/line-cards/*.json
    uv run python scripts/line_cards_demo.py --push Uxxxx    # also send the 4 cards to that user

`--push` needs LINE_CHANNEL_ACCESS_TOKEN in .env and a userId that has added the OA as a friend
(a linked guardian's `line_user_id`). Images come from CARD_IMAGE_BASE_URL (or `--images`).
Sample people and wording are fictional.
"""

import argparse
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.domain.line_cards import CardButton, FamilyCardData, render_family_card
from app.line_client import LineClient

OUT = Path(__file__).resolve().parent.parent.parent / "docs" / "line-cards"
DAY, TIME = "20 พ.ย. 2569", "09:00 น."


def samples() -> dict[str, FamilyCardData]:
    """One card per status. Every field is plain data: change it freely to preview other text."""
    return {
        "green": FamilyCardData(
            kind="green",
            elder_id="eld_somsri",
            call_id="demo-green",
            name="ยายสมศรี",
            date=DAY,
            time=TIME,
            rows=[
                ("calendar", "วันที่โทร", DAY),
                ("clock", "เวลา", TIME),
                ("phone", "ระยะเวลาสนทนา", "3 นาที"),
                ("pill", "ยา", "กินยาแล้ว"),
            ],
            section=["คุณยายสบายดี พูดคุยตามปกติ ทานข้าวและพักผ่อนเพียงพอ ผักบุ้งที่ปลูกไว้ขึ้นแล้ว"],
            ai_note=True,
            notes=[("ไม่พบสัญญาณผิดปกติในสายนี้ (ไม่ได้หมายความว่าปลอดภัยแน่นอน)", "small")],
            buttons=[CardButton("รับทราบ", "postback", "ack", filled=True, icon="check")],
        ),
        "unreachable": FamilyCardData(
            kind="unreachable",
            elder_id="eld_sombat",
            call_id="demo-unreachable",
            name="ตาสมบัติ",
            date=DAY,
            time=TIME,
            rows=[
                ("calendar", "วันที่โทร", DAY),
                ("clock", "เวลา", TIME),
                ("phone", "จำนวนครั้งที่โทร", "2 ครั้ง (ห่าง 30 นาที)"),
            ],
            section=["โทรแล้ว 2 ครั้ง แต่ยังไม่มีผู้รับสาย"],
            ai_note=False,
            notes=[
                (
                    "ระบบไม่ได้ตีความว่าเกิดเหตุ กรุณาลองโทรหาด้วยตัวเอง หรือขอให้ อสม. ช่วยดู",
                    "small",
                )
            ],
            buttons=[
                CardButton("โทรหาตาสมบัติ", "tel", "0891234567", filled=True, icon="phone"),
                CardButton("แจ้ง อสม.", "postback", "notify_osm", icon="users"),
            ],
        ),
        "followup": FamilyCardData(
            kind="followup",
            elder_id="eld_somsri",
            call_id="demo-followup",
            name="ยายสมศรี",
            date=DAY,
            time=TIME,
            rows=[
                ("calendar", "วันที่โทร", DAY),
                ("clock", "เวลา", TIME),
                ("pill", "ยา", "ยังไม่ได้กินยา"),
            ],
            section=["คุณยายสบายดี ไปตลาดมา แต่ยังไม่ได้ทานยาตอนเช้า ลูกหลานช่วยเตือนด้วยนะคะ"],
            ai_note=True,
            notes=[("มีบางเรื่องที่ควรได้รับการติดตาม อสม. ในพื้นที่ได้รับแจ้งแล้ว", "normal")],
            buttons=[
                CardButton("โทรหายายสมศรี", "tel", "0891234567", icon="phone"),
                CardButton("รับทราบ", "postback", "ack", filled=True, icon="check"),
            ],
        ),
        "red": FamilyCardData(
            kind="red",
            elder_id="eld_malee",
            call_id="demo-red",
            name="ยายมาลี",
            date=DAY,
            time=TIME,
            rows=[("calendar", "วันที่โทร", DAY), ("clock", "เวลา", TIME)],
            section=["คุณยายแจ้งว่ามีอาการเวียนศีรษะมากและอ่อนเพลีย ลุกเดินไม่ค่อยไหว"],
            ai_note=True,
            notes=[
                ("ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว", "strong"),
                ("ระบบไม่สามารถเรียกรถพยาบาลหรือยืนยันอาการได้ กรุณาติดต่อทันที", "alert"),
            ],
            buttons=[
                CardButton("โทร 1669", "tel", "1669", filled=True, icon="phone"),
                CardButton("แจ้ง อสม.", "postback", "notify_osm", icon="users"),
                CardButton("โทรหายายมาลี", "tel", "0891234567", icon="smartphone"),
            ],
        ),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--push", metavar="LINE_USER_ID", help="send the 4 cards to this LINE user")
    ap.add_argument("--images", help="override CARD_IMAGE_BASE_URL")
    args = ap.parse_args()
    s = get_settings()
    base = args.images or s.card_image_base_url or None

    OUT.mkdir(parents=True, exist_ok=True)
    cards = {k: render_family_card(d, base) for k, d in samples().items()}
    for kind, msg in cards.items():
        # *.json = message object for the Messaging API; *.bubble.json = paste into Flex Simulator
        (OUT / f"{kind}.json").write_text(json.dumps(msg, ensure_ascii=False, indent=2), "utf-8")
        (OUT / f"{kind}.bubble.json").write_text(
            json.dumps(msg["contents"], ensure_ascii=False, indent=2), "utf-8"
        )
        size = len(json.dumps(msg["contents"], ensure_ascii=False).encode())
        print(f"{kind:12} {size / 1024:5.1f} KB  -> docs/line-cards/{kind}.json")

    if args.push:
        if not s.line_channel_access_token:
            sys.exit("LINE_CHANNEL_ACCESS_TOKEN is not set")
        line = LineClient(s.line_channel_access_token, dry_run=False)
        for kind, msg in cards.items():
            r = line.push(args.push, [msg], key_seed=f"demo-{kind}-{uuid.uuid4()}")
            print(f"push {kind:12} {'ok' if r.ok else 'FAILED ' + str(r.error)}")


if __name__ == "__main__":
    main()
