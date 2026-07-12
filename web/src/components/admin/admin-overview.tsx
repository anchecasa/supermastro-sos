import Link from "next/link";
import {
  SITUATION_PILLS,
  type SituationCounts,
  urgencyLevel,
} from "@/lib/admin-dashboard";

const URGENCY_CLASS = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-red-200 bg-red-50 text-red-800",
};

export function AdminSituationBar({ situation }: { situation: SituationCounts }) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="list"
      aria-label="Situazione operativa"
    >
      {SITUATION_PILLS.map((pill) => {
        const count = situation[pill.key] ?? 0;
        const level = urgencyLevel(count);
        return (
          <Link
            key={pill.key}
            href={pill.href}
            role="listitem"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition hover:brightness-[0.98] ${URGENCY_CLASS[level]}`}
          >
            <span>{pill.label}</span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold tabular-nums">
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminKpiGrid({
  situation,
  metrics,
}: {
  situation: SituationCounts;
  metrics: Record<string, number | null | undefined>;
}) {
  const items = [
    { label: "Talent attivi", value: situation.active_workers },
    { label: "In verifica", value: situation.pending_verification },
    { label: "Annunci aperti", value: situation.open_jobs },
    { label: "SOS oggi", value: metrics.requests_today },
    { label: "SOS 7 gg", value: metrics.requests_7d },
    { label: "Match rate 7 gg (%)", value: metrics.match_rate_7d },
    { label: "Employer attivi", value: situation.active_employers },
    { label: "Dispute aperte", value: situation.open_disputes },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {item.value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
