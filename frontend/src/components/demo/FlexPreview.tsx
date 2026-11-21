"use client";
// Renders a LINE Flex message (as built by backend/app/domain/line_cards.py) as HTML that looks
// close to LINE (CLAUDE.md §7.6). Covers the parts our cards use: bubble, box, text, separator,
// button, image. Display only: actions (postback/tel/uri) are not clickable here.
import type { CSSProperties, ReactNode } from "react";

import type { FlexMessage } from "@/lib/types";

type Node = Record<string, unknown>;

const SPACING: Record<string, number> = { none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20 };
const TEXT_SIZE: Record<string, number> = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  "3xl": 24,
};
const RADIUS: Record<string, number> = { none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20 };
const BORDER: Record<string, number> = {
  none: 0,
  light: 0.5,
  normal: 1,
  medium: 2,
  "semi-bold": 3,
  bold: 4,
};
const ALIGN: Record<string, string> = {
  start: "flex-start",
  "flex-start": "flex-start",
  center: "center",
  end: "flex-end",
  "flex-end": "flex-end",
  "space-between": "space-between",
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/** "12px" or a keyword from `table`. */
function px(v: unknown, table: Record<string, number>): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (s.endsWith("px")) return Number.parseFloat(s);
  return table[s];
}

function boxStyle(n: Node, defaultPad?: number): CSSProperties {
  const layout = str(n.layout) ?? "vertical";
  const pad = px(n.paddingAll, SPACING) ?? defaultPad;
  const bw = px(n.borderWidth, BORDER);
  return {
    display: "flex",
    flexDirection: layout === "vertical" ? "column" : "row",
    alignItems: layout === "baseline" ? "baseline" : ALIGN[str(n.alignItems) ?? ""],
    justifyContent: ALIGN[str(n.justifyContent) ?? ""],
    gap: px(n.spacing, SPACING),
    padding: pad,
    paddingTop: px(n.paddingTop, SPACING),
    paddingBottom: px(n.paddingBottom, SPACING),
    paddingLeft: px(n.paddingStart, SPACING),
    paddingRight: px(n.paddingEnd, SPACING),
    background: str(n.backgroundColor),
    borderRadius: px(n.cornerRadius, RADIUS),
    border: bw ? `${bw}px solid ${str(n.borderColor) ?? "#000"}` : undefined,
    width: str(n.width),
    height: str(n.height),
  };
}

function itemStyle(n: Node, parentRow: boolean): CSSProperties {
  // A fixed width/height box keeps its size, as in LINE.
  const fixed = parentRow ? str(n.width) : str(n.height);
  const f = num(n.flex) ?? (parentRow && !fixed ? 1 : 0);
  return {
    flex: `${f} ${f ? 1 : 0} ${f ? "0%" : "auto"}`,
    minWidth: 0,
    marginTop: parentRow ? undefined : px(n.margin, SPACING),
    marginLeft: parentRow ? px(n.margin, SPACING) : undefined,
  };
}

function render(n: Node, key: number, parentRow: boolean): ReactNode {
  const type = str(n.type);
  const base = itemStyle(n, parentRow);
  switch (type) {
    case "box": {
      const row = (str(n.layout) ?? "vertical") !== "vertical";
      const kids = Array.isArray(n.contents) ? (n.contents as Node[]) : [];
      return (
        <div key={key} style={{ ...base, ...boxStyle(n) }}>
          {kids.map((c, i) => render(c, i, row))}
        </div>
      );
    }
    case "text":
      return (
        <div
          key={key}
          style={{
            ...base,
            fontSize: TEXT_SIZE[str(n.size) ?? "md"] ?? 14,
            fontWeight: n.weight === "bold" ? 700 : 400,
            color: str(n.color) ?? "#111",
            textAlign: (str(n.align) as CSSProperties["textAlign"]) ?? "left",
            whiteSpace: n.wrap ? "pre-wrap" : "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.45,
          }}
        >
          {str(n.text)}
        </div>
      );
    case "separator":
      return (
        <div
          key={key}
          style={{
            ...base,
            flex: "none",
            borderTop: `1px solid ${str(n.color) ?? "#e5e7eb"}`,
          }}
        />
      );
    case "button": {
      const action = (n.action ?? {}) as Node;
      const primary = n.style === "primary";
      const color = str(n.color) ?? (primary ? "#17c950" : "#42659a");
      return (
        <div
          key={key}
          style={{
            ...base,
            borderRadius: 8,
            padding: n.height === "sm" ? "8px 12px" : "12px",
            textAlign: "center",
            fontSize: 14,
            fontWeight: 700,
            background: primary ? color : n.style === "secondary" ? "#dcdfe5" : "transparent",
            color: primary ? "#fff" : color,
          }}
        >
          {str(action.label)}
        </div>
      );
    }
    case "image": {
      const url = str(n.url);
      const ratio = (str(n.aspectRatio) ?? "1:1").split(":").map(Number);
      if (!url?.startsWith("https://")) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element -- remote card image, preview only
        <img
          key={key}
          src={url}
          alt=""
          // Card images live on the public tunnel (CARD_IMAGE_BASE_URL); hide them if it is down.
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          style={{
            ...base,
            width: "100%",
            aspectRatio: `${ratio[0] || 1} / ${ratio[1] || 1}`,
            objectFit: n.aspectMode === "cover" ? "cover" : "contain",
          }}
        />
      );
    }
    default:
      return null;
  }
}

function section(n: unknown, defaultPad: number): ReactNode {
  if (!n || typeof n !== "object") return null;
  const node = n as Node;
  if (node.type === "image") return render(node, 0, false);
  const kids = Array.isArray(node.contents) ? (node.contents as Node[]) : [];
  const row = (str(node.layout) ?? "vertical") !== "vertical";
  return <div style={boxStyle(node, defaultPad)}>{kids.map((c, i) => render(c, i, row))}</div>;
}

export function FlexPreview({ message, label }: { message: FlexMessage; label: string }) {
  const b = message.contents as Node;
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-[12px] font-semibold text-ink-muted">{label}</figcaption>
      <div className="rounded-2xl bg-[#8fa7c7] p-3">
        <div className="mb-1.5 text-[11px] text-white/90">หลานโทรหา</div>
        <div
          className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-sm"
          style={{ fontFamily: "inherit" }}
        >
          {section(b.header, 16)}
          {section(b.hero, 0)}
          {section(b.body, 16)}
          {section(b.footer, 16)}
        </div>
        <div className="mt-1.5 text-[11px] text-white/80">ข้อความแจ้งเตือน: {message.altText}</div>
      </div>
    </figure>
  );
}
