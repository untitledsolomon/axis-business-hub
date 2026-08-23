import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  ExpenseFilters,
} from "@/lib/finance/expenses-queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { Expense } from "@/lib/types";

export function useExpenses(orgId: string, filters?: ExpenseFilters) {
  return useQuery({
    queryKey: ["expenses", orgId, filters],
    queryFn: () => getExpenses(orgId, filters),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}

export function useExpense(orgId: string, expenseId: string) {
  return useQuery({
    queryKey: ["expenses", orgId, expenseId],
    queryFn: () => getExpense(orgId, expenseId),
    enabled: typeof window !== "undefined" && !!orgId && !!expenseId,
  });
}

export function useCreateExpense(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: Omit<Parameters<typeof createExpense>[0], "org_id">) =>
      createExpense({ ...vars, org_id: orgId }),
    invalidateKeys: () => [["expenses", orgId]],
    successMessage: "Expense logged",
    fallbackErrorMessage: "Failed to log expense",
  });
}

export function useUpdateExpense(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string; updates: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(vars.id, vars.updates),
    invalidateKeys: (vars) => [["expenses", orgId], ["expenses", orgId, vars.id]],
    successMessage: "Expense updated",
    fallbackErrorMessage: "Failed to update expense",
  });
}

export function useDeleteExpense(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string }) => deleteExpense(vars.id),
    invalidateKeys: () => [["expenses", orgId]],
    successMessage: "Expense deleted",
    fallbackErrorMessage: "Failed to delete expense",
  });
}

/** Client-side helper for the running total shown atop ExpensesList. */
export function sumExpenses(expenses: Expense[] | undefined) {
  return (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
}

export function useExpensesQueryClient() {
  return useQueryClient();
}
