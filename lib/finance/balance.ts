import type { JournalEntry } from "@/lib/types";

/**
 * Computes a running balance for a given GL account from posted journal
 * entries, following standard double-entry convention:
 *   asset / expense accounts:      balance = debits - credits
 *   liability / equity / revenue:  balance = credits - debits
 * Draft/void entries are excluded — only posted entries affect the balance.
 */
export function computeAccountBalance(
  accountId: string | undefined,
  entries: JournalEntry[],
  category?: "asset" | "liability" | "equity" | "revenue" | "expense"
): number {
  if (!accountId) return 0;
  let debitTotal = 0;
  let creditTotal = 0;

  for (const entry of entries) {
    if (entry.status !== "posted") continue;
    for (const line of entry.lines || []) {
      if (line.account_id === accountId) {
        debitTotal += line.debit || 0;
        creditTotal += line.credit || 0;
      }
    }
  }

  const normalDebitBalance = category === "asset" || category === "expense" || category === undefined;
  return normalDebitBalance ? debitTotal - creditTotal : creditTotal - debitTotal;
}
