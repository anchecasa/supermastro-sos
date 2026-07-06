"use client";

import type { AssistantAppointment } from "@/lib/procione/types";
import { addDays, appointmentsForDay, COLOR_MAP, sameDay, startOfDay } from "./calendar-utils";

type MonthViewProps = {
  anchor: Date;
  appointments: AssistantAppointment[];
  onSelectDay: (d: Date) => void;
};

export function MonthView({ anchor, appointments, onSelectDay }: MonthViewProps) {
  const first = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-medium uppercase text-gray-400">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-xl bg-gray-100">
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const appts = appointmentsForDay(appointments, d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDay(d)}
              className={`min-h-[72px] bg-white p-1 text-left ${!inMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  sameDay(d, today) ? "bg-[#F27131] font-bold text-white" : "text-gray-700"
                }`}
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {appts.slice(0, 2).map((a) => (
                  <span
                    key={a.id}
                    className="block truncate rounded px-1 text-[9px] text-white"
                    style={{ backgroundColor: COLOR_MAP[a.color] }}
                  >
                    {a.title}
                  </span>
                ))}
                {appts.length > 2 && (
                  <span className="text-[9px] text-gray-400">+{appts.length - 2}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
