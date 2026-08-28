import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { orgId?: string } | null;
  if (!body?.orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data: member } = await supabase
    .from("organisation_members")
    .select("org_id")
    .eq("org_id", body.orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Organisation access denied" }, { status: 403 });

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("paddle_checkout_sessions").insert({
    token_hash: tokenHash,
    org_id: body.orgId,
    user_id: user.id,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  if (error) return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  return NextResponse.json({ token });
}