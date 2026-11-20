// Types mirroring the backend JSON (snake_case) — CLAUDE.md §4 and §6.
// Keep in sync with backend/app/domain/models.py once M2/M5 land.

export type Plan = "light" | "standard" | "premium";
export type RiskLevel = "red" | "yellow" | "green";
export type ElderStatus = "red" | "yellow" | "unreachable" | "green" | "pending";
export type CallOutcome = "answered" | "no_answer" | "unclear";
export type Mood = "good" | "neutral" | "low" | "unclear";
export type AiStatus = "ok" | "fallback";

export interface Medication {
  name: string;
  times: string[];
}

export interface Consents {
  record_conversation: boolean;
  family_summary: boolean;
  osm_share: boolean;
  screening_2q: boolean;
  given_at: string;
  voice_confirmed_at: string | null;
}

/** GET /v1/osm/me — never contains password_hash. */
export interface OsmMe {
  id: string;
  name: string;
  tambon: string;
  referral_code: string;
  line_linked: boolean;
  line_link_code: string | null;
}

export interface DashboardRow {
  elder_id: string;
  name: string;
  age: number;
  phone_masked: string;
  voice_confirmed: boolean;
  status: ElderStatus;
  reasons: string[];
  med_taken: boolean | null;
  latest_call_id: string | null;
  latest_call_at: string | null;
  resolved: boolean;
  resolve_note: string | null;
  family_requested_osm: boolean;
}

export interface DashboardCounts {
  red: number;
  yellow: number;
  unreachable: number;
  green: number;
  pending: number;
  tasks_open: number;
}

export interface NineQTaskView {
  id: string;
  elder_id: string;
  elder_name: string;
  screened_at: string;
  due_at: string;
}

/** GET /v1/osm/dashboard */
export interface DashboardData {
  rows: DashboardRow[];
  counts: DashboardCounts;
  tasks: NineQTaskView[];
  generated_at: string;
}

export interface DailyEntry {
  date: string; // YYYY-MM-DD (Asia/Bangkok)
  call_id: string;
  started_at: string;
  outcome: CallOutcome;
  risk_level: RiskLevel | null; // null when no_answer
  summary_osm: string | null;
  risk_reasons: string[];
  evidence: string[];
  med_taken: boolean | null;
  mood: Mood | null;
  ai_status: AiStatus | null;
  rule_flags: string[];
}

/** GET /v1/osm/elders/{id}/daily */
export interface ElderDaily {
  elder: {
    id: string;
    name: string;
    age: number;
    call_time: string;
    plan: Plan;
    medications: Medication[];
    consents: Consents;
  };
  status: ElderStatus;
  reasons: string[];
  days: DailyEntry[];
}

/** GET /v1/osm/daily-digest */
export interface DailyDigest {
  date: string;
  total_calls: number;
  counts: { red: number; yellow: number; unreachable: number; green: number };
  visit_first: { elder_id: string; name: string; status: ElderStatus; reason: string }[];
}

export interface LoginResult {
  session: string;
  expires_at: string;
}

/** POST /v1/public/register body */
export interface RegisterPayload {
  guardian: { name: string; phone: string; relation: string };
  elder: { name: string; age: number; phone: string; call_time: string };
  referral_code: string;
  medications: Medication[];
  plan: Plan;
  consents: {
    record_conversation: boolean;
    family_summary: boolean;
    osm_share: boolean;
    screening_2q: boolean;
  };
  osm_explained: true;
}

export interface RegisterResult {
  elder_name: string;
  link_code: string;
  expires_at: string;
}
