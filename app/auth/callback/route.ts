import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/onboarding";
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as "email" | "signup" | "recovery" | "invite" | "magiclink" | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing verification code") };

  if (error) {
    const errorUrl = new URL("/login", request.url);
    errorUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}