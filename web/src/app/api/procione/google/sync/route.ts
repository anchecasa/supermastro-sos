import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import {
  getValidAccessToken,
  listGoogleEvents,
  type GoogleTokens,
} from "@/lib/procione/google-calendar";

export async function POST() {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;

  const { data: tokens } = await supabase
    .from("assistant_google_tokens")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!tokens) {
    return NextResponse.json({ error: "Google Calendar non collegato." }, { status: 400 });
  }

  const accessToken = await getValidAccessToken(tokens as GoogleTokens, async (access, expiresAt) => {
    await supabase
      .from("assistant_google_tokens")
      .update({ access_token: access, expires_at: expiresAt.toISOString() })
      .eq("owner_id", user.id);
  });

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 30);

  const events = await listGoogleEvents(
    accessToken,
    (tokens as GoogleTokens).calendar_id || "primary",
    now.toISOString(),
    end.toISOString()
  );

  let imported = 0;
  let updated = 0;
  for (const ev of events) {
    const starts = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T09:00:00+01:00` : null);
    const ends = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T10:00:00+01:00` : null);
    if (!starts || !ends || !ev.summary) continue;

    const { data: existing } = await supabase
      .from("assistant_appointments")
      .select("id, title, starts_at, ends_at, location, description")
      .eq("owner_id", user.id)
      .eq("google_event_id", ev.id)
      .maybeSingle();

    if (existing) {
      const patch: Record<string, string | null> = {};
      if (existing.title !== ev.summary) patch.title = ev.summary;
      if (existing.starts_at !== starts) patch.starts_at = starts;
      if (existing.ends_at !== ends) patch.ends_at = ends;
      if ((existing.location ?? null) !== (ev.location ?? null)) patch.location = ev.location ?? null;
      if ((existing.description ?? null) !== (ev.description ?? null)) patch.description = ev.description ?? null;

      if (Object.keys(patch).length) {
        const { error } = await supabase
          .from("assistant_appointments")
          .update(patch)
          .eq("id", existing.id);
        if (!error) updated++;
      }
      continue;
    }

    const { error } = await supabase.from("assistant_appointments").insert({
      owner_id: user.id,
      title: ev.summary,
      description: ev.description ?? null,
      location: ev.location ?? null,
      starts_at: starts,
      ends_at: ends,
      source: "google",
      google_event_id: ev.id,
      color: "blue",
    });

    if (!error) imported++;
  }

  return NextResponse.json({ imported, updated, total: events.length });
}

export async function GET() {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data } = await auth.supabase
    .from("assistant_google_tokens")
    .select("updated_at, calendar_id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({ connected: Boolean(data), meta: data });
}
