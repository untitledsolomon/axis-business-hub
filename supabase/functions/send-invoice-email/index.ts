import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { renderInvoicePdf } from "../_shared/invoice-pdf.ts"

// Sends the invoice to the client's email via Resend, with the PDF
// attached. Requires RESEND_API_KEY to be set as a Supabase Edge Function
// secret (`supabase secrets set RESEND_API_KEY=...`) — this function fails
// clearly if it isn't configured rather than silently pretending to send.
//
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Mirrors lib/currency.ts's minor-unit table — duplicated here because this
// Deno edge function runs in a separate runtime/module resolution from the
// Next.js app and can't import "@/lib/currency" directly. Keep these two
// lists in sync if a new currency is added to INVOICE_CURRENCIES in
// components/invoicing/InvoiceForm.tsx.
const MINOR_UNIT_DIGITS: Record<string, number> = {
  UGX: 0, RWF: 0, XOF: 0, XAF: 0, JPY: 0,
  KES: 2, TZS: 2, SSP: 2, USD: 2, EUR: 2, GBP: 2,
}

function money(minorAmount: number, currency: string) {
  const digits = MINOR_UNIT_DIGITS[currency?.toUpperCase()] ?? 2
  const major = minorAmount / 10 ** digits
  return `${currency} ${major.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
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

    const { invoiceId, message } = await req.json()
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
      .select(`*, client:clients(*), items:invoice_items(*), org:organisations(*)`)
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!invoice.client?.email) {
      return new Response(JSON.stringify({ error: 'This client has no email address on file' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const pdfBase64 = toBase64(await renderInvoicePdf(invoice, supabase))
    const orgName = invoice.org?.name ?? "Your supplier"

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Hi ${invoice.client.contact_person || invoice.client.name},</p>
        <p>${message ? message.replace(/\n/g, "<br/>") : `Please find attached invoice ${invoice.invoice_number} from ${orgName}.`}</p>
        <p style="margin: 24px 0;">
          <strong>Amount due:</strong> ${money(invoice.grand_total, invoice.currency)}<br/>
          <strong>Due date:</strong> ${invoice.due_date}
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
        from: Deno.env.get("RESEND_FROM_EMAIL") ?? "invoices@resend.dev",
        to: invoice.client.email,
        subject: `Invoice ${invoice.invoice_number} from ${orgName}`,
        html: emailHtml,
        attachments: [
          {
            filename: `${invoice.invoice_number}.pdf`,
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

    // Reflect that the invoice was sent, so status/history are accurate —
    // reuses the same general-purpose status RPC as the manual "Sent" action.
    await supabase.rpc("update_invoice_status_v1", {
      p_org_id: invoice.org_id,
      p_invoice_id: invoice.id,
      p_status: invoice.status === "draft" ? "sent" : invoice.status,
    })

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to send invoice" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
