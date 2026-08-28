"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
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
import { useAccounts, useCreateBankAccount } from "@/hooks/finance/use-finance";
import { useOrg } from "@/hooks/use-org";
import { toast } from "sonner";
import { Account } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_id: z.string().min(1, "GL Account is required"),
  currency: z.string().min(1, "Currency is required"),
});

interface BankAccountFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function BankAccountForm({ orgId, onSuccess }: BankAccountFormProps) {
  const { currentOrg } = useOrg();
  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const { data: accounts } = useAccounts(orgId);
  const createBankAccount = useCreateBankAccount();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bank_name: "",
      account_number: "",
      account_id: "",
      currency: baseCurrency,
    },
  });

  useEffect(() => {
    if (baseCurrency && !form.formState.dirtyFields.currency) {
      form.setValue("currency", baseCurrency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createBankAccount.mutateAsync({
        ...values,
        org_id: orgId,
        is_active: true,
      });
      toast.success("Bank account created successfully");
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create bank account";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Stanbic Operating" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bank_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Stanbic Bank" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="account_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input placeholder="**** 1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GL Account (Chart of Accounts)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select GL account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts?.filter((a: Account) => a.category === 'asset').map((acc: Account) => (
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
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="UGX">UGX</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="SSP">SSP</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="RWF">RWF</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-axis-blue hover:bg-axis-blue-light" disabled={createBankAccount.isPending}>
          {createBankAccount.isPending ? "Creating..." : "Create Bank Account"}
        </Button>
      </form>
    </Form>
  );
}
