"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/finance/use-finance";
import { useMarkInvoicePaid } from "@/hooks/invoicing/use-invoices";
import { Invoice } from "@/lib/types";
import posthog from "posthog-js";

const formSchema = z.object({
  deposit_account_id: z.string().min(1, "Select which account received the payment"),
  payment_date: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
});

interface MarkPaidDialogProps {
  orgId: string;
  invoice: Invoice;
  onSuccess?: () => void;
}

export function MarkPaidDialog({ orgId, invoice, onSuccess }: MarkPaidDialogProps) {
  const { data: bankAccounts, isLoading: accountsLoading } = useBankAccounts(orgId);
  const markPaid = useMarkInvoicePaid(orgId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deposit_account_id: "",
      payment_date: new Date().toISOString().slice(0, 10),
      reference: invoice.invoice_number,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await markPaid.mutateAsync({
      invoice_id: invoice.id,
      deposit_account_id: values.deposit_account_id,
      payment_date: values.payment_date,
      reference: values.reference,
    });
    posthog.capture("invoice_marked_paid", {
      currency: invoice.currency,
      grand_total: invoice.grand_total,
    });
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This records {invoice.currency}{" "}
          {(invoice.grand_total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} as
          received and posts a journal entry — it isn&apos;t just a status flag, it affects your
          ledger and account balances.
        </p>
        <FormField
          control={form.control}
          name="deposit_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deposited into</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={accountsLoading ? "Loading accounts…" : "Select bank account"}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bankAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.account_id}>
                      {acc.name} {acc.bank_name ? `— ${acc.bank_name}` : ""}
                    </SelectItem>
                  ))}
                  {!accountsLoading && (!bankAccounts || bankAccounts.length === 0) && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No bank accounts yet — add one in Banking first
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payment_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input placeholder="e.g. transaction ID, cheque number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={markPaid.isPending}
        >
          {markPaid.isPending ? "Recording payment..." : "Confirm Payment Received"}
        </Button>
      </form>
    </Form>
  );
}
