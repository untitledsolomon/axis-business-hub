import { createClient } from "@/lib/supabase/client";
import {
  TrialBalanceRow,
  ProfitAndLossRow,
  BalanceSheetRow,
  AccountLedgerRow,
  RevenueTrendRow,
  ARAgingRow,
  ExpenseBreakdownRow,
  TopClientRow,
} from "@/lib/types";

// ---- Core accounting reports ----

export async function getTrialBalance(orgId: string, asOfDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_trial_balance_v1", {
    p_org_id: orgId,
    p_as_of_date: asOfDate,
  });

  if (error) throw error;
  return data as TrialBalanceRow[];
}

export async function getProfitAndLoss(orgId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_profit_and_loss_v1", {
    p_org_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as ProfitAndLossRow[];
}

export async function getBalanceSheet(orgId: string, asOfDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_balance_sheet_v1", {
    p_org_id: orgId,
    p_as_of_date: asOfDate,
  });

  if (error) throw error;
  return data as BalanceSheetRow[];
}

export async function getAccountLedger(
  orgId: string,
  accountId: string,
  startDate: string,
  endDate: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_account_ledger_v1", {
    p_org_id: orgId,
    p_account_id: accountId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as AccountLedgerRow[];
}

// ---- Business analytics ----

export async function getRevenueTrend(orgId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_revenue_trend_v1", {
    p_org_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as RevenueTrendRow[];
}

export async function getARAging(orgId: string, asOfDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_ar_aging_v1", {
    p_org_id: orgId,
    p_as_of_date: asOfDate,
  });

  if (error) throw error;
  return data as ARAgingRow[];
}

export async function getExpenseBreakdown(orgId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_expense_breakdown_v1", {
    p_org_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as ExpenseBreakdownRow[];
}

export async function getTopClients(
  orgId: string,
  startDate: string,
  endDate: string,
  limit: number = 10
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_top_clients_v1", {
    p_org_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
  });

  if (error) throw error;
  return data as TopClientRow[];
}
