import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { OrgInvitation } from "@/lib/types";

export interface TeamMember {
  id: string;
  role: string;
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getTeamMembers(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisation_members")
    .select(`
      id,
      role,
      created_at,
      profile:profiles(id, email, full_name, avatar_url)
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as unknown as TeamMember[];
}

export async function getPendingInvitations(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("org_invitations")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as OrgInvitation[];
}

export async function createInvitation(params: { org_id: string; email: string; role: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("create_org_invitation_v1", {
    p_org_id: params.org_id,
    p_email: params.email,
    p_role: params.role,
  });

  if (error) throw error;
  // RPC returns a table (id, code); Supabase returns it as an array.
  const row = Array.isArray(data) ? data[0] : data;
  return row as { id: string; code: string };
}

export async function revokeInvitation(invitationId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("revoke_org_invitation_v1", {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
}

export async function acceptInvitation(code: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("accept_org_invitation_v1", { p_code: code });
  if (error) throw error;
  return data as string; // org_id joined
}
