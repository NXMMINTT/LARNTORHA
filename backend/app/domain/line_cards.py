"""LINE Flex Message cards (CLAUDE.md §8).

Family cards follow the team's card design (2026-11-21) and are built in three layers:
  1. `family_card_data()`  — what the card says (dynamic per call)      -> FamilyCardData
  2. `CARD_THEMES`          — colours, labels and icons per status
  3. `render_family_card()` — FamilyCardData + theme -> Flex JSON (one bubble)
Sending lives elsewhere (`app/line_client.py`, called from `app/services/calls.py`).

Family cards must never contain 2Q, 9Q, ซึมเศร้า or คะแนน (tested)."""

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta, timezone
from typing import Any, Literal

from app.domain.models import CallResult, CardKind, Elder

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
BRAND_RED = "#D71920"
INK, MUTED = "#1e293b", "#64748b"

# Images live in app/static/cards: {kind}.jpg 1024x320 cropped from banners.png by
# frontend/scripts/crop-line-card-banners.mjs, and icons/{name}-{color}.png (lucide) built by
# frontend/scripts/build-line-card-icons.mjs. Bump CARD_IMAGE_VERSION whenever an image changes:
# LINE caches images by URL.
CARD_IMAGE_VERSION = "4"
MUTED_HEX, FAINT_HEX = "#64748b", "#94a3b8"

Json = dict[str, Any]


@dataclass(frozen=True)
class CardTheme:
    label: str  # status word, also used in altText
    emoji: str  # for altText / the plain header fallback
    color: str  # status colour (avatar ring, section title)
    tint: str  # section background
    section_title: str
    section_icon: str  # lucide icon name (icons/{name}-{color}.png)


CARD_THEMES: dict[CardKind, CardTheme] = {
    "green": CardTheme("ปกติ", "🟢", "#16a34a", "#EAF8EE", "สรุปการสนทนา", "message-circle"),
    "unreachable": CardTheme("ยังติดต่อไม่ได้", "🟡", "#ca8a04", "#FFF7DA", "หมายเหตุ", "triangle-alert"),
    "followup": CardTheme("ควรติดตาม", "🟠", "#EA7A0C", "#FFF1E3", "สิ่งที่ควรติดตาม", "search"),
    "red": CardTheme("เร่งด่วน", "🔴", "#dc2626", "#FDECEC", "ข้อสังเกต", "siren"),
}


@dataclass(frozen=True)
class CardButton:
    label: str
    kind: Literal["tel", "postback"]
    value: str  # phone number, or postback action name
    filled: bool = False
    icon: str | None = None  # lucide icon name


@dataclass
class FamilyCardData:
    """Everything a family card shows. Built from a call, or by hand for previews/tests."""

    kind: CardKind
    elder_id: str
    call_id: str
    name: str
    date: str  # "20 พ.ย. 2569"
    time: str  # "09:00 น."
    rows: list[tuple[str, str, str]]  # (lucide icon name, label, value)
    section: list[str]  # paragraphs in the coloured box
    ai_note: bool  # show "สรุปโดย AI" under the section
    notes: list[tuple[str, Literal["normal", "strong", "alert", "small"]]] = field(
        default_factory=list
    )  # mandatory safety texts (CLAUDE.md §8)
    buttons: list[CardButton] = field(default_factory=list)
    role: str = "ผู้รับบริการ"


# ------------------------------------------------------------------ dates


def thai_date(dt: datetime) -> str:
    local = dt.astimezone(BKK)
    return f"{local.day} {THAI_MONTHS[local.month - 1]} {local.year + 543}"


def thai_time(dt: datetime) -> str:
    local = dt.astimezone(BKK)
    return f"{local.hour:02d}:{local.minute:02d} น."


def thai_datetime(dt: datetime) -> str:
    return f"{thai_date(dt)} {thai_time(dt)}"


# ------------------------------------------------------------------ 1. data


def _med_text(call: CallResult) -> str:
    if call.med_taken is True:
        return "กินยาแล้ว"
    if call.med_taken is False:
        return "ยังไม่ได้กินยา"
    return "ไม่ได้ยืนยัน"


def family_card_data(kind: CardKind, elder: Elder, call: CallResult) -> FamilyCardData:
    a = call.analysis
    name = elder.name
    common: dict[str, Any] = {
        "kind": kind,
        "elder_id": elder.id,
        "call_id": call.id,
        "name": name,
        "date": thai_date(call.started_at),
        "time": thai_time(call.started_at),
    }
    date_rows = [("calendar", "วันที่โทร", common["date"]), ("clock", "เวลา", common["time"])]
    tel_elder = CardButton(f"โทรหา{name}", "tel", elder.phone)

    if kind == "green":
        minutes = max(1, round(call.duration_sec / 60))
        return FamilyCardData(
            **common,
            rows=[
                *date_rows,
                ("phone", "ระยะเวลาสนทนา", f"{minutes} นาที"),
                ("pill", "ยา", _med_text(call)),
            ],
            section=[a.summary_family] if a else ["วันนี้คุยกันเรียบร้อยดี"],
            ai_note=a is not None,
            notes=[("ไม่พบสัญญาณผิดปกติในสายนี้ (ไม่ได้หมายความว่าปลอดภัยแน่นอน)", "small")],
            buttons=[CardButton("รับทราบ", "postback", "ack", filled=True, icon="check")],
        )

    if kind == "unreachable":
        return FamilyCardData(
            **common,
            rows=[*date_rows, ("phone", "จำนวนครั้งที่โทร", "2 ครั้ง (ห่าง 30 นาที)")],
            section=["โทรแล้ว 2 ครั้ง แต่ยังไม่มีผู้รับสาย"],
            ai_note=False,
            notes=[
                (
                    "ระบบไม่ได้ตีความว่าเกิดเหตุ กรุณาลองโทรหาด้วยตัวเอง หรือขอให้ อสม. ช่วยดู",
                    "small",
                )
            ],
            buttons=[
                CardButton(tel_elder.label, "tel", elder.phone, filled=True, icon="phone"),
                CardButton("แจ้ง อสม.", "postback", "notify_osm", icon="users"),
            ],
        )

    if kind == "followup":
        unclear = call.outcome == "unclear" or (a is not None and a.transcript_quality == "poor")
        return FamilyCardData(
            **common,
            rows=[*date_rows, ("pill", "ยา", _med_text(call))],
            section=["วันนี้ฟังไม่ชัดจนสรุปไม่ได้"] if unclear or a is None else [a.summary_family],
            ai_note=not unclear and a is not None,
            notes=[("มีบางเรื่องที่ควรได้รับการติดตาม อสม. ในพื้นที่ได้รับแจ้งแล้ว", "normal")],
            buttons=[
                CardButton(tel_elder.label, "tel", elder.phone, icon="phone"),
                CardButton("รับทราบ", "postback", "ack", filled=True, icon="check"),
            ],
        )

    if kind == "red":
        self_harm = a is not None and a.self_harm
        # Self-harm: generic wording only, never words from the transcript (CLAUDE.md §8).
        if self_harm:
            section = [f"มีเรื่องที่ต้องการความช่วยเหลือเร่งด่วน กรุณาติดต่อคุณ{name}ทันที"]
        else:
            section = [a.summary_family if a else "พบสัญญาณอันตรายระหว่างสาย"]
        buttons = [
            CardButton("โทร 1669", "tel", "1669", filled=True, icon="phone"),
            CardButton("แจ้ง อสม.", "postback", "notify_osm", icon="users"),
            CardButton(tel_elder.label, "tel", elder.phone, icon="smartphone"),
        ]
        if self_harm:
            buttons.insert(
                1,
                CardButton("สายด่วนสุขภาพจิต 1323", "tel", "1323", filled=True, icon="message-circle"),
            )
        return FamilyCardData(
            **common,
            rows=date_rows,
            section=section,
            ai_note=not self_harm and a is not None,
            notes=[
                ("ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว", "strong"),
                ("ระบบไม่สามารถเรียกรถพยาบาลหรือยืนยันอาการได้ กรุณาติดต่อทันที", "alert"),
            ],
            buttons=buttons,
        )

    raise ValueError(f"not a family card kind: {kind}")


# ------------------------------------------------------------------ 3. render


def _text(text: str, **kw: Any) -> Json:
    return {"type": "text", "text": text, "wrap": True, **kw}


def _icon_url(base: str, name: str, color: str) -> str:
    return f"{base}/icons/{name}-{color.lstrip('#').lower()}.png?v={CARD_IMAGE_VERSION}"


def _icon_text(
    base: str | None, icon: str, icon_color: str, label: str, flex: int | None = None, **kw: Any
) -> Json:
    """Icon + text on one baseline. Without a public image base: text only."""
    contents: list[Json] = []
    if base:
        contents.append({"type": "icon", "url": _icon_url(base, icon, icon_color), "size": "sm"})
    contents.append(_text(label, **kw))
    box: Json = {"type": "box", "layout": "baseline", "spacing": "sm", "contents": contents}
    if flex is not None:
        box["flex"] = flex
    return box


def _info_row(base: str | None, icon: str, label: str, value: str) -> Json:
    return {
        "type": "box",
        "layout": "horizontal",
        "spacing": "sm",
        "contents": [
            _icon_text(base, icon, MUTED_HEX, label, flex=5, size="sm", color=MUTED),
            _text(value, size="sm", color=INK, flex=6, weight="bold"),
        ],
    }


def _pill_button(b: CardButton, elder_id: str, call_id: str, base: str | None = None) -> Json:
    """Rounded pill (box + action) so filled and outlined buttons match the design."""
    if b.kind == "tel":
        action: Json = {"type": "uri", "label": b.label[:40], "uri": f"tel:{b.value}"}
    else:
        action = {
            "type": "postback",
            "label": b.label[:40],
            "data": f"action={b.value}&elder={elder_id}&call={call_id}",
            "displayText": b.label,
        }
    return {
        "type": "box",
        "layout": "vertical",
        "flex": 1,
        "cornerRadius": "xxl",
        "paddingAll": "11px",
        "backgroundColor": BRAND_RED if b.filled else "#FFFFFF",
        "borderColor": BRAND_RED,
        "borderWidth": "medium",
        "action": action,
        "contents": [_pill_label(b, base)],
    }


def _pill_label(b: CardButton, base: str | None) -> Json:
    color = "#FFFFFF" if b.filled else BRAND_RED
    label = _text(b.label, size="sm", weight="bold", align="center", color=color)
    if not (base and b.icon):
        return label
    label["flex"] = 0
    return {
        "type": "box",
        "layout": "horizontal",
        "spacing": "sm",
        "justifyContent": "center",
        "alignItems": "center",
        "contents": [
            {
                "type": "image",
                "url": _icon_url(base, b.icon, color),
                "size": "18px",
                "flex": 0,
                "aspectMode": "fit",
            },
            label,
        ],
    }


def _initial(name: str) -> str:
    """First letter of the given name, without a kinship prefix (ยายสมศรี -> ส)."""
    for prefix in ("คุณยาย", "คุณตา", "ยาย", "ตา", "คุณ"):
        if name.startswith(prefix) and len(name) > len(prefix):
            return name[len(prefix)]
    return name[:1] or "?"


def _button_rows(buttons: list[Json], labels: list[str]) -> list[list[Json]]:
    """Two pills per row; a long label gets a row of its own so it never wraps."""
    rows: list[list[Json]] = []
    pending: list[Json] = []
    for b, label in zip(buttons, labels, strict=True):
        if len(label) > 13:
            if pending:
                rows.append(pending)
                pending = []
            rows.append([b])
        else:
            pending.append(b)
            if len(pending) == 2:
                rows.append(pending)
                pending = []
    if pending:
        rows.append(pending)
    return rows


def render_family_card(data: FamilyCardData, image_base: str | None = None) -> Json:
    """FamilyCardData -> Flex message. With `image_base` (public folder of the card images) the
    card opens with the น้องหลาน status image; without it, a plain coloured header."""
    t = CARD_THEMES[data.kind]
    base = image_base.rstrip("/") if image_base else None

    who = {
        "type": "box",
        "layout": "horizontal",
        "spacing": "md",
        "alignItems": "center",
        "contents": [
            {
                "type": "box",
                "layout": "vertical",
                "width": "48px",
                "height": "48px",
                "cornerRadius": "xxl",
                "backgroundColor": t.tint,
                "borderColor": t.color,
                "borderWidth": "medium",
                "justifyContent": "center",
                "contents": [
                    _text(
                        _initial(data.name),
                        align="center",
                        weight="bold",
                        size="lg",
                        color=t.color,
                    )
                ],
            },
            {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    _text(data.name, weight="bold", size="xl", color=INK),
                    _icon_text(base, "user", MUTED_HEX, data.role, size="xs", color=MUTED),
                ],
            },
        ],
    }
    section: Json = {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "12px",
        "cornerRadius": "lg",
        "backgroundColor": t.tint,
        "contents": [
            _icon_text(
                base,
                t.section_icon,
                t.color,
                t.section_title,
                size="sm",
                weight="bold",
                color=t.color,
            ),
            *[_text(p, size="sm", color=INK) for p in data.section],
            *(
                [_icon_text(base, "bot", FAINT_HEX, "สรุปโดย AI", size="xxs", color=FAINT_HEX)]
                if data.ai_note
                else []
            ),
        ],
    }
    note_style = {
        "normal": {"size": "sm", "color": INK},
        "strong": {"size": "sm", "color": INK, "weight": "bold"},
        "alert": {"size": "sm", "color": "#dc2626"},
        "small": {"size": "xs", "color": MUTED},
    }
    body: list[Json] = [
        who,
        {"type": "separator", "color": "#eef0f4"},
        *[_info_row(base, *r) for r in data.rows],
        section,
        *[_text(n, **note_style[s]) for n, s in data.notes],
    ]

    pills = [_pill_button(b, data.elder_id, data.call_id, base) for b in data.buttons]
    rows = _button_rows(pills, [b.label for b in data.buttons])
    footer_contents: list[Json] = [
        {"type": "box", "layout": "horizontal", "spacing": "sm", "contents": r} for r in rows
    ]

    title = f"{t.emoji} {data.name} — {t.label}"
    bubble: Json = {"type": "bubble", "size": "mega"}
    if base:
        bubble["hero"] = {
            "type": "image",
            "url": f"{base}/{data.kind}.jpg?v={CARD_IMAGE_VERSION}",
            "size": "full",
            "aspectRatio": "16:5",
            "aspectMode": "cover",
        }
    else:
        bubble["header"] = {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": t.color,
            "paddingAll": "16px",
            "contents": [_text(title, color="#ffffff", weight="bold", size="lg")],
        }
    bubble["body"] = {
        "type": "box",
        "layout": "vertical",
        "spacing": "md",
        "paddingAll": "18px",
        "contents": body,
    }
    bubble["footer"] = {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingStart": "18px",
        "paddingEnd": "18px",
        "paddingTop": "4px",
        "paddingBottom": "18px",
        "contents": footer_contents,
    }
    alt = f"{t.emoji} {data.name} — {t.label}" if data.kind != "red" else f"🔴 เร่งด่วน — {data.name}"
    return _flex(alt, bubble)


def family_card(
    kind: CardKind, elder: Elder, call: CallResult, image_base: str | None = None
) -> Json:
    """Card for guardians. kind is green | unreachable | followup | red."""
    return render_family_card(family_card_data(kind, elder, call), image_base)


# ------------------------------------------------------------------ อสม. cards


def _bubble(color: str, title: str, body: list[Json], buttons: list[Json]) -> Json:
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
        "footer": {"type": "box", "layout": "vertical", "spacing": "sm", "contents": buttons},
    }


def _flex(alt: str, bubble: Json) -> Json:
    return {"type": "flex", "altText": alt[:400], "contents": bubble}


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
        _text(f"ส่งเมื่อ {thai_datetime(datetime.now(UTC))}", size="sm", color=MUTED),
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
