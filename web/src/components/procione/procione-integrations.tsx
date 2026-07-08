"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Bell, Sparkles, Mic } from "lucide-react";

type IntegrationsProps = {
  googleConnected: boolean;
  pushEnabled: boolean;
  onGoogleSync: () => Promise<void>;
  onWakeToggle: (enable: boolean) => void;
  wakeEnabled: boolean;
};

type AlexaLinkState = {
  linked: boolean;
  pendingCode: string | null;
  pendingExpiresAt: string | null;
};

export function ProcioneIntegrations({
  googleConnected,
  pushEnabled,
  onGoogleSync,
  onWakeToggle,
  wakeEnabled,
}: IntegrationsProps) {
  const [syncing, setSyncing] = useState(false);
  const [alexa, setAlexa] = useState<AlexaLinkState | null>(null);
  const [alexaLoading, setAlexaLoading] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkInstruction, setLinkInstruction] = useState<string | null>(null);

  const refreshAlexa = useCallback(async () => {
    try {
      const res = await fetch("/api/procione/alexa/link");
      if (!res.ok) return;
      const data = (await res.json()) as AlexaLinkState;
      setAlexa(data);
      if (data.pendingCode) setLinkCode(data.pendingCode);
    } catch {
      // Alexa opzionale
    }
  }, []);

  useEffect(() => {
    void refreshAlexa();
  }, [refreshAlexa]);

  async function generateAlexaCode() {
    setAlexaLoading(true);
    try {
      const res = await fetch("/api/procione/alexa/link", { method: "POST" });
      const data = (await res.json()) as {
        code?: string;
        instruction?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Errore generazione codice");
      setLinkCode(data.code ?? null);
      setLinkInstruction(data.instruction ?? null);
      await refreshAlexa();
    } catch (e) {
      setLinkInstruction(e instanceof Error ? e.message : "Errore");
    } finally {
      setAlexaLoading(false);
    }
  }

  return (
    <section className="mb-4 space-y-3 rounded-2xl bg-white p-3 shadow-sm">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Sparkles className="h-3.5 w-3.5 text-[#F27131]" />
        Impostazioni Procione
      </p>

      <div className="flex flex-wrap gap-2">
        {!googleConnected ? (
          <a
            href="/api/procione/google/auth"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-3.5 w-3.5" />
            Collega Google Calendar
          </a>
        ) : (
          <button
            type="button"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                await onGoogleSync();
              } finally {
                setSyncing(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
          >
            <Calendar className="h-3.5 w-3.5" />
            {syncing ? "Sync…" : "Sync Google Calendar"}
          </button>
        )}

        <span
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
            pushEnabled ? "bg-emerald-50 text-emerald-800" : "bg-gray-50 text-gray-500"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          {pushEnabled ? "Promemoria push attivi (15 min)" : "Push al consenso microfono"}
        </span>

        <button
          type="button"
          onClick={() => onWakeToggle(!wakeEnabled)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
            wakeEnabled
              ? "bg-[#F27131] text-white"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {wakeEnabled ? "Ascolto attivo" : "Riattiva ascolto"}
        </button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <Mic className="h-3.5 w-3.5 text-[#F27131]" />
          Amazon Alexa
        </p>
        {alexa?.linked ? (
          <p className="text-xs text-emerald-800">Account Echo collegato. Chiedi l&apos;agenda alla skill SuperMastro.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Collega Echo per leggere e creare appuntamenti vocalmente. Memoria: «quando dico Mario intendo Mario Rossi».
            </p>
            <button
              type="button"
              disabled={alexaLoading}
              onClick={() => void generateAlexaCode()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {alexaLoading ? "Genero…" : "Genera codice collegamento"}
            </button>
            {(linkCode || alexa?.pendingCode) && (
              <p className="rounded-lg bg-white px-2 py-1.5 font-mono text-sm font-bold tracking-widest text-[#F27131]">
                {linkCode ?? alexa?.pendingCode}
              </p>
            )}
            {linkInstruction && <p className="text-xs text-gray-600">{linkInstruction}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

export function ProcioneServiceWorkerRegister({
  swPath = "/procione/sw.js",
  scope = "/procione/",
}: {
  swPath?: string;
  scope?: string;
} = {}) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register(swPath, { scope });
  }, [scope, swPath]);
  return null;
}

export async function subscribeProcionePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push non supportate su questo dispositivo.");
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permesso notifiche negato.");

  const cfg = (await fetch("/api/procione/push/subscribe").then((r) => r.json())) as {
    configured?: boolean;
    publicKey?: string;
  };

  if (!cfg.configured || !cfg.publicKey) {
    throw new Error("VAPID keys non configurate sul server.");
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
  });

  const json = sub.toJSON();
  const res = await fetch("/api/procione/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Errore registrazione push");
  }

  return true;
}

export async function unsubscribeProcionePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/procione/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
