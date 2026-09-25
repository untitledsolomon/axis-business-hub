import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getQuotations,
  getQuotationsByClient,
  getQuotation,
  createQuotation,
  updateQuotation,
  getNextQuotationNumber,
  updateQuotationStatus,
  convertQuotationToInvoice,
  sendQuotationEmail,
} from "@/lib/quotations/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { Quotation, QuotationItem } from "@/lib/types";
import { useOrg } from "@/hooks/use-org";

export function useQuotations(orgId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["quotations", orgId],
    queryFn: () => getQuotations(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useQuotation(orgId: string, quotationId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["quotations", orgId, quotationId],
    queryFn: () => getQuotation(orgId, quotationId),
    enabled: typeof window !== 'undefined' && !!orgId && !!quotationId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useQuotationsByClient(orgId: string, clientId: string) {
  return useQuery({
    queryKey: ["quotations", orgId, "by-client", clientId],
    queryFn: () => getQuotationsByClient(orgId, clientId),
    enabled: typeof window !== 'undefined' && !!orgId && !!clientId,
  });
}

export function useNextQuotationNumber(orgId: string) {
  return useQuery({
    queryKey: ["next-quotation-number", orgId],
    queryFn: () => getNextQuotationNumber(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

interface CreateQuotationParams {
  quotation: Omit<Quotation, "id" | "created_at" | "updated_at" | "client" | "items">;
  items: Omit<QuotationItem, "id" | "org_id" | "quotation_id" | "created_at">[];
}

export function useCreateQuotation() {
  return useCrudMutation<CreateQuotationParams, Quotation>({
    mutationFn: ({ quotation, items }) => createQuotation(quotation, items),
    invalidateKeys: (variables) => [["quotations", variables.quotation.org_id]],
    successMessage: "Quotation created",
    fallbackErrorMessage: "Failed to create quotation",
  });
}

export function useUpdateQuotation(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string; updates: Partial<Quotation> }, Quotation>({
    mutationFn: ({ id, updates }) => updateQuotation(id, updates),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId, variables.id] });
      return [["quotations", orgId]];
    },
    successMessage: "Quotation updated",
    fallbackErrorMessage: "Failed to update quotation",
  });
}

export function useUpdateQuotationStatus(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ quotation_id: string; status: string }, Quotation>({
    mutationFn: (vars) => updateQuotationStatus({ org_id: orgId, ...vars }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId, variables.quotation_id] });
      return [["quotations", orgId]];
    },
    successMessage: "Quotation status updated",
    fallbackErrorMessage: "Failed to update quotation status",
  });
}

export function useConvertQuotationToInvoice(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ quotation_id: string }, string>({
    mutationFn: (vars) => convertQuotationToInvoice({ org_id: orgId, ...vars }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId, variables.quotation_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      return [["quotations", orgId]];
    },
    successMessage: "Quotation converted to invoice",
    fallbackErrorMessage: "Failed to convert quotation to invoice",
  });
}

export function useSendQuotationEmail(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ quotationId: string; message?: string }, { sent: boolean }>({
    mutationFn: (vars) => sendQuotationEmail(vars),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId, variables.quotationId] });
      return [["quotations", orgId]];
    },
    successMessage: "Quotation sent to client",
    fallbackErrorMessage: "Failed to send quotation",
  });
}
