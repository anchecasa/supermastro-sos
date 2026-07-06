import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SKILL_SLUGS = ["idraulico", "elettricista", "fabbro"] as const;
type SkillSlug = (typeof SKILL_SLUGS)[number];
type Urgency = "low" | "medium" | "high";

interface DiagnosisResult {
  skill_slug: SkillSlug;
  urgency: Urgency;
  confidence: number;
  summary: string;
}

function stubDiagnosis(_mimeTypes: string[]): DiagnosisResult {
  const skill = SKILL_SLUGS[Math.floor(Math.random() * SKILL_SLUGS.length)];
  return {
    skill_slug: skill,
    urgency: "medium",
    confidence: 0.72,
    summary: `Intervento ${skill} suggerito dall'analisi automatica (staging).`,
  };
}

async function openAiDiagnosis(
  imageUrls: string[],
  apiKey: string
): Promise<DiagnosisResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Sei SuperMastro. Analizza foto di problemi domestici in Italia.
Rispondi SOLO JSON: {"skill_slug":"idraulico|elettricista|fabbro","urgency":"low|medium|high","confidence":0.0-1.0,"summary":"max 120 char italiano"}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Classifica il problema nelle foto allegate.",
            },
            ...imageUrls.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "low" as const },
            })),
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content) as DiagnosisResult;

  if (!SKILL_SLUGS.includes(parsed.skill_slug)) {
    throw new Error("Skill non riconosciuta dal modello");
  }

  return parsed;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { request_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestId = body.request_id;
  if (!requestId) {
    return new Response(JSON.stringify({ error: "request_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: requestRow, error: reqError } = await supabase
    .from("service_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();

  if (reqError || !requestRow) {
    return new Response(JSON.stringify({ error: "Request not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (requestRow.status !== "diagnosing") {
    return new Response(JSON.stringify({ error: "Invalid request status" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: media, error: mediaError } = await supabase
    .from("request_media")
    .select("storage_path, mime_type")
    .eq("request_id", requestId)
    .order("sort_order");

  if (mediaError || !media?.length) {
    return new Response(JSON.stringify({ error: "No media found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signedUrls: string[] = [];
  for (const item of media) {
    const { data: signed, error: signError } = await supabase.storage
      .from("request-media")
      .createSignedUrl(item.storage_path, 300);

    if (signError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "Signed URL failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    signedUrls.push(signed.signedUrl);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  let diagnosis: DiagnosisResult;
  let modelVersion = "stub-v1";

  try {
    if (openAiKey) {
      diagnosis = await openAiDiagnosis(signedUrls, openAiKey);
      modelVersion = "gpt-4o-mini";
    } else {
      diagnosis = stubDiagnosis(media.map((m) => m.mime_type));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Diagnosis failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: applyError } = await supabase.rpc("apply_request_diagnosis", {
    p_request_id: requestId,
    p_skill_slug: diagnosis.skill_slug,
    p_urgency: diagnosis.urgency,
    p_confidence: diagnosis.confidence,
    p_summary: diagnosis.summary,
    p_raw_response: diagnosis,
    p_model_version: modelVersion,
  });

  if (applyError) {
    return new Response(JSON.stringify({ error: applyError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      skill_slug: diagnosis.skill_slug,
      urgency: diagnosis.urgency,
      model_version: modelVersion,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
