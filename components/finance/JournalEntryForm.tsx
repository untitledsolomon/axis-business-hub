"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { useAccounts, useCreateJournalEntry } from "@/hooks/finance/use-finance";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Account } from "@/lib/types";
import { useEffect, useState } from "react";
import posthog from "posthog-js";

const lineSchema = z.object({
  account_id: z.string().min(1, "Account is required"),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().optional(),
});

const formSchema = z.object({
  entry_date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  lines: z.array(lineSchema).min(2, "At least two lines are required"),
});

interface JournalEntryFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function JournalEntryForm({ orgId, onSuccess }: JournalEntryFormProps) {
  const { data: accounts } = useAccounts(orgId);
  const createJournalEntry = useCreateJournalEntry();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_date: new Date().toISOString().split("T")[0],
      reference: "",
      description: "",
      lines: [
        { account_id: "", debit: 0, credit: 0, description: "" },
        { account_id: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  if (!mounted) return null;

  const totalDebit = form.watch("lines").reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = form.watch("lines").reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = totalDebit - totalCredit;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (totalDebit !== totalCredit) {
      toast.error(`Entry is out of balance by ${(Math.abs(difference)).toLocaleString()}`);
      return;
    }

    try {
      // Convert to cents for database
      const linesInCents = values.lines.map(line => ({
        ...line,
        debit: Math.round(line.debit * 100),
        credit: Math.round(line.credit * 100),
      }));

      await createJournalEntry.mutateAsync({
        entry: {
          org_id: orgId,
          entry_date: values.entry_date,
          reference: values.reference,
          description: values.description,
          status: "posted",
        },
        lines: linesInCents,
      });

      posthog.capture("journal_entry_posted", {
        line_count: linesInCents.length,
        total_debit: Math.round(totalDebit * 100),
      });
      toast.success("Journal entry created successfully");
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create journal entry";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="entry_date"
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
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. JE-001" {...field} />
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
                <Input placeholder="General description of the entry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Lines</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ account_id: "", debit: 0, credit: 0, description: "" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Line
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:border-0 sm:p-0">
                <div className="flex-1 sm:min-w-[200px]">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.account_id`}
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts?.map((acc: Account) => (
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
                </div>
                <div className="flex gap-2">
                <div className="w-1/2 sm:w-[120px]">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.debit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Debit"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-1/2 sm:w-[120px]">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.credit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Credit"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-1 shrink-0 text-axis-red"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end pt-4 border-t space-y-1">
          <div className="flex gap-8 text-sm">
            <span className="text-muted-foreground">Total Debit:</span>
            <span className="font-mono">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-8 text-sm">
            <span className="text-muted-foreground">Total Credit:</span>
            <span className="font-mono">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-8 text-sm font-bold">
            <span className="text-muted-foreground">Difference:</span>
            <span className={difference === 0 ? "text-axis-green" : "text-axis-red"}>
              {difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <Button type="submit" className="w-full bg-axis-blue hover:bg-axis-blue-light" disabled={createJournalEntry.isPending}>
          {createJournalEntry.isPending ? "Posting..." : "Post Journal Entry"}
        </Button>
      </form>
    </Form>
  );
}
