import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"

// Real PDF generation. Deno's edge runtime can't run a headless browser
// (no Puppeteer/Chromium available), so this renders the invoice directly
// with jsPDF's drawing primitives instead of HTML->PDF conversion. Layout
// is intentionally simple — one page, clear sections — since the goal is a
// correct, sendable invoice document, not pixel-matching a design mock.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
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
        org:organisations(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const marginX = 48
    let y = 56

    // Header
    doc.setFontSize(20).setFont("helvetica", "bold")
    doc.text(invoice.org?.name ?? "Invoice", marginX, y)
    doc.setFontSize(11).setFont("helvetica", "normal")
    doc.text(`Invoice ${invoice.invoice_number}`, 545, y, { align: "right" })
    y += 30

    doc.setDrawColor(220).line(marginX, y, 547, y)
    y += 24

    // Bill to / dates
    doc.setFontSize(9).setFont("helvetica", "bold").text("BILL TO", marginX, y)
    doc.text("ISSUE DATE", 340, y)
    doc.text("DUE DATE", 460, y)
    y += 14

    doc.setFontSize(11).setFont("helvetica", "normal")
    doc.text(invoice.client?.name ?? "—", marginX, y)
    doc.setFontSize(10)
    doc.text(invoice.issue_date ?? "—", 340, y)
    doc.text(invoice.due_date ?? "—", 460, y)
    y += 14

    if (invoice.client?.company_name) {
      doc.setFontSize(10).text(invoice.client.company_name, marginX, y)
      y += 14
    }
    if (invoice.client?.email) {
      doc.setFontSize(10).text(invoice.client.email, marginX, y)
      y += 14
    }
    y += 16

    // Line items table header
    doc.setFillColor(245, 245, 245).rect(marginX, y, 499, 22, "F")
    doc.setFontSize(9).setFont("helvetica", "bold")
    doc.text("DESCRIPTION", marginX + 8, y + 15)
    doc.text("QTY", 360, y + 15, { align: "right" })
    doc.text("UNIT PRICE", 460, y + 15, { align: "right" })
    doc.text("TOTAL", 547, y + 15, { align: "right" })
    y += 32

    doc.setFont("helvetica", "normal").setFontSize(10)
    const items = invoice.items ?? []
    for (const item of items) {
      if (y > 720) {
        doc.addPage()
        y = 56
      }
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

    // Totals
    const totalsX = 460
    doc.setFontSize(10).setFont("helvetica", "normal")
    doc.text("Subtotal", totalsX, y, { align: "right" })
    doc.text(money(invoice.subtotal, invoice.currency), 547, y, { align: "right" })
    y += 16

    if (invoice.discount_total > 0) {
      doc.text("Discount", totalsX, y, { align: "right" })
      doc.text(`-${money(invoice.discount_total, invoice.currency)}`, 547, y, { align: "right" })
      y += 16
    }
    if (invoice.tax_total > 0) {
      doc.text("Tax", totalsX, y, { align: "right" })
      doc.text(money(invoice.tax_total, invoice.currency), 547, y, { align: "right" })
      y += 16
    }

    doc.setDrawColor(220).line(totalsX - 20, y, 547, y)
    y += 16
    doc.setFontSize(12).setFont("helvetica", "bold")
    doc.text("Total", totalsX, y, { align: "right" })
    doc.text(money(invoice.grand_total, invoice.currency), 547, y, { align: "right" })
    y += 30

    if (invoice.notes) {
      doc.setFontSize(9).setFont("helvetica", "bold").text("NOTES", marginX, y)
      y += 14
      doc.setFont("helvetica", "normal").setFontSize(10)
      const noteLines = doc.splitTextToSize(invoice.notes, 499)
      doc.text(noteLines, marginX, y)
    }

    const pdfBytes = doc.output("arraybuffer")

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "PDF generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
