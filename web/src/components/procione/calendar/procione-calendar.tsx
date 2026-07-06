"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AssistantAppointment } from "@/lib/procione/types";
import { cn } from "@/lib/utils";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { addDays, CalendarViewMode, formatDayHeader, startOfDay } from "./calendar-utils";

type ProcioneCalendarProps = {
  appointments: AssistantAppointment[];
  onSelectAppointment: (a: AssistantAppointment) => void;
};

export function ProcioneCalendar({ appointments, onSelectAppointment }: ProcioneCalendarProps) {
  const [view, setView] = useState<CalendarViewMode>("day");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  function shift(n: number) {
    if (view === "day") setCursor((c) => addDays(c, n));
    else if (view === "week") setCursor((c) => addDays(c, n * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Precedente">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => shift(1)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Successivo">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfDay(new Date()))}
            className="rounded-lg px-2 py-1 text-xs font-medium text-[#F27131] hover:bg-orange-50"
          >
            Oggi
          </button>
        </div>
        <p className="truncate text-sm font-semibold text-gray-900">
          {view === "month"
            ? new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(cursor)
            : formatDayHeader(cursor)}
        </p>
      </div>

      <div className="flex rounded-xl bg-gray-100 p-1">
        {(
          [
            ["day", "Giorno"],
            ["week", "Settimana"],
            ["month", "Mese"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-medium transition",
              view === id ? "bg-white text-[#F27131] shadow-sm" : "text-gray-500"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "day" && (
        <DayView day={cursor} appointments={appointments} onSelect={onSelectAppointment} />
      )}
      {view === "week" && (
        <WeekView
          anchor={cursor}
          appointments={appointments}
          onSelect={onSelectAppointment}
          onDayClick={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      )}
      {view === "month" && (
        <MonthView
          anchor={cursor}
          appointments={appointments}
          onSelectDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      )}
    </div>
  );
}
