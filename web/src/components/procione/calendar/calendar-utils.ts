import type { AssistantAppointment } from "@/lib/procione/types";

export type CalendarViewMode = "day" | "week" | "month";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function appointmentsForDay(appointments: AssistantAppointment[], day: Date) {
  return appointments.filter((a) => sameDay(new Date(a.starts_at), day));
}

export function formatDayHeader(d: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export const HOUR_HEIGHT = 56;
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;

export function eventTopPercent(startsAt: string) {
  const d = new Date(startsAt);
  const minutes = (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
  const total = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  return Math.max(0, Math.min(100, (minutes / total) * 100));
}

export function eventHeightPercent(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const mins = Math.max(30, (e.getTime() - s.getTime()) / 60000);
  const total = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  return Math.max(8, Math.min(100, (mins / total) * 100));
}

export const COLOR_MAP: Record<AssistantAppointment["color"], string> = {
  orange: "#F27131",
  green: "#10b981",
  blue: "#0ea5e9",
  purple: "#8b5cf6",
};
