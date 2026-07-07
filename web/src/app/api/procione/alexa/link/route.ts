import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { generateLinkCode } from "@/lib/procione/user-memory";

const CODE_TTL_MS = 15 * 60 * 1000;

export async function GET() {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;
  const { data: link } = await supabase
    .from("assistant_alexa_links")
    .select("linked_at, amazon_user_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: pending } = await supabase
    .from("assistant_alexa_link_codes")
    .select("code, expires_at")
    .eq("owner_id", user.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    linked: Boolean(link),
    linkedAt: link?.linked_at ?? null,
    pendingCode: pending?.code ?? null,
    pendingExpiresAt: pending?.expires_at ?? null,
  });
}

export async function POST() {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;
  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error } = await supabase.from("assistant_alexa_link_codes").insert({
    owner_id: user.id,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code,
    expiresAt,
    instruction: `Di' ad Alexa: «collega codice ${code}» entro 15 minuti.`,
  });
}
