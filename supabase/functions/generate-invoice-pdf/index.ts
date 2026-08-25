import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { interpolateTemplate } from "../../../lib/invoicing/templates/interpolate.ts"
import { BUILT_IN_TEMPLATES } from "../../../lib/invoicing/templates/registry.ts"
import type { InvoicePdfData } from "../../../lib/invoicing/templates/types.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { invoiceId } = await req.json()
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*),
        org:organisations(name, logo_url, address, invoice_template_id, invoice_template_storage_path, invoice_brand_color)
      `)
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const data: InvoicePdfData = {
      org: { name: invoice.org?.name ?? "Invoice", logo_url: invoice.org?.logo_url ?? null, address: invoice.org?.address ?? null, brand_color: invoice.org?.invoice_brand_color ?? "#0f172a" },
      invoice: { number: invoice.invoice_number, issue_date: invoice.issue_date, due_date: invoice.due_date, currency: invoice.currency, notes: invoice.notes ?? null },
      client: { name: invoice.client?.name ?? "", company_name: invoice.client?.company_name ?? null, email: invoice.client?.email ?? null, phone: invoice.client?.phone ?? null },
      items: (invoice.items ?? []).map((item: { description: string; quantity: number; unit_price: number; total: number }) => ({ description: item.description, quantity: Number(item.quantity), unit_price_cents: Number(item.unit_price), total_cents: Number(item.total) })),
      totals: { subtotal_cents: Number(invoice.subtotal), discount_cents: Number(invoice.discount_total), tax_cents: Number(invoice.tax_total), grand_total_cents: Number(invoice.grand_total) },
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

    try {
      const apiKey = Deno.env.get("PDFSHIFT_API_KEY")
      if (!apiKey) throw new Error("PDFSHIFT_API_KEY is not configured")

      const pdfshiftRes = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${btoa(`api:${apiKey}`)}` },
        body: JSON.stringify({ source: html, landscape: false, format: "A4" }),
      })

      if (!pdfshiftRes.ok) {
        throw new Error(`PDFShift returned ${pdfshiftRes.status}: ${await pdfshiftRes.text()}`)
      }
      const pdfBytes = new Uint8Array(await pdfshiftRes.arrayBuffer())

      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: `PDFShift request failed: ${err instanceof Error ? err.message : "network error"}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "PDF generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
