"use client";

import { useCallback, useEffect, useState } from "react";
import type { FieldValues, UseFormReset, UseFormWatch } from "react-hook-form";

export function useJobDraft<T extends FieldValues>({
  storageKey,
  watch,
  reset,
}: {
  storageKey: string;
  watch: UseFormWatch<T>;
  reset: UseFormReset<T>;
}) {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      reset(JSON.parse(raw) as T);
      // Defer the indicator update until after the external storage read.
      queueMicrotask(() => setRestored(true));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [reset, storageKey]);

  useEffect(() => {
    const subscription = watch((values) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        // Storage can be disabled or full; the server draft remains canonical.
      }
    });
    return () => subscription.unsubscribe();
  }, [storageKey, watch]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage cleanup failures after a successful save.
    }
    setRestored(false);
  }, [storageKey]);

  return { restored, clear };
}
