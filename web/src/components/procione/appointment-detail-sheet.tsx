"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, MapPin, User, X } from "lucide-react";
import type { AssistantAppointment } from "@/lib/procione/types";

const PROCIONE_AVATAR = "/images/supermastro-mezzobusto.png";
const ORANGE = "#F27131";

type AppointmentDetailSheetProps = {
  appointment: AssistantAppointment;
  onClose: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatShortBadge(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function buildSubtitle(appt: AssistantAppointment): string {
  const parts: string[] = [];
  if (appt.contact_name) parts.push(appt.contact_name);
  if (appt.location) parts.push(appt.location);
  if (appt.description) parts.push(appt.description);
  if (!parts.length) {
    parts.push(`Appuntamento del ${formatLongDate(appt.starts_at)}`);
  }
  return parts.join(" · ");
}

export function AppointmentDetailSheet({
  appointment,
  onClose,
  onDelete,
  deleting,
}: AppointmentDetailSheetProps) {
  const subtitle = buildSubtitle(appointment);

  return (
    <>
      <button
        type="button"
        aria-label="Chiudi dettaglio"
        onClick={onClose}
        className="absolute inset-0 z-50 bg-black/35 backdrop-blur-[2px]"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-0">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="pointer-events-auto relative w-full max-w-sm"
        >
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[42%]">
            <div
              className="relative h-[7.5rem] w-[7.5rem] overflow-hidden rounded-full border-[5px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
              style={{ borderColor: ORANGE }}
            >
              <Image src={PROCIONE_AVATAR} alt="SuperMastro Procione" fill className="object-cover" priority />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-t-[1.75rem] bg-white px-5 pb-8 pt-16 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <div className="space-y-3 pr-8">
              <h2 className="text-[1.05rem] font-bold leading-snug text-gray-900">
                {formatTime(appointment.starts_at)} — {appointment.title}
              </h2>
              <p className="text-sm leading-relaxed text-gray-500">{subtitle}</p>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Calendar className="h-4 w-4 shrink-0 text-[#F27131]" strokeWidth={1.75} />
                <span>
                  {formatLongDate(appointment.starts_at)} · {formatTime(appointment.starts_at)} –{" "}
                  {formatTime(appointment.ends_at)}
                </span>
              </div>
              {appointment.contact_name && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <User className="h-4 w-4 shrink-0 text-[#F27131]" strokeWidth={1.75} />
                  <span>{appointment.contact_name}</span>
                </div>
              )}
              {appointment.location && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 shrink-0 text-[#F27131]" strokeWidth={1.75} />
                  <span>{appointment.location}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                style={{ backgroundColor: ORANGE }}
              >
                {formatShortBadge(appointment.starts_at)}
              </span>
              {onDelete && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={onDelete}
                  className="text-xs font-medium text-gray-400 underline-offset-2 hover:text-red-500 hover:underline disabled:opacity-50"
                >
                  {deleting ? "Eliminazione…" : "Elimina appuntamento"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
