import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, createInvoice, getNextInvoiceNumber } from "@/lib/invoicing/queries";
import { Invoice, InvoiceItem } from "@/lib/types";

export function useInvoices(orgId: string) {
  return useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => getInvoices(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoice, items }: CreateInvoiceParams) => createInvoice(invoice, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", variables.invoice.org_id] });
    },
  });
}
