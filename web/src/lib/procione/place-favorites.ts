import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConciergePlaceResult, ConciergeSearchResult } from "@/lib/procione/concierge";

export type PlaceFavorite = {
  id: string;
  kind: "restaurant" | "hotel";
  name: string;
  address: string | null;
  city: string;
  maps_url: string | null;
  place_id: string | null;
  rating: number | null;
  notes: string | null;
  booked_at: string | null;
};

export async function loadPlaceFavoritesForCity(
  supabase: SupabaseClient,
  userId: string,
  city: string,
  kind?: "restaurant" | "hotel"
): Promise<PlaceFavorite[]> {
  let q = supabase
    .from("assistant_place_favorites")
    .select("id, kind, name, address, city, maps_url, place_id, rating, notes, booked_at")
    .eq("owner_id", userId)
    .ilike("city", city)
    .order("booked_at", { ascending: false, nullsFirst: false })
    .limit(5);

  if (kind) q = q.eq("kind", kind);

  const { data } = await q;
  return (data ?? []) as PlaceFavorite[];
}

export async function savePlaceFavorite(
  supabase: SupabaseClient,
  userId: string,
  place: ConciergePlaceResult & { kind: "restaurant" | "hotel"; city: string },
  notes?: string
): Promise<PlaceFavorite> {
  const { data, error } = await supabase
    .from("assistant_place_favorites")
    .insert({
      owner_id: userId,
      kind: place.kind,
      name: place.name,
      address: place.address,
      city: place.city,
      maps_url: place.mapsUrl,
      place_id: place.placeId ?? null,
      rating: place.rating ?? null,
      notes: notes ?? null,
      booked_at: new Date().toISOString(),
    })
    .select("id, kind, name, address, city, maps_url, place_id, rating, notes, booked_at")
    .single();

  if (error) throw new Error(error.message);
  return data as PlaceFavorite;
}

export function favoriteToPlaceResult(fav: PlaceFavorite): ConciergePlaceResult {
  return {
    name: fav.name,
    address: fav.address ?? fav.city,
    rating: fav.rating ?? undefined,
    mapsUrl: fav.maps_url ?? "",
    placeId: fav.place_id ?? undefined,
    isFavorite: true,
  };
}

export function mergeFavoritesIntoSearch(
  result: ConciergeSearchResult,
  favorites: PlaceFavorite[]
): ConciergeSearchResult {
  if (!favorites.length || result.kind === "train" || !result.places) return result;

  const favPlaces = favorites
    .filter((f) => f.kind === result.kind)
    .map(favoriteToPlaceResult);

  const existingNames = new Set(result.places.map((p) => p.name.toLowerCase()));
  const merged = [
    ...favPlaces.filter((p) => !existingNames.has(p.name.toLowerCase())),
    ...result.places,
  ].slice(0, 4);

  return { ...result, places: merged };
}

export function formatFavoriteHint(favorites: PlaceFavorite[], city: string): string | null {
  if (!favorites.length) return null;
  const top = favorites[0]!;
  return `L'ultima volta a ${city} ti sei trovato bene da ${top.name}.`;
}
