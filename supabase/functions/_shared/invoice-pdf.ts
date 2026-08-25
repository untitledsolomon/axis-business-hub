import { interpolateTemplate } from "../../../lib/invoicing/templates/interpolate.ts"
import { BUILT_IN_TEMPLATES } from "../../../lib/invoicing/templates/registry.ts"
import type { InvoicePdfData } from "../../../lib/invoicing/templates/types.ts"

type InvoiceRecord = {
  invoice_number: string
  issue_date: string
  due_date: string
  currency: string
  notes?: string | null
  subtotal: number
  discount_total: number
  tax_total: number
  grand_total: number
  client?: { name?: string; company_name?: string | null; email?: string | null; phone?: string | null }
  items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>
  org?: {
    name?: string
    logo_url?: string | null
    address?: string | null
    invoice_template_id?: string | null
    invoice_template_storage_path?: string | null
    invoice_brand_color?: string | null
  }
}

type StorageClient = {
  storage: {
    from(bucket: string): {
      download(path: string): Promise<{ data: Blob | null; error: unknown }>
    }
  }
}

export async function renderInvoicePdf(invoice: InvoiceRecord, supabase: StorageClient): Promise<Uint8Array> {
  const data: InvoicePdfData = {
    org: {
      name: invoice.org?.name ?? "Invoice",
      logo_url: invoice.org?.logo_url ?? null,
      address: invoice.org?.address ?? null,
      brand_color: invoice.org?.invoice_brand_color ?? "#0f172a",
    },
    invoice: {
      number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      currency: invoice.currency,
      notes: invoice.notes ?? null,
    },
    client: {
      name: invoice.client?.name ?? "",
      company_name: invoice.client?.company_name ?? null,
      email: invoice.client?.email ?? null,
      phone: invoice.client?.phone ?? null,
    },
    items: (invoice.items ?? []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price_cents: Number(item.unit_price),
      total_cents: Number(item.total),
    })),
    totals: {
      subtotal_cents: Number(invoice.subtotal),
      discount_cents: Number(invoice.discount_total),
      tax_cents: Number(invoice.tax_total),
      grand_total_cents: Number(invoice.grand_total),
    },
  }

  const templateId = invoice.org?.invoice_template_id
  let html = (BUILT_IN_TEMPLATES[templateId as keyof typeof BUILT_IN_TEMPLATES] ?? BUILT_IN_TEMPLATES.classic).render(data)
  if (templateId === "custom" && invoice.org?.invoice_template_storage_path) {
    const { data: templateFile, error: templateError } = await supabase.storage
      .from("invoice-templates")
      .download(invoice.org.invoice_template_storage_path)
    if (templateError || !templateFile) {
      console.warn("Invoice template file missing; falling back to classic template", templateError)
    } else {
      html = interpolateTemplate(await templateFile.text(), data)
    }
  }

  const apiKey = Deno.env.get("PDFSHIFT_API_KEY")
  if (!apiKey) throw new Error("PDFSHIFT_API_KEY is not configured")
  const pdfshiftRes = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Basic ${btoa(`api:${apiKey}`)}` },
    body: JSON.stringify({ source: html, landscape: false, format: "A4" }),
  })
  if (!pdfshiftRes.ok) throw new Error(`PDFShift returned ${pdfshiftRes.status}: ${await pdfshiftRes.text()}`)
  return new Uint8Array(await pdfshiftRes.arrayBuffer())
}