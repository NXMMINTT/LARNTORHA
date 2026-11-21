"""Create the LINE OA rich menu (6 buttons) and make it the default for every user.

    uv run python scripts/setup_rich_menu.py          # create + upload image + set default
    uv run python scripts/setup_rich_menu.py --dry    # print the rich menu JSON only
    uv run python scripts/setup_rich_menu.py --liff-id 1234567890-abcdefgh
        # "ข้อมูลผู้สูงอายุ" opens the family dashboard (LIFF) instead of a chat reply

Needs LINE_CHANNEL_ACCESS_TOKEN in .env. Older menus with the same name are deleted afterwards.
Buttons send postback `menu=<key>`, answered by app/services/line_menu.py via the webhook.
Image: app/static/richmenu/main.jpg (1536x1024, LINE limit 1 MB).
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings

API = "https://api.line.me/v2/bot"
DATA_API = "https://api-data.line.me/v2/bot"
IMAGE = Path(__file__).resolve().parent.parent / "app/static/richmenu/main.jpg"
NAME = "larntorha-main"

# (key, label, x, y, width, height) on the 1536x1024 image; the header strip is not a button
COLS = ((0, 520), (520, 496), (1016, 520))
ROWS = ((320, 292), (612, 412))
BUTTONS = (
    ("report", "รายงานผลการโทร"),
    ("history", "ประวัติการโทร"),
    ("elder", "ข้อมูลผู้สูงอายุ"),
    ("help", "วิธีใช้งาน"),
    ("settings", "ตั้งค่าการแจ้งเตือน"),
    ("contact", "ติดต่อเจ้าหน้าที่"),
)


def rich_menu(liff_id: str | None = None) -> dict[str, Any]:
    areas = []
    for i, (key, label) in enumerate(BUTTONS):
        (x, w), (y, h) = COLS[i % 3], ROWS[i // 3]
        action: dict[str, Any] = {
            "type": "postback",
            "label": label,
            "data": f"menu={key}",
            "displayText": label,
        }
        if key == "elder" and liff_id:
            action = {"type": "uri", "label": label, "uri": f"https://liff.line.me/{liff_id}"}
        areas.append({"bounds": {"x": x, "y": y, "width": w, "height": h}, "action": action})
    return {
        "size": {"width": 1536, "height": 1024},
        "selected": True,
        "name": NAME,
        "chatBarText": "เมนู",
        "areas": areas,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--dry", action="store_true", help="print the JSON, do not call LINE")
    ap.add_argument("--liff-id", help="LIFF ID of the family dashboard (/family)")
    args = ap.parse_args()
    menu = rich_menu(args.liff_id)
    if args.dry:
        print(json.dumps(menu, ensure_ascii=False, indent=2))
        return

    token = get_settings().line_channel_access_token
    if not token:
        sys.exit("LINE_CHANNEL_ACCESS_TOKEN is not set")
    auth = {"Authorization": f"Bearer {token}"}
    with httpx.Client(timeout=30, headers=auth) as http:
        r = http.post(f"{API}/richmenu/validate", json=menu)
        r.raise_for_status()
        old = [
            m["richMenuId"]
            for m in http.get(f"{API}/richmenu/list").json()["richmenus"]
            if m["name"] == NAME
        ]
        menu_id = http.post(f"{API}/richmenu", json=menu).raise_for_status().json()["richMenuId"]
        http.post(
            f"{DATA_API}/richmenu/{menu_id}/content",
            content=IMAGE.read_bytes(),
            headers={"Content-Type": "image/jpeg"},
        ).raise_for_status()
        http.post(f"{API}/user/all/richmenu/{menu_id}").raise_for_status()
        print(f"default rich menu: {menu_id}")
        for mid in old:
            http.delete(f"{API}/richmenu/{mid}").raise_for_status()
            print(f"deleted old menu: {mid}")


if __name__ == "__main__":
    main()
