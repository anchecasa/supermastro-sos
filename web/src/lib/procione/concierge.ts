import type { ConciergeKind } from "@/lib/procione/concierge-parser";
import {
  buildTransitMapsFallback,
  geocodeCityOsm,
  searchPlacesNearbyOsm,
  searchPlacesOsm,
} from "@/lib/procione/concierge-osm";

export type ConciergePlaceResult = {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: number;
  mapsUrl: string;
  bookingUrl?: string;
  placeId?: string;
  isFavorite?: boolean;
};

export type ConciergeTransitLeg = {
  line: string;
  departure: string;
  arrival: string;
  duration: string;
};

export type ConciergeTransitResult = {
  summary: string;
  departure: string;
  arrival: string;
  duration: string;
  legs: ConciergeTransitLeg[];
  mapsUrl: string;
};

export type ConciergeSearchResult = {
  kind: ConciergeKind;
  destination: string;
  places?: ConciergePlaceResult[];
  transit?: ConciergeTransitResult[];
  policyNote?: string;
  favoriteHint?: string;
};

export const VERSACE_CINESE_ACK =
  "Esatto Fernando, qualità Versace prezzo cinese — la nostra politica AncheCasa. Cerco posti con buon rapporto qualità e prezzo.";

function mapsKey() {
  return process.env.GOOGLE_MAPS_API_KEY ?? "";
}

export function isGoogleMapsConfigured() {
  return Boolean(mapsKey());
}

/** Concierge attivo con Google Maps o fallback OpenStreetMap. */
export function isConciergeConfigured() {
  return true;
}

function buildBookingUrl(city: string, people = 2, budgetMax?: number): string {
  const params = new URLSearchParams({
    ss: city,
    group_adults: String(people),
    group_children: "0",
    no_rooms: "1",
  });
  if (budgetMax) params.set("price_filter", "currencycode-EUR-max-" + budgetMax);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function mapPlaceResult(
  r: {
    name?: string;
    formatted_address?: string;
    vicinity?: string;
    rating?: number;
    price_level?: number;
    place_id?: string;
  },
  fallbackCity: string,
  kind: "restaurant" | "hotel",
  people?: number,
  budgetMax?: number
): ConciergePlaceResult {
  const name = r.name ?? "Senza nome";
  const address = r.formatted_address ?? r.vicinity ?? fallbackCity;
  const placeId = r.place_id;
  return {
    name,
    address,
    rating: r.rating,
    priceLevel: r.price_level,
    placeId,
    mapsUrl: placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${fallbackCity}`)}`,
    bookingUrl: kind === "hotel" ? buildBookingUrl(fallbackCity, people, budgetMax) : undefined,
  };
}

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  const key = mapsKey();
  if (key) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", `${city}, Italia`);
    url.searchParams.set("key", key);
    url.searchParams.set("language", "it");
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        results?: { geometry?: { location?: { lat: number; lng: number } } }[];
      };
      const loc = data.results?.[0]?.geometry?.location;
      if (loc) return { lat: loc.lat, lng: loc.lng };
    }
  }
  return geocodeCityOsm(city);
}

export async function searchPlacesNearby(
  kind: "restaurant" | "hotel",
  lat: number,
  lng: number,
  cityLabel: string,
  options: { versaceCinese?: boolean; budgetMax?: number; people?: number } = {}
): Promise<ConciergePlaceResult[]> {
  const key = mapsKey();
  const bookingUrl = kind === "hotel" ? buildBookingUrl(cityLabel, options.people, options.budgetMax) : undefined;
  if (!key) {
    return searchPlacesNearbyOsm(kind, lat, lng, cityLabel, { bookingUrl });
  }

  const type = kind === "restaurant" ? "restaurant" : "lodging";
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "5000");
  url.searchParams.set("type", type);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "it");

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: {
      name?: string;
      formatted_address?: string;
      vicinity?: string;
      rating?: number;
      price_level?: number;
      place_id?: string;
    }[];
  };

  let results = data.results ?? [];
  if (kind === "restaurant" && options.versaceCinese) {
    results = [...results].sort(
      (a, b) => (b.rating ?? 0) * 2 - (b.price_level ?? 2) - ((a.rating ?? 0) * 2 - (a.price_level ?? 2))
    );
  } else {
    results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  if (options.budgetMax && kind === "hotel") {
    results = results.filter((r) => (r.price_level ?? 2) <= 3);
  }

  return results
    .slice(0, 3)
    .map((r) => mapPlaceResult(r, cityLabel, kind, options.people, options.budgetMax));
}

export async function searchPlaces(
  kind: "restaurant" | "hotel",
  destination: string,
  options: { versaceCinese?: boolean; budgetMax?: number; people?: number } = {}
): Promise<ConciergePlaceResult[]> {
  const key = mapsKey();
  if (!key) {
    const bookingUrl = kind === "hotel" ? buildBookingUrl(destination, options.people, options.budgetMax) : undefined;
    return searchPlacesOsm(kind, destination, { bookingUrl, versaceCinese: options.versaceCinese });
  }

  const queryType = kind === "restaurant" ? "ristorante" : "hotel";
  let query = `${queryType} ${destination} Italia`;
  if (options.versaceCinese && kind === "restaurant") {
    query = `ristorante qualità ${destination} recensioni`;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "it");

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: {
      name?: string;
      formatted_address?: string;
      rating?: number;
      price_level?: number;
      place_id?: string;
    }[];
  };

  let results = data.results ?? [];

  if (kind === "restaurant" && options.versaceCinese) {
    results = [...results].sort((a, b) => {
      const scoreA = (a.rating ?? 0) * 2 - (a.price_level ?? 2);
      const scoreB = (b.rating ?? 0) * 2 - (b.price_level ?? 2);
      return scoreB - scoreA;
    });
  } else {
    results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  if (options.budgetMax && kind === "hotel") {
    results = results.filter((r) => (r.price_level ?? 2) <= 3);
  }

  return results
    .slice(0, 3)
    .map((r) => mapPlaceResult(r, destination, kind, options.people, options.budgetMax));
}

export async function searchTransit(
  origin: string,
  destination: string,
  when?: string
): Promise<ConciergeTransitResult[]> {
  const key = mapsKey();
  if (!key) {
    return buildTransitMapsFallback(origin, destination, when);
  }

  const [originGeo, destGeo] = await Promise.all([geocodeCity(origin), geocodeCity(destination)]);
  if (!originGeo || !destGeo) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${originGeo.lat},${originGeo.lng}`);
  url.searchParams.set("destination", `${destGeo.lat},${destGeo.lng}`);
  url.searchParams.set("mode", "transit");
  url.searchParams.set("key", key);
  url.searchParams.set("language", "it");
  url.searchParams.set("region", "it");

  if (when?.includes("domani")) {
    const dep = new Date();
    dep.setDate(dep.getDate() + 1);
    if (when.includes("mattina")) dep.setHours(8, 30, 0, 0);
    else dep.setHours(14, 0, 0, 0);
    url.searchParams.set("departure_time", String(Math.floor(dep.getTime() / 1000)));
  }

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    routes?: {
      summary?: string;
      legs?: {
        duration?: { text?: string };
        departure_time?: { text?: string };
        arrival_time?: { text?: string };
        steps?: {
          travel_mode?: string;
          transit_details?: {
            line?: { short_name?: string; name?: string };
            departure_time?: { text?: string };
            arrival_time?: { text?: string };
          };
        }[];
      }[];
    }[];
  };

  const routes = data.routes ?? [];
  return routes.slice(0, 3).map((route) => {
    const leg = route.legs?.[0];
    const transitSteps =
      leg?.steps?.filter((s) => s.travel_mode === "TRANSIT" && s.transit_details) ?? [];
    const legs: ConciergeTransitLeg[] = transitSteps.map((s) => ({
      line: s.transit_details?.line?.short_name ?? s.transit_details?.line?.name ?? "Treno",
      departure: s.transit_details?.departure_time?.text ?? "",
      arrival: s.transit_details?.arrival_time?.text ?? "",
      duration: leg?.duration?.text ?? "",
    }));

    return {
      summary: route.summary ?? `${origin} → ${destination}`,
      departure: leg?.departure_time?.text ?? "",
      arrival: leg?.arrival_time?.text ?? "",
      duration: leg?.duration?.text ?? "",
      legs,
      mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`,
    };
  });
}

export async function runConciergeSearch(input: {
  kind: ConciergeKind;
  destination: string;
  origin?: string;
  people?: number;
  budgetMax?: number;
  when?: string;
  versaceCinese?: boolean;
  nearMe?: boolean;
  lat?: number;
  lng?: number;
  cityLabel?: string;
}): Promise<ConciergeSearchResult> {
  const defaultOrigin = "Milano";

  if (input.kind === "train") {
    const origin = input.origin ?? defaultOrigin;
    const transit = await searchTransit(origin, input.destination, input.when);
    return { kind: "train", destination: input.destination, transit };
  }

  const cityLabel = input.cityLabel ?? input.destination;
  let places: ConciergePlaceResult[];

  if (input.nearMe && input.lat != null && input.lng != null) {
    places = await searchPlacesNearby(input.kind, input.lat, input.lng, cityLabel, {
      versaceCinese: input.versaceCinese,
      budgetMax: input.budgetMax,
      people: input.people,
    });
  } else {
    places = await searchPlaces(input.kind, input.destination, {
      versaceCinese: input.versaceCinese,
      budgetMax: input.budgetMax,
      people: input.people,
    });
  }

  return {
    kind: input.kind,
    destination: cityLabel,
    places,
    policyNote: input.versaceCinese
      ? "Criterio AncheCasa: qualità Versace, prezzo cinese."
      : undefined,
  };
}

export function formatConciergeReply(result: ConciergeSearchResult, versaceAck?: string): string {
  const prefix = versaceAck ? `${versaceAck} ` : "";
  const fav = result.favoriteHint ? `${result.favoriteHint} ` : "";

  if (result.kind === "train") {
    if (!result.transit?.length) {
      return `${prefix}Non trovo collegamenti treno per ${result.destination}. Prova su Google Maps.`;
    }
    const top = result.transit[0]!;
    const lines = top.legs.map((l) => `${l.line} ${l.departure}→${l.arrival}`).join(", ");
    return `${prefix}Per ${result.destination}: ${top.duration}, partenza ${top.departure}, arrivo ${top.arrival}. ${lines || top.summary}.`;
  }

  if (!result.places?.length) {
    return `${prefix}${fav}Non trovo ${result.kind === "hotel" ? "hotel" : "ristoranti"} ${result.destination === "vicino a te" ? "qui vicino" : `a ${result.destination}`} adesso.`;
  }

  const list = result.places
    .map((p, i) => {
      const stars = p.rating ? ` voto ${p.rating}` : "";
      const favTag = p.isFavorite ? " (già gradito)" : "";
      return `${i + 1}) ${p.name}${stars}${favTag}`;
    })
    .join("; ");

  return `${prefix}${fav}Ti segnalo: ${list}. Se prenoti, dimmi «ho prenotato il primo» e lo memorizzo.`;
}
