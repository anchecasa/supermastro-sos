"use client";



import { useEffect, useState } from "react";

import { Calendar, Bell, Sparkles } from "lucide-react";



type IntegrationsProps = {

  googleConnected: boolean;

  pushEnabled: boolean;

  onGoogleSync: () => Promise<void>;

  onWakeToggle: (enable: boolean) => void;

  wakeEnabled: boolean;

};



export function ProcioneIntegrations({

  googleConnected,

  pushEnabled,

  onGoogleSync,

  onWakeToggle,

  wakeEnabled,

}: IntegrationsProps) {

  const [syncing, setSyncing] = useState(false);



  return (

    <section className="mb-4 space-y-2 rounded-2xl bg-white p-3 shadow-sm">

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

    </section>

  );

}



export function ProcioneServiceWorkerRegister() {

  useEffect(() => {

    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/procione/sw.js", { scope: "/procione/" });

  }, []);

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

