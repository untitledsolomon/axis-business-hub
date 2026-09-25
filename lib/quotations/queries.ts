import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { Quotation, QuotationItem } from "@/lib/types";

export async function getQuotations(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("org_id", orgId)
    .order("quotation_number", { ascending: false });

  if (error) throw error;
  return data as Quotation[];
}

export async function getQuotationsByClient(orgId: string, clientId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .order("quotation_number", { ascending: false });

  if (error) throw error;
  return data as Quotation[];
}

export async function getQuotation(orgId: string, quotationId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(`
      *,
      client:clients(*),
      items:quotation_items(*)
    `)
    .eq("org_id", orgId)
    .eq("id", quotationId)
    .single();

  if (error) throw error;
  return data as Quotation;
}

export async function createQuotation(
  quotation: Omit<Quotation, "id" | "created_at" | "updated_at" | "client" | "items">,
  items: Omit<QuotationItem, "id" | "org_id" | "quotation_id" | "created_at">[]
) {
  const supabase = getSupabaseClient();

  const { data: newQuotation, error: quotationError } = await supabase
    .from("quotations")
    .insert(quotation)
    .select()
    .single();

  if (quotationError) throw quotationError;

  const itemsWithIds = items.map((item) => ({
    ...item,
    org_id: quotation.org_id,
    quotation_id: newQuotation.id,
  }));

  const { error: itemsError } = await supabase
    .from("quotation_items")
    .insert(itemsWithIds);

  if (itemsError) throw itemsError;

  return newQuotation as Quotation;
}

export async function updateQuotation(quotationId: string, updates: Partial<Quotation>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quotations")
    .update(updates)
    .eq("id", quotationId)
    .select()
    .single();

  if (error) throw error;
  return data as Quotation;
}

export async function getNextQuotationNumber(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_next_quotation_number", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return data as string;
}

export async function updateQuotationStatus(params: { org_id: string; quotation_id: string; status: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({ status: params.status })
    .eq("org_id", params.org_id)
    .eq("id", params.quotation_id)
    .select()
    .single();

  if (error) throw error;
  return data as Quotation;
}

// Converts an accepted quotation into a draft invoice carrying the same
// client, items and totals, with invoices.quotation_id set for traceability
// (see design notes: quotation first, then invoice, same pattern as before —
// invoice usually precedes the job order but can follow it).
export async function convertQuotationToInvoice(params: { org_id: string; quotation_id: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("convert_quotation_to_invoice_v1", {
    p_org_id: params.org_id,
    p_quotation_id: params.quotation_id,
  });

  if (error) throw error;
  return data as string; // new invoice id
}

export async function sendQuotationEmail(params: { quotationId: string; message?: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("send-quotation-email", {
    body: { quotationId: params.quotationId, message: params.message },
  });

  if (error) throw error;
  return data as { sent: boolean };
}
