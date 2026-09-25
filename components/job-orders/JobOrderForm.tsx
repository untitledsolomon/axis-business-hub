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
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/clients/use-clients";
import { useCreateJobOrder, useJobOrderStatuses, useNextJobOrderNumber } from "@/hooks/job-orders/use-job-orders";
import { useQuotations } from "@/hooks/quotations/use-quotations";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { useOrg } from "@/hooks/use-org";

const formSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  quotation_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

interface JobOrderFormProps {
  orgId: string;
  /** Pre-fill from an accepted quotation's "Create job order" action. */
  fromQuotationId?: string;
  onSuccess?: () => void;
}

export function JobOrderForm({ orgId, fromQuotationId, onSuccess }: JobOrderFormProps) {
  const { currentOrg } = useOrg();
  const { data: clients } = useClients(orgId);
  const { data: quotations } = useQuotations(orgId);
  const { data: statuses } = useJobOrderStatuses(orgId);
  const { data: nextNumber } = useNextJobOrderNumber(orgId);
  const createJobOrder = useCreateJobOrder();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      quotation_id: fromQuotationId ?? "",
      description: "",
      quantity: 1,
      due_date: "",
      notes: "",
    },
  });

  // If launched from an accepted quotation, prefill the client too.
  useEffect(() => {
    if (fromQuotationId && quotations) {
      const quotation = quotations.find((q) => q.id === fromQuotationId);
      if (quotation) form.setValue("client_id", quotation.client_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuotationId, quotations]);

  if (!mounted) return null;

  const defaultStatus = statuses?.find((s) => s.is_default);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const jobOrder = await createJobOrder.mutateAsync({
        org_id: orgId,
        client_id: values.client_id,
        description: values.description,
        quantity: values.quantity,
        currency: currentOrg?.base_currency,
        due_date: values.due_date || undefined,
        notes: values.notes || undefined,
        quotation_id: values.quotation_id || undefined,
      });

      posthog.capture("job_order_created", { from_quotation: !!values.quotation_id });
      toast.success(`Job order ${jobOrder.job_order_number} created`);
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create job order";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {nextNumber && (
          <p className="text-sm text-muted-foreground">
            This will be job order <span className="font-mono font-medium text-foreground">{nextNumber}</span>
            {defaultStatus ? <>, starting in <span className="font-medium text-foreground">{defaultStatus.label}</span></> : null}.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
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
            name="quotation_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From quotation (optional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No linked quotation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No linked quotation</SelectItem>
                    {quotations?.filter((q) => q.status === "accepted").map((quotation) => (
                      <SelectItem key={quotation.id} value={quotation.id}>
                        {quotation.quotation_number} — {quotation.client?.name}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="What's being produced or worked on" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date (optional)</FormLabel>
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Production notes, special instructions, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-axis-blue hover:bg-axis-blue-light" disabled={createJobOrder.isPending}>
          {createJobOrder.isPending ? "Creating Job Order..." : "Create Job Order"}
        </Button>
      </form>
    </Form>
  );
}
