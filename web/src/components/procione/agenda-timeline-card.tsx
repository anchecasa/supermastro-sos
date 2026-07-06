"use client";

import { Calendar, ChevronRight } from "lucide-react";
import type { AssistantAppointment } from "@/lib/procione/types";
import { cn } from "@/lib/utils";

const ORANGE = "#F27131";

const COLOR_STYLES: Record<
  AssistantAppointment["color"],
  { bar: string; card: string; dot: string }
> = {
  orange: {
    bar: "bg-[#F27131]",
    card: "bg-[#FFF4ED] border-[#F27131]/20",
    dot: "bg-[#F27131]",
  },
  green: {
    bar: "bg-emerald-500",
    card: "bg-emerald-50/90 border-emerald-200",
    dot: "bg-emerald-500",
  },
  blue: {
    bar: "bg-sky-500",
    card: "bg-sky-50/90 border-sky-200",
    dot: "bg-sky-500",
  },
  purple: {
    bar: "bg-violet-500",
    card: "bg-violet-50/90 border-violet-200",
    dot: "bg-violet-500",
  },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatCardMeta(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatBadge(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

type AgendaTimelineCardProps = {
  appointment: AssistantAppointment;
  selected?: boolean;
  onSelect: () => void;
};

export function AgendaTimelineCard({ appointment, selected, onSelect }: AgendaTimelineCardProps) {
  const styles = COLOR_STYLES[appointment.color];
  const metaParts = [
    appointment.contact_name,
    formatCardMeta(appointment.starts_at),
  ].filter(Boolean);

  return (
    <div className="relative mb-4">
      <span className="absolute -left-14 top-4 w-12 text-right text-xs font-semibold tabular-nums text-gray-600">
        {formatTime(appointment.starts_at)}
      </span>
      <span
        className={cn(
          "absolute -left-[1.65rem] top-[1.15rem] h-3 w-3 rounded-full border-2 border-white shadow-sm",
          styles.dot,
          selected && "ring-2 ring-[#F27131]/50 ring-offset-1"
        )}
      />
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md",
          styles.card,
          selected && "ring-2 ring-[#F27131]/45 shadow-md"
        )}
      >
        <div className="flex gap-3">
          <span className={cn("mt-0.5 w-1 shrink-0 rounded-full", styles.bar)} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold leading-snug text-gray-900">
                {formatTime(appointment.starts_at)} — {appointment.title}
              </p>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold capitalize text-white"
                style={{ backgroundColor: ORANGE }}
              >
                {formatBadge(appointment.starts_at)}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate">{metaParts.join(", ")}</span>
            </p>
            {appointment.location && (
              <p className="mt-1 truncate text-xs text-gray-400">{appointment.location}</p>
            )}
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
        </div>
      </button>
    </div>
  );
}
