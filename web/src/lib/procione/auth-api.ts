import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { agendaGateUser, readAgendaGateSession } from "@/lib/agenda/gate";

export async function requireProcioneApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAdminEmail(user.email)) {
    return { supabase, user };
  }

  const gate = await readAgendaGateSession();
  if (gate) {
    return {
      supabase: createAdminClient(),
      user: agendaGateUser(gate.userId, gate.email),
    };
  }

  return { error: "Unauthorized" as const, status: 401 as const };
}
