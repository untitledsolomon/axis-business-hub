import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDeliveryForms,
  getDeliveryForm,
  createDeliveryForm,
  updateDeliveryForm,
  getNextDeliveryNumber,
  getUndeliveredJobOrdersForClient,
} from "@/lib/delivery-forms/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { DeliveryForm, DeliveryFormItem } from "@/lib/types";
import { useOrg } from "@/hooks/use-org";

export function useDeliveryForms(orgId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["delivery-forms", orgId],
    queryFn: () => getDeliveryForms(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useDeliveryForm(orgId: string, deliveryFormId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["delivery-forms", orgId, deliveryFormId],
    queryFn: () => getDeliveryForm(orgId, deliveryFormId),
    enabled: typeof window !== 'undefined' && !!orgId && !!deliveryFormId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useNextDeliveryNumber(orgId: string) {
  return useQuery({
    queryKey: ["next-delivery-number", orgId],
    queryFn: () => getNextDeliveryNumber(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useUndeliveredJobOrdersForClient(orgId: string, clientId: string) {
  return useQuery({
    queryKey: ["job-orders", orgId, "by-client", clientId],
    queryFn: () => getUndeliveredJobOrdersForClient(orgId, clientId),
    enabled: typeof window !== 'undefined' && !!orgId && !!clientId,
  });
}

interface CreateDeliveryFormParams {
  deliveryForm: Omit<DeliveryForm, "id" | "created_at" | "updated_at" | "client" | "items">;
  items: Omit<DeliveryFormItem, "id" | "org_id" | "delivery_form_id" | "created_at" | "job_order">[];
}

export function useCreateDeliveryForm() {
  return useCrudMutation<CreateDeliveryFormParams, DeliveryForm>({
    mutationFn: ({ deliveryForm, items }) => createDeliveryForm(deliveryForm, items),
    invalidateKeys: (variables) => [["delivery-forms", variables.deliveryForm.org_id]],
    successMessage: "Delivery form created",
    fallbackErrorMessage: "Failed to create delivery form",
  });
}

export function useUpdateDeliveryForm(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string; updates: Partial<DeliveryForm> }, DeliveryForm>({
    mutationFn: ({ id, updates }) => updateDeliveryForm(id, updates),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-forms", orgId, variables.id] });
      return [["delivery-forms", orgId]];
    },
    successMessage: "Delivery form updated",
    fallbackErrorMessage: "Failed to update delivery form",
  });
}
