"use client";

import { useCallback, useEffect, useState } from "react";

// Checklist progress is kept in this browser, per app.
export function useProgress(slug: string) {
  const key = `oauthready:progress:${slug}`;
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {
      setDone({});
    }
  }, [key]);

  const set = useCallback(
    (id: string, value: boolean) =>
      setDone((prev) => {
        const next = { ...prev, [id]: value };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage blocked; progress lasts for this visit only.
        }
        return next;
      }),
    [key]
  );

  return { done, set };
}

