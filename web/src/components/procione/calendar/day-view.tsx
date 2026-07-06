"use client";

import type { AssistantAppointment } from "@/lib/procione/types";
import {
  appointmentsForDay,
  COLOR_MAP,
  DAY_END_HOUR,
  DAY_START_HOUR,
  eventHeightPercent,
  eventTopPercent,
  formatTime,
  HOUR_HEIGHT,
} from "./calendar-utils";

type DayViewProps = {
  day: Date;
  appointments: AssistantAppointment[];
  onSelect: (a: AssistantAppointment) => void;
};

export function DayView({ day, appointments, onSelect }: DayViewProps) {
  const dayAppts = appointmentsForDay(appointments, day);
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
  const now = new Date();
  const showNow = day.toDateString() === now.toDateString();
  const nowTop = eventTopPercent(now.toISOString());

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="relative flex">
        <div className="w-12 shrink-0 border-r border-gray-100 bg-gray-50/80">
          {hours.map((h) => (
            <div key={h} className="flex h-14 items-start justify-end pr-1 pt-1 text-[10px] text-gray-400">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="relative min-h-[840px] flex-1" style={{ height: hours.length * HOUR_HEIGHT }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-gray-100"
              style={{ top: `${((h - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR + 1)) * 100}%` }}
            />
          ))}
          {showNow && (
            <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: `${nowTop}%` }}>
              <span className="h-2 w-2 rounded-full bg-[#F27131]" />
              <span className="h-0.5 flex-1 bg-[#F27131]" />
            </div>
          )}
          {dayAppts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a)}
              className="absolute inset-x-1 z-20 overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm transition hover:brightness-95"
              style={{
                top: `${eventTopPercent(a.starts_at)}%`,
                height: `${eventHeightPercent(a.starts_at, a.ends_at)}%`,
                backgroundColor: COLOR_MAP[a.color],
                minHeight: 28,
              }}
            >
              <p className="truncate text-xs font-semibold">{a.title}</p>
              <p className="truncate text-[10px] opacity-90">
                {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
