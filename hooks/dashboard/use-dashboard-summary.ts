import { useMemo, useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { useClients } from "@/hooks/clients/use-clients";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useJournalEntries } from "@/hooks/finance/use-finance";
import { convertMinorUnits } from "@/lib/currency";

export type DashboardTimeframe = "this_month" | "last_30_days" | "this_quarter" | "this_year" | "all_time";

export const TIMEFRAME_LABELS: Record<DashboardTimeframe, string> = {
  this_month: "This Month",
  last_30_days: "Last 30 Days",
  this_quarter: "This Quarter",
  this_year: "This Year",
  all_time: "All Time",
};

/** Returns [currentRangeStart, previousRangeStart, previousRangeEnd) so callers
 * can compute both "this period" and "the period before it" for a trend
 * comparison, regardless of which timeframe is selected. previousRangeEnd is
 * exclusive (i.e. it's the same instant as currentRangeStart). */
function getRangeBounds(timeframe: DashboardTimeframe, now: Date) {
  switch (timeframe) {
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start, prevStart, prevEnd: start };
    }
    case "last_30_days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 30);
      return { start, prevStart, prevEnd: start };
    }
    case "this_quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      const prevStart = new Date(now.getFullYear(), quarterStartMonth - 3, 1);
      return { start, prevStart, prevEnd: start };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const prevStart = new Date(now.getFullYear() - 1, 0, 1);
      return { start, prevStart, prevEnd: start };
    }
    case "all_time": {
      const start = new Date(0);
      // No meaningful "previous period" for all-time; use an empty window
      // so comparison totals stay at zero and trend% is suppressed by the
      // caller instead of showing a misleading number.
      return { start, prevStart: new Date(0), prevEnd: new Date(0) };
    }
  }
}

export function useDashboardSummary(timeframe: DashboardTimeframe = "this_month") {
  const { currentOrg, isLoading: orgLoading } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const baseCurrency = currentOrg?.base_currency ?? "UGX";

  const clients = useClients(orgId);
  const invoices = useInvoices(orgId);
  const journal = useJournalEntries(orgId);

  const isLoading = orgLoading || clients.isPending || invoices.isPending || journal.isPending;

  // Captured once per mount (not re-read on every render) so the server-render
  // pass and the client-render pass agree on the same instant. Reading
  // `new Date()` fresh inside the useMemo below meant the server and client
  // could compute slightly different "now" values, which shifts which
  // invoices/journal entries fall into the current-vs-previous period and
  // produces mismatched summary totals in the server vs client HTML (React
  // error #418), the same class of bug fixed for RecentActivity.timeAgo().
  const [now] = useState(() => new Date());

  const summary = useMemo(() => {
    const { start, prevStart, prevEnd } = getRangeBounds(timeframe, now);

    const inCurrent = (d: Date) => d >= start && d <= now;
    const inPrevious = (d: Date) => d >= prevStart && d < prevEnd;

    const activeClients = (clients.data ?? []).filter((c) => c.status === "active").length;

    // Outstanding total: sum invoice amounts directly (not journal-derived), converted
    // to base currency. This is fine to source from `invoices` because it is never also
    // summed from `journal_entries` below — unlike revenue, there's no double-count risk here.
    const outstanding = (invoices.data ?? []).filter((i) =>
      ["sent", "viewed", "partial", "overdue", "draft"].includes(i.status)
    );
    const outstandingCount = outstanding.length;
    const outstandingTotalMinor = outstanding.reduce(
      (sum, i) => sum + convertMinorUnits(i.grand_total, i.currency, baseCurrency, i.exchange_rate || 1),
      0
    );

    // Revenue and expenses are derived ONLY from posted journal entries — every invoice
    // payment, daily sale, and expense already posts a journal entry (see
    // create_journal_entry_v1 / the invoice payment RPCs), so journal_entries is the
    // single source of truth for the ledger. Summing invoices.grand_total on top of this
    // double-counts invoice revenue that's already reflected in its journal entry.
    let incomeCurrent = 0;
    let incomePrevious = 0;
    let expenseCurrent = 0;
    let expensePrevious = 0;

    (journal.data ?? []).forEach((entry) => {
      // Draft entries aren't posted to the ledger yet and shouldn't count as realized
      // revenue/expense — only "posted" entries represent money that has actually moved.
      if (entry.status !== "posted") return;
      const entryDate = new Date(entry.entry_date);
      const isCurrent = inCurrent(entryDate);
      const isPrevious = inPrevious(entryDate);
      if (!isCurrent && !isPrevious) return;

      // Journal entries are always posted in the org's base currency (foreign-currency
      // invoices are converted at posting time), so no further conversion is needed here.
      (entry.lines ?? []).forEach((line) => {
        const category = line.account?.category;
        const debit = line.debit ?? 0;
        const credit = line.credit ?? 0;

        if (category === "expense") {
          if (isCurrent) expenseCurrent += debit;
          else expensePrevious += debit;
        }
        if (category === "revenue") {
          if (isCurrent) incomeCurrent += credit;
          else incomePrevious += credit;
        }
      });
    });

    const netProfitCurrentMinor = incomeCurrent - expenseCurrent;
    const netProfitPreviousMinor = incomePrevious - expensePrevious;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    const hasComparisonPeriod = timeframe !== "all_time";

    return {
      activeClients,
      outstandingCount,
      // *Minor suffix = integer minor units in the org's base currency; format with
      // formatMoney(value, baseCurrency) at render time. Do not divide by 100 — that
      // conversion is currency-dependent and handled inside formatMoney/toMajorUnits.
      outstandingTotalMinor,
      netProfitThisMonthMinor: netProfitCurrentMinor,
      netProfitChangePct: hasComparisonPeriod ? pctChange(netProfitCurrentMinor, netProfitPreviousMinor) : 0,
      revenueThisMonthMinor: incomeCurrent,
      revenueChangePct: hasComparisonPeriod ? pctChange(incomeCurrent, incomePrevious) : 0,
      hasComparisonPeriod,
      baseCurrency,
    };
  }, [clients.data, invoices.data, journal.data, timeframe, baseCurrency]);

  return { ...summary, isLoading };
}
