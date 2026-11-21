"""LINE Messaging API push/reply with retry (CLAUDE.md §8)."""

import hashlib
import logging
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx

log = logging.getLogger("larntorha.line")

VERIFY_ID_TOKEN_URL = "https://api.line.me/oauth2/v2.1/verify"  # noqa: S105 (a URL, not a secret)
PUSH_URL = "https://api.line.me/v2/bot/message/push"
REPLY_URL = "https://api.line.me/v2/bot/message/reply"
BACKOFF = (0.5, 1.0, 2.0)


@dataclass
class SendResult:
    ok: bool
    error: str | None = None


def retry_key(call_id: str, recipient: str) -> str:
    """Same call + recipient → same key, so LINE de-duplicates retried pushes."""
    digest = hashlib.sha256(f"{call_id}{recipient}".encode()).digest()
    return str(uuid.UUID(bytes=digest[:16], version=4))


class LineClient:
    def __init__(
        self,
        access_token: str,
        dry_run: bool,
        http: httpx.Client | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.token = access_token
        self.dry_run = dry_run
        self.http = http or httpx.Client(timeout=10)
        self.sleep = sleep
        self.sent: list[dict[str, Any]] = []  # dry-run record, used by demo + tests

    def push(self, to: str, messages: list[dict[str, Any]], key_seed: str) -> SendResult:
        body = {"to": to, "messages": messages}
        if self.dry_run:
            log.info("[LINE dry-run] push to=%s… kinds=%d", to[:6], len(messages))
            self.sent.append({"push": body})
            return SendResult(True)
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Line-Retry-Key": retry_key(key_seed, to),
        }
        return self._post(PUSH_URL, body, headers)

    def reply(self, reply_token: str, messages: list[dict[str, Any]]) -> SendResult:
        body = {"replyToken": reply_token, "messages": messages}
        if self.dry_run:
            log.info("[LINE dry-run] reply")
            self.sent.append({"reply": body})
            return SendResult(True)
        return self._post(REPLY_URL, body, {"Authorization": f"Bearer {self.token}"}, retries=0)

    def verify_id_token(self, id_token: str, channel_id: str) -> str | None:
        """LIFF ID token -> LINE userId (sub), or None if LINE rejects it."""
        if not channel_id:
            return None
        try:
            r = self.http.post(
                VERIFY_ID_TOKEN_URL, data={"id_token": id_token, "client_id": channel_id}
            )
        except httpx.HTTPError:
            return None
        if r.status_code != 200:
            return None
        sub = r.json().get("sub")
        return sub if isinstance(sub, str) else None

    def _post(
        self, url: str, body: dict[str, Any], headers: dict[str, str], retries: int = 3
    ) -> SendResult:
        error = "unknown"
        for attempt in range(retries + 1):
            try:
                r = self.http.post(url, json=body, headers=headers)
            except httpx.HTTPError as e:
                error = type(e).__name__
            else:
                if r.status_code < 300 or r.status_code == 409:  # 409 = already accepted
                    return SendResult(True)
                error = f"http_{r.status_code}"
                if r.status_code != 429 and r.status_code < 500:
                    break
            if attempt < retries:
                self.sleep(BACKOFF[min(attempt, len(BACKOFF) - 1)])
        log.warning("LINE send failed: %s", error)
        return SendResult(False, error)


def text(message: str) -> dict[str, Any]:
    return {"type": "text", "text": message}
