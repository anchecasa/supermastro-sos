"use client";

import type { ProcioneDraft } from "@/lib/procione/draft";
import { cn } from "@/lib/utils";

const ORANGE = "#F27131";

type Props = {
  draft: ProcioneDraft;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ProcioneDraftCard({ draft, pending, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-2xl border-2 bg-white p-4 shadow-2xl"
      style={{ borderColor: ORANGE }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#F27131]">In attesa di conferma</p>
      <p className="mt-2 text-sm text-gray-800">{draft.summary}</p>

      {draft.contact && (
        <dl className="mt-3 space-y-1 text-xs text-gray-600">
          <div>
            <dt className="inline font-medium">Nome: </dt>
            <dd className="inline">{draft.contact.full_name}</dd>
          </div>
          {draft.contact.phone && (
            <div>
              <dt className="inline font-medium">Tel: </dt>
              <dd className="inline">{draft.contact.phone}</dd>
            </div>
          )}
          {draft.contact.company && (
            <div>
              <dt className="inline font-medium">Azienda: </dt>
              <dd className="inline">{draft.contact.company}</dd>
            </div>
          )}
        </dl>
      )}

      {draft.marketing && (
        <dl className="mt-3 space-y-1 text-xs text-gray-600">
          <div>
            <dt className="inline font-medium">Campagna: </dt>
            <dd className="inline">{draft.marketing.title}</dd>
          </div>
        </dl>
      )}

      {draft.task && (
        <dl className="mt-3 space-y-1 text-xs text-gray-600">
          <div>
            <dt className="inline font-medium">Soggetto: </dt>
            <dd className="inline">{draft.task.title}</dd>
          </div>
          {draft.task.description && (
            <div>
              <dt className="inline font-medium">Contenuto: </dt>
              <dd className="inline">{draft.task.description}</dd>
            </div>
          )}
          {draft.task.due_at && (
            <div>
              <dt className="inline font-medium">Scadenza: </dt>
              <dd className="inline">
                {new Intl.DateTimeFormat("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(draft.task.due_at))}
              </dd>
            </div>
          )}
        </dl>
      )}

      {draft.placeFavorite && (
        <dl className="mt-3 space-y-1 text-xs text-gray-600">
          <div>
            <dt className="inline font-medium">
              {draft.placeFavorite.kind === "hotel" ? "Albergo" : "Ristorante"}:{" "}
            </dt>
            <dd className="inline">{draft.placeFavorite.name}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Città: </dt>
            <dd className="inline">{draft.placeFavorite.city}</dd>
          </div>
        </dl>
      )}

      {draft.appointment && (
        <dl className="mt-3 space-y-1 text-xs text-gray-600">
          <div>
            <dt className="inline font-medium">Appuntamento: </dt>
            <dd className="inline">{draft.appointment.title}</dd>
          </div>
          {draft.appointment.contact_name && (
            <div>
              <dt className="inline font-medium">Con: </dt>
              <dd className="inline">{draft.appointment.contact_name}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="mt-3 text-[11px] text-gray-500">Di&apos; «ok» o «confermo», oppure usa i pulsanti.</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
        >
          Annulla
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white",
            pending && "opacity-60"
          )}
          style={{ backgroundColor: ORANGE }}
        >
          {pending ? "Salvo…" : "Conferma"}
        </button>
      </div>
    </div>
  );
}
