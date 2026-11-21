"""อสม. accounts kept in a local JSON file while the repo is in-memory (DynamoDB not built yet).

scripts/create_osm.py appends to the file; build_deps loads it at startup so accounts survive a
restart. The file holds scrypt hashes only (never plain passwords) and is git-ignored.
"""

import json
import secrets
from datetime import UTC, datetime
from pathlib import Path

from app.auth import hash_password
from app.domain.models import Osm
from app.repo.base import Repo

REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I (CLAUDE.md §4)


def read_accounts(path: Path) -> list[Osm]:
    if not path.exists():
        return []
    return [Osm.model_validate(o) for o in json.loads(path.read_text(encoding="utf-8"))]


def load_into(repo: Repo, path: Path) -> int:
    accounts = read_accounts(path)
    for osm in accounts:
        repo.put_osm(osm)
    return len(accounts)


class AccountError(ValueError):
    pass


def create_account(path: Path, name: str, phone: str, tambon: str, password: str) -> Osm:
    """Validate, append to the file and return the new account."""
    if not (len(phone) == 10 and phone.isdigit() and phone.startswith("0")):
        raise AccountError("เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0")
    if len(password) < 8:
        raise AccountError("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร")
    if not name.strip() or not tambon.strip():
        raise AccountError("ต้องระบุชื่อและตำบล")
    accounts = read_accounts(path)
    taken_phones = {o.phone for o in accounts} | {"0812345678"}  # demo อสม. in the seed
    if phone in taken_phones:
        raise AccountError("เบอร์นี้มีบัญชี อสม. แล้ว")
    taken_codes = {o.referral_code for o in accounts} | {"OSM-DEMO"}
    code = _referral_code(taken_codes)
    osm = Osm(
        id=f"osm_{secrets.token_hex(10)}",
        name=name.strip(),
        phone=phone,
        tambon=tambon.strip(),
        password_hash=hash_password(password),
        referral_code=code,
        created_at=datetime.now(UTC),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    data = [o.model_dump(mode="json") for o in [*accounts, osm]]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return osm


def _referral_code(taken: set[str]) -> str:
    while True:
        code = "OSM-" + "".join(secrets.choice(REFERRAL_ALPHABET) for _ in range(4))
        if code not in taken:
            return code
