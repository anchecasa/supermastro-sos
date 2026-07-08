import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";

export const AGENDA_GATE_COOKIE = "agenda_gate";
export const AGENDA_PUBLIC_PATH = "/agenda";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getAgendaAccessCode(): string {
  return process.env.AGENDA_ACCESS_CODE?.trim() || "242424";
}

function getGateSecret(): string {
  return (
    process.env.AGENDA_GATE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ||
    "agenda-gate-dev-only"
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", getGateSecret()).update(payload).digest("base64url");
}

export function createAgendaGateToken(userId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

export function parseAgendaGateToken(token: string | undefined | null): { userId: string; exp: number } | null {
  if (!token?.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expRaw, sig] = parts;
  if (!userId || !expRaw || !sig) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  const payload = `${userId}.${expRaw}`;
  const expected = signPayload(payload);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return { userId, exp };
}

export async function resolveProcioneAdminUser(): Promise<{ id: string; email: string } | null> {
  try {
    const admin = createAdminClient();
    const targets = new Set(getAdminEmails());
    if (!targets.size) return null;

    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;

      for (const user of data.users) {
        const email = user.email?.toLowerCase();
        if (email && targets.has(email)) {
          return { id: user.id, email: user.email! };
        }
      }

      if (data.users.length < 200) break;
    }
  } catch {
    return null;
  }

  return null;
}

export async function readAgendaGateSession(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AGENDA_GATE_COOKIE)?.value;
  const parsed = parseAgendaGateToken(token);
  if (!parsed) return null;

  const admin = await resolveProcioneAdminUser();
  if (!admin || admin.id !== parsed.userId) return null;

  return { userId: parsed.userId, email: admin.email };
}

export function agendaGateUser(userId: string, email: string): User {
  return {
    id: userId,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User;
}

export function agendaGateCookieOptions(maxAgeSeconds = 30 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
