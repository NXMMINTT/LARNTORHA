"""LINE webhook events (CLAUDE.md §6.2)."""

import base64
import hashlib
import hmac
import logging
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qs

from app.deps import Deps
from app.domain.line_cards import osm_request_alert
from app.domain.models import NotificationLog
from app.line_client import text

log = logging.getLogger("larntorha.webhook")

CODE_RE = re.compile(r"LTH-\d{6}", re.IGNORECASE)
DISCLAIMER = "หลานโทรหาไม่ใช่สายด่วนและไม่ใช่ระบบเฝ้าระวัง 24 ชั่วโมง หากฉุกเฉินโทร 1669"
WELCOME = (
    "ยินดีต้อนรับสู่หลานโทรหา 🙏\n"
    "กรุณาพิมพ์รหัสเชื่อม LINE ที่ได้รับตอนสมัคร (เช่น LTH-123456) เพื่อรับสรุปการโทรทุกวัน\n\n" + DISCLAIMER
)
ONLY_SUMMARIES = "ช่องทางนี้ใช้รับสรุปการโทรเท่านั้น หากฉุกเฉินโทร 1669"


def signature_ok(secret: str, body: bytes, signature: str | None) -> bool:
    if not secret or not signature:
        return False
    expected = base64.b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).decode()
    return hmac.compare_digest(expected, signature)


def handle_events(deps: Deps, events: list[dict[str, Any]]) -> None:
    for ev in events:
        try:
            _handle(deps, ev)
        except Exception:
            log.exception("webhook event failed type=%s", ev.get("type"))


def _reply(deps: Deps, ev: dict[str, Any], message: str) -> None:
    token = ev.get("replyToken")
    if token:
        deps.line.reply(token, [text(message)])


def _handle(deps: Deps, ev: dict[str, Any]) -> None:
    kind = ev.get("type")
    user_id = (ev.get("source") or {}).get("userId")
    if kind == "follow":
        _reply(deps, ev, WELCOME)
    elif kind == "message" and (ev.get("message") or {}).get("type") == "text" and user_id:
        _link(deps, ev, user_id, ev["message"].get("text", ""))
    elif kind == "postback" and user_id:
        _postback(deps, ev, user_id, (ev.get("postback") or {}).get("data", ""))


def _link(deps: Deps, ev: dict[str, Any], user_id: str, message: str) -> None:
    m = CODE_RE.search(message)
    if not m:
        _reply(deps, ev, ONLY_SUMMARIES)
        return
    code = m.group(0).upper()
    repo = deps.repo
    now = datetime.now(UTC)

    g = repo.get_guardian_by_link_code(code)
    if g is not None:
        if g.line_link_code_expires_at is None or g.line_link_code_expires_at < now:
            _reply(deps, ev, "รหัสนี้หมดอายุแล้ว กรุณาติดต่อ อสม. ในพื้นที่เพื่อขอรหัสใหม่")
            return
        g.line_user_id = user_id
        g.line_link_code = None  # single use
        g.line_link_code_expires_at = None
        repo.put_guardian(g)
        elder = repo.get_elder(g.elder_id)
        name = elder.name if elder else "ผู้สูงอายุ"
        _reply(
            deps,
            ev,
            f"เชื่อม LINE สำเร็จ ✅ ต่อไปนี้คุณจะได้รับสรุปการโทรของ{name}ทาง LINE นี้\n\n{DISCLAIMER}",
        )
        return

    osm = repo.get_osm_by_link_code(code)
    if osm is not None:
        osm.line_user_id = user_id
        osm.line_link_code = None
        repo.put_osm(osm)
        _reply(deps, ev, f"เชื่อม LINE สำหรับ อสม. สำเร็จ ✅ ({osm.name}) จะได้รับแจ้งเตือนผู้สูงอายุที่ต้องติดตาม")
        return

    _reply(deps, ev, "รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจสอบอีกครั้ง")


def _postback(deps: Deps, ev: dict[str, Any], user_id: str, data: str) -> None:
    q = {k: v[0] for k, v in parse_qs(data).items()}
    action, elder_id, call_id = q.get("action"), q.get("elder", ""), q.get("call", "")
    repo = deps.repo
    if not any(g.line_user_id == user_id for g in repo.list_guardians(elder_id)):
        _reply(deps, ev, "ขออภัย คุณไม่มีสิทธิ์ดำเนินการกับรายการนี้")
        return
    call = repo.get_call(elder_id, call_id)
    elder = repo.get_elder(elder_id)
    if call is None or elder is None:
        _reply(deps, ev, "ไม่พบรายการนี้")
        return
    now = datetime.now(UTC)

    if action == "ack":
        if call.acknowledged_at is None:
            call.acknowledged_at = now
            repo.put_call(call)
        _reply(deps, ev, "รับทราบแล้ว ขอบคุณค่ะ 🙏")
        return

    if action == "notify_osm":
        if call.family_requested_osm_at is None:
            call.family_requested_osm_at = now
        osm = repo.get_osm(elder.osm_id)
        should_push = (
            call.osm_request_notified_at is None
            and osm is not None
            and osm.line_user_id is not None
            and elder.consents.osm_share
        )
        if should_push and osm is not None and osm.line_user_id:
            call.osm_request_notified_at = now  # mark first so a double tap never pushes twice
            repo.put_call(call)
            res = deps.line.push(
                osm.line_user_id,
                [osm_request_alert(elder, deps.settings.app_base_url)],
                key_seed=f"{call.id}:osm_request",
            )
            repo.add_notification(
                NotificationLog(
                    id=f"ntf_{call.id}_req",
                    elder_id=elder.id,
                    call_id=call.id,
                    to="osm",
                    kind="osm_request",
                    ok=res.ok,
                    error=res.error,
                    at=now,
                )
            )
        else:
            repo.put_call(call)
        _reply(deps, ev, "แจ้ง อสม. ในพื้นที่ให้ช่วยดูแล้ว หากฉุกเฉินโทร 1669")
        return

    _reply(deps, ev, ONLY_SUMMARIES)
