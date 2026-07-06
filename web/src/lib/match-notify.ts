import { createAdminClient } from "@/lib/supabase/admin";
import { buildClientMatchSms, hashPhone, sendSms } from "@/lib/sms";

export async function notifyClientMatchSms(matchId: string) {
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("id, worker_id, request_id")
    .eq("id", matchId)
    .single();

  if (!match) return;

  const [{ data: workerContact }, { data: workerProfile }, { data: request }] =
    await Promise.all([
      admin
        .from("contact_vault")
        .select("phone")
        .eq("owner_type", "worker")
        .eq("owner_id", match.worker_id)
        .maybeSingle(),
      admin.from("workers").select("user_id").eq("id", match.worker_id).single(),
      admin.from("service_requests").select("client_id").eq("id", match.request_id).single(),
    ]);

  if (!request?.client_id) return;

  const { data: clientContact } = await admin
    .from("contact_vault")
    .select("phone")
    .eq("owner_type", "client")
    .eq("owner_id", request.client_id)
    .maybeSingle();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", workerProfile?.user_id ?? "")
    .maybeSingle();

  if (!clientContact?.phone || !workerContact?.phone) return;

  const body = buildClientMatchSms(profile?.display_name ?? "Mastro", workerContact.phone);
  const result = await sendSms(clientContact.phone, body);

  await admin.from("sms_delivery_log").insert({
    client_user_id: request.client_id,
    phone_hash: hashPhone(clientContact.phone),
    message_type: "client_match",
    body_preview: body,
    status: result.error ? "failed" : "sent",
    provider_sid: result.sid ?? null,
  });
}
