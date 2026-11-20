"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Calls router.refresh() every `seconds`, only while this tab is visible (CLAUDE.md §7.3). */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
