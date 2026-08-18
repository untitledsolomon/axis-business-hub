import { useMemo } from "react";
import { useOrg } from "@/hooks/use-org";
import { useClients } from "@/hooks/clients/use-clients";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useJournalEntries } from "@/hooks/finance/use-finance";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function useDashboardSummary() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";

  const clients = useClients(orgId);
  const invoices = useInvoices(orgId);
  const journal = useJournalEntries(orgId);

  const isLoading = clients.isLoading || invoices.isLoading || journal.isLoading;

  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = monthKey(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = monthKey(lastMonthDate);

    const activeClients = (clients.data ?? []).filter((c) => c.status === "active").length;

    const outstanding = (invoices.data ?? []).filter((i) =>
      ["sent", "viewed", "partial", "overdue"].includes(i.status)
    );
    const outstandingCount = outstanding.length;
    const outstandingTotal = outstanding.reduce((sum, i) => sum + i.grand_total, 0) / 100;

    // Revenue = income accounts credited; Expenses = expense accounts debited.
    let incomeThisMonth = 0;
    let incomeLastMonth = 0;
    let expenseThisMonth = 0;
    let expenseLastMonth = 0;

    (journal.data ?? []).forEach((entry) => {
      if (entry.status !== "posted" && entry.status !== "draft") return;
      const key = monthKey(new Date(entry.entry_date));
      if (key !== thisMonth && key !== lastMonth) return;

      (entry.lines ?? []).forEach((line) => {
        const category = line.account?.category;
        const credit = line.credit ?? 0;
        const debit = line.debit ?? 0;

        if (category === "revenue") {
          if (key === thisMonth) incomeThisMonth += credit;
          else incomeLastMonth += credit;
        }
        if (category === "expense") {
          if (key === thisMonth) expenseThisMonth += debit;
          else expenseLastMonth += debit;
        }
      });
    });

    const netProfitThisMonth = (incomeThisMonth - expenseThisMonth) / 100;
    const netProfitLastMonth = (incomeLastMonth - expenseLastMonth) / 100;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    return {
      activeClients,
      outstandingCount,
      outstandingTotal,
      netProfitThisMonth,
      netProfitChangePct: pctChange(netProfitThisMonth, netProfitLastMonth),
      revenueThisMonth: incomeThisMonth / 100,
      revenueChangePct: pctChange(incomeThisMonth, incomeLastMonth),
    };
  }, [clients.data, invoices.data, journal.data]);

  return { ...summary, isLoading };
}
