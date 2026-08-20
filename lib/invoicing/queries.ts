import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { Invoice, InvoiceItem } from "@/lib/types";

export async function getInvoices(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("org_id", orgId)
    .order("invoice_number", { ascending: false });

  if (error) throw error;
  return data as Invoice[];
}

export async function getInvoice(orgId: string, invoiceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
    .eq("org_id", orgId)
    .eq("id", invoiceId)
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function createInvoice(
  invoice: Omit<Invoice, "id" | "created_at" | "updated_at" | "client" | "items">,
  items: Omit<InvoiceItem, "id" | "org_id" | "invoice_id" | "created_at">[]
) {
  const supabase = getSupabaseClient();

  // We should ideally use an RPC for atomic creation of invoice + items
  const { data: newInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert(invoice)
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  const itemsWithIds = items.map(item => ({
    ...item,
    org_id: invoice.org_id,
    invoice_id: newInvoice.id
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemsWithIds);

  if (itemsError) throw itemsError;

  return newInvoice as Invoice;
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function getNextInvoiceNumber(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_next_invoice_number", {
    p_org_id: orgId
  });

  if (error) throw error;
  return data as string;
}

export async function markInvoicePaid(params: {
  org_id: string;
  invoice_id: string;
  deposit_account_id: string;
  payment_date?: string;
  reference?: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("mark_invoice_paid_v1", {
    p_org_id: params.org_id,
    p_invoice_id: params.invoice_id,
    p_deposit_account_id: params.deposit_account_id,
    p_payment_date: params.payment_date ?? new Date().toISOString().slice(0, 10),
    p_reference: params.reference ?? null,
  });

  if (error) throw error;
  return data as string; // journal entry id
}

export async function voidInvoice(params: { org_id: string; invoice_id: string; reason?: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("void_invoice_v1", {
    p_org_id: params.org_id,
    p_invoice_id: params.invoice_id,
    p_reason: params.reason ?? null,
  });

  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoiceStatus(params: { org_id: string; invoice_id: string; status: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("update_invoice_status_v1", {
    p_org_id: params.org_id,
    p_invoice_id: params.invoice_id,
    p_status: params.status,
  });

  if (error) throw error;
  return data as Invoice;
}

export async function generateInvoicePdf(invoiceId: string): Promise<Blob> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
    body: { invoiceId },
  });

  if (error) throw error;
  // Edge function returns raw PDF bytes; supabase-js gives us a Blob when
  // the response isn't JSON.
  return data as Blob;
}

export async function sendInvoiceEmail(params: { invoiceId: string; message?: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("send-invoice-email", {
    body: { invoiceId: params.invoiceId, message: params.message },
  });

  if (error) throw error;
  return data as { sent: boolean };
}
