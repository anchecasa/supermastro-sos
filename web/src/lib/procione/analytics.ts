import type { ProcioneBusinessSnapshot } from "@/lib/procione/context";

export function isAnalyticsQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  if (
    /(?:quanti|numero|quante|statistic|metric|report|situazione|andamento|performance|dati|numeri)/.test(
      t
    ) &&
    /(?:iscrit|registr|talent|mastri|societ|datori|employer|region|comun|idraulic|elettric|sos|condomin|albergh|impres|profession|piattaforma|anchecasa|supermastro|settimana|mese|oggi|marketing)/.test(
      t
    )
  ) {
    return true;
  }
  return (
    /com['']?[eè]\s+(?:la\s+)?situazione/.test(t) ||
    /(?:dammi|dimmi|raccontami).*(?:numeri|dati|metriche)/.test(t) ||
    /(?:iscritti|iscrizioni).*(?:settimana|mese|oggi)/.test(t)
  );
}

function fmtPeriod(snapshot: ProcioneBusinessSnapshot): string {
  return snapshot.periodDays === 7 ? "ultimi 7 giorni" : `ultimi ${snapshot.periodDays} giorni`;
}

function orgMetric(snapshot: ProcioneBusinessSnapshot, type: string) {
  return snapshot.byOrgType.find((o) => o.type === type);
}

export function formatAnalyticsReply(
  snapshot: ProcioneBusinessSnapshot,
  transcript: string,
  _demoMode = false
): string {
  const t = transcript.toLowerCase();

  if (/(?:condomin)/.test(t)) {
    const c = orgMetric(snapshot, "condominium");
    return `Condomini: ${c?.active ?? 0} attivi, ${c?.signupsPeriod ?? 0} nuove iscrizioni ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:albergh|hotel)/.test(t)) {
    const h = orgMetric(snapshot, "hotel");
    return `Alberghi: ${h?.active ?? 0} attivi, ${h?.signupsPeriod ?? 0} nuove iscrizioni ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:impres|aziend)/.test(t) && !/(?:idraulic|profession)/.test(t)) {
    const c = orgMetric(snapshot, "company");
    return `Imprese: ${c?.active ?? 0} attive, ${c?.signupsPeriod ?? 0} nuove iscrizioni ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:profession|artigian)/.test(t)) {
    const p = snapshot.byTalentType.find((x) => x.type === "artisan");
    return `Professionisti: ${p?.active ?? 0} attivi, ${p?.signupsPeriod ?? 0} iscrizioni ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:idraulic|idraulici)/.test(t)) {
    return `Idraulici: ${snapshot.idrauliciActive} attivi, ${snapshot.idrauliciSignupsPeriod} nuove iscrizioni ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:elettric)/.test(t)) {
    const el = snapshot.bySkill.find((s) => s.slug === "elettricista");
    return `Elettricisti: ${el?.active ?? 0} attivi, ${el?.signupsPeriod ?? 0} iscrizioni ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:societ|datori|employer)/.test(t)) {
    return `Datori attivi: ${snapshot.activeEmployers}, ${snapshot.newEmployersPeriod} nuovi ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:region|comun|territor)/.test(t)) {
    return `Territori forti: ${snapshot.regionsTop}. Comune top: ${snapshot.topComune} con ${snapshot.topComuneCount} talent attivi.`;
  }

  if (/(?:sos|emergen)/.test(t)) {
    return `SOS: ${snapshot.sosActive} attive adesso, ${snapshot.sosToday} arrivate oggi, ${snapshot.sosPeriod} totali ${fmtPeriod(snapshot)}.`;
  }

  if (/(?:settimana|7\s*giorni|questa settimana)/.test(t)) {
    const imprese = orgMetric(snapshot, "company")?.signupsPeriod ?? 0;
    const cond = orgMetric(snapshot, "condominium")?.signupsPeriod ?? 0;
    const alberghi = orgMetric(snapshot, "hotel")?.signupsPeriod ?? 0;
    return `Questa settimana ${snapshot.signupsWeek} iscrizioni totali: ${snapshot.idrauliciSignupsPeriod} idraulici, ${imprese} imprese, ${cond} condomini, ${alberghi} alberghi, più altri professionisti. ${snapshot.sosPeriod} richieste SOS.`;
  }

  if (/(?:mese|30\s*giorni)/.test(t)) {
    return `Ultimo mese: ${snapshot.signupsMonth} iscrizioni talent, ${snapshot.activeTalents} talent attivi, ${snapshot.activeEmployers} datori attivi.`;
  }

  const idraulico = snapshot.bySkill.find((s) => s.slug === "idraulico");
  return `Situazione AncheCasa ${fmtPeriod(snapshot)}: ${snapshot.signupsPeriod} iscrizioni (${snapshot.signupsWeek} questa settimana), ${snapshot.activeTalents} talent attivi. Idraulici ${idraulico?.active ?? snapshot.idrauliciActive} attivi (${snapshot.idrauliciSignupsPeriod} nuovi). Top comune ${snapshot.topComune}. SOS ${snapshot.sosActive} attive. ${snapshot.pendingVerification} in attesa verifica.`;
}

export function buildBusinessContextBlock(snapshot: ProcioneBusinessSnapshot, demoMode = false): string {
  const label = demoMode ? "DEMO_SNAPSHOT (presentazione riunione)" : "BUSINESS_SNAPSHOT (dati reali Supabase)";
  const imprese = orgMetric(snapshot, "company");
  const cond = orgMetric(snapshot, "condominium");
  const alberghi = orgMetric(snapshot, "hotel");
  return `${label}:
Periodo: ${snapshot.periodDays} giorni | Settimana: ${snapshot.signupsWeek} iscrizioni
Idraulici: ${snapshot.idrauliciSignupsPeriod} nuovi, ${snapshot.idrauliciActive} attivi
Imprese: ${imprese?.signupsPeriod ?? 0} nuovi | Condomini: ${cond?.signupsPeriod ?? 0} | Alberghi: ${alberghi?.signupsPeriod ?? 0}
Territori: ${snapshot.regionsTop}
SOS: ${snapshot.sosActive} attive, ${snapshot.sosToday} oggi`;
}

export function appendAnalyticsFollowUp(
  factual: string,
  followUp: string | null,
  demoMode: boolean
): string {
  if (!followUp) {
    return demoMode
      ? `${factual} Che vuoi fa? Ti preparo numeri per la riunione o cerchiamo hotel/ristorante?`
      : `${factual} Che vuoi fa? Campagna marketing?`;
  }
  return `${factual} ${followUp}`;
}
