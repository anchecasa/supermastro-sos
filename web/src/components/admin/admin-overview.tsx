import Link from "next/link";
import {
  SITUATION_PILLS,
  type SituationCounts,
  urgencyLevel,
} from "@/lib/admin-dashboard";

const URGENCY_CLASS = {
  ok: "border-emerald-800/60 bg-emerald-950/40 text-emerald-300",
  warn: "border-amber-800/60 bg-amber-950/40 text-amber-300",
  urgent: "border-red-800/60 bg-red-950/40 text-red-300",
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
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:brightness-110 ${URGENCY_CLASS[level]}`}
          >
            <span>{pill.label}</span>
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold tabular-nums">
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
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {item.value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
