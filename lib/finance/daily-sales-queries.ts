import { createClient } from "@/lib/supabase/client";
import { DailySale } from "@/lib/types";

export interface DailySaleFilters {
  from?: string;
  to?: string;
}

export async function getDailySales(orgId: string, filters?: DailySaleFilters) {
  const supabase = createClient();
  let query = supabase
    .from("daily_sales")
    .select(`
      *,
      revenue_account:accounts!daily_sales_revenue_account_id_fkey(id, name, code),
      received_into_account:accounts!daily_sales_received_into_account_id_fkey(id, name, code),
      item:items(id, name, sku)
    `)
    .eq("org_id", orgId)
    .order("sale_date", { ascending: false });

  if (filters?.from) query = query.gte("sale_date", filters.from);
  if (filters?.to) query = query.lte("sale_date", filters.to);

  const { data, error } = await query;

  if (error) throw error;
  return data as DailySale[];
}

export async function getDailySale(orgId: string, saleId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_sales")
    .select(`
      *,
      revenue_account:accounts!daily_sales_revenue_account_id_fkey(id, name, code),
      received_into_account:accounts!daily_sales_received_into_account_id_fkey(id, name, code)
    `)
    .eq("org_id", orgId)
    .eq("id", saleId)
    .single();

  if (error) throw error;
  return data as DailySale;
}

export async function createDailySale(params: {
  org_id: string;
  sale_date: string;
  description: string;
  amount: number; // cents
  payment_method: string;
  revenue_account_id: string;
  received_into_account_id: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_daily_sale_v1", {
    p_org_id: params.org_id,
    p_sale_date: params.sale_date,
    p_description: params.description,
    p_amount: params.amount,
    p_payment_method: params.payment_method,
    p_revenue_account_id: params.revenue_account_id,
    p_received_into_account_id: params.received_into_account_id,
  });

  if (error) throw error;
  return data as string;
}

export async function createItemSale(params: {
  org_id: string;
  item_id: string;
  quantity: number;
  unit_sale_price: number; // cents
  sale_date: string;
  payment_method: string;
  revenue_account_id: string;
  received_into_account_id: string;
  description?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_item_sale_v1", {
    p_org_id: params.org_id,
    p_item_id: params.item_id,
    p_quantity: params.quantity,
    p_unit_sale_price: params.unit_sale_price,
    p_sale_date: params.sale_date,
    p_payment_method: params.payment_method,
    p_revenue_account_id: params.revenue_account_id,
    p_received_into_account_id: params.received_into_account_id,
    p_description: params.description ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function updateDailySale(
  saleId: string,
  updates: Partial<Pick<DailySale, "sale_date" | "description" | "payment_method">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_sales")
    .update(updates)
    .eq("id", saleId)
    .select()
    .single();

  if (error) throw error;
  return data as DailySale;
}

export async function deleteDailySale(saleId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("daily_sales").delete().eq("id", saleId);
  if (error) throw error;
}
