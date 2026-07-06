import { createClient } from "@/lib/supabase/server";

import {

  getDefaultHomePath,

  REGISTRATION_CONSENT_PURPOSE,

  sanitizeAuthNextPath,

  type UserRole,

} from "@/lib/constants";

import { NextResponse, type NextRequest } from "next/server";



async function resolvePostAuthPath(

  supabase: Awaited<ReturnType<typeof createClient>>,

  role: UserRole,

  next: string | null

): Promise<string> {

  if (next) {

    return next;

  }



  if (role === "worker") {

    const {

      data: { user },

    } = await supabase.auth.getUser();



    if (user) {

      const { data: worker } = await supabase

        .from("workers")

        .select("status")

        .eq("user_id", user.id)

        .maybeSingle();



      if (!worker || worker.status === "registered") {

        return "/supermastro/profilo/onboarding";

      }

    }

  }



  return getDefaultHomePath(role);

}



async function handleAuthCallback(

  request: NextRequest,

  role: UserRole

) {

  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  const next = sanitizeAuthNextPath(searchParams.get("next"), role);

  const homePath = getDefaultHomePath(role);

  const redirectUrl = new URL(homePath, origin);



  if (!code) {

    redirectUrl.searchParams.set("auth", "error");

    return NextResponse.redirect(redirectUrl);

  }



  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);



  if (error) {

    redirectUrl.searchParams.set("auth", "error");

    return NextResponse.redirect(redirectUrl);

  }



  await supabase.rpc("log_registration_consent", {

    p_purpose: REGISTRATION_CONSENT_PURPOSE,

    p_version: "1.0",

  });



  const destination = await resolvePostAuthPath(supabase, role, next);

  return NextResponse.redirect(new URL(destination, origin));

}



export async function supermastroAuthCallback(request: NextRequest) {

  return handleAuthCallback(request, "client");

}



export async function artigianoAuthCallback(request: NextRequest) {

  return handleAuthCallback(request, "worker");

}


