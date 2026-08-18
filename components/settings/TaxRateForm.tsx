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

const formSchema = z.object({
  name: z.string().min(1, "Tax rate name is required"),
  rate: z.coerce.number().min(0, "Rate must be 0 or greater").max(100, "Rate cannot exceed 100%"),
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
      toast.success("Tax rate created");
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create tax rate");
      console.error(error);
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Standard VAT" {...field} />
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
                <Input type="number" step="0.01" min="0" max="100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={createTaxRate.isPending}
        >
          {createTaxRate.isPending ? "Saving..." : "Save Tax Rate"}
        </Button>
      </form>
    </Form>
  );
}
