// Server-side wrapper around the FastAPI backend (CLAUDE.md §3).
// The browser never calls the backend directly; everything goes through Server Components/Actions.
import "server-only";

import { cookies, headers as requestHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE } from "./constants";
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

async function session(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Browser IP for the backend's rate limits (login per IP + phone, register per IP). */
async function clientIp(): Promise<string | null> {
  const h = await requestHeaders();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
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
  const ip = await clientIp();
  if (ip) headers["X-Client-IP"] = ip;
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

/** OSM calls: an expired/invalid session sends the user back to /login. */
async function osm<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login?expired=1");
    throw e;
  }
}

const seg = encodeURIComponent;

export const login = (phone: string, password: string) =>
  call<LoginResult>("POST", "/v1/osm/login", { body: { phone, password } });

// cache(): the dashboard layout and page both need these; one backend call per request.
export const getMe = cache(() => osm(() => call<OsmMe>("GET", "/v1/osm/me", { auth: true })));

export const getDashboard = cache(() =>
  osm(() => call<DashboardData>("GET", "/v1/osm/dashboard", { auth: true })),
);

export const getDailyDigest = (date?: string) =>
  osm(() =>
    call<DailyDigest>("GET", `/v1/osm/daily-digest${date ? `?date=${seg(date)}` : ""}`, {
      auth: true,
    }),
  );

export const getElderDaily = (elderId: string, days = 14) =>
  osm(() =>
    call<ElderDaily>("GET", `/v1/osm/elders/${seg(elderId)}/daily?days=${days}`, { auth: true }),
  );

export const resolveCall = (elderId: string, callId: string, note: string | null) =>
  osm(() =>
    call("POST", `/v1/osm/calls/${seg(elderId)}/${seg(callId)}/resolve`, {
      auth: true,
      body: { note },
    }),
  );

export const completeTask = (elderId: string, taskId: string, note: string | null) =>
  osm(() =>
    call("POST", `/v1/osm/tasks/${seg(elderId)}/${seg(taskId)}/complete`, {
      auth: true,
      body: { note },
    }),
  );

export const createLineLinkCode = () =>
  osm(() => call<{ code: string }>("POST", "/v1/osm/line-link-code", { auth: true }));

export const register = (payload: RegisterPayload) =>
  call<RegisterResult>("POST", "/v1/public/register", { body: payload });
