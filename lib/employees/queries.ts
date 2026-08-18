import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { Employee } from "@/lib/types";

export async function getEmployees(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data as Employee[];
}

// Note: create/update/terminate are intentionally not implemented yet.
// Employees UI is read-only against real data for now — see V1 Roadmap
// Phase 3 (schema in place, workflows to be built once a client's actual
// HR requirements are confirmed).
