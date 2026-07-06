/** Normalizza nomi contatto per match fuzzy (es. "i di Quintini" → "quintini"). */
export function normalizeContactName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\b(i|di|de|del|della|da|il|lo|la|sig|sig\.|dott|dott\.|ing|ing\.)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocation(location: string | null | undefined): string {
  if (!location) return "";
  return location
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function contactNamesMatch(a: string, b: string): boolean {
  const na = normalizeContactName(a);
  const nb = normalizeContactName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = na.split(" ");
  const tb = nb.split(" ");
  return ta.some((t) => t.length > 2 && tb.includes(t)) || tb.some((t) => t.length > 2 && ta.includes(t));
}

export function formatDisplayName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
