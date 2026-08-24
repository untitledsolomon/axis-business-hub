import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getItems,
  getItem,
  getItemMovements,
  getOrgItemMovements,
  createItem,
  updateItem,
  deleteItem,
  archiveItem,
  updateItemQuantity,
} from "@/lib/items/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import type { Item, ItemMovementType } from "@/lib/types";

export function useItems(orgId: string) {
  return useQuery({
    queryKey: ["items", orgId],
    queryFn: () => getItems(orgId),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}

export function useItem(orgId: string, itemId: string) {
  return useQuery({
    queryKey: ["items", orgId, itemId],
    queryFn: () => getItem(orgId, itemId),
    enabled: typeof window !== "undefined" && !!orgId && !!itemId,
  });
}

export function useItemMovements(orgId: string, itemId: string) {
  return useQuery({
    queryKey: ["item-movements", orgId, itemId],
    queryFn: () => getItemMovements(orgId, itemId),
    enabled: typeof window !== "undefined" && !!orgId && !!itemId,
  });
}

export function useOrgItemMovements(orgId: string, filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["item-movements", orgId, "org", filters],
    queryFn: () => getOrgItemMovements(orgId, filters),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}

export function useCreateItem() {
  return useCrudMutation<Omit<Item, "id" | "created_at" | "updated_at">, Item>({
    mutationFn: (item) => createItem(item),
    invalidateKeys: (variables) => [["items", variables.org_id]],
    successMessage: "Item created",
    fallbackErrorMessage: "Failed to create item",
  });
}

export function useUpdateItem(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string; updates: Partial<Item> }, Item>({
    mutationFn: ({ id, updates }) => updateItem(id, updates),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["items", orgId, variables.id] });
      return [["items", orgId]];
    },
    successMessage: "Item updated",
    fallbackErrorMessage: "Failed to update item",
  });
}

export function useDeleteItem(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string }, void>({
    mutationFn: ({ id }) => deleteItem(id),
    invalidateKeys: () => [["items", orgId]],
    successMessage: "Item deleted",
    fallbackErrorMessage: "Failed to delete item",
  });
}

export function useArchiveItem(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string }, Item>({
    mutationFn: ({ id }) => archiveItem(id),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["items", orgId, variables.id] });
      return [["items", orgId]];
    },
    successMessage: "Item archived",
    fallbackErrorMessage: "Failed to archive item",
  });
}

export function useRecordItemMovement(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{
    item_id: string;
    quantity_change: number;
    movement_type: ItemMovementType;
    reference?: string;
    notes?: string;
    unit_cost?: number;
  }, Item>({
    mutationFn: (vars) =>
      updateItemQuantity({
        org_id: orgId,
        item_id: vars.item_id,
        quantity_change: vars.quantity_change,
        movement_type: vars.movement_type,
        reference: vars.reference,
        notes: vars.notes,
        unit_cost: vars.unit_cost,
      }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["items", orgId, variables.item_id] });
      return [["items", orgId]];
    },
    successMessage: "Stock updated",
    fallbackErrorMessage: "Failed to update stock",
  });
}
