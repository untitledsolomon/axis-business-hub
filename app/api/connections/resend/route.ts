import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RESEND_API_URL = "https://api.resend.com";

type ResendDomain = {
  id: string;
  name: string;
  status: string;
  records?: Array<{
    record: string;
    name: string;
    type: string;
    value: string;
    ttl?: string;
    status?: string;
  }>;
};

async function getAdminAccess(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required", status: 401 as const };

  const { data: member } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "Organisation access denied", status: 403 as const };
  if (!["owner", "admin"].includes(member.role)) {
    return { error: "Only organisation owners and admins can manage connections", status: 403 as const };
  }
  return { supabase } as const;
}

async function resendRequest<T>(path: string, options?: RequestInit) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const response = await fetch(`${RESEND_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const body = await response.json().catch(() => null) as T & { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? "Resend API request failed");
  return body as T;
}

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  const access = await getAdminAccess(orgId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await access.supabase
    .from("connections")
    .select("id, provider, status, verified_at, last_error, config, updated_at")
    .eq("org_id", orgId)
    .eq("provider", "resend")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { orgId?: string; action?: "register" | "verify"; domain?: string } | null;
  if (!body?.orgId || !body.action) return NextResponse.json({ error: "orgId and action are required" }, { status: 400 });
  const access = await getAdminAccess(body.orgId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { data: connection } = await access.supabase
      .from("connections")
      .select("id, config")
      .eq("org_id", body.orgId)
      .eq("provider", "resend")
      .maybeSingle();

    let domain: ResendDomain;
    if (body.action === "register") {
      if (!body.domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
      domain = await resendRequest<ResendDomain>("/domains", {
        method: "POST",
        body: JSON.stringify({ name: body.domain.trim().toLowerCase() }),
      });
    } else {
      const domainId = (connection?.config as { domain_id?: string } | null)?.domain_id;
      if (!domainId) return NextResponse.json({ error: "Register a domain before checking verification" }, { status: 400 });
      domain = await resendRequest<ResendDomain>(`/domains/${encodeURIComponent(domainId)}`);
    }

    const isVerified = domain.status === "verified";
    const { data: saved, error } = await access.supabase
      .from("connections")
      .upsert({
        org_id: body.orgId,
        provider: "resend",
        config: { domain_id: domain.id, domain: domain.name },
        status: isVerified ? "connected" : "pending",
        verified_at: isVerified ? new Date().toISOString() : null,
        last_error: null,
      }, { onConflict: "org_id,provider" })
      .select("id, provider, status, verified_at, last_error, config, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ connection: saved, domain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend request failed";
    await access.supabase.from("connections").upsert({
      org_id: body.orgId,
      provider: "resend",
      status: "error",
      last_error: message,
    }, { onConflict: "org_id,provider" });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
