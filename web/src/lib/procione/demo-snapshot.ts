import type { ProcioneBusinessSnapshot } from "@/lib/procione/context";
import type { ProcioneDemoSnapshot } from "@/lib/procione/session";

const DEMO_COMUNI = ["Milano", "Roma", "Torino", "Bologna", "Napoli", "Firenze", "Bari"];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededInt(seed: string, min: number, max: number): number {
  const h = hashSeed(seed);
  return min + (h % (max - min + 1));
}

/** Numeri demo coerenti per pitch riunione (~60-100/settimana totali). */
export function createDemoSnapshot(sessionId: string): ProcioneDemoSnapshot {
  const topComune = DEMO_COMUNI[seededInt(`${sessionId}-comune`, 0, DEMO_COMUNI.length - 1)];
  const signupsWeek = seededInt(`${sessionId}-sw`, 62, 98);
  const idrauliciWeek = seededInt(`${sessionId}-is`, 12, 28);
  const impreseWeek = seededInt(`${sessionId}-imp`, 8, 22);
  const condominiWeek = seededInt(`${sessionId}-cond`, 6, 18);
  const alberghiWeek = seededInt(`${sessionId}-alb`, 4, 14);
  const professionistiWeek = Math.max(
    10,
    signupsWeek - idrauliciWeek - impreseWeek - condominiWeek - alberghiWeek
  );

  return {
    periodDays: 7,
    signupsPeriod: signupsWeek + seededInt(`${sessionId}-sp`, 0, 12),
    signupsWeek,
    signupsMonth: seededInt(`${sessionId}-sm`, 240, 380),
    activeTalents: seededInt(`${sessionId}-at`, 850, 2400),
    activeEmployers: seededInt(`${sessionId}-ae`, 45, 180),
    newEmployersPeriod: impreseWeek + condominiWeek + alberghiWeek,
    topComune,
    topComuneCount: seededInt(`${sessionId}-tcc`, 12, 48),
    idrauliciActive: seededInt(`${sessionId}-ia`, 120, 380),
    idrauliciSignupsPeriod: idrauliciWeek,
    elettricistiActive: seededInt(`${sessionId}-el`, 95, 310),
    impreseSignupsPeriod: impreseWeek,
    condominiSignupsPeriod: condominiWeek,
    alberghiSignupsPeriod: alberghiWeek,
    professionistiSignupsPeriod: professionistiWeek,
    sosActive: seededInt(`${sessionId}-sa`, 3, 18),
    sosToday: seededInt(`${sessionId}-st`, 1, 12),
    sosPeriod: seededInt(`${sessionId}-sop`, 25, 95),
    pendingVerification: seededInt(`${sessionId}-pv`, 5, 22),
  };
}

export function demoSnapshotToBusinessSnapshot(
  demo: ProcioneDemoSnapshot,
  periodDays = 7
): ProcioneBusinessSnapshot {
  const topComune = String(demo.topComune ?? "Milano");
  const topComuneCount = Number(demo.topComuneCount ?? 0);
  const secondComune = DEMO_COMUNI.find((c) => c !== topComune) ?? "Roma";

  return {
    periodDays,
    signupsPeriod: Number(demo.signupsPeriod ?? 0),
    signupsWeek: Number(demo.signupsWeek ?? 0),
    signupsMonth: Number(demo.signupsMonth ?? 0),
    activeTalents: Number(demo.activeTalents ?? 0),
    activeEmployers: Number(demo.activeEmployers ?? 0),
    newEmployersPeriod: Number(demo.newEmployersPeriod ?? 0),
    topComune,
    topComuneCount,
    topComuni: [
      { comune: topComune, count: topComuneCount },
      { comune: secondComune, count: Math.max(8, topComuneCount - 5) },
    ],
    idrauliciActive: Number(demo.idrauliciActive ?? 0),
    idrauliciSignupsPeriod: Number(demo.idrauliciSignupsPeriod ?? 0),
    elettricistiActive: Number(demo.elettricistiActive ?? 0),
    sosActive: Number(demo.sosActive ?? 0),
    sosToday: Number(demo.sosToday ?? 0),
    sosPeriod: Number(demo.sosPeriod ?? 0),
    regionsTop: `${topComune}, ${secondComune}`,
    pendingVerification: Number(demo.pendingVerification ?? 0),
    bySkill: [
      {
        slug: "idraulico",
        label: "Idraulico",
        signupsPeriod: Number(demo.idrauliciSignupsPeriod ?? 0),
        active: Number(demo.idrauliciActive ?? 0),
      },
      {
        slug: "elettricista",
        label: "Elettricista",
        signupsPeriod: seededInt(String(demo.elettricistiActive), 10, 40),
        active: Number(demo.elettricistiActive ?? 0),
      },
    ],
    byOrgType: [
      {
        type: "company",
        label: "Imprese",
        signupsPeriod: Number(demo.impreseSignupsPeriod ?? 0),
        active: seededInt(String(demo.impreseSignupsPeriod), 20, 80),
      },
      {
        type: "condominium",
        label: "Condomini",
        signupsPeriod: Number(demo.condominiSignupsPeriod ?? 0),
        active: seededInt(String(demo.condominiSignupsPeriod), 15, 60),
      },
      {
        type: "hotel",
        label: "Alberghi",
        signupsPeriod: Number(demo.alberghiSignupsPeriod ?? 0),
        active: seededInt(String(demo.alberghiSignupsPeriod), 8, 35),
      },
    ],
    byTalentType: [
      {
        type: "artisan",
        label: "Professionisti",
        signupsPeriod: Number(demo.professionistiSignupsPeriod ?? 0),
        active: seededInt(String(demo.professionistiSignupsPeriod), 200, 900),
      },
      {
        type: "employee",
        label: "Dipendenti",
        signupsPeriod: seededInt(String(demo.signupsWeek), 5, 20),
        active: seededInt(String(demo.activeTalents), 50, 200),
      },
    ],
  };
}
