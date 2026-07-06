import { artigianoAuthCallback } from "@/app/auth/callback-handler";

export async function GET(request: Request) {
  return artigianoAuthCallback(request as import("next/server").NextRequest);
}
