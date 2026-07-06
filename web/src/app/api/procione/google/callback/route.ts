import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { exchangeGoogleCode } from "@/lib/procione/google-calendar";
import { getProcioneEnv } from "@/lib/procione/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const { siteUrl } = getProcioneEnv();
  const redirectBase = `${siteUrl}/procione/agenda`;

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${redirectBase}?google=error`);
  }

  let uid: string;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString()) as { uid?: string };
    if (!state.uid) throw new Error("state invalid");
    uid = state.uid;
  } catch {
    return NextResponse.redirect(`${redirectBase}?google=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== uid || !isAdminEmail(user.email)) {
    return NextResponse.redirect(`${redirectBase}?google=unauthorized`);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${redirectBase}?google=no_refresh`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase.from("assistant_google_tokens").upsert({
      owner_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      calendar_id: "primary",
    });

    return NextResponse.redirect(`${redirectBase}?google=connected`);
  } catch {
    return NextResponse.redirect(`${redirectBase}?google=error`);
  }
}
