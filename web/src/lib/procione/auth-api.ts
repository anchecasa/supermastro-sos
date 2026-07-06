import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export async function requireProcioneApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  return { supabase, user };
}
