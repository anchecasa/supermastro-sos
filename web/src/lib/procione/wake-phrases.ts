/** Normalizza testo STT per confronto wake word (accenti, punteggiatura). */
export function normalizeWakeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const WAKE_WITH_PROCIONE = [
  /ehi\s+procion/i,
  /hey\s+procion/i,
  /ei\s+procion/i,
  /eh\s+procion/i,
  /e\s+procion/i,
  /ok\s+procion/i,
  /we\s+we\s+procion/i,
  /wi\s+wi\s+procion/i,
  /ui\s+ui\s+procion/i,
  /we\s+procion/i,
  /wi\s+procion/i,
  /ui\s+procion/i,
  /o\s+procion/i,
  /^procion\b/i,
  /\bprocion[, ]/i,
];

/** Varianti fonetiche di «ehi» / «hey» (STT spesso trascrive «we we», «wi wi»…). */
const WAKE_ALONE = [
  /^ehi+\b/,
  /^hey+\b/,
  /^ei+\b/,
  /^eh+\b/,
  /^we+\s+we+\b/,
  /^wi+\s+wi+\b/,
  /^ui+\s+ui+\b/,
  /^eh+\s+eh+\b/,
  /^ei+\s+ei+\b/,
  /\behi+\b/,
  /\bhey+\b/,
  /\bwe+\s+we+\b/,
  /\bwi+\s+wi+\b/,
  /^wee+\s+wee+\b/,
  /\bwee+\s+wee+\b/,
];

export function containsWakePhrase(text: string): boolean {
  const n = normalizeWakeText(text);
  if (!n) return false;
  return (
    WAKE_WITH_PROCIONE.some((re) => re.test(n)) || WAKE_ALONE.some((re) => re.test(n))
  );
}

export function extractCommandAfterWake(text: string): string {
  const n = normalizeWakeText(text);
  return n
    .replace(
      /^.*?(ehi+|hey+|ei+|eh+|ok+|we+\s+we+|wi+\s+wi+|ui+\s+ui+|eh+\s+eh+|ei+\s+ei+|we+|wi+|ui+|o+)\s*procion[e]?\s*[,:\s]*/i,
      ""
    )
    .replace(/^.*?\b(ehi+|hey+|ei+|eh+|we+\s+we+|wee+\s+wee+|wi+\s+wi+|ui+\s+ui+|ue+\s+ue+|vi+\s+vi+|eh+\s+eh+|ei+\s+ei+)\b\s*[,:\s]*/i, "")
    .replace(/^procion[e]?\s*[,:\s]*/i, "")
    .trim();
}
