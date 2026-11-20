// TEMPORARY dev-only stand-in for the FastAPI backend, used while the backend (M2–M5) is not built.
// Enabled only when MOCK_BACKEND=true and NODE_ENV !== "production" (see api.ts).
// Seed follows CLAUDE.md §14 — every person here is fictional. Delete this file once M5 is done.
import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { STATUS_ORDER } from "./constants";
import { bangkokDateKey, maskPhone } from "./format";
import type {
  CallOutcome,
  Consents,
  DailyDigest,
  DailyEntry,
  DashboardData,
  ElderDaily,
  ElderStatus,
  LoginResult,
  Medication,
  Mood,
  OsmMe,
  Plan,
  RegisterPayload,
  RegisterResult,
  RiskLevel,
} from "./types";

export class MockApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

interface Analysis {
  summary_family: string;
  summary_osm: string;
  topics: string[];
  med_taken: boolean | null;
  risk_level: RiskLevel;
  risk_reasons: string[];
  evidence: string[];
  urgent_reason: string | null;
  two_q: "positive" | "negative" | "not_asked";
  mood: Mood;
  transcript_quality: "good" | "poor";
  ai_status: "ok" | "fallback";
  rule_flags: string[];
}

interface Call {
  id: string;
  elder_id: string;
  started_at: string;
  outcome: CallOutcome;
  analysis: Analysis | null;
  resolved_at: string | null;
  resolve_note: string | null;
  family_requested_osm_at: string | null;
}

interface Elder {
  id: string;
  name: string;
  age: number;
  phone: string;
  osm_id: string;
  call_time: string;
  plan: Plan;
  medications: Medication[];
  consents: Consents;
}

interface Task {
  id: string;
  elder_id: string;
  osm_id: string;
  screened_at: string;
  due_at: string;
  status: "open" | "done";
  note: string | null;
}

interface Osm {
  id: string;
  name: string;
  phone: string;
  password: string;
  tambon: string;
  referral_code: string;
  line_user_id: string | null;
  line_link_code: string | null;
}

interface Store {
  osms: Osm[];
  elders: Elder[];
  calls: Call[];
  tasks: Task[];
  sessions: Map<string, { osm_id: string; expires: number }>;
}

// ---------------------------------------------------------------- seed

const BKK_OFFSET = 7 * 3_600_000;
const DAY = 86_400_000;

function callTimestamp(now: Date, daysAgo: number, hhmm: string): string {
  const shifted = new Date(now.getTime() + BKK_OFFSET);
  // Before 10:00 Bangkok the "latest call" is yesterday's (CLAUDE.md §14).
  const latestOffset = shifted.getUTCHours() < 10 ? 1 : 0;
  const midnightUtc =
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - BKK_OFFSET;
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(
    midnightUtc -
      (daysAgo + latestOffset) * DAY +
      h * 3_600_000 +
      m * 60_000 +
      randomInt(0, 4) * 60_000,
  ).toISOString();
}

function green(family: string, osm: string, evidence: string, topics: string[]): Analysis {
  return {
    summary_family: family,
    summary_osm: osm,
    topics,
    med_taken: true,
    risk_level: "green",
    risk_reasons: [],
    evidence: [evidence],
    urgent_reason: null,
    two_q: "not_asked",
    mood: "good",
    transcript_quality: "good",
    ai_status: "ok",
    rule_flags: [],
  };
}

const GREEN_POOL: Analysis[] = [
  green(
    "วันนี้เล่าว่าไปรดน้ำต้นมะนาวหลังบ้าน อารมณ์ดี กินยาเช้าแล้ว",
    "รับสาย พูดคุยปกติ เล่าเรื่องรดน้ำต้นไม้ กินยาเช้าแล้ว ไม่พบอาการผิดปกติ",
    "เช้านี้ไปรดน้ำต้นมะนาวมาแล้ว",
    ["สวน", "ต้นมะนาว"],
  ),
  green(
    "วันนี้คุยเรื่องหลานที่จะกลับมาเยี่ยมช่วงปีใหม่ ฟังดูดีใจมาก",
    "พูดคุยปกติ เล่าว่าหลานจะกลับมาช่วงปีใหม่ กินยาตามเวลา",
    "หลานบอกว่าปีใหม่จะกลับมา",
    ["หลาน", "ปีใหม่"],
  ),
  green(
    "วันนี้ไปวัดตอนเช้ากับเพื่อนบ้าน กลับมากินข้าวแล้ว",
    "ไปวัดตอนเช้า รับประทานอาหารได้ กินยาแล้ว ไม่พบอาการผิดปกติ",
    "ไปวัดกับป้าแก้วมา",
    ["วัด", "เพื่อนบ้าน"],
  ),
  green(
    "วันนี้ทำแกงหน่อไม้กินเอง บอกว่าอร่อย นอนหลับดี",
    "ทำอาหารเองได้ นอนหลับดี กินยาครบ ไม่มีอาการผิดปกติ",
    "ทำแกงหน่อไม้กินเองเด้อ",
    ["ทำอาหาร"],
  ),
  green(
    "วันนี้นั่งดูละครหลังข่าว เล่าเรื่องละครให้ฟังอย่างสนุก",
    "พูดคุยปกติ สื่อสารชัดเจน กินยาแล้ว",
    "ละครเมื่อคืนสนุกหลาย",
    ["ละคร"],
  ),
  green(
    "วันนี้เดินออกกำลังรอบหมู่บ้านตอนเย็น สบายดี",
    "เดินออกกำลังกายได้ตามปกติ ไม่มีเวียนหัว กินยาแล้ว",
    "เย็นนี้จะเดินรอบหมู่บ้าน",
    ["ออกกำลังกาย"],
  ),
];

function pick(i: number): Analysis {
  return structuredClone(GREEN_POOL[i % GREEN_POOL.length]);
}

const fullConsents = (given: string, voice: string | null): Consents => ({
  record_conversation: true,
  family_summary: true,
  osm_share: true,
  screening_2q: true,
  given_at: given,
  voice_confirmed_at: voice,
});

function seed(): Store {
  const now = new Date();
  const osm: Osm = {
    id: "osm_0000000000000000demo",
    name: "พี่แดง (ตัวอย่าง)",
    phone: "0812345678",
    password: "demo-password",
    tambon: "ต.บ้านตัวอย่าง",
    referral_code: "OSM-DEMO",
    line_user_id: null,
    line_link_code: null,
  };
  const created = new Date(now.getTime() - 30 * DAY).toISOString();
  const voice = new Date(now.getTime() - 29 * DAY).toISOString();
  const med = (name: string, ...times: string[]): Medication => ({ name, times });

  const base: Omit<Elder, "osm_id" | "consents">[] = [
    {
      id: "eld_somchai",
      name: "ตาสมชาย",
      age: 82,
      phone: "0891111234",
      call_time: "09:00",
      plan: "premium",
      medications: [med("ยาความดัน", "08:00"), med("ยาละลายลิ่มเลือด", "08:00")],
    },
    {
      id: "eld_malee",
      name: "ยายมาลี",
      age: 78,
      phone: "0892222345",
      call_time: "09:00",
      plan: "standard",
      medications: [med("ยาเบาหวาน", "07:30", "18:00")],
    },
    {
      id: "eld_bualoy",
      name: "ยายบัวลอย",
      age: 75,
      phone: "0893333456",
      call_time: "09:30",
      plan: "standard",
      medications: [med("ยาความดัน", "08:00")],
    },
    {
      id: "eld_somsri",
      name: "ยายสมศรี",
      age: 74,
      phone: "0894444567",
      call_time: "08:30",
      plan: "light",
      medications: [med("วิตามินบี", "08:00")],
    },
    {
      id: "eld_thongdee",
      name: "ตาทองดี",
      age: 80,
      phone: "0895555678",
      call_time: "10:00",
      plan: "standard",
      medications: [med("ยาไขมัน", "20:00")],
    },
    {
      id: "eld_samlee",
      name: "ยายสำลี",
      age: 77,
      phone: "0896666789",
      call_time: "09:00",
      plan: "premium",
      medications: [med("ยาความดัน", "08:00", "20:00")],
    },
    {
      id: "eld_kham",
      name: "ยายคำ",
      age: 71,
      phone: "0897777890",
      call_time: "09:00",
      plan: "light",
      medications: [],
    },
  ];
  const elders: Elder[] = base.map((e) => ({
    ...e,
    osm_id: osm.id,
    consents: fullConsents(created, e.id === "eld_kham" ? null : voice),
  }));

  const calls: Call[] = [];
  const tasks: Task[] = [];
  const add = (elder: Elder, daysAgo: number, outcome: CallOutcome, analysis: Analysis | null) => {
    calls.push({
      id: `call_${elder.id.slice(4)}_${daysAgo}`,
      elder_id: elder.id,
      started_at: callTimestamp(now, daysAgo, elder.call_time),
      outcome,
      analysis,
      resolved_at: null,
      resolve_note: null,
      family_requested_osm_at: null,
    });
  };
  const [somchai, malee, bualoy, somsri, thongdee, samlee] = elders;

  // ตาสมชาย — red: เจ็บหน้าอก today; family asked อสม. to check
  add(somchai, 0, "answered", {
    summary_family: "วันนี้คุณตาบอกว่าเจ็บหน้าอก ผู้ช่วย AI แนะนำให้โทร 1669 แล้ว",
    summary_osm: "แจ้งเจ็บแน่นหน้าอกตั้งแต่เช้า ร้าวไปแขนซ้าย AI แนะนำให้โทร 1669 กินยาความดันเช้าแล้ว",
    topics: ["เจ็บหน้าอก"],
    med_taken: true,
    risk_level: "red",
    risk_reasons: ["เจ็บแน่นหน้าอก"],
    evidence: ["เจ็บหน้าอก แน่น ๆ ตั้งแต่เช้า", "มันร้าวไปแขนซ้าย"],
    urgent_reason: "เจ็บหน้าอก",
    two_q: "not_asked",
    mood: "low",
    transcript_quality: "good",
    ai_status: "ok",
    rule_flags: ["เจ็บหน้าอก"],
  });
  for (let d = 1; d < 14; d++) add(somchai, d, "answered", pick(d));
  calls.find((c) => c.id === "call_somchai_0")!.family_requested_osm_at = new Date().toISOString();

  // ยายมาลี — unreachable: no answer today
  add(malee, 0, "no_answer", null);
  for (let d = 1; d < 14; d++) {
    if (d === 6) add(malee, d, "no_answer", null);
    else add(malee, d, "answered", pick(d + 1));
  }

  // ยายบัวลอย — 2Q positive 2 days ago
  for (let d = 0; d < 14; d++) {
    if (d === 2) {
      add(bualoy, d, "answered", {
        ...pick(d),
        summary_family: "วันนี้คุยกันเรื่องอากาศเย็นและงานบ้าน",
        summary_osm: "เล่าว่านอนไม่ค่อยหลับ รู้สึกไม่อยากทำอะไร 2Q ผลบวก ควรประเมิน 9Q กินยาแล้ว",
        topics: ["นอนไม่หลับ"],
        risk_level: "yellow",
        risk_reasons: ["2Q ผลบวก"],
        evidence: ["ช่วงนี้ไม่อยากทำอะไรเลย"],
        two_q: "positive",
        mood: "low",
      });
    } else add(bualoy, d, "answered", pick(d + 2));
  }
  tasks.push({
    id: "task_bualoy",
    elder_id: bualoy.id,
    osm_id: osm.id,
    screened_at: calls.find((c) => c.id === "call_bualoy_2")!.started_at,
    due_at: new Date(
      Date.parse(calls.find((c) => c.id === "call_bualoy_2")!.started_at) + 7 * DAY,
    ).toISOString(),
    status: "open",
    note: null,
  });

  // ยายสมศรี — green: ผักบุ้ง
  add(somsri, 0, "answered", {
    ...pick(0),
    summary_family: "วันนี้ยายเล่าว่าผักบุ้งที่ปลูกไว้ขึ้นแล้ว ดีใจมาก กินยาเช้าแล้ว",
    summary_osm: "ผักบุ้งที่ปลูกขึ้นแล้ว พูดคุยปกติ กินยาเช้าแล้ว",
    topics: ["ผักบุ้ง", "สวน"],
    evidence: ["ผักบุ้งที่ปลูกขึ้นแล้วเด้อ"],
  });
  for (let d = 1; d < 14; d++) add(somsri, d, "answered", pick(d + 3));

  // ตาทองดี — 2Q positive 4 days ago
  for (let d = 0; d < 14; d++) {
    if (d === 4) {
      add(thongdee, d, "answered", {
        ...pick(d),
        summary_family: "วันนี้คุยเรื่องสวนยางและฝนที่ตกหนัก",
        summary_osm: "เล่าว่าเบื่อ ๆ เหงา ตั้งแต่ภรรยาเสีย 2Q ผลบวก ควรประเมิน 9Q",
        topics: ["เหงา"],
        risk_level: "yellow",
        risk_reasons: ["2Q ผลบวก", "เหงามาก"],
        evidence: ["อยู่คนเดียวมันเหงา"],
        two_q: "positive",
        mood: "low",
      });
    } else add(thongdee, d, "answered", pick(d + 4));
  }
  const tdCall = calls.find((c) => c.id === "call_thongdee_4")!;
  tasks.push({
    id: "task_thongdee",
    elder_id: thongdee.id,
    osm_id: osm.id,
    screened_at: tdCall.started_at,
    due_at: new Date(Date.parse(tdCall.started_at) + 7 * DAY).toISOString(),
    status: "open",
    note: null,
  });

  // ยายสำลี — forgot meds 4 days + 2Q positive
  for (let d = 0; d < 14; d++) {
    if (d < 4) {
      add(samlee, d, "answered", {
        ...pick(d + 5),
        summary_family: "วันนี้คุยกันแล้ว คุณยายยังไม่ได้กินยาตอนเช้า",
        summary_osm: `ยังไม่ได้กินยาความดันเช้า บอกว่าลืม${d === 3 ? " 2Q ผลบวก" : ""}`,
        topics: ["ลืมยา"],
        med_taken: false,
        risk_level: "yellow",
        risk_reasons: d === 3 ? ["ลืมกินยา", "2Q ผลบวก"] : ["ลืมกินยา"],
        evidence: ["ยังบ่ได้กินยาเลย ลืม"],
        two_q: d === 3 ? "positive" : "not_asked",
        mood: d === 3 ? "low" : "neutral",
      });
    } else add(samlee, d, "answered", pick(d));
  }
  const slCall = calls.find((c) => c.id === "call_samlee_3")!;
  tasks.push({
    id: "task_samlee",
    elder_id: samlee.id,
    osm_id: osm.id,
    screened_at: slCall.started_at,
    due_at: new Date(Date.parse(slCall.started_at) + 7 * DAY).toISOString(),
    status: "open",
    note: null,
  });

  // ยายคำ — no calls yet, voice consent not confirmed (handled above)

  return { osms: [osm], elders, calls, tasks, sessions: new Map() };
}

const g = globalThis as unknown as { __ltrMockStore?: Store };
function store(): Store {
  g.__ltrMockStore ??= seed();
  return g.__ltrMockStore;
}

// ---------------------------------------------------------------- status policy (mirror of §5)

interface StatusResult {
  status: ElderStatus;
  reasons: string[];
  latest: Call | null;
  resolved: boolean;
}

function missedMedStreak(callsNewestFirst: Call[]): number {
  let n = 0;
  for (const c of callsNewestFirst) {
    const taken = c.outcome === "answered" ? (c.analysis?.med_taken ?? null) : null;
    if (taken === null) continue;
    if (taken) break;
    n++;
  }
  return n;
}

function computeStatus(callsNewestFirst: Call[], openTasks: Task[]): StatusResult {
  const latest = callsNewestFirst[0] ?? null;
  if (!latest) return { status: "pending", reasons: ["ยังไม่มีสายแรก"], latest, resolved: false };
  const resolved = latest.resolved_at !== null;
  const a = latest.analysis;
  if (a && (a.risk_level === "red" || a.urgent_reason)) {
    const why = a.urgent_reason ?? a.risk_reasons[0] ?? "พบสัญญาณอันตราย";
    return { status: "red", reasons: [`${why} — แนะนำ 1669 แล้ว`], latest, resolved };
  }
  if (latest.outcome === "no_answer") {
    return { status: "unreachable", reasons: ["ไม่รับสาย 2 ครั้ง — ยังติดต่อไม่ได้"], latest, resolved };
  }
  const reasons: string[] = [];
  if (a?.risk_level === "yellow") reasons.push(...a.risk_reasons);
  if (latest.outcome === "unclear" || a?.transcript_quality === "poor") {
    reasons.push("ฟังไม่ชัดจนสรุปไม่ได้");
  }
  const streak = missedMedStreak(callsNewestFirst);
  if (streak >= 3) reasons.push(`ลืมยาติดกัน ${streak} วัน`);
  if (openTasks.length > 0) reasons.push("2Q ผลบวก — รอ อสม. ประเมิน 9Q");
  const unique = [...new Set(reasons)];
  if (unique.length) return { status: "yellow", reasons: unique, latest, resolved };
  return {
    status: "green",
    reasons: [a?.summary_osm ?? "ไม่พบสัญญาณผิดปกติในสายนี้"],
    latest,
    resolved,
  };
}

// ---------------------------------------------------------------- helpers

function osmFromSession(session: string | null): Osm {
  const s = store();
  const entry = session ? s.sessions.get(session) : undefined;
  if (!entry || entry.expires < Date.now()) throw new MockApiError(401, "unauthorized");
  const osm = s.osms.find((o) => o.id === entry.osm_id);
  if (!osm) throw new MockApiError(401, "unauthorized");
  return osm;
}

function visibleElders(osm: Osm): Elder[] {
  return store().elders.filter((e) => e.osm_id === osm.id && e.consents.osm_share);
}

function ownedElder(osm: Osm, elderId: string): Elder {
  const e = visibleElders(osm).find((x) => x.id === elderId);
  if (!e) throw new MockApiError(404, "not_found");
  return e;
}

function callsOf(elderId: string): Call[] {
  return store()
    .calls.filter((c) => c.elder_id === elderId)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

function openTasksOf(elderId: string): Task[] {
  return store().tasks.filter((t) => t.elder_id === elderId && t.status === "open");
}

const thaiCollator = new Intl.Collator("th");

// ---------------------------------------------------------------- API surface

export const mockBackend = {
  async login(phone: string, password: string): Promise<LoginResult> {
    const osm = store().osms.find((o) => o.phone === phone);
    if (!osm || osm.password !== password) throw new MockApiError(401, "invalid_credentials");
    const session = `mock.${randomBytes(18).toString("base64url")}`;
    const expires = Date.now() + 12 * 3_600_000;
    store().sessions.set(session, { osm_id: osm.id, expires });
    return { session, expires_at: new Date(expires).toISOString() };
  },

  async me(session: string | null): Promise<OsmMe> {
    const o = osmFromSession(session);
    return {
      id: o.id,
      name: o.name,
      tambon: o.tambon,
      referral_code: o.referral_code,
      line_linked: o.line_user_id !== null,
      line_link_code: o.line_link_code,
    };
  },

  async dashboard(session: string | null): Promise<DashboardData> {
    const osm = osmFromSession(session);
    const elders = visibleElders(osm);
    const rows = elders.map((e) => {
      const calls = callsOf(e.id).slice(0, 14);
      const st = computeStatus(calls, openTasksOf(e.id));
      const latest = st.latest;
      return {
        elder_id: e.id,
        name: e.name,
        age: e.age,
        phone_masked: maskPhone(e.phone),
        voice_confirmed: e.consents.voice_confirmed_at !== null,
        status: st.status,
        reasons: st.reasons,
        med_taken: latest?.outcome === "answered" ? (latest.analysis?.med_taken ?? null) : null,
        latest_call_id: latest?.id ?? null,
        latest_call_at: latest?.started_at ?? null,
        resolved: st.resolved,
        resolve_note: latest?.resolve_note ?? null,
        family_requested_osm: latest?.family_requested_osm_at != null,
      };
    });
    rows.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        Number(a.resolved) - Number(b.resolved) ||
        thaiCollator.compare(a.name, b.name),
    );
    const count = (s: ElderStatus) => rows.filter((r) => r.status === s).length;
    const tasks = store()
      .tasks.filter((t) => t.osm_id === osm.id && t.status === "open")
      .filter((t) => elders.some((e) => e.id === t.elder_id))
      .sort((a, b) => a.due_at.localeCompare(b.due_at))
      .map((t) => ({
        id: t.id,
        elder_id: t.elder_id,
        elder_name: elders.find((e) => e.id === t.elder_id)!.name,
        screened_at: t.screened_at,
        due_at: t.due_at,
      }));
    return {
      rows,
      counts: {
        red: count("red"),
        yellow: count("yellow"),
        unreachable: count("unreachable"),
        green: count("green"),
        pending: count("pending"),
        tasks_open: tasks.length,
      },
      tasks,
      generated_at: new Date().toISOString(),
    };
  },

  async dailyDigest(session: string | null, date?: string): Promise<DailyDigest> {
    const data = await mockBackend.dashboard(session);
    const day =
      date ?? bangkokDateKey(data.rows.find((r) => r.latest_call_at)?.latest_call_at ?? new Date());
    const total = data.rows.filter(
      (r) => r.latest_call_at && bangkokDateKey(r.latest_call_at) === day,
    ).length;
    const visit = data.rows
      .filter((r) => ["red", "yellow", "unreachable"].includes(r.status) && !r.resolved)
      .map((r) => ({
        elder_id: r.elder_id,
        name: r.name,
        status: r.status,
        reason: (r.reasons.find((x) => x.startsWith("ลืมยาติดกัน")) ?? r.reasons[0] ?? "").replace(
          / — .*$/,
          "",
        ),
      }));
    return {
      date: day,
      total_calls: total,
      counts: {
        red: data.counts.red,
        yellow: data.counts.yellow,
        unreachable: data.counts.unreachable,
        green: data.counts.green,
      },
      visit_first: visit,
    };
  },

  async elderDaily(session: string | null, elderId: string, days: number): Promise<ElderDaily> {
    const osm = osmFromSession(session);
    const e = ownedElder(osm, elderId);
    const calls = callsOf(e.id);
    const st = computeStatus(calls.slice(0, 14), openTasksOf(e.id));
    const rank = (c: Call) =>
      c.analysis
        ? { red: 3, yellow: 2, green: 1 }[c.analysis.risk_level]
        : c.outcome === "no_answer"
          ? 1.5
          : 0;
    const byDay = new Map<string, Call>();
    for (const c of calls) {
      const k = bangkokDateKey(c.started_at);
      const cur = byDay.get(k);
      if (!cur || rank(c) > rank(cur)) byDay.set(k, c);
    }
    const entries: DailyEntry[] = [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, days)
      .map(([date, c]) => ({
        date,
        call_id: c.id,
        started_at: c.started_at,
        outcome: c.outcome,
        risk_level: c.analysis?.risk_level ?? null,
        summary_osm: c.analysis?.summary_osm ?? null,
        risk_reasons: c.analysis?.risk_reasons ?? [],
        evidence: c.analysis?.evidence ?? [],
        med_taken: c.outcome === "answered" ? (c.analysis?.med_taken ?? null) : null,
        mood: c.analysis?.mood ?? null,
        ai_status: c.analysis?.ai_status ?? null,
        rule_flags: c.analysis?.rule_flags ?? [],
      }));
    return {
      elder: {
        id: e.id,
        name: e.name,
        age: e.age,
        call_time: e.call_time,
        plan: e.plan,
        medications: e.medications,
        consents: e.consents,
      },
      status: st.status,
      reasons: st.reasons,
      days: entries,
    };
  },

  async resolveCall(session: string | null, elderId: string, callId: string, note: string | null) {
    const osm = osmFromSession(session);
    ownedElder(osm, elderId);
    const c = store().calls.find((x) => x.id === callId && x.elder_id === elderId);
    if (!c) throw new MockApiError(404, "not_found");
    if (!c.resolved_at) {
      c.resolved_at = new Date().toISOString();
      c.resolve_note = note;
    }
    return { ok: true };
  },

  async completeTask(session: string | null, elderId: string, taskId: string, note: string | null) {
    const osm = osmFromSession(session);
    ownedElder(osm, elderId);
    const t = store().tasks.find((x) => x.id === taskId && x.elder_id === elderId);
    if (!t) throw new MockApiError(404, "not_found");
    t.status = "done";
    t.note = note;
    return { ok: true };
  },

  async createLineLinkCode(session: string | null): Promise<{ code: string }> {
    const osm = osmFromSession(session);
    osm.line_link_code = `LTH-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    return { code: osm.line_link_code };
  },

  async register(p: RegisterPayload): Promise<RegisterResult> {
    const s = store();
    const osm = s.osms.find((o) => o.referral_code === p.referral_code);
    if (!osm) throw new MockApiError(404, "referral_not_found");
    const now = new Date();
    s.elders.push({
      id: `eld_${randomBytes(10).toString("hex")}`,
      name: p.elder.name,
      age: p.elder.age,
      phone: p.elder.phone,
      osm_id: osm.id,
      call_time: p.elder.call_time,
      plan: p.plan,
      medications: p.medications,
      consents: { ...p.consents, given_at: now.toISOString(), voice_confirmed_at: null },
    });
    return {
      elder_name: p.elder.name,
      link_code: `LTH-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`,
      expires_at: new Date(now.getTime() + 7 * DAY).toISOString(),
    };
  },
};
