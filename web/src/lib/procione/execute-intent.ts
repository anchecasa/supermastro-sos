import type { SupabaseClient } from "@supabase/supabase-js";
import type { GptParsedCommand } from "@/lib/procione/env";
import { loadProcioneContext } from "@/lib/procione/context";
import {
  chatWithProcione,
  wrapAgendaWithPersona,
  wrapAnalyticsWithPersona,
  type ChatTurn,
} from "@/lib/procione/chat";
import {
  buildAppointmentDraftSummary,
  buildContactDraftSummary,
  buildDraftResult,
  confirmProcioneDraft,
  type ProcioneDraft,
} from "@/lib/procione/draft";
import { parseConciergeIntent } from "@/lib/procione/concierge-parser";
import {
  formatConciergeReply,
  isConciergeConfigured,
  isGoogleMapsConfigured,
  runConciergeSearch,
  VERSACE_CINESE_ACK,
  type ConciergeSearchResult,
} from "@/lib/procione/concierge";
import { appendAnalyticsFollowUp, formatAnalyticsReply, isAnalyticsQuery } from "@/lib/procione/analytics";
import { handleModeSwitch } from "@/lib/procione/mode";
import { buildMarketingDraftResult, parseMarketingDraft } from "@/lib/procione/marketing";
import { buildMarketingFollowUp } from "@/lib/procione/marketing-context";
import {
  formatFavoriteHint,
  loadPlaceFavoritesForCity,
  mergeFavoritesIntoSearch,
} from "@/lib/procione/place-favorites";
import { buildPlaceSaveSummary, parsePlaceSaveIntent } from "@/lib/procione/place-save-parser";
import { parseAgendaQuery, parseSuperMastroCommand } from "@/lib/procione/voice-parser";
import {
  isConversationalIntent,
  isVoiceConfirmCancel,
  isVoiceConfirmYes,
} from "@/lib/procione/router";
import { parseWithGpt } from "@/lib/procione/openai";
import { getProcioneEnv, isOpenAiConfigured } from "@/lib/procione/env";
import { CONCIERGE_SEARCH_ONLY, isDemoMetricsPersistBlocked } from "@/lib/procione/storage-rules";
import {
  executeVoiceCommand,
  removeAppointmentWithGoogle,
  type IntentResult,
} from "@/lib/procione/tools";
import type {
  ProcioneDataMode,
  ProcioneDemoSnapshot,
  ProcioneMeetingContext,
} from "@/lib/procione/session";

export type { IntentResult };

export type SessionState = {
  dataMode?: ProcioneDataMode;
  meetingContext?: ProcioneMeetingContext;
  demoSnapshot?: ProcioneDemoSnapshot;
  sessionId?: string;
  lastConciergeSearch?: ConciergeSearchResult;
};

export type ExecuteOptions = {
  pendingDraft?: ProcioneDraft | null;
  history?: ChatTurn[];
  session?: SessionState;
  lat?: number;
  lng?: number;
};

function withSession(
  result: IntentResult,
  session: {
    dataMode: ProcioneDataMode;
    meetingContext?: ProcioneMeetingContext;
    demoSnapshot?: ProcioneDemoSnapshot;
  }
): IntentResult {
  return {
    ...result,
    dataMode: session.dataMode,
    meetingContext: session.meetingContext,
    demoSnapshot: session.demoSnapshot,
    sessionActive: result.sessionActive ?? true,
    lastConciergeSearch: result.lastConciergeSearch ?? result.concierge,
  };
}

function personaOptions(dataMode: ProcioneDataMode) {
  return { dataMode };
}

export async function executeParsedCommand(
  supabase: SupabaseClient,
  userId: string,
  parsed: GptParsedCommand | null,
  transcript: string,
  options: ExecuteOptions = {}
): Promise<IntentResult> {
  let dataMode: ProcioneDataMode = options.session?.dataMode ?? "real";
  let meetingContext = options.session?.meetingContext;
  let demoSnapshot = options.session?.demoSnapshot;
  const sessionId = options.session?.sessionId;

  const modeSwitch = handleModeSwitch(
    transcript,
    dataMode,
    meetingContext,
    demoSnapshot,
    sessionId
  );
  if (modeSwitch) {
    dataMode = modeSwitch.dataMode;
    meetingContext = modeSwitch.meetingContext;
    demoSnapshot = modeSwitch.demoSnapshot;
    if (modeSwitch.changed || parseMeetingEnterOnly(transcript)) {
      return withSession(
        { reply: modeSwitch.reply, type: "chat", sessionActive: true },
        { dataMode, meetingContext, demoSnapshot }
      );
    }
  }

  const ctx = await loadProcioneContext(supabase, userId, { dataMode, demoSnapshot });
  const { pendingDraft, history = [] } = options;
  const sessionPatch = { dataMode, meetingContext, demoSnapshot };

  if (pendingDraft) {
    if (isVoiceConfirmYes(transcript)) {
      const saved = await confirmProcioneDraft(supabase, userId, pendingDraft);
      return withSession({ ...saved, sessionActive: true }, sessionPatch);
    }
    if (isVoiceConfirmCancel(transcript)) {
      return withSession(
        {
          reply: "Ok Fernando, annullo. Non salvo nulla.",
          type: "chat",
          sessionActive: true,
        },
        sessionPatch
      );
    }
  }

  const marketingDraft = parseMarketingDraft(transcript);
  if (marketingDraft) {
    return withSession(buildMarketingDraftResult(marketingDraft), sessionPatch);
  }

  const placeSave = parsePlaceSaveIntent(transcript, options.session?.lastConciergeSearch);
  if (placeSave) {
    const pf = placeSave.place;
    return withSession(
      buildDraftResult({
        kind: "place_favorite",
        placeFavorite: {
          kind: pf.kind,
          name: pf.name,
          address: pf.address,
          city: pf.city,
          mapsUrl: pf.mapsUrl,
          placeId: pf.placeId,
          rating: pf.rating,
        },
        summary: buildPlaceSaveSummary(placeSave),
      }),
      sessionPatch
    );
  }

  const conciergeIntent = parseConciergeIntent(transcript, meetingContext?.destination);
  if (conciergeIntent) {
    if (!isConciergeConfigured()) {
      return withSession(
        {
          reply: "Concierge non disponibile al momento.",
          type: "chat",
          sessionActive: true,
        },
        sessionPatch
      );
    }

    // CONCIERGE_SEARCH_ONLY: ricerca API + sessione, nessun insert automatico in DB.
    void CONCIERGE_SEARCH_ONLY;

    const versaceAck =
      conciergeIntent.versaceCinese && conciergeIntent.kind === "restaurant"
        ? VERSACE_CINESE_ACK
        : undefined;

    let concierge = await runConciergeSearch({
      kind: conciergeIntent.kind,
      destination: conciergeIntent.destination,
      origin: conciergeIntent.origin,
      people: conciergeIntent.people,
      budgetMax: conciergeIntent.budgetMax,
      when: conciergeIntent.when,
      versaceCinese: conciergeIntent.versaceCinese,
      nearMe: conciergeIntent.nearMe,
      lat: options.lat,
      lng: options.lng,
      cityLabel: conciergeIntent.nearMe ? "vicino a te" : conciergeIntent.destination,
    });

    if (conciergeIntent.kind !== "train" && !conciergeIntent.nearMe) {
      const favorites = await loadPlaceFavoritesForCity(
        supabase,
        userId,
        conciergeIntent.destination,
        conciergeIntent.kind
      );
      if (favorites.length) {
        concierge = mergeFavoritesIntoSearch(concierge, favorites);
        const hint = formatFavoriteHint(favorites, conciergeIntent.destination);
        if (hint) concierge = { ...concierge, favoriteHint: hint };
      }
    }

    const reply = formatConciergeReply(concierge, versaceAck);
    return withSession(
      { reply, type: "chat", concierge, lastConciergeSearch: concierge, sessionActive: true },
      sessionPatch
    );
  }

  if (isAnalyticsQuery(transcript)) {
    void isDemoMetricsPersistBlocked(dataMode);

    const snapshot =
      dataMode === "meeting_demo"
        ? ctx.business ?? (await loadProcioneContext(supabase, userId, { dataMode, demoSnapshot })).business
        : ctx.business ?? (await loadProcioneContext(supabase, userId, { dataMode: "real" })).business;

    if (snapshot) {
      const factual = formatAnalyticsReply(snapshot, transcript, dataMode === "meeting_demo");
      const followUp = await buildMarketingFollowUp(supabase, userId, dataMode === "meeting_demo");
      const withFollowUp = appendAnalyticsFollowUp(factual, followUp, dataMode === "meeting_demo");
      if (isOpenAiConfigured()) {
        const env = getProcioneEnv();
        const reply = await wrapAnalyticsWithPersona(
          env.openaiKey,
          env.openaiModel,
          transcript,
          withFollowUp,
          ctx,
          personaOptions(dataMode)
        );
        return withSession({ reply, type: "chat", sessionActive: true }, sessionPatch);
      }
      return withSession({ reply: withFollowUp, type: "query", sessionActive: true }, sessionPatch);
    }
  }

  const superMastro = parseSuperMastroCommand(transcript);
  if (superMastro) {
    return withSession(
      {
        reply: superMastro.reply,
        type: "navigate",
        navigate: { url: superMastro.url, label: superMastro.label },
      },
      sessionPatch
    );
  }

  const agendaPeriod = parseAgendaQuery(transcript);
  if (agendaPeriod) {
    const { buildAgendaQueryReply } = await import("@/lib/procione/context");
    const factual = await buildAgendaQueryReply(supabase, userId, agendaPeriod);
    if (isOpenAiConfigured()) {
      const env = getProcioneEnv();
      const reply = await wrapAgendaWithPersona(
        env.openaiKey,
        env.openaiModel,
        transcript,
        factual,
        ctx,
        personaOptions(dataMode)
      );
      return withSession({ reply, type: "chat", agendaAction: "open", sessionActive: true }, sessionPatch);
    }
    return withSession(
      { reply: factual, type: "query", agendaAction: "open", sessionActive: true },
      sessionPatch
    );
  }

  if (isConversationalIntent(transcript) && isOpenAiConfigured()) {
    const env = getProcioneEnv();
    const reply = await chatWithProcione(
      env.openaiKey,
      env.openaiModel,
      transcript,
      ctx,
      history,
      personaOptions(dataMode)
    );
    return withSession({ reply, type: "chat", agendaAction: "open", sessionActive: true }, sessionPatch);
  }

  if (parsed?.intent && parsed.intent !== "unknown") {
    const gptResult = await executeGptStructured(supabase, userId, parsed, transcript);
    if (gptResult.type !== "unknown") {
      return withSession({ ...gptResult, sessionActive: true }, sessionPatch);
    }
  }

  const fallback = await executeVoiceCommand(supabase, userId, transcript, ctx);
  return withSession(
    { ...fallback, sessionActive: fallback.type === "chat" || fallback.type === "draft" },
    sessionPatch
  );
}

function parseMeetingEnterOnly(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return (
    /(?:vado|devo andare|sto andando).*(?:riunione|meeting)/.test(t) ||
    /\bpreparati\b/.test(t) ||
    /inventa.*numer/.test(t) ||
    /dall['']?ora in poi.*invent/.test(t) ||
    /modalit[aà].*demo/.test(t) ||
    /(?:ho\s+)?finito(?:\s+la\s+riunione)?/.test(t) ||
    /(?:ho\s+)?finito.*riunione/.test(t) ||
    /fine\s+riunione/.test(t) ||
    /torna.*(?:real|veri|dati\s+real)/.test(t)
  );
}

async function executeGptStructured(
  supabase: SupabaseClient,
  userId: string,
  parsed: GptParsedCommand,
  transcript: string
): Promise<IntentResult> {
  const hasAppt = Boolean(parsed.appointment?.title && parsed.appointment.starts_at && parsed.appointment.ends_at);
  const hasContact = Boolean(parsed.contact?.full_name);

  if (hasAppt && hasContact) {
    const contact = {
      full_name: parsed.contact!.full_name!,
      company: parsed.contact!.company ?? null,
      phone: parsed.contact!.phone ?? null,
      email: parsed.contact!.email ?? null,
    };
    const appointment = {
      title: parsed.appointment!.title!,
      description: parsed.appointment!.description,
      location: parsed.appointment!.location,
      contact_name: parsed.appointment!.contact_name ?? parsed.contact!.full_name,
      starts_at: parsed.appointment!.starts_at!,
      ends_at: parsed.appointment!.ends_at!,
      source: "voice" as const,
      color: "orange" as const,
    };
    return buildDraftResult({
      kind: "multi",
      contact,
      appointment,
      summary: `${buildContactDraftSummary(contact)} ${buildAppointmentDraftSummary(appointment)}`,
    });
  }

  if (parsed.intent === "create_appointment" && hasAppt) {
    const appointment = {
      title: parsed.appointment!.title!,
      description: parsed.appointment!.description,
      location: parsed.appointment!.location,
      contact_name: parsed.appointment!.contact_name,
      starts_at: parsed.appointment!.starts_at!,
      ends_at: parsed.appointment!.ends_at!,
      source: "voice" as const,
      color: "orange" as const,
    };
    return buildDraftResult({
      kind: "appointment",
      appointment,
      summary: buildAppointmentDraftSummary(appointment),
    });
  }

  if (parsed.intent === "create_contact" && hasContact) {
    const contact = {
      full_name: parsed.contact!.full_name!,
      company: parsed.contact!.company ?? null,
      phone: parsed.contact!.phone ?? null,
      email: parsed.contact!.email ?? null,
    };
    return buildDraftResult({
      kind: "contact",
      contact,
      summary: buildContactDraftSummary(contact),
    });
  }

  if (parsed.intent === "query_appointments") {
    const period = parseAgendaQuery(transcript) ?? "today";
    const { buildAgendaQueryReply } = await import("@/lib/procione/context");
    const reply = await buildAgendaQueryReply(supabase, userId, period);
    return { reply, type: "query", agendaAction: "open" };
  }

  return { reply: parsed.reply || "Non ho capito.", type: "unknown" };
}

export async function planAndExecuteVoice(
  supabase: SupabaseClient,
  userId: string,
  transcript: string,
  options: ExecuteOptions = {}
): Promise<IntentResult> {
  let parsed: GptParsedCommand | null = null;
  if (isOpenAiConfigured()) {
    const env = getProcioneEnv();
    const dataMode = options.session?.dataMode ?? "real";
    const ctx = await loadProcioneContext(supabase, userId, {
      dataMode,
      demoSnapshot: options.session?.demoSnapshot,
    });
    parsed = await parseWithGpt(env.openaiKey, env.openaiModel, transcript, ctx.contextBlock);
  }
  return executeParsedCommand(supabase, userId, parsed, transcript, options);
}

export { removeAppointmentWithGoogle };
