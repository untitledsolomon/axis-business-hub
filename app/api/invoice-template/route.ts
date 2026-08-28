import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { validateCustomTemplate } from "@/lib/invoicing/templates/interpolate";

const BUCKET = "invoice-templates";
const MAX_FILE_SIZE = 500 * 1024;

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function assertMember(orgId: string, requireAdmin = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required", status: 401 };

  const { data: member } = await supabase
    .from("organisation_members")
    .select("org_id, role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "Organisation access denied", status: 403 };
  if (requireAdmin && !["owner", "admin"].includes(member.role)) return { error: "Only organisation owners and admins can manage templates", status: 403 };
  return { user };
}

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  const access = await assertMember(orgId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const storage = serviceClient();
  if (new URL(request.url).searchParams.get("content") === "true") {
    const { data: file, error: downloadError } = await storage.storage.from(BUCKET).download(`${orgId}/template.html`);
    if (downloadError || !file) return NextResponse.json({ error: "Uploaded template not found" }, { status: 404 });
    return NextResponse.json({ html: await file.text() });
  }
  const { data, error } = await storage.storage.from(BUCKET).list(orgId, { search: "template.html", limit: 1 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const file = data?.find((item) => item.name === "template.html");
  return NextResponse.json(file ? { fileName: file.metadata?.originalName ?? file.name, uploadedAt: file.updated_at ?? file.created_at } : { fileName: null, uploadedAt: null });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const orgId = String(formData.get("orgId") ?? "");
  const file = formData.get("file");
  if (!orgId || !(file instanceof File)) return NextResponse.json({ error: "orgId and an HTML file are required" }, { status: 400 });
  if (!/\.html?$/i.test(file.name)) return NextResponse.json({ error: "Only .html and .htm files are allowed" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Template files must be 500KB or smaller" }, { status: 400 });

  const access = await assertMember(orgId, true);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const html = await file.text();
  const validationError = validateCustomTemplate(html);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const path = `${orgId}/template.html`;
  const { error } = await serviceClient().storage.from(BUCKET).upload(path, new Blob([html], { type: "text/html" }), {
    contentType: "text/html",
    metadata: { originalName: file.name },
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path, fileName: file.name, uploadedAt: new Date().toISOString() });
}

export async function DELETE(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  const access = await assertMember(orgId, true);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { error } = await serviceClient().storage.from(BUCKET).remove([`${orgId}/template.html`]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
