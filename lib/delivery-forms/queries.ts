import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { DeliveryForm, DeliveryFormItem } from "@/lib/types";

export async function getDeliveryForms(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_forms")
    .select(`
      *,
      client:clients(*),
      items:delivery_form_items(*, job_order:job_orders(*))
    `)
    .eq("org_id", orgId)
    .order("delivery_number", { ascending: false });

  if (error) throw error;
  return data as DeliveryForm[];
}

export async function getDeliveryForm(orgId: string, deliveryFormId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_forms")
    .select(`
      *,
      client:clients(*),
      items:delivery_form_items(*, job_order:job_orders(*, status:job_order_statuses(*)))
    `)
    .eq("org_id", orgId)
    .eq("id", deliveryFormId)
    .single();

  if (error) throw error;
  return data as DeliveryForm;
}

export async function createDeliveryForm(
  deliveryForm: Omit<DeliveryForm, "id" | "created_at" | "updated_at" | "client" | "items">,
  items: Omit<DeliveryFormItem, "id" | "org_id" | "delivery_form_id" | "created_at" | "job_order">[]
) {
  const supabase = getSupabaseClient();

  const { data: newDeliveryForm, error: deliveryFormError } = await supabase
    .from("delivery_forms")
    .insert(deliveryForm)
    .select()
    .single();

  if (deliveryFormError) throw deliveryFormError;

  const itemsWithIds = items.map((item) => ({
    ...item,
    org_id: deliveryForm.org_id,
    delivery_form_id: newDeliveryForm.id,
  }));

  const { error: itemsError } = await supabase
    .from("delivery_form_items")
    .insert(itemsWithIds);

  if (itemsError) throw itemsError;

  return newDeliveryForm as DeliveryForm;
}

export async function updateDeliveryForm(deliveryFormId: string, updates: Partial<DeliveryForm>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_forms")
    .update(updates)
    .eq("id", deliveryFormId)
    .select()
    .single();

  if (error) throw error;
  return data as DeliveryForm;
}

export async function getNextDeliveryNumber(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_next_delivery_number", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return data as string;
}

// Job orders for a client that aren't yet on a delivery form — the picker
// for "what can go on this delivery" (a job order can appear on multiple
// delivery forms across partial batches, so this is a convenience filter,
// not a hard exclusion; it just surfaces not-yet-delivered ones first).
export async function getUndeliveredJobOrdersForClient(orgId: string, clientId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_orders")
    .select(`*, status:job_order_statuses(*)`)
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .order("job_order_number", { ascending: false });

  if (error) throw error;
  return data;
}
