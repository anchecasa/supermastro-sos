import { createClient } from "@/lib/supabase/server";
import {
  getDefaultHomePath,
  REGISTRATION_CONSENT_PURPOSE,
  sanitizeAuthNextPath,
  type UserRole,
} from "@/lib/constants";
import { NextResponse, type NextRequest } from "next/server";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

export async function completeAuthSession(
  request: NextRequest,
  role: UserRole
): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const homePath = getDefaultHomePath(role);
  const errorRedirect = new URL(homePath, origin);
  errorRedirect.searchParams.set("auth", "error");

  const next = sanitizeAuthNextPath(searchParams.get("next"), role);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash") ?? searchParams.get("token");
  const type = (searchParams.get("type") ?? (tokenHash ? "magiclink" : null)) as OtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession:", error.message);
      return NextResponse.redirect(errorRedirect);
    }
  } else if (tokenHash && type) {
    const otpTypes: OtpType[] = [type, "magiclink", "signup", "email"];
    let verified = false;
    for (const otpType of [...new Set(otpTypes)]) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      });
      if (!error) {
        verified = true;
        break;
      }
      console.error(`verifyOtp (${otpType}):`, error.message);
    }
    if (!verified) {
      return NextResponse.redirect(errorRedirect);
    }
  } else {
    return NextResponse.redirect(errorRedirect);
  }

  await supabase.rpc("log_registration_consent", {
    p_purpose: REGISTRATION_CONSENT_PURPOSE,
    p_version: "1.0",
  });

  const destination = next ?? homePath;
  return NextResponse.redirect(new URL(destination, origin));
}

export async function handleAuthCallback(request: NextRequest, role: UserRole) {
  return completeAuthSession(request, role);
}

export async function supermastroAuthCallback(request: NextRequest) {
  return handleAuthCallback(request, "client");
}

export async function artigianoAuthCallback(request: NextRequest) {
  return handleAuthCallback(request, "worker");
}
