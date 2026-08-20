import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"

// Sends the invoice to the client's email via Resend, with the PDF
// attached. Requires RESEND_API_KEY to be set as a Supabase Edge Function
// secret (`supabase secrets set RESEND_API_KEY=...`) — this function fails
// clearly if it isn't configured rather than silently pretending to send.
//
// PDF generation is duplicated from generate-invoice-pdf rather than
// calling that function internally, since edge functions calling edge
// functions adds latency/auth complexity for no real benefit here — both
// stay small and simple to read independently.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

function buildInvoicePdfBase64(invoice: Record<string, unknown> & {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  grand_total: number;
  org?: { name?: string };
  client?: { name?: string };
  items?: Array<{ description?: string; quantity: number; unit_price: number; total: number }>;
}): string {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const marginX = 48
  let y = 56

  doc.setFontSize(20).setFont("helvetica", "bold")
  doc.text(invoice.org?.name ?? "Invoice", marginX, y)
  doc.setFontSize(11).setFont("helvetica", "normal")
  doc.text(`Invoice ${invoice.invoice_number}`, 545, y, { align: "right" })
  y += 30
  doc.setDrawColor(220).line(marginX, y, 547, y)
  y += 24

  doc.setFontSize(9).setFont("helvetica", "bold").text("BILL TO", marginX, y)
  doc.text("ISSUE DATE", 340, y)
  doc.text("DUE DATE", 460, y)
  y += 14
  doc.setFontSize(11).setFont("helvetica", "normal")
  doc.text(invoice.client?.name ?? "—", marginX, y)
  doc.setFontSize(10)
  doc.text(invoice.issue_date ?? "—", 340, y)
  doc.text(invoice.due_date ?? "—", 460, y)
  y += 24

  doc.setFillColor(245, 245, 245).rect(marginX, y, 499, 22, "F")
  doc.setFontSize(9).setFont("helvetica", "bold")
  doc.text("DESCRIPTION", marginX + 8, y + 15)
  doc.text("QTY", 360, y + 15, { align: "right" })
  doc.text("UNIT PRICE", 460, y + 15, { align: "right" })
  doc.text("TOTAL", 547, y + 15, { align: "right" })
  y += 32

  doc.setFont("helvetica", "normal").setFontSize(10)
  for (const item of invoice.items ?? []) {
    if (y > 720) { doc.addPage(); y = 56 }
    const lines = doc.splitTextToSize(item.description ?? "", 260)
    doc.text(lines, marginX + 8, y)
    doc.text(String(item.quantity), 360, y, { align: "right" })
    doc.text(money(item.unit_price, invoice.currency), 460, y, { align: "right" })
    doc.text(money(item.total, invoice.currency), 547, y, { align: "right" })
    y += Math.max(16, lines.length * 13)
  }

  y += 8
  doc.setDrawColor(220).line(marginX, y, 547, y)
  y += 20
  doc.setFontSize(12).setFont("helvetica", "bold")
  doc.text("Total", 460, y, { align: "right" })
  doc.text(money(invoice.grand_total, invoice.currency), 547, y, { align: "right" })

  return doc.output("datauristring").split(",")[1] // strip the data: prefix, keep base64
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

    const pdfBase64 = buildInvoicePdfBase64(invoice)
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
