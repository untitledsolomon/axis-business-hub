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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/finance/use-finance";
import { useCreateDailySale } from "@/hooks/finance/use-daily-sales";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Account } from "@/lib/types";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().min(1, "Description is required"),
  sale_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "bank", "mobile_money"]),
  received_into_account_id: z.string().min(1, "Select where this was received into"),
  revenue_account_id: z.string().min(1, "Select a revenue account"),
});

type FormValues = z.infer<typeof formSchema>;

interface QuickSaleFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function QuickSaleForm({ orgId, onSuccess }: QuickSaleFormProps) {
  const { data: accounts } = useAccounts(orgId);
  const createDailySale = useCreateDailySale(orgId);

  const cashBankAccounts = (accounts ?? []).filter((a: Account) => a.category === "asset");
  const revenueAccounts = (accounts ?? []).filter((a: Account) => a.category === "revenue");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      sale_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      received_into_account_id: "",
      revenue_account_id: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createDailySale.mutateAsync({
        sale_date: values.sale_date,
        description: values.description,
        amount: Math.round(values.amount * 100),
        payment_method: values.payment_method,
        revenue_account_id: values.revenue_account_id,
        received_into_account_id: values.received_into_account_id,
      });
      posthog.capture("daily_sale_logged", {});
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log sale";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (UGX)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sale_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Sticker + A4 printing, walk-ins" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="received_into_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received into</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cashBankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="revenue_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Revenue account (Chart of Accounts)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select GL account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {revenueAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={createDailySale.isPending}
        >
          {createDailySale.isPending ? "Logging…" : "Log Sale"}
        </Button>
      </form>
    </Form>
  );
}
