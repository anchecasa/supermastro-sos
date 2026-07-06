import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { unlockMatchContact } from "@/app/artigiano/actions";
import { MatchMediaGallery } from "@/components/artigiano/match-media-gallery";
import { DisputeForm } from "@/components/dispute/dispute-form";
import { ContentPage } from "@/components/layout/content-page";
import { openDispute } from "@/app/artigiano/actions";

export default async function ArtigianoMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/artigiano/auth/login?next=/artigiano/match/${matchId}`);
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, request_id, worker_id")
    .eq("id", matchId)
    .single();

  if (!match) {
    notFound();
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("user_id")
    .eq("id", match.worker_id)
    .single();

  if (!worker || worker.user_id !== user.id) {
    notFound();
  }

  const { data: contact, error } = await unlockMatchContact(matchId);

  return (
    <ContentPage size="sm">
      <Link href="/artigiano/inviti" className="text-sm text-amber-400 hover:underline">
        ← Inviti
      </Link>

      <section className="rounded-2xl border border-green-900/50 bg-green-950/30 p-6 space-y-3">
        <h1 className="text-xl font-bold text-green-300">Match confermato</h1>
        <p className="text-sm text-zinc-300">
          Contatta il cliente entro 15 minuti. Il credito è stato scalato.
        </p>
      </section>

      {error && (
        <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {contact && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-2">
          <p className="text-xs uppercase text-zinc-500">Contatto cliente</p>
          <p className="text-lg font-semibold">
            {contact.display_name ?? "Cliente"}
          </p>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="block text-amber-400 text-xl font-bold"
            >
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <p className="text-sm text-zinc-400">{contact.email}</p>
          )}
        </div>
      )}

      <MatchMediaGallery matchId={matchId} />

      <DisputeForm matchId={matchId} role="worker" submitDispute={openDispute} />
    </ContentPage>
  );
}
