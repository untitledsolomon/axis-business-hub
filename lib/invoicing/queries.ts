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

export async function getNextInvoiceNumber(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_next_invoice_number", {
    p_org_id: orgId
  });

  if (error) throw error;
  return data as string;
}
