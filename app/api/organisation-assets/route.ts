import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function assertAdmin(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required", status: 401 } as const;
  const { data: member } = await supabase.from("organisation_members").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (!member) return { error: "Organisation access denied", status: 403 } as const;
  return { user, isAdmin: ["owner", "admin"].includes(member.role) } as const;
}

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  const access = await assertAdmin(orgId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const storage = serviceClient();
  const { data, error } = await storage.storage.from("organisation-logos").list(orgId, { limit: 50, sortBy: { column: "updated_at", order: "desc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assets: (data ?? []).filter((file) => file.name).map((file) => { const path = `${orgId}/${file.name}`; const { data: url } = storage.storage.from("organisation-logos").getPublicUrl(path); return { path, url: url.publicUrl, name: file.metadata?.originalName ?? file.name, updatedAt: file.updated_at ?? file.created_at }; }) });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const orgId = String(formData.get("orgId") ?? "");
  const file = formData.get("file");
  if (!orgId || !(file instanceof File)) return NextResponse.json({ error: "orgId and an image file are required" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Logo files must be 2MB or smaller" }, { status: 400 });
  const access = await assertAdmin(orgId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.isAdmin) return NextResponse.json({ error: "Only organisation owners and admins can manage logos" }, { status: 403 });
  const path = `${orgId}/logo-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
  const { error } = await serviceClient().storage.from("organisation-logos").upload(path, file, { contentType: file.type, upsert: true, metadata: { originalName: file.name } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = serviceClient().storage.from("organisation-logos").getPublicUrl(path);
  return NextResponse.json({ path, url: data.publicUrl });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as { orgId?: string; path?: string } | null;
  if (!body?.orgId || !body.path || !body.path.startsWith(`${body.orgId}/`)) return NextResponse.json({ error: "orgId and a valid asset path are required" }, { status: 400 });
  const access = await assertAdmin(body.orgId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.isAdmin) return NextResponse.json({ error: "Only organisation owners and admins can manage logos" }, { status: 403 });
  const { error } = await serviceClient().storage.from("organisation-logos").remove([body.path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}