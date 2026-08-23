import { useQuery } from "@tanstack/react-query";
import {
  getDailySales,
  getDailySale,
  createDailySale,
  updateDailySale,
  deleteDailySale,
  DailySaleFilters,
} from "@/lib/finance/daily-sales-queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { DailySale } from "@/lib/types";

export function useDailySales(orgId: string, filters?: DailySaleFilters) {
  return useQuery({
    queryKey: ["daily-sales", orgId, filters],
    queryFn: () => getDailySales(orgId, filters),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}

export function useDailySale(orgId: string, saleId: string) {
  return useQuery({
    queryKey: ["daily-sales", orgId, saleId],
    queryFn: () => getDailySale(orgId, saleId),
    enabled: typeof window !== "undefined" && !!orgId && !!saleId,
  });
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
  return useCrudMutation({
    mutationFn: (vars: { id: string }) => deleteDailySale(vars.id),
    invalidateKeys: () => [["daily-sales", orgId]],
    successMessage: "Sale deleted",
    fallbackErrorMessage: "Failed to delete sale",
  });
}

export function sumDailySales(sales: DailySale[] | undefined) {
  return (sales ?? []).reduce((sum, s) => sum + s.amount, 0);
}
