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
import { useCreateTaxRate } from "@/hooks/finance/use-finance";
import { toast } from "sonner";
import posthog from "posthog-js";

const formSchema = z.object({
  name: z.string().min(1, "Tax name is required"),
  rate: z.number().min(0, "Rate must be positive"),
});

interface TaxRateFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function TaxRateForm({ orgId, onSuccess }: TaxRateFormProps) {
  const createTaxRate = useCreateTaxRate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      rate: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createTaxRate.mutateAsync({
        ...values,
        org_id: orgId,
        is_active: true,
      });
      posthog.capture("tax_rate_created", { tax_rate: values.rate });
      toast.success("Tax rate created successfully");
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create tax rate";
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
        <Button type="submit" className="w-full bg-axis-blue hover:bg-axis-blue-light" disabled={createTaxRate.isPending}>
          {createTaxRate.isPending ? "Creating..." : "Create Tax Rate"}
        </Button>
      </form>
    </Form>
  );
}
