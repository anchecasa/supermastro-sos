import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Misconfigured" }), { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.replace("Bearer ", "") !== serviceKey) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: pending, error } = await supabase
    .from("notification_outbox")
    .select("id, worker_id, invitation_id, payload")
    .is("sent_at", null)
    .order("created_at")
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const sentIds: string[] = [];

  for (const row of pending ?? []) {
    // Sprint 1 stub: log push payload. FCM/Web Push in Sprint 2.
    console.log("[push-stub]", {
      worker_id: row.worker_id,
      invitation_id: row.invitation_id,
      payload: row.payload,
    });
    sentIds.push(row.id);
  }

  if (sentIds.length > 0) {
    await supabase.rpc("mark_notifications_sent", { p_ids: sentIds });
  }

  return new Response(
    JSON.stringify({ processed: sentIds.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
