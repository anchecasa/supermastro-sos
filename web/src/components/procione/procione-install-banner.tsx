"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isProcioneStandalone } from "@/lib/procione/focus-agenda";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type ProcioneInstallBannerProps = {
  variant?: "procione" | "agenda";
  prominent?: boolean;
};

export function ProcioneInstallBanner({
  variant = "procione",
  prominent = false,
}: ProcioneInstallBannerProps) {
  const storageKey =
    variant === "agenda" ? "agenda-install-dismissed" : "procione-install-dismissed";

  const [hidden, setHidden] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isProcioneStandalone()) return;
    if (window.localStorage.getItem(storageKey) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !isProcioneStandalone()) {
      setHidden(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [storageKey]);

  if (hidden) return null;

  const title =
    variant === "agenda" ? "Scarica la PWA Agenda" : "Installa Procione sul telefono";
  const description =
    variant === "agenda"
      ? "Aggiungi anchecasa.it/agenda alla home: ascolto vocale sempre attivo, di' «we we» per aprire l'agenda."
      : "Aggiungi alla home: di' «we we» con l'app aperta e si apre l'agenda. Tieni lo schermo acceso (Procione resta in ascolto).";

  return (
    <div
      className={
        prominent
          ? "mb-4 rounded-2xl border-2 border-[#F27131]/30 bg-gradient-to-br from-orange-50 to-white p-4 text-sm shadow-md"
          : "mb-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm"
      }
    >
      <div className="flex items-start gap-2">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#F27131]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p>
          {deferred ? (
            <button
              type="button"
              onClick={async () => {
                await deferred.prompt();
                setHidden(true);
              }}
              className={
                prominent
                  ? "mt-3 w-full rounded-xl bg-[#F27131] px-4 py-3 text-sm font-semibold text-white shadow"
                  : "mt-2 rounded-xl bg-[#F27131] px-3 py-2 text-xs font-semibold text-white"
              }
            >
              {variant === "agenda" ? "Scarica PWA" : "Installa app"}
            </button>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              iPhone: Condividi → Aggiungi a Home. Android: Menu → Installa app.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={() => {
            window.localStorage.setItem(storageKey, "1");
            setHidden(true);
          }}
          className="rounded-full p-1 text-gray-400 hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
