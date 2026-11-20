"""LINE Flex Message cards (CLAUDE.md §8).

Family cards must never contain 2Q, 9Q, ซึมเศร้า or คะแนน (tested)."""

from datetime import UTC, datetime, timedelta, timezone
from typing import Any

from app.domain.models import CallAnalysis, CallResult, CardKind, Elder

BKK = timezone(timedelta(hours=7))  # Asia/Bangkok has no DST
THAI_MONTHS = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
]
FAMILY_BANNED = ("2Q", "9Q", "ซึมเศร้า", "คะแนน")
COLORS = {"green": "#16a34a", "yellow": "#ca8a04", "red": "#dc2626", "osm": "#1e3a8a"}

Json = dict[str, Any]


def thai_datetime(dt: datetime) -> str:
    local = dt.astimezone(BKK)
    return (
        f"{local.day} {THAI_MONTHS[local.month - 1]} {local.year + 543} "
        f"{local.hour:02d}:{local.minute:02d} น."
    )


def _text(text: str, **kw: Any) -> Json:
    return {"type": "text", "text": text, "wrap": True, **kw}


def _row(label: str, value: str) -> Json:
    return {
        "type": "box",
        "layout": "baseline",
        "spacing": "sm",
        "contents": [
            _text(label, size="sm", color="#64748b", flex=2),
            _text(value, size="sm", color="#1e293b", flex=5),
        ],
    }


def _tel(label: str, number: str) -> Json:
    return {
        "type": "button",
        "style": "secondary",
        "height": "sm",
        "action": {"type": "uri", "label": label, "uri": f"tel:{number}"},
    }


def _postback(label: str, action: str, elder_id: str, call_id: str, primary: bool) -> Json:
    return {
        "type": "button",
        "style": "primary" if primary else "secondary",
        "height": "sm",
        "color": "#1e3a8a" if primary else None,
        "action": {
            "type": "postback",
            "label": label,
            "data": f"action={action}&elder={elder_id}&call={call_id}",
            "displayText": label,
        },
    }


def _bubble(color: str, title: str, body: list[Json], buttons: list[Json]) -> Json:
    clean_buttons = [{k: v for k, v in b.items() if v is not None} for b in buttons]
    return {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": color,
            "paddingAll": "16px",
            "contents": [_text(title, color="#ffffff", weight="bold", size="lg")],
        },
        "body": {"type": "box", "layout": "vertical", "spacing": "md", "contents": body},
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": clean_buttons,
        },
    }


def _flex(alt: str, bubble: Json) -> Json:
    return {"type": "flex", "altText": alt[:400], "contents": bubble}


def _med_text(call: CallResult) -> str:
    if call.med_taken is True:
        return "✅ กินยาแล้ว"
    if call.med_taken is False:
        return "❌ ยังไม่ได้กินยา"
    return "— ไม่ได้ยืนยัน"


def _story(a: CallAnalysis | None) -> list[Json]:
    if a is None:
        return []
    return [
        _text("วันนี้เล่าว่า", size="sm", color="#64748b"),
        _text(a.summary_family, size="md"),
        _text("🤖 สรุปโดย AI", size="xs", color="#94a3b8"),
    ]


def family_card(kind: CardKind, elder: Elder, call: CallResult) -> Json:
    """Card for guardians. kind is green | unreachable | followup | red."""
    a = call.analysis
    when = thai_datetime(call.started_at)
    name = elder.name
    eid, cid = elder.id, call.id

    if kind == "green":
        minutes = max(1, round(call.duration_sec / 60))
        body = [
            _row("เวลา", when),
            _row("คุยนาน", f"{minutes} นาที"),
            *_story(a),
            _row("ยา", _med_text(call)),
            _text(
                "ไม่พบสัญญาณผิดปกติในสายนี้ (ไม่ได้หมายความว่าปลอดภัยแน่นอน)",
                size="xs",
                color="#64748b",
            ),
        ]
        return _flex(
            f"🟢 {name} — ปกติ",
            _bubble(
                COLORS["green"],
                f"🟢 {name} — ปกติ",
                body,
                [_postback("รับทราบ", "ack", eid, cid, True)],
            ),
        )

    if kind == "unreachable":
        body = [
            _row("วันที่", when),
            _text("โทรแล้ว 2 ครั้ง (ห่าง 30 นาที) แต่ยังไม่มีผู้รับสาย"),
            _text(
                "ระบบไม่ได้ตีความว่าเกิดเหตุ กรุณาลองโทรหาด้วยตัวเอง หรือขอให้ อสม. ช่วยดู",
                size="sm",
                color="#64748b",
            ),
        ]
        return _flex(
            f"🟡 {name} — ยังติดต่อไม่ได้",
            _bubble(
                COLORS["yellow"],
                f"🟡 {name} — ยังติดต่อไม่ได้",
                body,
                [
                    _tel(f"โทรหา{name}", elder.phone),
                    _postback("แจ้ง อสม. ให้ช่วยดู", "notify_osm", eid, cid, True),
                ],
            ),
        )

    if kind == "followup":
        unclear = call.outcome == "unclear" or (a is not None and a.transcript_quality == "poor")
        story = [_text("วันนี้ฟังไม่ชัดจนสรุปไม่ได้", size="md")] if unclear or a is None else _story(a)
        body = [
            _row("วันที่", when),
            _row("ยา", _med_text(call)),
            *story,
            _text(
                "มีบางเรื่องที่ควรได้รับการติดตาม อสม. ในพื้นที่ได้รับแจ้งแล้ว",
                size="sm",
                color="#64748b",
            ),
        ]
        return _flex(
            f"🟡 {name} — ควรติดตาม",
            _bubble(
                COLORS["yellow"],
                f"🟡 {name} — ควรติดตาม",
                body,
                [_tel(f"โทรหา{name}", elder.phone), _postback("รับทราบ", "ack", eid, cid, True)],
            ),
        )

    if kind == "red":
        self_harm = a is not None and a.self_harm
        if self_harm:
            what = [_text(f"มีเรื่องที่ต้องการความช่วยเหลือเร่งด่วน กรุณาติดต่อคุณ{name}ทันที")]
        else:
            what = [
                _text("สิ่งที่เกิดขึ้น", size="sm", color="#64748b"),
                _text(a.summary_family if a else "พบสัญญาณอันตรายระหว่างสาย"),
                _text("🤖 สรุปโดย AI", size="xs", color="#94a3b8"),
            ]
        body = [
            _row("เวลา", when),
            *what,
            _text("ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว", weight="bold"),
            _text(
                "ระบบไม่สามารถเรียกรถพยาบาลหรือยืนยันอาการได้ กรุณาติดต่อทันที",
                size="sm",
                color="#dc2626",
            ),
        ]
        buttons = [_tel(f"โทรหา{name}", elder.phone), _tel("โทร 1669", "1669")]
        if self_harm:
            buttons.append(_tel("สายด่วนสุขภาพจิต 1323", "1323"))
        buttons.append(_postback("แจ้ง อสม. ให้ช่วยดู", "notify_osm", eid, cid, True))
        return _flex(
            f"🔴 เร่งด่วน — {name}",
            _bubble(COLORS["red"], f"🔴 เร่งด่วน — {name}", body, buttons),
        )

    raise ValueError(f"not a family card kind: {kind}")


def osm_alert(elder: Elder, status: str, reasons: list[str], app_base_url: str) -> Json:
    """Alert for the อสม. (may mention 2Q). status is red | yellow | unreachable."""
    icon = {"red": "🔴 เร่งด่วน", "yellow": "🟡 ต้องติดตาม", "unreachable": "📵 ติดต่อไม่ได้"}
    title = f"{icon.get(status, status)} — {elder.name}"
    color = COLORS["red"] if status == "red" else COLORS["yellow"]
    body = [_text(f"{elder.name} อายุ {elder.age} ปี", weight="bold")]
    body += [_text(f"• {r}", size="sm") for r in reasons[:3]]
    return _flex(title, _bubble(color, title, body, [_dashboard_button(app_base_url)]))


def osm_request_alert(elder: Elder, app_base_url: str) -> Json:
    title = f"🙋 ลูกหลานขอให้ช่วยดู — {elder.name}"
    body = [
        _text(f'ครอบครัวของ{elder.name}กด "แจ้ง อสม." จากการ์ดสรุปการโทร'),
        _text(f"ส่งเมื่อ {thai_datetime(datetime.now(UTC))}", size="sm", color="#64748b"),
    ]
    return _flex(title, _bubble(COLORS["osm"], title, body, [_dashboard_button(app_base_url)]))


def _dashboard_button(app_base_url: str) -> Json:
    return {
        "type": "button",
        "style": "primary",
        "height": "sm",
        "color": "#1e3a8a",
        "action": {
            "type": "uri",
            "label": "เปิด Dashboard",
            "uri": f"{app_base_url.rstrip('/')}/dashboard",
        },
    }
