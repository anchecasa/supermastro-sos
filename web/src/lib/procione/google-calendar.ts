import { getProcioneEnv } from "@/lib/procione/env";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

type GoogleTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string;
};

export function getGoogleAuthUrl(state: string): string {
  const { googleClientId, siteUrl } = getProcioneEnv();
  const redirectUri = `${siteUrl}/api/procione/google/callback`;
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string) {
  const { googleClientId, googleClientSecret, siteUrl } = getProcioneEnv();
  const redirectUri = `${siteUrl}/api/procione/google/callback`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error(`Google OAuth: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  }>;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { googleClientId, googleClientSecret } = getProcioneEnv();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`Google refresh: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function getValidAccessToken(
  tokens: GoogleTokens,
  updateTokens: (access: string, expiresAt: Date) => Promise<void>
): Promise<string> {
  const expires = new Date(tokens.expires_at).getTime();
  if (expires > Date.now() + 60_000) return tokens.access_token;

  const refreshed = await refreshGoogleAccessToken(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await updateTokens(refreshed.access_token, expiresAt);
  return refreshed.access_token;
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: {
    title: string;
    description?: string | null;
    location?: string | null;
    starts_at: string;
    ends_at: string;
  }
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: event.starts_at, timeZone: "Europe/Rome" },
        end: { dateTime: event.ends_at, timeZone: "Europe/Rome" },
      }),
    }
  );

  if (!res.ok) throw new Error(`Google create event: ${await res.text()}`);
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Google event senza id");
  return data.id;
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: {
    title: string;
    description?: string | null;
    location?: string | null;
    starts_at: string;
    ends_at: string;
  }
) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: event.starts_at, timeZone: "Europe/Rome" },
        end: { dateTime: event.ends_at, timeZone: "Europe/Rome" },
      }),
    }
  );

  if (!res.ok) throw new Error(`Google update event: ${await res.text()}`);
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (res.status !== 204 && res.status !== 410 && !res.ok) {
    throw new Error(`Google delete event: ${await res.text()}`);
  }
}

export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Google list events: ${await res.text()}`);
  const data = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  return data.items ?? [];
}

export type { GoogleTokens };
