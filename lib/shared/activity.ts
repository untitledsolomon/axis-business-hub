import { createClient } from "@/lib/supabase/client";

export interface ActivityLog {
  id: string;
  org_id: string;
  user_id: string | null;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  profile?: { full_name: string | null; email: string | null } | null;
}

export async function getActivityLog(orgId: string, limit = 25, offset = 0) {
  const { data, error } = await createClient().from("audit_log")
    .select("*, profile:profiles!user_id(full_name,email)")
    .eq("org_id", orgId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

export function activityDescription(activity: ActivityLog) {
  const record = activity.new_data ?? activity.old_data ?? {};
  const label = String(record.name ?? record.invoice_number ?? record.description ?? record.reference ?? "record");
  const entity = activity.table_name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const action = activity.action.toLowerCase();
  const pastTense = action === "delete" ? "deleted" : action === "insert" ? "created" : "updated";
  return { title: `${entity} ${pastTense}`, description: `${label} was ${pastTense}.` };
}

export async function getActivityEntityNames(orgId: string) {
  const { data, error } = await createClient().from("audit_log").select("table_name").eq("org_id", orgId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ table_name: string }>;
  return Array.from(new Set(rows.map((row) => row.table_name))).sort();
}