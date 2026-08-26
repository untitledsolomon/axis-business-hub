import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDailySales,
  getDailySale,
  createDailySale,
  createItemSale,
  updateDailySale,
  deleteDailySale,
  DailySaleFilters,
} from "@/lib/finance/daily-sales-queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { DailySale } from "@/lib/types";
import { useOrg } from "@/hooks/use-org";

export function useDailySales(orgId: string, filters?: DailySaleFilters) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["daily-sales", orgId, filters],
    queryFn: () => getDailySales(orgId, filters),
    enabled: typeof window !== "undefined" && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useDailySale(orgId: string, saleId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["daily-sales", orgId, saleId],
    queryFn: () => getDailySale(orgId, saleId),
    enabled: typeof window !== "undefined" && !!orgId && !!saleId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useCreateDailySale(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: Omit<Parameters<typeof createDailySale>[0], "org_id">) =>
      createDailySale({ ...vars, org_id: orgId }),
    invalidateKeys: () => [["daily-sales", orgId]],
    successMessage: "Sale logged",
    fallbackErrorMessage: "Failed to log sale",
  });
}

export function useCreateItemSale(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: Omit<Parameters<typeof createItemSale>[0], "org_id">) =>
      createItemSale({ ...vars, org_id: orgId }),
    invalidateKeys: () => [["daily-sales", orgId], ["items", orgId]],
    successMessage: "Sale logged",
    fallbackErrorMessage: "Failed to log sale",
  });
}

export function useUpdateDailySale(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string; updates: Parameters<typeof updateDailySale>[1] }) =>
      updateDailySale(vars.id, vars.updates),
    invalidateKeys: (vars) => [["daily-sales", orgId], ["daily-sales", orgId, vars.id]],
    successMessage: "Sale updated",
    fallbackErrorMessage: "Failed to update sale",
  });
}

export function useDeleteDailySale(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation({
    mutationFn: (vars: { id: string }) => deleteDailySale({ org_id: orgId, sale_id: vars.id }),
    invalidateKeys: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", orgId] });
      return [["daily-sales", orgId]];
    },
    successMessage: "Sale deleted",
    fallbackErrorMessage: "Failed to delete sale",
  });
}

export function sumDailySales(sales: DailySale[] | undefined) {
  // Same fix as sumExpenses — a voided linked journal entry means the
  // ledger no longer counts this sale.
  return (sales ?? [])
    .filter((s) => s.journal_entry?.status !== "void")
    .reduce((sum, s) => sum + s.amount, 0);
}
