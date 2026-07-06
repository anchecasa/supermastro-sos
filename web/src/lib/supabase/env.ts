const PLACEHOLDER_HOST = "placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";

function resolveSupabaseKey(): string | undefined {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (anon && anon !== PLACEHOLDER_KEY) return anon;
  if (publishable && publishable !== PLACEHOLDER_KEY) return publishable;
  return undefined;
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = resolveSupabaseKey();

  if (!url || url.includes(PLACEHOLDER_HOST)) {
    throw new Error(
      "Supabase non configurato. Verifica web/.env.local (NEXT_PUBLIC_SUPABASE_URL) e riavvia il dev server."
    );
  }

  if (!key) {
    throw new Error(
      "Chiave Supabase mancante. Verifica web/.env.local e riavvia il dev server."
    );
  }

  return { url, key };
}
