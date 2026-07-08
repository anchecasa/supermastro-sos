import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AGENDA_GATE_COOKIE,
  agendaGateCookieOptions,
  createAgendaGateToken,
  getAgendaAccessCode,
  resolveProcioneAdminUser,
} from "@/lib/agenda/gate";

export async function POST(request: Request) {
  let body: { password?: string } = {};
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const password = body.password?.trim() ?? "";
  if (password !== getAgendaAccessCode()) {
    return NextResponse.json({ error: "Password non valida" }, { status: 401 });
  }

  const adminUser = await resolveProcioneAdminUser();
  if (!adminUser) {
    return NextResponse.json(
      { error: "Admin Procione non configurato sul server" },
      { status: 503 }
    );
  }

  const token = createAgendaGateToken(adminUser.id);
  const cookieStore = await cookies();
  cookieStore.set(AGENDA_GATE_COOKIE, token, agendaGateCookieOptions());

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(AGENDA_GATE_COOKIE, "", { ...agendaGateCookieOptions(0), maxAge: 0 });
  return NextResponse.json({ ok: true });
}
