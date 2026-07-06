import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { runConciergeSearch, formatConciergeReply } from "@/lib/procione/concierge";
import type { ConciergeKind } from "@/lib/procione/concierge-parser";

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    kind?: ConciergeKind;
    destination?: string;
    origin?: string;
    people?: number;
    budgetMax?: number;
    when?: string;
    versaceCinese?: boolean;
  };

  if (!body.destination || !body.kind) {
    return NextResponse.json({ error: "destination e kind richiesti." }, { status: 400 });
  }

  const concierge = await runConciergeSearch({
    kind: body.kind,
    destination: body.destination,
    origin: body.origin,
    people: body.people,
    budgetMax: body.budgetMax,
    when: body.when,
    versaceCinese: body.versaceCinese,
  });

  return NextResponse.json({
    reply: formatConciergeReply(concierge),
    concierge,
  });
}
