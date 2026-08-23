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
import { useCreateExpense } from "@/hooks/finance/use-expenses";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Account } from "@/lib/types";

const EXPENSE_CATEGORIES = [
  { value: "transport", label: "Transport" },
  { value: "meals", label: "Meals" },
  { value: "supplies", label: "Supplies" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salaries", label: "Salaries" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  expense_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "bank", "mobile_money"]),
  paid_from_account_id: z.string().min(1, "Select where this was paid from"),
  expense_account_id: z.string().min(1, "Select an expense category account"),
  recurrence: z.enum(["one_off", "daily", "weekly", "monthly"]),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  orgId: string;
  /** Pre-fill values, e.g. from the "Duplicate" action on an existing expense. */
  defaultValues?: Partial<FormValues>;
  onSuccess?: () => void;
}

export function ExpenseForm({ orgId, defaultValues, onSuccess }: ExpenseFormProps) {
  const { data: accounts } = useAccounts(orgId);
  const createExpense = useCreateExpense(orgId);

  const cashBankAccounts = (accounts ?? []).filter((a: Account) => a.category === "asset");
  const expenseAccounts = (accounts ?? []).filter((a: Account) => a.category === "expense");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      category: "",
      description: "",
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      paid_from_account_id: "",
      expense_account_id: "",
      recurrence: "one_off",
      ...defaultValues,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createExpense.mutateAsync({
        expense_date: values.expense_date,
        category: values.category,
        description: values.description,
        amount: Math.round(values.amount * 100),
        recurrence: values.recurrence,
        payment_method: values.payment_method,
        expense_account_id: values.expense_account_id,
        paid_from_account_id: values.paid_from_account_id,
      });
      posthog.capture("expense_logged", { category: values.category, recurrence: values.recurrence });
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log expense";
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
            name="expense_date"
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Lunch for the team" rows={2} {...field} />
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
            name="paid_from_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid from</FormLabel>
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
          name="expense_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense account (Chart of Accounts)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select GL account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expenseAccounts.map((acc) => (
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
          name="recurrence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recurrence</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="one_off">One-off</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={createExpense.isPending}
        >
          {createExpense.isPending ? "Logging…" : "Log Expense"}
        </Button>
      </form>
    </Form>
  );
}
