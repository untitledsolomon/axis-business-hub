import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CrudMutationOptions<TVariables, TResult> {
  /** The actual Supabase call, e.g. (vars) => updateClient(vars.id, vars.updates) */
  mutationFn: (variables: TVariables) => Promise<TResult>;
  /** Query keys to invalidate on success, e.g. [["clients", orgId]] */
  invalidateKeys: (variables: TVariables, result: TResult) => unknown[][];
  /** Shown via toast on success, e.g. "Client updated" */
  successMessage: string;
  /** Shown via toast if mutationFn throws and the error has no message */
  fallbackErrorMessage: string;
}

/**
 * Standard CRUD mutation wrapper used across every module (clients, invoices,
 * items, accounts, tax rates, bank accounts, journal entries). Centralizes
 * the pattern every existing create-mutation already followed by hand
 * (toast + cache invalidation) so update/delete/status-change actions are
 * consistent everywhere and don't need to be re-derived per module.
 *
 * Usage:
 *   export function useUpdateClient(orgId: string) {
 *     return useCrudMutation({
 *       mutationFn: (vars: { id: string; updates: Partial<Client> }) =>
 *         updateClient(vars.id, vars.updates),
 *       invalidateKeys: () => [["clients", orgId]],
 *       successMessage: "Client updated",
 *       fallbackErrorMessage: "Failed to update client",
 *     });
 *   }
 */
export function useCrudMutation<TVariables, TResult>({
  mutationFn,
  invalidateKeys,
  successMessage,
  fallbackErrorMessage,
}: CrudMutationOptions<TVariables, TResult>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      for (const key of invalidateKeys(variables, result)) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success(successMessage);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : fallbackErrorMessage;
      toast.error(message);
    },
  });
}
