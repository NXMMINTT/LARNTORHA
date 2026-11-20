"use server";

import { revalidatePath } from "next/cache";

import { completeTask, createLineLinkCode, resolveCall } from "@/lib/api";

function note(fd: FormData, max: number): string | null {
  const v = String(fd.get("note") ?? "").trim();
  return v ? v.slice(0, max) : null;
}

// Ownership is enforced by the backend from the session — ids here are just routing.
export async function resolveCallAction(elderId: string, callId: string, fd: FormData) {
  await resolveCall(elderId, callId, note(fd, 300));
  revalidatePath("/dashboard");
}

export async function completeTaskAction(elderId: string, taskId: string, fd: FormData) {
  await completeTask(elderId, taskId, note(fd, 300));
  revalidatePath("/dashboard");
}

export async function createLineLinkCodeAction() {
  await createLineLinkCode();
  revalidatePath("/dashboard");
}
