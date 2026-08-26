import { createClient } from "@/lib/supabase/client";
import { Expense } from "@/lib/types";

export interface ExpenseFilters {
  from?: string; // ISO date
  to?: string; // ISO date
  category?: string;
}

export async function getExpenses(orgId: string, filters?: ExpenseFilters) {
  const supabase = createClient();
  let query = supabase
    .from("expenses")
    .select(`
      *,
      expense_account:accounts!expenses_expense_account_id_fkey(id, name, code),
      paid_from_account:accounts!expenses_paid_from_account_id_fkey(id, name, code),
      journal_entry:journal_entries!expenses_journal_entry_id_fkey(id, status)
    `)
    .eq("org_id", orgId)
    .order("expense_date", { ascending: false });

  if (filters?.from) query = query.gte("expense_date", filters.from);
  if (filters?.to) query = query.lte("expense_date", filters.to);
  if (filters?.category && filters.category !== "all") query = query.eq("category", filters.category);

  const { data, error } = await query;

  if (error) throw error;
  return data as Expense[];
}

export async function getExpense(orgId: string, expenseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(`
      *,
      expense_account:accounts!expenses_expense_account_id_fkey(id, name, code),
      paid_from_account:accounts!expenses_paid_from_account_id_fkey(id, name, code)
    `)
    .eq("org_id", orgId)
    .eq("id", expenseId)
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function createExpense(params: {
  org_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number; // cents
  recurrence: string;
  payment_method: string;
  expense_account_id: string;
  paid_from_account_id: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_expense_v1", {
    p_org_id: params.org_id,
    p_expense_date: params.expense_date,
    p_category: params.category,
    p_description: params.description,
    p_amount: params.amount,
    p_recurrence: params.recurrence,
    p_payment_method: params.payment_method,
    p_expense_account_id: params.expense_account_id,
    p_paid_from_account_id: params.paid_from_account_id,
  });

  if (error) throw error;
  return data as string; // new expense id
}

export async function updateExpense(
  expenseId: string,
  updates: Partial<Pick<Expense, "expense_date" | "category" | "description" | "recurrence" | "payment_method">>
) {
  // Note: amount, expense_account_id, and paid_from_account_id are
  // intentionally not editable here — changing them would desync the
  // expense row from the journal entry it already posted. Void + re-log via
  // the Duplicate action if the amount/accounts were wrong.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", expenseId)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(params: { org_id: string; expense_id: string }) {
  const supabase = createClient();
  // Voids the linked journal entry (soft, audit trail preserved) before
  // removing the row — a plain table delete left the journal entry posted
  // forever with no way to trace it back to the expense that created it.
  const { error } = await supabase.rpc("delete_expense_v1", {
    p_org_id: params.org_id,
    p_expense_id: params.expense_id,
  });
  if (error) throw error;
}
