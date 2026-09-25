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
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/clients/use-clients";
import { useCreateDeliveryForm, useNextDeliveryNumber, useUndeliveredJobOrdersForClient } from "@/hooks/delivery-forms/use-delivery-forms";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import posthog from "posthog-js";

const itemSchema = z.object({
  job_order_id: z.string().min(1, "Job order is required"),
  quantity_delivered: z.number().min(0.01, "Quantity must be greater than 0"),
});

const formSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  delivery_number: z.string().min(1, "Delivery number is required"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  recipient_name: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one job order is required"),
});

interface DeliveryFormProps {
  orgId: string;
  /** Pre-select a job order — e.g. launched from a job order's "Add to delivery form" action. */
  fromJobOrderId?: string;
  onSuccess?: () => void;
}

export function DeliveryForm({ orgId, fromJobOrderId, onSuccess }: DeliveryFormProps) {
  const { data: clients } = useClients(orgId);
  const { data: nextNumber } = useNextDeliveryNumber(orgId);
  const createDeliveryForm = useCreateDeliveryForm();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      delivery_number: "",
      delivery_date: new Date().toISOString().split("T")[0],
      recipient_name: "",
      notes: "",
      items: [{ job_order_id: fromJobOrderId ?? "", quantity_delivered: 1 }],
    },
  });

  useEffect(() => {
    if (nextNumber) {
      form.setValue("delivery_number", nextNumber);
    }
  }, [nextNumber, form]);

  const watchClientId = form.watch("client_id");
  const { data: jobOrders } = useUndeliveredJobOrdersForClient(orgId, watchClientId);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  if (!mounted) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const deliveryForm = await createDeliveryForm.mutateAsync({
        deliveryForm: {
          org_id: orgId,
          client_id: values.client_id,
          delivery_number: values.delivery_number,
          delivery_date: values.delivery_date,
          recipient_name: values.recipient_name || undefined,
          notes: values.notes || undefined,
        },
        items: values.items.map((item) => ({
          job_order_id: item.job_order_id,
          quantity_delivered: item.quantity_delivered,
        })),
      });

      posthog.capture("delivery_form_created", { job_order_count: values.items.length });
      toast.success(`Delivery form ${deliveryForm.delivery_number} created`);
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create delivery form";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Client changed — job order picks made for the previous
                    // client no longer apply, so reset the item rows.
                    form.setValue("items", [{ job_order_id: "", quantity_delivered: 1 }]);
                  }}
                  value={field.value}
                >
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
            name="delivery_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="delivery_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipient_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Who received the delivery" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold">Job orders on this delivery</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ job_order_id: "", quantity_delivered: 1 })}
              disabled={!watchClientId}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Job Order
            </Button>
          </div>

          {!watchClientId ? (
            <p className="text-sm text-muted-foreground">Select a client to choose their job orders.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-start sm:border-0 sm:p-0"
                >
                  <div className="col-span-2 sm:col-span-8">
                    <FormField
                      control={form.control}
                      name={`items.${index}.job_order_id`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a job order" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jobOrders?.map((jo: { id: string; job_order_number: string; description: string }) => (
                                <SelectItem key={jo.id} value={jo.id}>
                                  {jo.job_order_number} — {jo.description.slice(0, 40)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity_delivered`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Qty delivered"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end sm:col-span-1 sm:justify-start sm:pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-axis-red"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove job order</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Delivery instructions, condition notes, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-axis-blue hover:bg-axis-blue-light" disabled={createDeliveryForm.isPending}>
          {createDeliveryForm.isPending ? "Creating Delivery Form..." : "Create Delivery Form"}
        </Button>
      </form>
    </Form>
  );
}
