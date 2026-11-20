"""Password hashing (scrypt), OSM session tokens (HMAC-SHA256) and a small rate limiter
(CLAUDE.md §3, §10)."""

import base64
import hashlib
import hmac
import json
import os
import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

N, R, P = 16384, 8, 1
SESSION_TTL = timedelta(hours=12)


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    h = hashlib.scrypt(password.encode(), salt=salt, n=N, r=R, p=P, dklen=32)
    return f"scrypt${N}${R}${P}${_b64(salt)}${_b64(h)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt_b64, hash_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        expected = base64.b64decode(hash_b64)
        h = hashlib.scrypt(
            password.encode(),
            salt=base64.b64decode(salt_b64),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(h, expected)


# Verified when the phone is unknown so response time does not reveal which phones exist.
DUMMY_HASH = hash_password("dummy-password-for-timing")


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64url(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def issue_session(osm_id: str, secret: str, now: datetime | None = None) -> tuple[str, datetime]:
    exp = (now or datetime.now(UTC)) + SESSION_TTL
    body = _b64url(json.dumps({"osm_id": osm_id, "exp": int(exp.timestamp())}).encode())
    sig = _b64url(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}", exp


def verify_session(token: str, secret: str, now: datetime | None = None) -> str | None:
    """Return osm_id if the token is genuine and not expired."""
    try:
        body, sig = token.split(".")
        good = _b64url(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        data = json.loads(_unb64url(body))
        if int(data["exp"]) < (now or datetime.now(UTC)).timestamp():
            return None
        osm_id = data["osm_id"]
        return osm_id if isinstance(osm_id, str) else None
    except (ValueError, KeyError, TypeError):
        return None


def tokens_equal(given: str | None, expected: str) -> bool:
    if not given or not expected:
        return False
    return hmac.compare_digest(given.encode(), expected.encode())


class RateLimiter:
    """In-memory sliding window. Production must add AWS WAF (README)."""

    def __init__(self, limit: int, window_sec: float) -> None:
        self.limit = limit
        self.window = window_sec
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
