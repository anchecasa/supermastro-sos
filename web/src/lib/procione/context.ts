import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBusinessContextBlock } from "@/lib/procione/analytics";
import { demoSnapshotToBusinessSnapshot } from "@/lib/procione/demo-snapshot";
import type { ProcioneDataMode, ProcioneDemoSnapshot } from "@/lib/procione/session";

export type AgendaQueryPeriod = "today" | "tomorrow" | "day_after_tomorrow" | "week";

export type ProcioneSkillMetric = {
  slug: string;
  label: string;
  signupsPeriod: number;
  active: number;
};

export type ProcioneOrgMetric = {
  type: string;
  label: string;
  signupsPeriod: number;
  active: number;
};

export type ProcioneBusinessSnapshot = {
  periodDays: number;
  signupsPeriod: number;
  signupsWeek: number;
  signupsMonth: number;
  activeTalents: number;
  activeEmployers: number;
  newEmployersPeriod: number;
  topComune: string;
  topComuneCount: number;
  topComuni: Array<{ comune: string; count: number }>;
  idrauliciActive: number;
  idrauliciSignupsPeriod: number;
  elettricistiActive: number;
  sosActive: number;
  sosToday: number;
  sosPeriod: number;
  regionsTop: string;
  pendingVerification: number;
  bySkill: ProcioneSkillMetric[];
  byOrgType: ProcioneOrgMetric[];
  byTalentType: ProcioneOrgMetric[];
};

export type LoadProcioneContextOptions = {
  dataMode?: ProcioneDataMode;
  demoSnapshot?: ProcioneDemoSnapshot;
};

export type ProcioneOpsSnapshot = {
  sosActive: number;
  sosIdraulicoActive: number;
  sosToday: number;
  pendingVerification: number;
  openDisputes: number;
};

export type ProcioneUserContext = {
  todayAppointments: Array<{
    title: string;
    starts_at: string;
    location: string | null;
    contact_name: string | null;
  }>;
  tomorrowAppointments: Array<{ title: string; starts_at: string }>;
  recentContacts: Array<{ full_name: string; phone: string | null; company: string | null }>;
  recentVoiceLog: Array<{ role: string; content: string }>;
  ops: ProcioneOpsSnapshot;
  business?: ProcioneBusinessSnapshot;
  summaryText: string;
  contextBlock: string;
};

type AppointmentRow = {
  title: string;
  starts_at: string;
  location: string | null;
  contact_name: string | null;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function fmtDay(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(iso)
  );
}

function describeAppointment(a: AppointmentRow) {
  const who = a.contact_name ? ` con ${a.contact_name}` : "";
  const where = a.location ? ` in ${a.location}` : "";
  return `alle ${fmtTime(a.starts_at)} ${a.title}${who}${where}`;
}

export function formatAppointmentsList(appts: AppointmentRow[], dayLabel: string): string {
  if (!appts.length) {
    return `${dayLabel} non hai appuntamenti in agenda.`;
  }
  const n = appts.length;
  return `${dayLabel} hai ${n} appuntament${n === 1 ? "o" : "i"}: ${appts.map(describeAppointment).join("; ")}.`;
}

async function fetchAppointmentsForDay(
  supabase: SupabaseClient,
  userId: string,
  day: Date
): Promise<AppointmentRow[]> {
  const start = startOfDay(day);
  const end = endOfDay(day);
  const { data } = await supabase
    .from("assistant_appointments")
    .select("title, starts_at, location, contact_name")
    .eq("owner_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString())
    .order("starts_at");
  return data ?? [];
}

async function fetchAppointmentsForWeek(
  supabase: SupabaseClient,
  userId: string
): Promise<AppointmentRow[]> {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  end.setDate(end.getDate() + 6);
  const { data } = await supabase
    .from("assistant_appointments")
    .select("title, starts_at, location, contact_name")
    .eq("owner_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString())
    .order("starts_at");
  return data ?? [];
}

export async function buildAgendaQueryReply(
  supabase: SupabaseClient,
  userId: string,
  period: AgendaQueryPeriod
): Promise<string> {
  const now = new Date();

  if (period === "today") {
    return formatAppointmentsList(await fetchAppointmentsForDay(supabase, userId, now), "Oggi");
  }

  if (period === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatAppointmentsList(await fetchAppointmentsForDay(supabase, userId, d), "Domani");
  }

  if (period === "day_after_tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return formatAppointmentsList(await fetchAppointmentsForDay(supabase, userId, d), "Dopodomani");
  }

  const weekAppts = await fetchAppointmentsForWeek(supabase, userId);
  if (!weekAppts.length) {
    return "Nei prossimi 7 giorni non hai appuntamenti in agenda.";
  }

  const byDay = new Map<string, AppointmentRow[]>();
  for (const a of weekAppts) {
    const key = startOfDay(new Date(a.starts_at)).toISOString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  const parts: string[] = [];
  for (const [, appts] of [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const label = fmtDay(appts[0]!.starts_at);
    parts.push(`${label}: ${appts.map((a) => `${fmtTime(a.starts_at)} ${a.title}`).join(", ")}`);
  }

  return `Nei prossimi 7 giorni hai ${weekAppts.length} appuntament${weekAppts.length === 1 ? "o" : "i"}. ${parts.join(". ")}.`;
}

function buildOpsSummary(ops: ProcioneOpsSnapshot): string {
  const parts: string[] = [];
  if (ops.sosActive > 0) {
    parts.push(`${ops.sosActive} richieste SOS attive`);
  }
  if (ops.sosIdraulicoActive > 0) {
    parts.push(`${ops.sosIdraulicoActive} richieste idraulico in coda`);
  }
  if (ops.sosToday > 0) {
    parts.push(`${ops.sosToday} richieste SOS arrivate oggi`);
  }
  if (ops.pendingVerification > 0) {
    parts.push(`${ops.pendingVerification} mastri in attesa verifica`);
  }
  if (!parts.length) {
    return "Operatività SOS tranquilla al momento.";
  }
  return parts.join("; ") + ".";
}

function buildContextBlock(
  todayAppointments: AppointmentRow[],
  tomorrowAppointments: AppointmentRow[],
  recentContacts: ProcioneUserContext["recentContacts"],
  ops: ProcioneOpsSnapshot,
  recentVoiceLog: ProcioneUserContext["recentVoiceLog"],
  business?: ProcioneBusinessSnapshot,
  demoMode = false
): string {
  const lines: string[] = [];
  lines.push(formatAppointmentsList(todayAppointments, "Oggi"));
  if (tomorrowAppointments.length) {
    lines.push(formatAppointmentsList(tomorrowAppointments as AppointmentRow[], "Domani"));
  }
  lines.push(`Operatività: ${buildOpsSummary(ops)}`);
  if (business) {
    lines.push(buildBusinessContextBlock(business, demoMode));
  }
  if (recentContacts.length) {
    lines.push(
      `Contatti recenti in rubrica: ${recentContacts
        .slice(0, 5)
        .map((c) => c.full_name)
        .join(", ")}`
    );
  }
  if (recentVoiceLog.length) {
    const last = recentVoiceLog
      .slice(0, 4)
      .map((m) => `${m.role === "user" ? "Fernando" : "Procione"}: ${m.content}`)
      .join(" | ");
    lines.push(`Ultimi scambi: ${last}`);
  }
  return lines.join("\n");
}

async function loadOpsSnapshot(supabase: SupabaseClient): Promise<ProcioneOpsSnapshot> {
  const empty: ProcioneOpsSnapshot = {
    sosActive: 0,
    sosIdraulicoActive: 0,
    sosToday: 0,
    pendingVerification: 0,
    openDisputes: 0,
  };

  const { data, error } = await supabase.rpc("procione_ops_snapshot");
  if (error || !data) return empty;

  const row = data as Record<string, number>;
  return {
    sosActive: row.sos_active ?? 0,
    sosIdraulicoActive: row.sos_idraulico_active ?? 0,
    sosToday: row.sos_today ?? 0,
    pendingVerification: row.pending_verification ?? 0,
    openDisputes: row.open_disputes ?? 0,
  };
}

function mapOrgMetrics(raw: unknown): ProcioneOrgMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const item = s as Record<string, unknown>;
    return {
      type: String(item.type ?? ""),
      label: String(item.label ?? ""),
      signupsPeriod: Number(item.signups_period ?? 0),
      active: Number(item.active ?? 0),
    };
  });
}

function mapBusinessSnapshotRow(row: Record<string, unknown>, periodDays: number): ProcioneBusinessSnapshot {
  const bySkillRaw = row.by_skill;
  const bySkill: ProcioneSkillMetric[] = Array.isArray(bySkillRaw)
    ? bySkillRaw.map((s) => {
        const item = s as Record<string, unknown>;
        return {
          slug: String(item.slug ?? ""),
          label: String(item.label ?? ""),
          signupsPeriod: Number(item.signups_period ?? 0),
          active: Number(item.active ?? 0),
        };
      })
    : [];

  const topComuniRaw = row.top_comuni;
  const topComuni: Array<{ comune: string; count: number }> = Array.isArray(topComuniRaw)
    ? topComuniRaw.map((c) => {
        const item = c as Record<string, unknown>;
        return { comune: String(item.comune ?? ""), count: Number(item.count ?? 0) };
      })
    : [];

  const regionsTop =
    topComuni.length > 0
      ? topComuni.map((c) => `${c.comune} (${c.count})`).join(", ")
      : String(row.regions_top ?? "N/D");

  return {
    periodDays,
    signupsPeriod: Number(row.signups_period ?? 0),
    signupsWeek: Number(row.signups_week ?? 0),
    signupsMonth: Number(row.signups_month ?? 0),
    activeTalents: Number(row.active_talents ?? 0),
    activeEmployers: Number(row.active_employers ?? 0),
    newEmployersPeriod: Number(row.new_employers_period ?? 0),
    topComune: String(row.top_comune ?? "N/D"),
    topComuneCount: Number(row.top_comune_count ?? 0),
    topComuni,
    idrauliciActive: Number(row.idraulici_active ?? 0),
    idrauliciSignupsPeriod: Number(row.idraulici_signups_period ?? 0),
    elettricistiActive: Number(row.elettricisti_active ?? 0),
    sosActive: Number(row.sos_active ?? 0),
    sosToday: Number(row.sos_today ?? 0),
    sosPeriod: Number(row.sos_period ?? 0),
    regionsTop,
    pendingVerification: Number(row.pending_verification ?? 0),
    bySkill,
    byOrgType: mapOrgMetrics(row.by_org_type),
    byTalentType: mapOrgMetrics(row.by_talent_type),
  };
}

export async function loadBusinessSnapshot(
  supabase: SupabaseClient,
  periodDays = 7
): Promise<ProcioneBusinessSnapshot | undefined> {
  const { data, error } = await supabase.rpc("procione_business_snapshot", { p_days: periodDays });
  if (error || !data) return undefined;
  return mapBusinessSnapshotRow(data as Record<string, unknown>, periodDays);
}

export async function loadProcioneContext(
  supabase: SupabaseClient,
  userId: string,
  options: LoadProcioneContextOptions = {}
): Promise<ProcioneUserContext> {
  const dataMode = options.dataMode ?? "real";
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(new Date(now.getTime() + 86400000));
  const tomorrowEnd = endOfDay(new Date(now.getTime() + 86400000));

  const businessPromise =
    dataMode === "meeting_demo" && options.demoSnapshot
      ? Promise.resolve(demoSnapshotToBusinessSnapshot(options.demoSnapshot))
      : dataMode === "real"
        ? loadBusinessSnapshot(supabase)
        : Promise.resolve(undefined);

  const [{ data: todayAppts }, { data: tomorrowAppts }, { data: contacts }, { data: voiceLog }, ops, business] =
    await Promise.all([
      supabase
        .from("assistant_appointments")
        .select("title, starts_at, location, contact_name")
        .eq("owner_id", userId)
        .eq("status", "scheduled")
        .gte("starts_at", todayStart.toISOString())
        .lte("starts_at", todayEnd.toISOString())
        .order("starts_at"),
      supabase
        .from("assistant_appointments")
        .select("title, starts_at")
        .eq("owner_id", userId)
        .eq("status", "scheduled")
        .gte("starts_at", tomorrowStart.toISOString())
        .lte("starts_at", tomorrowEnd.toISOString())
        .order("starts_at"),
      supabase
        .from("assistant_contacts")
        .select("full_name, phone, company")
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false })
        .limit(15),
      supabase
        .from("assistant_voice_log")
        .select("role, content")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      loadOpsSnapshot(supabase),
      businessPromise,
    ]);

  const todayAppointments = todayAppts ?? [];
  const tomorrowAppointments = tomorrowAppts ?? [];
  const recentContacts = contacts ?? [];
  const recentVoiceLog = voiceLog ?? [];

  let summaryText = formatAppointmentsList(todayAppointments, "Oggi");
  if (tomorrowAppointments.length) {
    summaryText += ` ${formatAppointmentsList(tomorrowAppointments as AppointmentRow[], "Domani")}`;
  }

  const contextBlock = buildContextBlock(
    todayAppointments,
    tomorrowAppointments as AppointmentRow[],
    recentContacts,
    ops,
    recentVoiceLog,
    business,
    dataMode === "meeting_demo"
  );

  return {
    todayAppointments,
    tomorrowAppointments,
    recentContacts,
    recentVoiceLog,
    ops,
    business,
    summaryText,
    contextBlock,
  };
}
