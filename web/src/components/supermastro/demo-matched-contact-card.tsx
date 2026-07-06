import { DEMO_MATCHED_CONTACT } from "@/lib/sos/demo";

type Props = {
  skillLabel?: string;
  distanceKm?: number;
  etaMinutes?: number;
};

export function DemoMatchedContactCard({
  skillLabel = DEMO_MATCHED_CONTACT.skill_label,
  distanceKm = DEMO_MATCHED_CONTACT.distance_km,
  etaMinutes = DEMO_MATCHED_CONTACT.eta_minutes,
}: Props) {
  const contact = DEMO_MATCHED_CONTACT;

  return (
    <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-6">
      <p className="text-xs font-medium uppercase text-green-700">Mastro trovato</p>
      <p className="text-xl font-semibold text-zinc-900">{contact.display_name}</p>
      <p className="text-sm text-zinc-600">
        {skillLabel} verificato · ~{distanceKm} km · arrivo stimato {etaMinutes} min
      </p>
      <p className="text-sm text-zinc-600">Ti contatterà a breve.</p>
      <a
        href={`tel:${contact.phone.replace(/\s/g, "")}`}
        className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
      >
        Chiama {contact.phone}
      </a>
      <p className="text-xs text-zinc-500">Simulazione demo — contatto fittizio</p>
    </div>
  );
}
