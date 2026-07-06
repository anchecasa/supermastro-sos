import { supermastroAuthCallback } from "@/app/auth/callback-handler";

export async function GET(request: Request) {
  return supermastroAuthCallback(request as import("next/server").NextRequest);
}
