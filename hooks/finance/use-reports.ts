import { useQuery } from "@tanstack/react-query";
import {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getAccountLedger,
  getRevenueTrend,
  getARAging,
  getExpenseBreakdown,
  getTopClients,
  getClientProfitability,
  getCashFlow,
  getExpenseTrend,
  getComparativePeriods,
} from "@/lib/finance/reports-queries";
import { useOrg } from "@/hooks/use-org";

// ---- Core accounting reports ----

export function useTrialBalance(orgId: string, asOfDate: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["trial-balance", orgId, asOfDate],
    queryFn: () => getTrialBalance(orgId, asOfDate),
    enabled: typeof window !== "undefined" && !!orgId && !!asOfDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useProfitAndLoss(orgId: string, startDate: string, endDate: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["profit-and-loss", orgId, startDate, endDate],
    queryFn: () => getProfitAndLoss(orgId, startDate, endDate),
    enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useBalanceSheet(orgId: string, asOfDate: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["balance-sheet", orgId, asOfDate],
    queryFn: () => getBalanceSheet(orgId, asOfDate),
    enabled: typeof window !== "undefined" && !!orgId && !!asOfDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useAccountLedger(
  orgId: string,
  accountId: string,
  startDate: string,
  endDate: string
) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["account-ledger", orgId, accountId, startDate, endDate],
    queryFn: () => getAccountLedger(orgId, accountId, startDate, endDate),
    enabled: typeof window !== "undefined" && !!orgId && !!accountId && !!startDate && !!endDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

// ---- Business analytics ----

export function useRevenueTrend(orgId: string, startDate: string, endDate: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["revenue-trend", orgId, startDate, endDate],
    queryFn: () => getRevenueTrend(orgId, startDate, endDate),
    enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useARAging(orgId: string, asOfDate: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["ar-aging", orgId, asOfDate],
    queryFn: () => getARAging(orgId, asOfDate),
    enabled: typeof window !== "undefined" && !!orgId && !!asOfDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useExpenseBreakdown(orgId: string, startDate: string, endDate: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["expense-breakdown", orgId, startDate, endDate],
    queryFn: () => getExpenseBreakdown(orgId, startDate, endDate),
    enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useTopClients(orgId: string, startDate: string, endDate: string, limit?: number) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["top-clients", orgId, startDate, endDate, limit],
    queryFn: () => getTopClients(orgId, startDate, endDate, limit),
    enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useClientProfitability(orgId: string, startDate: string, endDate: string, limit = 10) {
  const query = useQuery({ queryKey: ["client-profitability", orgId, startDate, endDate, limit], queryFn: () => getClientProfitability(orgId, startDate, endDate, limit), enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate });
  return query;
}

export function useCashFlow(orgId: string, startDate: string, endDate: string) {
  const query = useQuery({ queryKey: ["cash-flow", orgId, startDate, endDate], queryFn: () => getCashFlow(orgId, startDate, endDate), enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate });
  return query;
}

export function useExpenseTrend(orgId: string, startDate: string, endDate: string) {
  const query = useQuery({ queryKey: ["expense-trend", orgId, startDate, endDate], queryFn: () => getExpenseTrend(orgId, startDate, endDate), enabled: typeof window !== "undefined" && !!orgId && !!startDate && !!endDate });
  return query;
}

export function useComparativePeriods(orgId: string, asOfDate: string) {
  const query = useQuery({ queryKey: ["comparative-periods", orgId, asOfDate], queryFn: () => getComparativePeriods(orgId, asOfDate), enabled: typeof window !== "undefined" && !!orgId && !!asOfDate });
  return query;
}
