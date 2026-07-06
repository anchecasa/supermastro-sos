"use client";

import { Mail } from "lucide-react";

export function MailPlaceholderPanel() {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Mail className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">Mail in arrivo</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
        Presto potrai collegare Gmail o Outlook e leggere le email qui, come su un client mail
        completo. Per ora usa Procione per agenda, contatti e comandi vocali.
      </p>
      <span className="mt-6 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        Prossimamente
      </span>
    </section>
  );
}
