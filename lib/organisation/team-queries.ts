import { createClient as getSupabaseClient } from "@/lib/supabase/client";

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
