import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { JobOrder, JobOrderCost, JobOrderCostType, JobOrderMargin, JobOrderStatus } from "@/lib/types";

export async function getJobOrders(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_orders")
    .select(`
      *,
      client:clients(*),
      status:job_order_statuses(*)
    `)
    .eq("org_id", orgId)
    .order("job_order_number", { ascending: false });

  if (error) throw error;
  return data as JobOrder[];
}

export async function getJobOrder(orgId: string, jobOrderId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_orders")
    .select(`
      *,
      client:clients(*),
      status:job_order_statuses(*),
      costs:job_order_costs(*, cost_type:job_order_cost_types(*)),
      quotation:quotations(*)
    `)
    .eq("org_id", orgId)
    .eq("id", jobOrderId)
    .single();

  if (error) throw error;
  return data as JobOrder;
}

export async function createJobOrder(params: {
  org_id: string;
  client_id: string;
  description: string;
  quantity: number;
  currency?: string;
  due_date?: string;
  notes?: string;
  quotation_id?: string;
  status_id?: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("create_job_order_v1", {
    p_org_id: params.org_id,
    p_client_id: params.client_id,
    p_description: params.description,
    p_quantity: params.quantity,
    p_currency: params.currency ?? null,
    p_due_date: params.due_date ?? null,
    p_notes: params.notes ?? null,
    p_quotation_id: params.quotation_id ?? null,
    p_status_id: params.status_id ?? null,
  });

  if (error) throw error;
  return data as JobOrder;
}

export async function updateJobOrder(jobOrderId: string, updates: Partial<JobOrder>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_orders")
    .update(updates)
    .eq("id", jobOrderId)
    .select()
    .single();

  if (error) throw error;
  return data as JobOrder;
}

export async function updateJobOrderStatus(params: { org_id: string; job_order_id: string; status_id: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("update_job_order_status_v1", {
    p_org_id: params.org_id,
    p_job_order_id: params.job_order_id,
    p_status_id: params.status_id,
  });

  if (error) throw error;
  return data as JobOrder;
}

export async function getNextJobOrderNumber(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_next_job_order_number", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return data as string;
}

// --- Statuses (org-configurable; seeded by default, editable on Pro+) -----

export async function getJobOrderStatuses(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_statuses")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as JobOrderStatus[];
}

export async function createJobOrderStatus(status: Omit<JobOrderStatus, "id" | "created_at" | "updated_at">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_statuses")
    .insert(status)
    .select()
    .single();

  if (error) throw error;
  return data as JobOrderStatus;
}

export async function updateJobOrderStatusConfig(statusId: string, updates: Partial<JobOrderStatus>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_statuses")
    .update(updates)
    .eq("id", statusId)
    .select()
    .single();

  if (error) throw error;
  return data as JobOrderStatus;
}

export async function deleteJobOrderStatus(statusId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("job_order_statuses").delete().eq("id", statusId);
  if (error) throw error;
}

// --- Cost types (org-configurable, Pro+) ----------------------------------

export async function getJobOrderCostTypes(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_cost_types")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as JobOrderCostType[];
}

export async function createJobOrderCostType(costType: Omit<JobOrderCostType, "id" | "created_at" | "updated_at">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_cost_types")
    .insert(costType)
    .select()
    .single();

  if (error) throw error;
  return data as JobOrderCostType;
}

export async function deleteJobOrderCostType(costTypeId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("job_order_cost_types").delete().eq("id", costTypeId);
  if (error) throw error;
}

// --- Costs (line items against a job order, Pro+; roll up into margin) ----

export async function addJobOrderCost(cost: Omit<JobOrderCost, "id" | "created_at" | "updated_at" | "cost_type">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_costs")
    .insert(cost)
    .select()
    .single();

  if (error) throw error;
  return data as JobOrderCost;
}

export async function deleteJobOrderCost(costId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("job_order_costs").delete().eq("id", costId);
  if (error) throw error;
}

export async function getJobOrderMargin(orgId: string, jobOrderId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_margins")
    .select("*")
    .eq("org_id", orgId)
    .eq("job_order_id", jobOrderId)
    .maybeSingle();

  if (error) throw error;
  return data as JobOrderMargin | null;
}

export async function getJobOrderMargins(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_order_margins")
    .select("*")
    .eq("org_id", orgId);

  if (error) throw error;
  return data as JobOrderMargin[];
}
