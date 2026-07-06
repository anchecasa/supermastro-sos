"use client";

import type { AssistantAppointment } from "@/lib/procione/types";
import { addDays, appointmentsForDay, COLOR_MAP, formatTime, sameDay, startOfDay } from "./calendar-utils";

type WeekViewProps = {
  anchor: Date;
  appointments: AssistantAppointment[];
  onSelect: (a: AssistantAppointment) => void;
  onDayClick?: (d: Date) => void;
};

export function WeekView({ anchor, appointments, onSelect, onDayClick }: WeekViewProps) {
  const start = startOfDay(anchor);
  const dayOfWeek = start.getDay() || 7;
  start.setDate(start.getDate() - dayOfWeek + 1);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid min-w-[560px] grid-cols-7 border-b border-gray-100">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onDayClick?.(d)}
            className="border-r border-gray-100 px-1 py-2 text-center last:border-r-0"
          >
            <p className="text-[10px] uppercase text-gray-400">
              {new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(d)}
            </p>
            <p
              className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                sameDay(d, today) ? "bg-[#F27131] text-white" : "text-gray-800"
              }`}
            >
              {d.getDate()}
            </p>
          </button>
        ))}
      </div>
      <div className="grid min-w-[560px] grid-cols-7">
        {days.map((d) => {
          const appts = appointmentsForDay(appointments, d);
          return (
            <div key={`col-${d.toISOString()}`} className="min-h-[320px] border-r border-gray-100 p-1 last:border-r-0">
              {appts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelect(a)}
                  className="mb-1 w-full rounded-md px-1.5 py-1 text-left text-[10px] text-white"
                  style={{ backgroundColor: COLOR_MAP[a.color] }}
                >
                  <span className="font-semibold">{formatTime(a.starts_at)}</span>
                  <span className="ml-1 truncate">{a.title}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
