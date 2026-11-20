"""FakeAnalyzer: rules + templates, for tests and dev machines without AWS (AI_PROVIDER=fake)."""

from collections.abc import Sequence

from app.ai.analyzer import AiOutput, AnalysisContext, AnalysisOutcome, merge, transcript_is_poor
from app.domain.models import TranscriptTurn
from app.domain.red_flags import check_transcript, normalize

TAKEN = ("กินยาแล้ว", "กินแล้ว", "กินยาเรียบร้อย", "กินแล้วจ้า", "กินแล้วจ้ะ")
NOT_TAKEN = ("ยังไม่ได้กิน", "ยังบ่ได้กิน", "ลืมกิน", "ลืมยา", "บ่ได้กิน")


def _med_taken(elder_text: str) -> bool | None:
    n = normalize(elder_text)
    if any(normalize(p) in n for p in NOT_TAKEN):
        return False
    if any(normalize(p) in n for p in TAKEN):
        return True
    return None


class FakeAnalyzer:
    def analyze(self, turns: Sequence[TranscriptTurn], ctx: AnalysisContext) -> AnalysisOutcome:
        rules = check_transcript(turns)
        elder_lines = [t.text.strip() for t in turns if t.speaker == "elder" and t.text.strip()]
        joined = " ".join(elder_lines)
        med = _med_taken(joined)
        risk = rules.risk
        if med is False:
            risk = "yellow" if risk == "green" else risk
        first = elder_lines[0] if elder_lines else ""
        story = first[:120]
        reasons = [f for f in rules.flags if not f.startswith("negated:")][:3]
        if med is False and "ยังไม่ได้กินยา" not in reasons:
            reasons.append("ยังไม่ได้กินยา")
        out = AiOutput(
            summary_family=(f"วันนี้{ctx.name}เล่าว่า {story}" if story else f"วันนี้คุยกับ{ctx.name}แล้ว")[
                :300
            ],
            summary_osm=(f"(สรุปจำลอง) ผู้สูงอายุพูดว่า: {joined}" if joined else "ไม่มีข้อความจากผู้สูงอายุ")[
                :500
            ],
            topics=[],
            med_taken=med,
            risk_level=risk,
            risk_reasons=reasons[:3],
            evidence=[first[:80]] if first else [],
            urgent_reason=rules.urgent_term if rules.risk == "red" else None,
            two_q="not_asked",
            mood="unclear",
            transcript_quality="good",
            self_harm=rules.self_harm,
        )
        return merge(out, turns, ctx, rules, transcript_is_poor(turns), "fake", 0)
