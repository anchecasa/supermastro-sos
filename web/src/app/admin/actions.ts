"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Non autorizzato");
  }

  return user;
}

async function logAdminAction(
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminClient();
  await admin.rpc("admin_log_action", {
    p_admin_email: adminEmail,
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_metadata: metadata,
  });
}

export async function approveWorker(workerId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_worker_status", {
    p_worker_id: workerId,
    p_status: "verified",
    p_note: "approved",
  });
  if (error) throw new Error(error.message);
  await logAdminAction(user.email!, "approve_worker", "worker", workerId);
  revalidatePath("/admin/verifica");
}

export async function rejectWorker(workerId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_worker_status", {
    p_worker_id: workerId,
    p_status: "deactivated",
    p_note: "rejected",
  });
  if (error) throw new Error(error.message);
  await logAdminAction(user.email!, "reject_worker", "worker", workerId);
  revalidatePath("/admin/verifica");
}

export async function requestCorrections(workerId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_worker_status", {
    p_worker_id: workerId,
    p_status: "registered",
    p_note: "corrections_requested",
  });
  if (error) throw new Error(error.message);
  await logAdminAction(user.email!, "request_corrections", "worker", workerId);
  revalidatePath("/admin/verifica");
}

export async function redispatchInvitations(requestId: string) {
  try {
    const user = await requireAdmin();
    const admin = createAdminClient();
    const { data: count, error } = await admin.rpc("admin_redispatch_invitations", {
      p_request_id: requestId,
      p_limit: 10,
    });

    if (error) {
      return { error: error.message };
    }

    await logAdminAction(user.email!, "redispatch_invitations", "service_request", requestId, {
      count,
    });

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/notifications/process`, {
      method: "POST",
    }).catch(() => null);

    revalidatePath("/admin/monitor");
    return { count: count as number };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function resolveDispute(
  disputeId: string,
  status: string,
  note: string,
  refund: boolean
) {
  try {
    const user = await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.rpc("admin_resolve_dispute", {
      p_dispute_id: disputeId,
      p_status: status,
      p_resolution_note: note,
      p_refund_worker: refund,
      p_admin_email: user.email!,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin/dispute");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function setPlatformFlag(key: string, value: boolean) {
  try {
    const user = await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.rpc("admin_set_platform_flag", {
      p_key: key,
      p_value: value,
      p_admin_email: user.email!,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin/impostazioni");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function buildJobShortlist(jobId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { data: count, error } = await admin.rpc("admin_build_job_shortlist", {
    p_job_id: jobId,
    p_limit: 10,
  });
  if (error) throw new Error(error.message);
  await logAdminAction(user.email!, "build_job_shortlist", "job_request", jobId, {
    count,
  });
  revalidatePath("/admin/recruitment");
  return count as number;
}

export async function selectJobCandidate(candidateId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_select_job_candidate", {
    p_candidate_id: candidateId,
  });
  if (error) throw new Error(error.message);
  await logAdminAction(user.email!, "select_job_candidate", "job_candidate", candidateId);
  revalidatePath("/admin/recruitment");
}

export async function approveJobRequest(jobId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_requests")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  await buildJobShortlist(jobId);
  await logAdminAction(user.email!, "approve_job_request", "job_request", jobId);
  revalidatePath("/admin/recruitment");
}
