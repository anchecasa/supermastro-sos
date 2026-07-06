"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildMediaStoragePath,
  SOS_SKILL_OPTIONS,
  URGENCY_LABELS,
  type UrgencyLevel,
} from "@/lib/sos/constants";
import {
  createDemoRequestId,
  demoDiagnosisForSkill,
  saveDemoRequest,
} from "@/lib/sos/demo";

type Step = "zone" | "photo" | "diagnosing" | "confirm" | "waiting";

type ZoneResult = {
  in_zone: boolean;
  zone_name?: string;
  city?: string;
};

type DiagnosisView = {
  skill_slug: string;
  skill_label: string;
  urgency: UrgencyLevel;
  summary: string | null;
};

type Props = {
  userId: string;
  demoMode?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SosWizard({ userId, demoMode = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("zone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoneInfo, setZoneInfo] = useState<ZoneResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null
  );
  const [requestId, setRequestId] = useState<string | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisView | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [clientPhone, setClientPhone] = useState("");

  const supabase = createClient();

  const locateAndCheckZone = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const { longitude, latitude, accuracy } = position.coords;
      setCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });

      if (demoMode) {
        const demoId = createDemoRequestId();
        setZoneInfo({
          in_zone: true,
          zone_name: "Zona pilota (demo)",
          city: "Roma",
        });
        setRequestId(demoId);
        setStep("photo");
        return;
      }

      const { data: zone, error: zoneError } = await supabase.rpc(
        "check_pilot_zone",
        { p_lng: longitude, p_lat: latitude }
      );

      if (zoneError) throw new Error(zoneError.message);

      const result = zone as ZoneResult;
      setZoneInfo(result);

      if (!result.in_zone) {
        setError(
          "SuperMastro non è ancora attivo nella tua zona. Il pilota è attivo a Roma."
        );
        return;
      }

      const { data: newRequestId, error: createError } = await supabase.rpc(
        "create_sos_request",
        {
          p_lng: longitude,
          p_lat: latitude,
          p_accuracy_m: Math.round(accuracy),
        }
      );

      if (createError) throw new Error(createError.message);

      setRequestId(newRequestId as string);
      setStep("photo");
    } catch (err) {
      const message =
        err instanceof GeolocationPositionError
          ? "Permesso posizione negato o non disponibile."
          : err instanceof Error
            ? err.message
            : "Errore imprevisto";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [demoMode, supabase]);

  const handlePhotoSelect = async (file: File) => {
    if (!requestId || !aiConsent) {
      setError("Accetta il consenso analisi AI prima di caricare.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (demoMode) {
        setPreviewUrl(URL.createObjectURL(file));
        return;
      }

      const { error: consentError } = await supabase.rpc(
        "log_ai_analysis_consent",
        { p_request_id: requestId }
      );
      if (consentError) throw new Error(consentError.message);

      const storagePath = buildMediaStoragePath(userId, requestId, file.name);

      const { error: uploadError } = await supabase.storage
        .from("request-media")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (uploadError) throw new Error(uploadError.message);

      const { error: registerError } = await supabase.rpc(
        "register_request_media",
        {
          p_request_id: requestId,
          p_storage_path: storagePath,
          p_mime_type: file.type,
          p_file_size_bytes: file.size,
        }
      );

      if (registerError) throw new Error(registerError.message);

      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fallito");
    } finally {
      setLoading(false);
    }
  };

  const submitForDiagnosis = async () => {
    if (!requestId) return;

    setError(null);
    setLoading(true);
    setStep("diagnosing");

    try {
      if (demoMode) {
        await sleep(1800);
        const defaultSkill = SOS_SKILL_OPTIONS[0];
        const demoDiag = demoDiagnosisForSkill(defaultSkill.slug, defaultSkill.label);
        setDiagnosis(demoDiag);
        setSelectedSkill(demoDiag.skill_slug);
        setStep("confirm");
        return;
      }

      const { error: submitError } = await supabase.rpc(
        "submit_request_for_diagnosis",
        { p_request_id: requestId }
      );
      if (submitError) throw new Error(submitError.message);

      const res = await fetch("/api/sos/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Diagnosi fallita");

      await loadDiagnosis(requestId);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Diagnosi fallita");
      setStep("photo");
    } finally {
      setLoading(false);
    }
  };

  const loadDiagnosis = async (id: string) => {
    const { data, error: diagError } = await supabase
      .from("request_diagnoses")
      .select("summary, urgency, skill_id")
      .eq("request_id", id)
      .single();

    if (diagError || !data) {
      throw new Error("Diagnosi non disponibile");
    }

    const { data: skillRow } = await supabase
      .from("skills")
      .select("slug, label")
      .eq("id", data.skill_id)
      .single();

    const skillSlug = skillRow?.slug ?? "idraulico";

    setDiagnosis({
      skill_slug: skillSlug,
      skill_label: skillRow?.label ?? skillSlug,
      urgency: data.urgency as UrgencyLevel,
      summary: data.summary,
    });
    setSelectedSkill(skillSlug);
  };

  const confirmDiagnosis = async () => {
    if (!requestId) return;

    if (!clientPhone.trim() || clientPhone.trim().length < 8) {
      setError("Inserisci un numero di telefono valido per essere contattato.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (demoMode) {
        if (!coords || !diagnosis) throw new Error("Dati demo incompleti");

        const skill =
          SOS_SKILL_OPTIONS.find((s) => s.slug === selectedSkill) ?? SOS_SKILL_OPTIONS[0];

        saveDemoRequest({
          id: requestId,
          lat: coords.lat,
          lng: coords.lng,
          accuracy_m: coords.accuracy,
          zone_name: zoneInfo?.zone_name ?? "Roma",
          city: zoneInfo?.city ?? "Roma",
          skill_slug: skill.slug,
          skill_label: skill.label,
          urgency: diagnosis.urgency,
          summary: diagnosis.summary ?? "",
          phone: clientPhone.trim(),
          createdAt: new Date().toISOString(),
        });

        router.push(`/supermastro/richiesta/${requestId}`);
        return;
      }

      const { error: phoneError } = await supabase.rpc("upsert_client_contact", {
        p_phone: clientPhone.trim(),
      });
      if (phoneError) throw new Error(phoneError.message);

      const { error: confirmError } = await supabase.rpc(
        "confirm_request_diagnosis",
        {
          p_request_id: requestId,
          p_skill_slug: selectedSkill || null,
        }
      );

      if (confirmError) throw new Error(confirmError.message);

      void fetch("/api/notifications/process", { method: "POST" });

      router.push(`/supermastro/richiesta/${requestId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conferma fallita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {demoMode && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Demo interattiva: GPS reale, analisi e match simulati — nessun mastro reale viene
          contattato.
        </p>
      )}

      {error && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            error.includes("RATE_LIMIT")
              ? "bg-amber-50 text-amber-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {error.replace("RATE_LIMIT: ", "")}
        </p>
      )}

      {step === "zone" && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Verifica zona pilota</h2>
            <p className="text-sm text-muted">
              Usiamo la tua posizione GPS per verificare che SuperMastro sia attivo nella tua
              area e per trovare mastri vicini.
            </p>
            {coords && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Posizione: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (±
                {coords.accuracy} m)
              </p>
            )}
            <Button
              type="button"
              disabled={loading}
              variant="client"
              size="full"
              onClick={() => void locateAndCheckZone()}
            >
              {loading ? "Acquisizione GPS…" : "Usa la mia posizione"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "photo" && zoneInfo?.in_zone && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-medium text-emerald-700">
              Zona attiva: {zoneInfo.zone_name} ({zoneInfo.city})
            </p>
            <h2 className="text-lg font-semibold">Scatta o carica una foto</h2>

            <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-muted">
                Acconsento all&apos;analisi automatica delle foto da parte di SuperMastro
                per individuare il tipo di intervento (AI). Posso annullare prima del
                match.
              </span>
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              disabled={!aiConsent || loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePhotoSelect(file);
              }}
              className="block w-full text-sm"
            />

            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Anteprima problema"
                className="max-h-64 w-full rounded-xl object-cover"
              />
            )}

            <Button
              type="button"
              disabled={!previewUrl || loading}
              variant="client"
              size="full"
              onClick={() => void submitForDiagnosis()}
            >
              Analizza e continua
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "diagnosing" && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold">Analisi in corso</p>
            <p className="mt-2 text-sm text-muted">Quasi fatto…</p>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && diagnosis && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Conferma intervento</h2>
            <p className="text-sm text-muted">
              {diagnosis.summary ?? "Verifica la categoria suggerita."}
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm"
              >
                {SOS_SKILL_OPTIONS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-sm text-muted">
              Urgenza stimata:{" "}
              <strong className="text-foreground">{URGENCY_LABELS[diagnosis.urgency]}</strong>
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="client-phone">
                Il tuo telefono
              </label>
              <Input
                id="client-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Es. 333 1234567"
              />
              <p className="text-xs text-muted">Visibile al mastro solo dopo il match.</p>
            </div>

            <Button
              type="button"
              disabled={loading}
              variant="client"
              size="full"
              onClick={() => void confirmDiagnosis()}
            >
              Invia richiesta ai mastri
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
