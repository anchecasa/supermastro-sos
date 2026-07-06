import type { ConciergePlaceResult, ConciergeSearchResult } from "@/lib/procione/concierge";

export type PlaceSaveSelection = {
  place: ConciergePlaceResult & { kind: "restaurant" | "hotel"; city: string };
  index: number;
};

const ORDINALS: Record<string, number> = {
  primo: 0,
  first: 0,
  "1": 0,
  secondo: 1,
  second: 1,
  "2": 1,
  terzo: 2,
  third: 2,
  "3": 2,
};

export function parsePlaceSaveIntent(
  transcript: string,
  lastSearch?: ConciergeSearchResult | null
): PlaceSaveSelection | null {
  if (!lastSearch || lastSearch.kind === "train" || !lastSearch.places?.length) return null;

  const t = transcript.toLowerCase();
  const isSave =
    /(?:ho\s+)?prenotato|mi\s+sono\s+trovato\s+bene|salva(?:re)?|memorizza(?:re)?|tieni\s+presente|segna/.test(
      t
    );
  if (!isSave) return null;

  let index = 0;
  for (const [word, idx] of Object.entries(ORDINALS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) {
      index = idx;
      break;
    }
  }

  const nameMatch = transcript.match(
    /(?:ristorante|albergo|hotel)\s+([A-Za-zÀ-ÿ0-9\s'&.-]{2,40})/i
  );
  if (nameMatch?.[1]) {
    const name = nameMatch[1].trim().toLowerCase();
    const byName = lastSearch.places.findIndex((p) => p.name.toLowerCase().includes(name));
    if (byName >= 0) index = byName;
  }

  const place = lastSearch.places[Math.min(index, lastSearch.places.length - 1)];
  if (!place) return null;

  return {
    place: {
      ...place,
      kind: lastSearch.kind as "restaurant" | "hotel",
      city: lastSearch.destination,
    },
    index,
  };
}

export function buildPlaceSaveSummary(selection: PlaceSaveSelection): string {
  const label = selection.place.kind === "hotel" ? "albergo" : "ristorante";
  return `Memorizzo ${label} «${selection.place.name}» a ${selection.place.city} tra i tuoi posti preferiti. Confermi? Di' ok.`;
}
