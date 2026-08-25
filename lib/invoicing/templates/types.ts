export interface InvoicePdfData {
  org: { name: string; logo_url: string | null; address: string | null; brand_color: string };
  invoice: { number: string; issue_date: string; due_date: string; currency: string; notes: string | null };
  client: { name: string; company_name: string | null; email: string | null };
  items: { description: string; quantity: number; unit_price_cents: number; total_cents: number }[];
  totals: { subtotal_cents: number; discount_cents: number; tax_cents: number; grand_total_cents: number };
}
