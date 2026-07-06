const PLACEHOLDER_HOST = "placeholder.supabase.co";

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || url.includes(PLACEHOLDER_HOST)) {
    throw new Error(
      "Supabase non configurato. Verifica web/.env.local (NEXT_PUBLIC_SUPABASE_URL) e riavvia il dev server."
    );
  }

  if (!key || key === "placeholder-key") {
    throw new Error(
      "Chiave Supabase mancante. Verifica web/.env.local e riavvia il dev server."
    );
  }

  return { url, key };
}
