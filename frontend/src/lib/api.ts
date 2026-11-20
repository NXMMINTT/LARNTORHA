// Server-side wrapper around the FastAPI backend (CLAUDE.md §3).
// The browser never calls the backend directly; everything goes through Server Components/Actions.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "./constants";
import { MockApiError, mockBackend } from "./mock-backend";
import type {
  DailyDigest,
  DashboardData,
  ElderDaily,
  LoginResult,
  OsmMe,
  RegisterPayload,
  RegisterResult,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: unknown,
  ) {
    super(`${status} ${code}`);
  }
}

const useMock = process.env.MOCK_BACKEND === "true" && process.env.NODE_ENV !== "production";

async function session(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const base = process.env.BACKEND_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) throw new Error("BACKEND_URL and INTERNAL_API_TOKEN must be set");
  const headers: Record<string, string> = { "X-Internal-Token": token, Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth) {
    const s = await session();
    if (s) headers.Authorization = `Bearer ${s}`;
  }
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: unknown };
    throw new ApiError(res.status, err.error ?? "http_error", err.detail);
  }
  return (await res.json()) as T;
}

/** Wrap OSM calls: an expired/invalid session sends the user back to /login. */
async function osm<T>(real: () => Promise<T>, mock: (s: string | null) => Promise<T>): Promise<T> {
  try {
    return useMock ? await mock(await session()) : await real();
  } catch (e) {
    const status = e instanceof ApiError || e instanceof MockApiError ? e.status : 0;
    if (status === 401) redirect("/login?expired=1");
    if (e instanceof MockApiError) throw new ApiError(e.status, e.code);
    throw e;
  }
}

function rethrowMock(e: unknown): never {
  if (e instanceof MockApiError) throw new ApiError(e.status, e.code);
  throw e;
}

export async function login(phone: string, password: string): Promise<LoginResult> {
  if (useMock) return mockBackend.login(phone, password).catch(rethrowMock);
  return call("POST", "/v1/osm/login", { body: { phone, password } });
}

export const getMe = () =>
  osm<OsmMe>(() => call("GET", "/v1/osm/me", { auth: true }), mockBackend.me);

export const getDashboard = () =>
  osm<DashboardData>(() => call("GET", "/v1/osm/dashboard", { auth: true }), mockBackend.dashboard);

export const getDailyDigest = (date?: string) =>
  osm<DailyDigest>(
    () =>
      call("GET", `/v1/osm/daily-digest${date ? `?date=${encodeURIComponent(date)}` : ""}`, {
        auth: true,
      }),
    (s) => mockBackend.dailyDigest(s, date),
  );

export const getElderDaily = (elderId: string, days = 14) =>
  osm<ElderDaily>(
    () =>
      call("GET", `/v1/osm/elders/${encodeURIComponent(elderId)}/daily?days=${days}`, {
        auth: true,
      }),
    (s) => mockBackend.elderDaily(s, elderId, days),
  );

export const resolveCall = (elderId: string, callId: string, note: string | null) =>
  osm(
    () =>
      call(
        "POST",
        `/v1/osm/calls/${encodeURIComponent(elderId)}/${encodeURIComponent(callId)}/resolve`,
        {
          auth: true,
          body: { note },
        },
      ),
    (s) => mockBackend.resolveCall(s, elderId, callId, note),
  );

export const completeTask = (elderId: string, taskId: string, note: string | null) =>
  osm(
    () =>
      call(
        "POST",
        `/v1/osm/tasks/${encodeURIComponent(elderId)}/${encodeURIComponent(taskId)}/complete`,
        {
          auth: true,
          body: { note },
        },
      ),
    (s) => mockBackend.completeTask(s, elderId, taskId, note),
  );

export const createLineLinkCode = () =>
  osm<{ code: string }>(
    () => call("POST", "/v1/osm/line-link-code", { auth: true }),
    mockBackend.createLineLinkCode,
  );

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  if (useMock) return mockBackend.register(payload).catch(rethrowMock);
  return call("POST", "/v1/public/register", { body: payload });
}

export const isMockBackend = useMock;
