# ruff: noqa: E501 — the Markdown report rows are clearer on one line
"""Measure risk grading against the transcript fixtures with the REAL Bedrock (CLAUDE.md §5A.8).

Not part of pytest: it calls AWS and costs a little. Run by hand:

    uv run python scripts/eval_bedrock.py            # prints the report
    uv run python scripts/eval_bedrock.py --write    # also writes docs/eval-results.md

Uses BEDROCK_* settings from backend/.env. Targets: red recall = 100% and accuracy >= 85%.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ai.analyzer import AnalysisContext, BedrockAnalyzer  # noqa: E402
from app.ai.bedrock_client import BedrockSettings, make_client  # noqa: E402
from app.ai.prompts import PROMPT_VERSION  # noqa: E402
from app.config import Settings  # noqa: E402
from app.domain.models import TranscriptTurn  # noqa: E402

FIXTURES = ROOT / "app" / "fixtures" / "transcripts"
REPORT = ROOT.parent / "docs" / "eval-results.md"
LEVELS = ("red", "yellow", "green")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write docs/eval-results.md")
    args = ap.parse_args()

    s = Settings()
    if s.ai_provider != "bedrock" or not s.bedrock_model_id:
        print("ต้องตั้ง AI_PROVIDER=bedrock และ BEDROCK_MODEL_ID ใน backend/.env", file=sys.stderr)
        return 2
    analyzer = BedrockAnalyzer(
        make_client(s.bedrock_region, s.bedrock_timeout_sec),
        BedrockSettings(s.bedrock_model_id, s.bedrock_guardrail_id, s.bedrock_guardrail_version),
    )

    rows = []
    for path in sorted(FIXTURES.glob("*.json")):
        fx = json.loads(path.read_text(encoding="utf-8"))
        turns = [TranscriptTurn.model_validate(t) for t in fx["transcript"]]
        ctx = AnalysisContext(
            name="คุณยาย",
            age=78,
            medications=["ยาความดัน", "ยาเบาหวาน"],
            recent_topics=[],
            consent_2q=fx["expected_two_q"] != "not_asked",
        )
        a = analyzer.analyze(turns, ctx).analysis
        rows.append(
            {
                "id": fx["id"],
                "expected": fx["expected_risk"],
                "got": a.risk_level,
                "med_ok": a.med_taken == fx["expected_med_taken"],
                "twoq_ok": a.two_q == fx["expected_two_q"],
                "ai": a.ai_status,
                "ms": a.latency_ms,
            }
        )
        mark = "✓" if a.risk_level == fx["expected_risk"] else "✗"
        print(
            f"{mark} {fx['id']:<30} expected={fx['expected_risk']:<6} got={a.risk_level:<6} "
            f"ai={a.ai_status} {a.latency_ms}ms",
            flush=True,
        )

    report = render(rows, s.bedrock_model_id, bool(s.bedrock_guardrail_id))
    print("\n" + report)
    if args.write:
        REPORT.write_text(report, encoding="utf-8")
        print(f"เขียนผลไว้ที่ {REPORT}")
    n = len(rows)
    red = [r for r in rows if r["expected"] == "red"]
    red_recall = sum(r["got"] == "red" for r in red) / len(red) if red else 1.0
    acc = sum(r["got"] == r["expected"] for r in rows) / n
    return 0 if red_recall == 1.0 and acc >= 0.85 else 1


def pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def render(rows: list[dict[str, object]], model: str, guardrail: bool) -> str:
    n = len(rows)
    acc = sum(r["got"] == r["expected"] for r in rows) / n
    red = [r for r in rows if r["expected"] == "red"]
    red_recall = sum(r["got"] == "red" for r in red) / len(red) if red else 1.0
    med = sum(bool(r["med_ok"]) for r in rows) / n
    twoq = sum(bool(r["twoq_ok"]) for r in rows) / n
    fallbacks = sum(r["ai"] == "fallback" for r in rows)
    lat = sorted(int(str(r["ms"])) for r in rows)
    median = lat[len(lat) // 2]

    out = [
        "# ผลวัดความแม่นยำของ AI (Amazon Bedrock)",
        "",
        f"- วันที่รัน: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
        f"- โมเดล: `{model}` · prompt `{PROMPT_VERSION}` · Guardrail: {'เปิด' if guardrail else 'ปิด'}",
        f"- ชุดทดสอบ: {n} บทสนทนา (`backend/app/fixtures/transcripts`) · สคริปต์ `backend/scripts/eval_bedrock.py`",
        "- ระดับที่วัดคือระดับสุดท้ายหลังรวม Bedrock กับกฎความปลอดภัย (§5A.4) แบบเดียวกับระบบจริง",
        "",
        "| ตัวชี้วัด | ผล | เป้าหมาย |",
        "|---|---|---|",
        f"| Recall ของ 🔴 เร่งด่วน | **{pct(red_recall)}** ({sum(r['got'] == 'red' for r in red)}/{len(red)}) | 100% |",
        f"| Accuracy ระดับความเสี่ยงรวม | **{pct(acc)}** | ≥ 85% |",
        f"| ถูกเรื่องกินยา | {pct(med)} | — |",
        f"| ถูกเรื่อง 2Q | {pct(twoq)} | — |",
        f"| สายที่ต้องใช้โหมดสำรอง | {fallbacks} | 0 |",
        f"| เวลาตอบกลับ (มัธยฐาน) | {median / 1000:.1f} วินาที | ≤ 20 วินาที |",
        "",
        "## Confusion matrix (แถว = ที่ควรเป็น, คอลัมน์ = ที่ระบบให้)",
        "",
        "| | 🔴 red | 🟡 yellow | 🟢 green |",
        "|---|---|---|---|",
    ]
    for exp in LEVELS:
        cells = [str(sum(r["expected"] == exp and r["got"] == got for r in rows)) for got in LEVELS]
        out.append(f"| **{exp}** | " + " | ".join(cells) + " |")
    out += [
        "",
        "## รายบทสนทนา",
        "",
        "| บทสนทนา | ควรเป็น | ระบบให้ | ยา | 2Q |",
        "|---|---|---|---|---|",
    ]
    for r in rows:
        ok = "✓" if r["got"] == r["expected"] else "✗"
        out.append(
            f"| `{r['id']}` | {r['expected']} | {ok} {r['got']} | "
            f"{'✓' if r['med_ok'] else '✗'} | {'✓' if r['twoq_ok'] else '✗'} |"
        )
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    raise SystemExit(main())
