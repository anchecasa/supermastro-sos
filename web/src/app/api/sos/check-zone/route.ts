import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ZoneResult = {
  in_zone: boolean;
  zone_name?: string;
  city?: string;
};

export async function POST(request: Request) {
  let body: { lat?: number; lng?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const { lat, lng } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "Coordinate mancanti" }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Coordinate non valide" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_pilot_zone", {
      p_lng: lng,
      p_lat: lat,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as ZoneResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore verifica zona";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
