import Link from "next/link";

import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { RequestStatusTracker } from "@/components/supermastro/request-status-tracker";

import { MatchedContactCard } from "@/components/supermastro/matched-contact-card";

import { DemoRichiestaView } from "@/components/supermastro/demo-richiesta-view";

import { DisputeForm } from "@/components/dispute/dispute-form";

import { openDispute } from "@/app/supermastro/actions";

import { isDemoRequestId } from "@/lib/sos/demo";

import type { RequestStatus } from "@/lib/sos/constants";



export default async function RichiestaPage({

  params,

}: {

  params: Promise<{ id: string }>;

}) {

  const { id } = await params;



  if (isDemoRequestId(id)) {

    return <DemoRichiestaView requestId={id} />;

  }



  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    redirect(`/supermastro/auth/login?next=/supermastro/richiesta/${id}`);

  }



  const { data: request } = await supabase

    .from("service_requests")

    .select("id, status, expires_at, client_id")

    .eq("id", id)

    .single();



  if (!request || request.client_id !== user.id) {

    notFound();

  }



  const { data: match } = await supabase

    .from("matches")

    .select("id")

    .eq("request_id", id)

    .maybeSingle();



  return (

    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">

      <Link href="/supermastro" className="text-sm text-blue-600 hover:underline">

        ← Torna a SuperMastro

      </Link>



      <RequestStatusTracker

        requestId={request.id}

        initialStatus={request.status as RequestStatus}

        expiresAt={request.expires_at}

      />



      {request.status === "matched" && match && (

        <>

          <MatchedContactCard matchId={match.id} />

          <DisputeForm matchId={match.id} role="client" submitDispute={openDispute} />

        </>

      )}



      {request.status === "draft" && (

        <Link

          href="/supermastro/nuova"

          className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium"

        >

          Completa la richiesta

        </Link>

      )}

    </div>

  );

}


