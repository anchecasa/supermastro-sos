import { ITALY_MAP_REGIONS } from "@/data/italy-map-regions";

/** Capoluoghi di regione: calibrazione lat/lng WGS84 → coordinate SVG cartina */
const REGION_CAPITAL_GEO: Record<string, { lat: number; lng: number }> = {
  piemonte: { lat: 45.0703, lng: 7.6869 },
  "valle-daosta": { lat: 45.737, lng: 7.32 },
  lombardia: { lat: 45.4642, lng: 9.19 },
  "trentino-alto-adige": { lat: 46.0748, lng: 11.1217 },
  veneto: { lat: 45.4408, lng: 12.3155 },
  "friuli-venezia-giulia": { lat: 45.6495, lng: 13.7768 },
  liguria: { lat: 44.4056, lng: 8.9463 },
  "emilia-romagna": { lat: 44.4949, lng: 11.3426 },
  toscana: { lat: 43.7696, lng: 11.2558 },
  umbria: { lat: 43.1107, lng: 12.3908 },
  marche: { lat: 43.6158, lng: 13.5189 },
  lazio: { lat: 41.9028, lng: 12.4964 },
  abruzzo: { lat: 42.3498, lng: 13.3995 },
  molise: { lat: 41.561, lng: 14.6683 },
  campania: { lat: 40.8518, lng: 14.2681 },
  puglia: { lat: 41.1171, lng: 16.8719 },
  basilicata: { lat: 40.6395, lng: 15.8051 },
  calabria: { lat: 38.9098, lng: 16.5878 },
  sicilia: { lat: 38.1157, lng: 13.3615 },
  sardegna: { lat: 39.2238, lng: 9.1217 },
};

type CalibPoint = { lat: number; lng: number; x: number; y: number };

function buildCalibrationPoints(): CalibPoint[] {
  const pts: CalibPoint[] = [];
  for (const region of ITALY_MAP_REGIONS) {
    const geo = REGION_CAPITAL_GEO[region.id];
    if (!geo) continue;
    pts.push({ lat: geo.lat, lng: geo.lng, x: region.capitalX, y: region.capitalY });
  }
  return pts;
}

function fitLinear3(points: CalibPoint[], pick: (p: CalibPoint) => number): [number, number, number] {
  let s00 = 0;
  let s01 = 0;
  let s02 = 0;
  let s11 = 0;
  let s12 = 0;
  let s22 = 0;
  let t0 = 0;
  let t1 = 0;
  let t2 = 0;

  for (const p of points) {
    const a = 1;
    const b = p.lng;
    const c = p.lat;
    const t = pick(p);
    s00 += a * a;
    s01 += a * b;
    s02 += a * c;
    s11 += b * b;
    s12 += b * c;
    s22 += c * c;
    t0 += a * t;
    t1 += b * t;
    t2 += c * t;
  }

  const det =
    s00 * (s11 * s22 - s12 * s12) -
    s01 * (s01 * s22 - s02 * s12) +
    s02 * (s01 * s12 - s02 * s11);

  if (Math.abs(det) < 1e-9) return [0, 12, 25];

  const c0 =
    (t0 * (s11 * s22 - s12 * s12) -
      s01 * (t1 * s22 - t2 * s12) +
      s02 * (t1 * s12 - t2 * s11)) /
    det;
  const c1 =
    (s00 * (t1 * s22 - t2 * s12) -
      t0 * (s01 * s22 - s02 * s12) +
      s02 * (s01 * t2 - t1 * s02)) /
    det;
  const c2 =
    (s00 * (s11 * t2 - t1 * s12) -
      s01 * (s01 * t2 - t1 * s02) +
      t0 * (s01 * s12 - s02 * s11)) /
    det;

  return [c0, c1, c2];
}

const CALIB = buildCalibrationPoints();
const X_COEFF = fitLinear3(CALIB, (p) => p.x);
const Y_COEFF = fitLinear3(CALIB, (p) => p.y);

/** Proiezione lat/lon → SVG (viewBox -10 20 480 580) */
export function latLngToItalyMapSvg(lat: number, lng: number): { x: number; y: number } {
  const x = X_COEFF[0] + X_COEFF[1] * lng + X_COEFF[2] * lat;
  const y = Y_COEFF[0] + Y_COEFF[1] * lng + Y_COEFF[2] * lat;
  return { x, y };
}
