const ITALIAN_CITIES =
  /(?:milano|roma|torino|bologna|napoli|firenze|genova|palermo|bari|verona|padova|trieste|brescia|modena|parma|perugia|venezia|reggio|catania|monza|bergamo|trento)/i;

export type ConciergeKind = "restaurant" | "train" | "hotel";

export type ConciergeIntent = {
  kind: ConciergeKind;
  destination: string;
  origin?: string;
  people?: number;
  budgetMax?: number;
  when?: string;
  versaceCinese?: boolean;
  nearMe?: boolean;
};

function extractCity(text: string, fallback?: string): string | undefined {
  const cityMatch = text.match(new RegExp(`(?:a|per|in|verso|da)\\s+(${ITALIAN_CITIES.source})`, "i"));
  if (cityMatch?.[1]) {
    const c = cityMatch[1];
    return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
  }
  const generic = text.match(/(?:a|per|in|verso)\s+([A-Za-zÀ-ÿ]{3,24})(?:\s|$|[,.])/i);
  return generic?.[1]?.trim() ?? fallback;
}

export function parseConciergeIntent(
  transcript: string,
  meetingDestination?: string
): ConciergeIntent | null {
  const t = transcript.toLowerCase();

  const isTrain =
    /(?:treno|treni|freccia|italo|binari|stazione|andare in treno|prendere il treno)/.test(t);
  const isHotel =
    /(?:hotel|albergo|dormire|pernott|camera|b[\&]?b|bed)/.test(t) && !isTrain;
  const isRestaurant =
    /(?:ristorante|mangiare|pranzo|cena|trattoria|osteria|pizzeria)/.test(t) ||
    (/cerc(?:a|ami|are)/.test(t) && /(?:mangiare|pranzo|cena)/.test(t));

  if (!isTrain && !isHotel && !isRestaurant) return null;

  const nearMe = /(?:qui vicino|vicino a me|intorno a me|nei paraggi|qui attorno)/.test(t);

  const destination =
    nearMe
      ? "vicino a te"
      : extractCity(transcript, meetingDestination) ?? meetingDestination ?? undefined;

  if (!destination && !nearMe) return null;

  const originMatch = transcript.match(/(?:da|partendo da|parto da)\s+([A-Za-zÀ-ÿ]{3,24})/i);
  const peopleMatch = transcript.match(/(?:per|con|siamo in)\s+(\d)\s*(?:person|ospit)/i);
  const budgetMatch = transcript.match(/(?:max|massimo|fino a|budget)\s*(\d{2,4})\s*(?:euro|€)?/i);
  const versaceCinese =
    /qualit[aà].*versace.*prezzo.*cines/.test(t) ||
    /versace.*cines/.test(t) ||
    /prezzo cinese.*qualit[aà] versace/.test(t);

  let when: string | undefined;
  if (/domani\s+mattina/.test(t)) when = "domani mattina";
  else if (/domani\s+pomeriggio/.test(t)) when = "domani pomeriggio";
  else if (/domani/.test(t)) when = "domani";
  else if (/oggi/.test(t)) when = "oggi";
  else {
    const time = transcript.match(/(?:alle|ore)\s*(\d{1,2}(?::\d{2})?)/i);
    if (time) when = `alle ${time[1]}`;
  }

  return {
    kind: isTrain ? "train" : isHotel ? "hotel" : "restaurant",
    destination: destination ?? "vicino a te",
    origin: originMatch?.[1]?.trim(),
    people: peopleMatch ? Number(peopleMatch[1]) : undefined,
    budgetMax: budgetMatch ? Number(budgetMatch[1]) : undefined,
    when,
    versaceCinese,
    nearMe,
  };
}
