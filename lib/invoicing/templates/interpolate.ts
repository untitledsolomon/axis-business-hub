import { escapeHtml, money } from "./format";
import type { InvoicePdfData } from "./types";

/*
 * Supported values: org.name, org.logo_url, org.address; invoice.number,
 * invoice.issue_date, invoice.due_date, invoice.notes; client.name,
 * client.company_name, client.email; totals.subtotal, totals.tax,
 * totals.discount, totals.grand_total. Inside {{#each items}}, use
 * description, quantity, unit_price, and total.
 */
const fieldValues = (data: InvoicePdfData) => ({
  "org.name": data.org.name, "org.logo_url": data.org.logo_url, "org.address": data.org.address,
  "invoice.number": data.invoice.number, "invoice.issue_date": data.invoice.issue_date,
  "invoice.due_date": data.invoice.due_date, "invoice.notes": data.invoice.notes,
  "client.name": data.client.name, "client.company_name": data.client.company_name, "client.email": data.client.email, "client.phone": data.client.phone,
  "totals.subtotal": money(data.totals.subtotal_cents, data.invoice.currency),
  "totals.tax": money(data.totals.tax_cents, data.invoice.currency),
  "totals.discount": money(data.totals.discount_cents, data.invoice.currency),
  "totals.grand_total": money(data.totals.grand_total_cents, data.invoice.currency),
});

function resolveConditionals(html: string, values: Record<string, string | null | undefined>): string {
  // Handles {{#if field}}truthy{{else}}falsy{{/if}} and {{#if field}}truthy{{/if}}
  // Non-greedy match, run repeatedly to support sibling (not nested) conditionals.
  const ifRe = /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/;
  let result = html;
  let guard = 0;
  while (ifRe.test(result) && guard < 100) {
    result = result.replace(ifRe, (_match, key: string, truthyBlock: string, falsyBlock = "") => {
      const val = values[key];
      const isTruthy = val !== null && val !== undefined && val !== "";
      return isTruthy ? truthyBlock : falsyBlock;
    });
    guard++;
  }
  return result;
}

export function interpolateTemplate(html: string, data: InvoicePdfData): string {
  const values = fieldValues(data);
  const withConditionals = resolveConditionals(html, values);
  const withItems = withConditionals.replace(/\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, block: string) =>
    data.items.map((item) => block.replace(/\{\{\s*(description|quantity|unit_price|total)\s*\}\}/g, (_match, key: string) =>
      escapeHtml(key === "description" ? item.description : key === "quantity" ? item.quantity : key === "unit_price" ? money(item.unit_price_cents, data.invoice.currency) : money(item.total_cents, data.invoice.currency))
    )).join("")
  );
  return withItems.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => key in values ? escapeHtml(values[key as keyof typeof values]) : match);
}

export function validateCustomTemplate(html: string): string | null {
  if (/<\s*script\b/i.test(html)) return "Custom templates cannot contain script tags.";
  if (/\bon[a-z]+\s*=/i.test(html)) return "Custom templates cannot contain inline event handlers.";
  return null;
}
