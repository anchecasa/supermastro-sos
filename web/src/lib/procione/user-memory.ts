import type { SupabaseClient } from "@supabase/supabase-js";
import { findContactByName } from "@/lib/procione/upsert";

export type ContactAlias = {
  alias: string;
  resolved_name: string;
  contact_id: string | null;
};

export type UserMemory = {
  aliases: ContactAlias[];
  preferences: Record<string, string>;
};

export type MemoryIntent =
  | { kind: "alias"; alias: string; resolvedName: string }
  | { kind: "preference"; key: string; value: string };

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMemoryIntent(transcript: string): MemoryIntent | null {
  const text = transcript.trim();
  if (!text) return null;

  const aliasPatterns = [
    /quando\s+dico\s+(.+?)\s+intendo\s+(.+)/i,
    /ricorda\s+che\s+(.+?)\s+(?:è|e)\s+(?:sempre\s+)?(.+)/i,
    /(?:memorizza|salva)\s+correzione[:\s]+quando\s+dico\s+(.+?)\s+intendo\s+(.+)/i,
    /(.+?)\s+(?:è|e)\s+sempre\s+(.+)/i,
  ];

  for (const pattern of aliasPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const alias = match[1]?.trim();
    const resolvedName = match[2]?.trim().replace(/[.!?]+$/, "");
    if (alias && resolvedName && alias.length >= 2 && resolvedName.length >= 2) {
      if (/^(il|la|mio|mia)\s+orario/.test(alias.toLowerCase())) continue;
      return { kind: "alias", alias, resolvedName };
    }
  }

  const defaultHour = text.match(
    /(?:orario\s+preferito|preferisco\s+(?:gli\s+)?appuntament\w*)\s+(?:alle?\s*)?(\d{1,2})(?:[:.](\d{2}))?/i
  );
  if (defaultHour) {
    const hour = Number(defaultHour[1]);
    const minute = defaultHour[2] ? Number(defaultHour[2]) : 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        kind: "preference",
        key: "default_appointment_hour",
        value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      };
    }
  }

  return null;
}

export async function loadUserMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<UserMemory> {
  const [{ data: aliases }, { data: prefs }] = await Promise.all([
    supabase
      .from("assistant_contact_aliases")
      .select("alias, resolved_name, contact_id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("assistant_preferences")
      .select("pref_key, pref_value")
      .eq("owner_id", userId),
  ]);

  const preferences: Record<string, string> = {};
  for (const p of prefs ?? []) {
    preferences[p.pref_key] = p.pref_value;
  }

  return {
    aliases: (aliases ?? []) as ContactAlias[],
    preferences,
  };
}

export function buildMemoryContextBlock(memory: UserMemory): string {
  const lines: string[] = [];
  if (memory.aliases.length) {
    lines.push(
      `Alias contatti memorizzati: ${memory.aliases
        .slice(0, 20)
        .map((a) => `"${a.alias}" -> ${a.resolved_name}`)
        .join("; ")}`
    );
  }
  const defaultHour = memory.preferences.default_appointment_hour;
  if (defaultHour) {
    lines.push(`Orario preferito appuntamenti: ${defaultHour}`);
  }
  return lines.join("\n");
}

export function resolveContactName(name: string, memory: UserMemory): string {
  const key = normalizeAlias(name);
  const hit = memory.aliases.find((a) => normalizeAlias(a.alias) === key);
  return hit?.resolved_name ?? name;
}

export function enrichContactsWithAliases<
  T extends { full_name: string; phone: string | null }
>(contacts: T[], memory: UserMemory): T[] {
  if (!memory.aliases.length) return contacts;
  const extra: T[] = [];
  for (const alias of memory.aliases) {
    const existing = contacts.find(
      (c) => c.full_name.toLowerCase() === alias.resolved_name.toLowerCase()
    );
    if (existing) continue;
    extra.push({
      full_name: alias.resolved_name,
      phone: null,
    } as T);
  }
  return [...contacts, ...extra];
}

export async function applyMemoryIntent(
  supabase: SupabaseClient,
  userId: string,
  intent: MemoryIntent
): Promise<{ reply: string }> {
  if (intent.kind === "preference") {
    const { error } = await supabase.from("assistant_preferences").upsert(
      {
        owner_id: userId,
        pref_key: intent.key,
        pref_value: intent.value,
      },
      { onConflict: "owner_id,pref_key" }
    );
    if (error) throw new Error(error.message);

    if (intent.key === "default_appointment_hour") {
      return {
        reply: `Memorizzato Fernando: per i nuovi appuntamenti userò le ${intent.value} come orario preferito.`,
      };
    }
    return { reply: "Preferenza salvata." };
  }

  const aliasKey = normalizeAlias(intent.alias);
  const contact = await findContactByName(supabase, userId, intent.resolvedName);

  const { error } = await supabase.from("assistant_contact_aliases").upsert(
    {
      owner_id: userId,
      alias: aliasKey,
      resolved_name: intent.resolvedName,
      contact_id: contact?.id ?? null,
    },
    { onConflict: "owner_id,alias" }
  );
  if (error) throw new Error(error.message);

  return {
    reply: `Ok Fernando, quando dici "${intent.alias}" intendo ${intent.resolvedName}.`,
  };
}

export function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function buildAliasMap(memory: UserMemory): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of memory.aliases) {
    map.set(a.alias.trim().toLowerCase(), a.resolved_name);
  }
  return map;
}

export function parseDefaultAppointmentTime(
  memory: UserMemory
): { hour: number; minute: number } | undefined {
  const raw = memory.preferences.default_appointment_hour;
  if (!raw) return undefined;
  const [h, m] = raw.split(":").map(Number);
  if (!Number.isFinite(h) || h < 0 || h > 23) return undefined;
  const minute = Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0;
  return { hour: h, minute };
}
