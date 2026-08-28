import { formatMoney } from "../../currency";

export function money(minorAmount: number, currency: string): string {
  return formatMoney(Number(minorAmount), currency);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
