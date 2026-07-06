import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { getGoogleAuthUrl } from "@/lib/procione/google-calendar";
import { isGoogleCalendarConfigured } from "@/lib/procione/env";

export async function GET() {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar non configurato." }, { status: 503 });
  }

  const state = Buffer.from(JSON.stringify({ uid: auth.user.id })).toString("base64url");
  const url = getGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
