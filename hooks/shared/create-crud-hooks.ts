import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecords, getRecord, createRecord, updateRecord, deleteRecord } from "@/lib/shared/crud";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";

/**
 * Generates a standard set of list/detail/create/update/delete hooks for a
 * single Supabase table, on top of the generic helpers in lib/shared/crud.ts
 * and the toast+cache-invalidation wrapper in use-crud-mutation.ts.
 *
 * This exists so a brand-new module (e.g. "assets" in Phase 4) can get a
 * working CRUD hook set in a few lines instead of re-deriving the same
 * query-key/invalidation/toast boilerplate every module has needed so far.
 *
 * Modules with extra rules (status transitions, RPC-backed writes, joined
 * selects) should still write dedicated functions in their own
 * lib/{module}/queries.ts and hooks/{module}/use-{module}.ts — this factory
 * covers the common case, not every case. See hooks/invoicing/use-invoices.ts
 * for an example of mixing generated hooks with hand-written ones.
 *
 * Usage:
 *   const itemHooks = createCrudHooks<Item>({
 *     table: "items",
 *     entityName: "Item",
 *     queryKeyBase: "items",
 *   });
 *   export const useItems = itemHooks.useList;
 *   export const useItem = itemHooks.useDetail;
 *   export const useCreateItem = itemHooks.useCreate;
 *   export const useUpdateItem = itemHooks.useUpdate;
 *   export const useDeleteItem = itemHooks.useDelete;
 */
interface CreateCrudHooksOptions {
  table: string;
  entityName: string; // human-readable, e.g. "Client", used in default toast copy
  queryKeyBase: string; // e.g. "clients" — must match keys used elsewhere for this table
  select?: string; // optional joined select, e.g. "*, client:clients(*)"
  orderBy?: { column: string; ascending?: boolean };
}

export function createCrudHooks<T extends { id: string; org_id: string }>({
  table,
  entityName,
  queryKeyBase,
  select,
  orderBy,
}: CreateCrudHooksOptions) {
  function useList(orgId: string) {
    return useQuery({
      queryKey: [queryKeyBase, orgId],
      queryFn: () => getRecords<T>(table, orgId, { select, orderBy }),
      enabled: typeof window !== "undefined" && !!orgId,
    });
  }

  function useDetail(orgId: string, id: string) {
    return useQuery({
      queryKey: [queryKeyBase, orgId, id],
      queryFn: () => getRecord<T>(table, orgId, id, { select }),
      enabled: typeof window !== "undefined" && !!orgId && !!id,
    });
  }

  function useCreate() {
    return useCrudMutation<Record<string, unknown>, T>({
      mutationFn: (record) => createRecord<T>(table, record),
      invalidateKeys: (variables) => [[queryKeyBase, variables.org_id as string]],
      successMessage: `${entityName} created`,
      fallbackErrorMessage: `Failed to create ${entityName.toLowerCase()}`,
    });
  }

  function useUpdate(orgId: string) {
    const queryClient = useQueryClient();
    return useCrudMutation<{ id: string; updates: Partial<T> }, T>({
      mutationFn: ({ id, updates }) => updateRecord<T>(table, id, updates as Record<string, unknown>),
      invalidateKeys: (variables) => {
        // Also proactively refresh the detail query for this record.
        queryClient.invalidateQueries({ queryKey: [queryKeyBase, orgId, variables.id] });
        return [[queryKeyBase, orgId]];
      },
      successMessage: `${entityName} updated`,
      fallbackErrorMessage: `Failed to update ${entityName.toLowerCase()}`,
    });
  }

  function useDelete(orgId: string) {
    return useCrudMutation<{ id: string }, void>({
      mutationFn: ({ id }) => deleteRecord(table, id),
      invalidateKeys: () => [[queryKeyBase, orgId]],
      successMessage: `${entityName} deleted`,
      fallbackErrorMessage: `Failed to delete ${entityName.toLowerCase()}`,
    });
  }

  return { useList, useDetail, useCreate, useUpdate, useDelete };
}
