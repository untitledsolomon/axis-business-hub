"use client";

import { useEffect, useState } from "react";
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
import { useCreateTaxRate, useUpdateTaxRate } from "@/hooks/finance/use-finance";
import { toast } from "sonner";
import posthog from "posthog-js";
import { TaxRate } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Tax name is required"),
  rate: z.number().min(0, "Rate must be positive"),
});

interface TaxRateFormProps {
  orgId: string;
  taxRate?: TaxRate; // when present, form edits instead of creates
  onSuccess?: () => void;
}

export function TaxRateForm({ orgId, taxRate, onSuccess }: TaxRateFormProps) {
  const createTaxRate = useCreateTaxRate();
  const updateTaxRate = useUpdateTaxRate(orgId);
  const isEditing = !!taxRate;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: taxRate?.name ?? "",
      rate: taxRate?.rate ?? 0,
    },
  });

  if (!mounted) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isEditing) {
        await updateTaxRate.mutateAsync({ id: taxRate.id, updates: values });
        posthog.capture("tax_rate_updated", { tax_rate: values.rate });
      } else {
        await createTaxRate.mutateAsync({
          ...values,
          org_id: orgId,
          is_active: true,
        });
        posthog.capture("tax_rate_created", { tax_rate: values.rate });
        toast.success("Tax rate created successfully");
        form.reset();
      }
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} tax rate`;
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
              <FormLabel>Tax Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Standard VAT (18%)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 18.0"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={createTaxRate.isPending || updateTaxRate.isPending}
        >
          {createTaxRate.isPending || updateTaxRate.isPending
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Create Tax Rate"}
        </Button>
      </form>
    </Form>
  );
}
