import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getJobOrders,
  getJobOrder,
  createJobOrder,
  updateJobOrder,
  updateJobOrderStatus,
  getNextJobOrderNumber,
  getJobOrderStatuses,
  createJobOrderStatus,
  updateJobOrderStatusConfig,
  deleteJobOrderStatus,
  getJobOrderCostTypes,
  createJobOrderCostType,
  deleteJobOrderCostType,
  addJobOrderCost,
  deleteJobOrderCost,
  getJobOrderMargin,
  getJobOrderMargins,
} from "@/lib/job-orders/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { JobOrder, JobOrderCost, JobOrderCostType, JobOrderStatus } from "@/lib/types";
import { useOrg } from "@/hooks/use-org";

export function useJobOrders(orgId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["job-orders", orgId],
    queryFn: () => getJobOrders(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useJobOrder(orgId: string, jobOrderId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["job-orders", orgId, jobOrderId],
    queryFn: () => getJobOrder(orgId, jobOrderId),
    enabled: typeof window !== 'undefined' && !!orgId && !!jobOrderId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useNextJobOrderNumber(orgId: string) {
  return useQuery({
    queryKey: ["next-job-order-number", orgId],
    queryFn: () => getNextJobOrderNumber(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

interface CreateJobOrderParams {
  org_id: string;
  client_id: string;
  description: string;
  quantity: number;
  currency?: string;
  due_date?: string;
  notes?: string;
  quotation_id?: string;
  status_id?: string;
}

export function useCreateJobOrder() {
  return useCrudMutation<CreateJobOrderParams, JobOrder>({
    mutationFn: (params) => createJobOrder(params),
    invalidateKeys: (variables) => [["job-orders", variables.org_id]],
    successMessage: "Job order created",
    fallbackErrorMessage: "Failed to create job order",
  });
}

export function useUpdateJobOrder(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string; updates: Partial<JobOrder> }, JobOrder>({
    mutationFn: ({ id, updates }) => updateJobOrder(id, updates),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-orders", orgId, variables.id] });
      return [["job-orders", orgId]];
    },
    successMessage: "Job order updated",
    fallbackErrorMessage: "Failed to update job order",
  });
}

export function useUpdateJobOrderStatus(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ job_order_id: string; status_id: string }, JobOrder>({
    mutationFn: (vars) => updateJobOrderStatus({ org_id: orgId, ...vars }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-orders", orgId, variables.job_order_id] });
      return [["job-orders", orgId]];
    },
    successMessage: "Job order status updated",
    fallbackErrorMessage: "Failed to update job order status",
  });
}

// --- Statuses --------------------------------------------------------------

export function useJobOrderStatuses(orgId: string) {
  return useQuery({
    queryKey: ["job-order-statuses", orgId],
    queryFn: () => getJobOrderStatuses(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateJobOrderStatus(orgId: string) {
  return useCrudMutation<Omit<JobOrderStatus, "id" | "created_at" | "updated_at">, JobOrderStatus>({
    mutationFn: (status) => createJobOrderStatus(status),
    invalidateKeys: () => [["job-order-statuses", orgId]],
    successMessage: "Status added",
    fallbackErrorMessage: "Failed to add status",
  });
}

export function useUpdateJobOrderStatusConfig(orgId: string) {
  return useCrudMutation<{ id: string; updates: Partial<JobOrderStatus> }, JobOrderStatus>({
    mutationFn: ({ id, updates }) => updateJobOrderStatusConfig(id, updates),
    invalidateKeys: () => [["job-order-statuses", orgId]],
    successMessage: "Status updated",
    fallbackErrorMessage: "Failed to update status",
  });
}

export function useDeleteJobOrderStatus(orgId: string) {
  return useCrudMutation<{ id: string }, void>({
    mutationFn: ({ id }) => deleteJobOrderStatus(id),
    invalidateKeys: () => [["job-order-statuses", orgId]],
    successMessage: "Status removed",
    fallbackErrorMessage: "Failed to remove status",
  });
}

// --- Cost types --------------------------------------------------------------

export function useJobOrderCostTypes(orgId: string) {
  return useQuery({
    queryKey: ["job-order-cost-types", orgId],
    queryFn: () => getJobOrderCostTypes(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateJobOrderCostType(orgId: string) {
  return useCrudMutation<Omit<JobOrderCostType, "id" | "created_at" | "updated_at">, JobOrderCostType>({
    mutationFn: (costType) => createJobOrderCostType(costType),
    invalidateKeys: () => [["job-order-cost-types", orgId]],
    successMessage: "Cost type added",
    fallbackErrorMessage: "Failed to add cost type",
  });
}

export function useDeleteJobOrderCostType(orgId: string) {
  return useCrudMutation<{ id: string }, void>({
    mutationFn: ({ id }) => deleteJobOrderCostType(id),
    invalidateKeys: () => [["job-order-cost-types", orgId]],
    successMessage: "Cost type removed",
    fallbackErrorMessage: "Failed to remove cost type",
  });
}

// --- Costs + margin ----------------------------------------------------------

export function useAddJobOrderCost(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<Omit<JobOrderCost, "id" | "created_at" | "updated_at" | "cost_type">, JobOrderCost>({
    mutationFn: (cost) => addJobOrderCost(cost),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-orders", orgId, variables.job_order_id] });
      queryClient.invalidateQueries({ queryKey: ["job-order-margins", orgId] });
      return [["job-orders", orgId]];
    },
    successMessage: "Cost added",
    fallbackErrorMessage: "Failed to add cost",
  });
}

export function useDeleteJobOrderCost(orgId: string, jobOrderId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string }, void>({
    mutationFn: ({ id }) => deleteJobOrderCost(id),
    invalidateKeys: () => {
      queryClient.invalidateQueries({ queryKey: ["job-orders", orgId, jobOrderId] });
      queryClient.invalidateQueries({ queryKey: ["job-order-margins", orgId] });
      return [["job-orders", orgId]];
    },
    successMessage: "Cost removed",
    fallbackErrorMessage: "Failed to remove cost",
  });
}

export function useJobOrderMargin(orgId: string, jobOrderId: string) {
  return useQuery({
    queryKey: ["job-order-margin", orgId, jobOrderId],
    queryFn: () => getJobOrderMargin(orgId, jobOrderId),
    enabled: typeof window !== 'undefined' && !!orgId && !!jobOrderId,
  });
}

export function useJobOrderMargins(orgId: string) {
  return useQuery({
    queryKey: ["job-order-margins", orgId],
    queryFn: () => getJobOrderMargins(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}
