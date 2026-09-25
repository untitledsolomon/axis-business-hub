import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Sends the quotation to the client's email via Resend, with a PDF
// attached, mirroring supabase/functions/send-invoice-email. Requires
// RESEND_API_KEY and PDFSHIFT_API_KEY to be set as Supabase Edge Function
// secrets — fails clearly if either isn't configured rather than silently
// pretending to send.
//
// Quotations use a small, self-contained HTML renderer here instead of
// lib/invoicing/templates (org branded invoice templates are invoice-
// specific — logo/brand-color storage, custom template uploads — and
// quotations don't need that machinery to ship a clean PDF).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Mirrors lib/currency.ts's minor-unit table — duplicated here for the same
// reason send-invoice-email duplicates it: this Deno edge function runs in
// a separate runtime/module resolution from the Next.js app.
const MINOR_UNIT_DIGITS: Record<string, number> = {
  UGX: 0, RWF: 0, XOF: 0, XAF: 0, JPY: 0,
  KES: 2, TZS: 2, SSP: 2, USD: 2, EUR: 2, GBP: 2,
}

function money(minorAmount: number, currency: string) {
  const digits = MINOR_UNIT_DIGITS[currency?.toUpperCase()] ?? 2
  const major = minorAmount / 10 ** digits
  return `${currency} ${major.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

type QuotationRecord = {
  quotation_number: string
  issue_date: string
  expiry_date: string | null
  currency: string
  notes?: string | null
  terms?: string | null
  subtotal: number
  discount_total: number
  tax_total: number
  grand_total: number
  org_id: string
  client?: { name?: string; company_name?: string | null; email?: string | null }
  items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>
  org?: { name?: string; logo_url?: string | null; address?: string | null; invoice_brand_color?: string | null }
}

function renderQuotationHtml(quotation: QuotationRecord): string {
  const brandColor = quotation.org?.invoice_brand_color ?? "#0f172a"
  const itemRows = (quotation.items ?? [])
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.quantity)}</td><td>${money(item.unit_price, quotation.currency)}</td><td>${money(item.total, quotation.currency)}</td></tr>`
    )
    .join("")
  const logo = quotation.org?.logo_url
    ? `<img src="${escapeHtml(quotation.org.logo_url)}" alt="${escapeHtml(quotation.org?.name)}" class="logo">`
    : `<strong class="org-name">${escapeHtml(quotation.org?.name)}</strong>`

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--accent:${escapeHtml(brandColor)};--ink:#17202a;--muted:#64748b}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:var(--ink);margin:0;padding:46px;font-size:12px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--accent);padding-bottom:22px}.logo{max-width:150px;max-height:54px}.org-name{font-size:22px}.title{text-align:right}.title h1{font-size:26px;margin:0 0 6px;color:var(--accent)}.muted{color:var(--muted)}.details{display:grid;grid-template-columns:2fr 1fr 1fr;gap:24px;padding:24px 0}.label{font-size:10px;font-weight:bold;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;margin-bottom:7px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#f1f5f9;color:#334155;font-size:10px;text-align:left;text-transform:uppercase;padding:10px}td{border-bottom:1px solid #e2e8f0;padding:11px 10px}th:not(:first-child),td:not(:first-child){text-align:right}.summary{margin:22px 0 0 auto;width:260px}.summary div{display:flex;justify-content:space-between;padding:5px 0}.total{border-top:2px solid var(--accent);font-size:15px;font-weight:bold;margin-top:7px;padding-top:10px!important}.notes{border-top:1px solid #e2e8f0;margin-top:30px;padding-top:16px}.notes p{white-space:pre-wrap}
  </style></head><body><header class="header"><div>${logo}<div class="muted">${escapeHtml(quotation.org?.address)}</div></div><div class="title"><h1>QUOTATION</h1><div>#${escapeHtml(quotation.quotation_number)}</div></div></header><section class="details"><div><div class="label">Prepared for</div><strong>${escapeHtml(quotation.client?.name)}</strong><div>${escapeHtml(quotation.client?.company_name)}</div><div class="muted">${escapeHtml(quotation.client?.email)}</div></div><div><div class="label">Issue date</div>${escapeHtml(quotation.issue_date)}</div><div><div class="label">Valid until</div>${escapeHtml(quotation.expiry_date ?? "—")}</div></section><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table><section class="summary"><div><span>Subtotal</span><span>${money(quotation.subtotal, quotation.currency)}</span></div>${quotation.discount_total ? `<div><span>Discount</span><span>-${money(quotation.discount_total, quotation.currency)}</span></div>` : ""}${quotation.tax_total ? `<div><span>Tax</span><span>${money(quotation.tax_total, quotation.currency)}</span></div>` : ""}<div class="total"><span>Total</span><span>${money(quotation.grand_total, quotation.currency)}</span></div></section>${quotation.terms ? `<section class="notes"><div class="label">Terms</div><p>${escapeHtml(quotation.terms)}</p></section>` : ""}${quotation.notes ? `<section class="notes"><div class="label">Notes</div><p>${escapeHtml(quotation.notes)}</p></section>` : ""}</body></html>`
}

async function renderQuotationPdf(html: string): Promise<Uint8Array> {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email sending isn't configured yet — add RESEND_API_KEY in Supabase Edge Function secrets." }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { quotationId, message } = await req.json()
    if (!quotationId) {
      return new Response(JSON.stringify({ error: "quotationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: quotation, error } = await supabase
      .from('quotations')
      .select(`*, client:clients(*), items:quotation_items(*), org:organisations(*)`)
      .eq('id', quotationId)
      .single()

    if (error || !quotation) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!quotation.client?.email) {
      return new Response(JSON.stringify({ error: 'This client has no email address on file' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const pdfBase64 = toBase64(await renderQuotationPdf(renderQuotationHtml(quotation)))
    const orgName = quotation.org?.name ?? "Your supplier"

    const { data: resendConnection } = await supabase
      .from("connections")
      .select("status, config")
      .eq("org_id", quotation.org_id)
      .eq("provider", "resend")
      .eq("status", "connected")
      .maybeSingle()
    const verifiedDomain = (resendConnection?.config as { domain?: string } | null)?.domain
    const configuredFrom = Deno.env.get("RESEND_FROM_EMAIL")
    const fromAddress = verifiedDomain ? `quotations@${verifiedDomain}` : configuredFrom ?? "quotations@resend.dev"

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Hi ${quotation.client.contact_person || quotation.client.name},</p>
        <p>${message ? message.replace(/\n/g, "<br/>") : `Please find attached quotation ${quotation.quotation_number} from ${orgName}.`}</p>
        <p style="margin: 24px 0;">
          <strong>Total:</strong> ${money(quotation.grand_total, quotation.currency)}<br/>
          ${quotation.expiry_date ? `<strong>Valid until:</strong> ${quotation.expiry_date}<br/>` : ""}
        </p>
        <p>Thank you,<br/>${orgName}</p>
      </div>
    `

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: quotation.client.email,
        subject: `Quotation ${quotation.quotation_number} from ${orgName}`,
        html: emailHtml,
        attachments: [
          {
            filename: `${quotation.quotation_number}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    })

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text()
      return new Response(JSON.stringify({ error: `Resend API error: ${errBody}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Reflect that the quotation was sent, so status/history are accurate —
    // same pattern as send-invoice-email's status update.
    await supabase
      .from("quotations")
      .update({
        status: quotation.status === "draft" ? "sent" : quotation.status,
        sent_at: new Date().toISOString(),
      })
      .eq("id", quotation.id)

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to send quotation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
