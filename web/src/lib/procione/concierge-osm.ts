import type { ConciergePlaceResult, ConciergeTransitResult } from "@/lib/procione/concierge";

const NOMINATIM_HEADERS = {
  "User-Agent": "AncheCasa-Procione/1.0 (contact@anchecasa.it)",
  Accept: "application/json",
};

function osmMapsUrl(name: string, city: string, lat?: number, lon?: number): string {
  if (lat != null && lon != null) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`;
}

function mapNominatimRow(
  row: { display_name?: string; lat?: string; lon?: string; name?: string; type?: string },
  city: string,
  kind: "restaurant" | "hotel",
  bookingUrl?: string
): ConciergePlaceResult {
  const name = row.name ?? row.display_name?.split(",")[0]?.trim() ?? "Senza nome";
  const address = row.display_name ?? city;
  const lat = row.lat ? Number(row.lat) : undefined;
  const lon = row.lon ? Number(row.lon) : undefined;
  return {
    name,
    address,
    mapsUrl: osmMapsUrl(name, city, lat, lon),
    bookingUrl,
  };
}

export async function geocodeCityOsm(city: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${city}, Italia`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "it");

  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  const row = data[0];
  if (!row?.lat || !row?.lon) return null;
  return { lat: Number(row.lat), lng: Number(row.lon) };
}

export async function searchPlacesOsm(
  kind: "restaurant" | "hotel",
  destination: string,
  options: { bookingUrl?: string; versaceCinese?: boolean } = {}
): Promise<ConciergePlaceResult[]> {
  const amenity = kind === "restaurant" ? "restaurant" : "hotel";
  const query =
    kind === "restaurant" && options.versaceCinese
      ? `ristorante ${destination}`
      : `${amenity === "hotel" ? "hotel" : "ristorante"} ${destination}`;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Italia`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "it");

  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    display_name?: string;
    lat?: string;
    lon?: string;
    name?: string;
    type?: string;
    class?: string;
  }[];

  const filtered = data.filter((row) => {
    const t = `${row.type ?? ""} ${row.class ?? ""}`.toLowerCase();
    if (kind === "restaurant") return t.includes("restaurant") || t.includes("food") || t.includes("cafe");
    return t.includes("hotel") || t.includes("hostel") || t.includes("motel") || t.includes("guest");
  });

  const rows = (filtered.length ? filtered : data).slice(0, 3);
  return rows.map((row) => mapNominatimRow(row, destination, kind, options.bookingUrl));
}

export async function searchPlacesNearbyOsm(
  kind: "restaurant" | "hotel",
  lat: number,
  lng: number,
  cityLabel: string,
  options: { bookingUrl?: string } = {}
): Promise<ConciergePlaceResult[]> {
  const amenity = kind === "restaurant" ? "restaurant" : "hotel";
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="${amenity}"](around:5000,${lat},${lng});
      way["amenity"="${amenity}"](around:5000,${lat},${lng});
    );
    out center 6;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return searchPlacesOsm(kind, cityLabel === "vicino a te" ? "Italia" : cityLabel, options);

  const data = (await res.json()) as {
    elements?: {
      tags?: { name?: string; "addr:street"?: string; "addr:city"?: string };
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
    }[];
  };

  const places: ConciergePlaceResult[] = [];
  for (const el of data.elements ?? []) {
    const name = el.tags?.name;
    if (!name) continue;
    const plat = el.lat ?? el.center?.lat;
    const plon = el.lon ?? el.center?.lon;
    const street = el.tags?.["addr:street"];
    const city = el.tags?.["addr:city"] ?? cityLabel;
    places.push({
      name,
      address: street ? `${street}, ${city}` : city,
      mapsUrl: osmMapsUrl(name, city, plat, plon),
      bookingUrl: options.bookingUrl,
    });
    if (places.length >= 3) break;
  }

  return places.length ? places : searchPlacesOsm(kind, cityLabel, options);
}

export function buildTransitMapsFallback(
  origin: string,
  destination: string,
  when?: string
): ConciergeTransitResult[] {
  const whenLabel = when ? ` (${when})` : "";
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;
  return [
    {
      summary: `Treni ${origin} → ${destination}${whenLabel}`,
      departure: origin,
      arrival: destination,
      duration: "Apri Maps per orari",
      legs: [{ line: "Treno", departure: origin, arrival: destination, duration: "" }],
      mapsUrl,
    },
  ];
}
