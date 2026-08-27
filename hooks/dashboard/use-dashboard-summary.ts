import { useMemo, useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { useClients } from "@/hooks/clients/use-clients";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useJournalEntries } from "@/hooks/finance/use-finance";

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

    const outstanding = (invoices.data ?? []).filter((i) =>
      ["sent", "viewed", "partial", "overdue", "draft"].includes(i.status)
    );
    const outstandingCount = outstanding.length;
    const outstandingTotal = outstanding.reduce((sum, i) => sum + i.grand_total, 0) / 100;

    // Revenue = income accounts credited; Expenses = expense accounts debited.
    let incomeCurrent = 0;
    let incomePrevious = 0;
    let expenseCurrent = 0;
    let expensePrevious = 0;

    (invoices.data ?? []).forEach((inv) => {
      if (inv.status !== "paid" && inv.status !== "partial") return;
      const issueDate = new Date(inv.issue_date);
      if (inCurrent(issueDate)) incomeCurrent += inv.grand_total;
      else if (inPrevious(issueDate)) incomePrevious += inv.grand_total;
    });

    (journal.data ?? []).forEach((entry) => {
      if (entry.status !== "posted" && entry.status !== "draft") return;
      const entryDate = new Date(entry.entry_date);
      const isCurrent = inCurrent(entryDate);
      const isPrevious = inPrevious(entryDate);
      if (!isCurrent && !isPrevious) return;

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

    const netProfitCurrent = (incomeCurrent - expenseCurrent) / 100;
    const netProfitPrevious = (incomePrevious - expensePrevious) / 100;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    const hasComparisonPeriod = timeframe !== "all_time";

    return {
      activeClients,
      outstandingCount,
      outstandingTotal,
      netProfitThisMonth: netProfitCurrent,
      netProfitChangePct: hasComparisonPeriod ? pctChange(netProfitCurrent, netProfitPrevious) : 0,
      revenueThisMonth: incomeCurrent / 100,
      revenueChangePct: hasComparisonPeriod ? pctChange(incomeCurrent, incomePrevious) : 0,
      hasComparisonPeriod,
    };
  }, [clients.data, invoices.data, journal.data, timeframe]);

  return { ...summary, isLoading };
}
