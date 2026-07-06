"use client";

import { useEffect, useRef } from "react";

type WakeLockSentinel = { release: () => Promise<void> };

/** Tiene lo schermo acceso mentre Procione ascolta (telefono fermo, app aperta). */
export function useProcioneScreenWakeLock(enabled: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      void lockRef.current?.release();
      lockRef.current = null;
      return;
    }

    let cancelled = false;

    async function acquire() {
      try {
        if (document.visibilityState !== "visible" || cancelled) return;
        const sentinel = await (
          navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }
        ).wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        lockRef.current = sentinel;
      } catch {
        /* permesso negato o non supportato */
      }
    }

    void acquire();

    const onVisible = () => {
      if (document.visibilityState === "visible" && enabled) void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [enabled]);
}
