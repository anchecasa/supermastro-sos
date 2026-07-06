import { unlockMatchContact } from "@/app/supermastro/actions";

type Props = {
  matchId: string;
};

export async function MatchedContactCard({ matchId }: Props) {
  const { data: contact, error } = await unlockMatchContact(matchId);

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    );
  }

  if (!contact) return null;

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-6 space-y-3">
      <p className="text-xs font-medium uppercase text-green-700">Mastro trovato</p>
      <p className="text-xl font-semibold text-zinc-900">
        {contact.display_name ?? "Il tuo mastro"}
      </p>
      <p className="text-sm text-zinc-600">Ti contatterà a breve.</p>
      {contact.phone && (
        <a
          href={`tel:${contact.phone}`}
          className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
        >
          Chiama {contact.phone}
        </a>
      )}
      {contact.email && (
        <p className="text-sm text-zinc-600">{contact.email}</p>
      )}
    </div>
  );
}
