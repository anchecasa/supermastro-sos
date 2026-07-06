"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isProcioneStandalone } from "@/lib/procione/focus-agenda";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function ProcioneInstallBanner() {
  const [hidden, setHidden] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isProcioneStandalone()) return;
    if (window.localStorage.getItem("procione-install-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    // iOS: niente beforeinstallprompt — mostra hint installazione
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !isProcioneStandalone()) {
      setHidden(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden) return null;

  return (
    <div className="mb-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#F27131]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Installa Procione sul telefono</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Aggiungi alla home: di&apos; «we we» con l&apos;app aperta e si apre l&apos;agenda. Tieni
            lo schermo acceso (Procione resta in ascolto).
          </p>
          {deferred ? (
            <button
              type="button"
              onClick={async () => {
                await deferred.prompt();
                setHidden(true);
              }}
              className="mt-2 rounded-xl bg-[#F27131] px-3 py-2 text-xs font-semibold text-white"
            >
              Installa app
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
            window.localStorage.setItem("procione-install-dismissed", "1");
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
