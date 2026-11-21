"""Create an อสม. account (login for /dashboard).

    uv run python scripts/create_osm.py --name "สมใจ ใจดี" --phone 0891234567 --tambon "ต.บ้านดง"

The password is asked twice on the terminal (never passed as an argument, so it stays out of
shell history). Accounts go to OSM_ACCOUNTS_FILE (default data/osm_accounts.json) and are
loaded when the backend starts: restart the backend after adding one.
"""

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.repo.osm_accounts import AccountError, create_account


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--name", required=True, help="ชื่อ อสม.")
    ap.add_argument("--phone", required=True, help="เบอร์โทร 10 หลัก (ใช้เป็นชื่อผู้ใช้)")
    ap.add_argument("--tambon", required=True, help="ตำบล เช่น ต.บ้านดง")
    args = ap.parse_args()

    phone = args.phone.replace("-", "").replace(" ", "")
    if phone.startswith("+66"):
        phone = "0" + phone[3:]
    password = getpass.getpass("รหัสผ่าน (อย่างน้อย 8 ตัวอักษร): ")
    if password != getpass.getpass("ยืนยันรหัสผ่าน: "):
        sys.exit("รหัสผ่านไม่ตรงกัน")

    path = Path(get_settings().osm_accounts_file)
    try:
        osm = create_account(path, args.name, phone, args.tambon, password)
    except AccountError as e:
        sys.exit(str(e))
    print(f"สร้างบัญชี อสม. แล้ว: {osm.name} ({osm.tambon})")
    print(f"ชื่อผู้ใช้ (เบอร์): {osm.phone}")
    print(f"รหัส อสม. สำหรับให้ครอบครัวสมัคร: {osm.referral_code}")
    print(f"บันทึกไว้ที่ {path} — restart backend เพื่อให้เข้าสู่ระบบได้")


if __name__ == "__main__":
    main()
