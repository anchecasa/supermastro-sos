export type ResolvedCoords = {
  lat: number;
  lng: number;
  accuracy: number;
  source: "gps" | "cap";
};

type ZoneResult = {
  in_zone: boolean;
  zone_name?: string;
  city?: string;
};

const GEO_OPTIONS_LOW: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12000,
  maximumAge: 120_000,
};

const GEO_OPTIONS_HIGH: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 18000,
  maximumAge: 60_000,
};

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Permesso posizione negato. Abilita la geolocalizzazione nel browser o inserisci il CAP.";
    case 2:
      return "Posizione non disponibile. Inserisci il CAP per continuare.";
    case 3:
      return "Timeout GPS. Riprova o inserisci il CAP.";
    default:
      return "Impossibile ottenere la posizione. Inserisci il CAP.";
  }
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function acquireDevicePosition(): Promise<ResolvedCoords> {
  if (typeof window === "undefined") {
    throw new Error("Geolocalizzazione non disponibile.");
  }

  if (!window.isSecureContext) {
    throw new Error("La posizione richiede HTTPS. Inserisci il CAP per continuare.");
  }

  if (!("geolocation" in navigator)) {
    throw new Error("Geolocalizzazione non supportata. Inserisci il CAP.");
  }

  const attempts = [GEO_OPTIONS_LOW, GEO_OPTIONS_HIGH];
  let lastError: GeolocationPositionError | null = null;

  for (const options of attempts) {
    try {
      const position = await getCurrentPosition(options);
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.max(1, Math.round(position.coords.accuracy)),
        source: "gps",
      };
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw new Error(geolocationErrorMessage(lastError?.code ?? 0));
}

export async function geocodeItalianCap(cap: string): Promise<ResolvedCoords> {
  const normalized = cap.replace(/\D/g, "");
  if (normalized.length !== 5) {
    throw new Error("Inserisci un CAP italiano valido (5 cifre).");
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("postalcode", normalized);
  url.searchParams.set("country", "Italy");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Geocoding CAP non disponibile. Riprova tra poco.");
  }

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const hit = data[0];

  if (!hit) {
    throw new Error("CAP non trovato. Verifica e riprova.");
  }

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    accuracy: 500,
    source: "cap",
  };
}

export async function reverseGeocodeCity(lat: number, lng: number): Promise<string> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "10");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return "Italia";

  const data = (await res.json()) as {
    address?: { city?: string; town?: string; village?: string; municipality?: string };
  };

  const address = data.address;
  return (
    address?.city ??
    address?.town ??
    address?.municipality ??
    address?.village ??
    "Italia"
  );
}

export async function checkPilotZone(lat: number, lng: number): Promise<ZoneResult> {
  const res = await fetch("/api/sos/check-zone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });

  const payload = (await res.json()) as ZoneResult & { error?: string };

  if (!res.ok) {
    throw new Error(payload.error ?? "Verifica zona non disponibile.");
  }

  return payload;
}

export async function resolveServiceZone(
  lat: number,
  lng: number
): Promise<ZoneResult & { in_zone: true }> {
  try {
    const zone = await checkPilotZone(lat, lng);
    if (zone.in_zone && zone.zone_name && zone.city) {
      return { in_zone: true, zone_name: zone.zone_name, city: zone.city };
    }
  } catch {
    // Prosegui con geocoding se la verifica remota non è disponibile.
  }

  const city = await reverseGeocodeCity(lat, lng);
  return {
    in_zone: true,
    zone_name: city,
    city,
  };
}

/** @deprecated Usa resolveServiceZone */
export const resolveZoneForSimulation = resolveServiceZone;
