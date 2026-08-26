import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInvoices,
  getInvoicesByClient,
  getInvoice,
  createInvoice,
  updateInvoice,
  getNextInvoiceNumber,
  markInvoicePaid,
  voidInvoice,
  updateInvoiceStatus,
  generateInvoicePdf,
  sendInvoiceEmail,
} from "@/lib/invoicing/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { Invoice, InvoiceItem } from "@/lib/types";
import { useOrg } from "@/hooks/use-org";

export function useInvoices(orgId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => getInvoices(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useInvoice(orgId: string, invoiceId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["invoices", orgId, invoiceId],
    queryFn: () => getInvoice(orgId, invoiceId),
    enabled: typeof window !== 'undefined' && !!orgId && !!invoiceId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useInvoicesByClient(orgId: string, clientId: string) {
  return useQuery({
    queryKey: ["invoices", orgId, "by-client", clientId],
    queryFn: () => getInvoicesByClient(orgId, clientId),
    enabled: typeof window !== 'undefined' && !!orgId && !!clientId,
  });
}

export function useNextInvoiceNumber(orgId: string) {
  return useQuery({
    queryKey: ["next-invoice-number", orgId],
    queryFn: () => getNextInvoiceNumber(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

interface CreateInvoiceParams {
  invoice: Omit<Invoice, "id" | "created_at" | "updated_at" | "client" | "items">;
  items: Omit<InvoiceItem, "id" | "org_id" | "invoice_id" | "created_at">[];
}

export function useCreateInvoice() {
  return useCrudMutation<CreateInvoiceParams, Invoice>({
    mutationFn: ({ invoice, items }) => createInvoice(invoice, items),
    invalidateKeys: (variables) => [["invoices", variables.invoice.org_id]],
    successMessage: "Invoice created",
    fallbackErrorMessage: "Failed to create invoice",
  });
}

export function useUpdateInvoice(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string; updates: Partial<Invoice> }, Invoice>({
    mutationFn: ({ id, updates }) => updateInvoice(id, updates),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId, variables.id] });
      return [["invoices", orgId]];
    },
    successMessage: "Invoice updated",
    fallbackErrorMessage: "Failed to update invoice",
  });
}

export function useMarkInvoicePaid(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<
    { invoice_id: string; deposit_account_id: string; payment_date?: string; reference?: string },
    string
  >({
    mutationFn: (vars) => markInvoicePaid({ org_id: orgId, ...vars }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId, variables.invoice_id] });
      // Marking paid posts a journal entry, so ledger/banking/dashboard
      // numbers derived from journal entries need to refresh too.
      queryClient.invalidateQueries({ queryKey: ["journal-entries", orgId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", orgId] });
      return [["invoices", orgId]];
    },
    successMessage: "Invoice marked as paid",
    fallbackErrorMessage: "Failed to mark invoice as paid",
  });
}

export function useVoidInvoice(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ invoice_id: string; reason?: string }, Invoice>({
    mutationFn: (vars) => voidInvoice({ org_id: orgId, ...vars }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId, variables.invoice_id] });
      return [["invoices", orgId]];
    },
    successMessage: "Invoice voided",
    fallbackErrorMessage: "Failed to void invoice",
  });
}

export function useUpdateInvoiceStatus(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ invoice_id: string; status: string }, Invoice>({
    mutationFn: (vars) => updateInvoiceStatus({ org_id: orgId, ...vars }),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId, variables.invoice_id] });
      // Leaving 'draft' now posts the AR/revenue accrual entry (see
      // update_invoice_status_v1), so the ledger/dashboard need to refresh
      // too — same pattern as useMarkInvoicePaid.
      queryClient.invalidateQueries({ queryKey: ["journal-entries", orgId] });
      return [["invoices", orgId]];
    },
    successMessage: "Invoice status updated",
    fallbackErrorMessage: "Failed to update invoice status",
  });
}

export function useSendInvoiceEmail(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ invoiceId: string; message?: string }, { sent: boolean }>({
    mutationFn: (vars) => sendInvoiceEmail(vars),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId, variables.invoiceId] });
      return [["invoices", orgId]];
    },
    successMessage: "Invoice sent to client",
    fallbackErrorMessage: "Failed to send invoice",
  });
}

// PDF download isn't a mutation in the data sense (nothing changes), so it
// doesn't use useCrudMutation — but it still needs its own toast/error
// handling, done inline where it's triggered (see InvoiceActions.tsx) since
// it also has to handle the browser download side-effect.
export { generateInvoicePdf };
