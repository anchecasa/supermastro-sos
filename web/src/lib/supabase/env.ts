const PLACEHOLDER_HOST = "placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";
const DEFAULT_SUPABASE_URL = "https://edsvmnxojsmknjuhobqa.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_QbYv61SkMkjA9_GGb1hhOA_6v6GEw87";

function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url && !url.includes(PLACEHOLDER_HOST)) return url;
  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseKey(): string {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (anon && anon !== PLACEHOLDER_KEY) return anon;
  if (publishable && publishable !== PLACEHOLDER_KEY) return publishable;
  return DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

export function getSupabasePublicConfig() {
  return { url: resolveSupabaseUrl(), key: resolveSupabaseKey() };
}
