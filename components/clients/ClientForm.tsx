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
import { useCreateClient, useUpdateClient } from "@/hooks/clients/use-clients";
import { useOrg } from "@/hooks/use-org";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Client } from "@/lib/types";
import posthog from "posthog-js";

// Matches INVOICE_CURRENCIES in components/invoicing/InvoiceForm.tsx — a
// client's currency here is just their default; any invoice can still
// override it individually.
const CLIENT_CURRENCIES = ["UGX", "USD", "SSP", "KES", "TZS", "RWF", "EUR", "GBP"];

const formSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  company_name: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  type: z.enum(["individual", "company"]),
  currency: z.string().min(1, "Currency is required"),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});

interface ClientFormProps {
  orgId: string;
  client?: Client; // when present, form edits instead of creates
  onSuccess?: () => void;
}

export function ClientForm({ orgId, client, onSuccess }: ClientFormProps) {
  const { currentOrg } = useOrg();
  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const createClient = useCreateClient();
  const updateClient = useUpdateClient(orgId);
  const isEditing = !!client;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name ?? "",
      company_name: client?.company_name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
      tax_id: client?.tax_id ?? "",
      type: client?.type ?? "company",
      currency: client?.currency ?? baseCurrency,
      payment_terms: client?.payment_terms ?? "Net 30",
      notes: client?.notes ?? "",
    },
  });

  // For a brand-new client, once org loads default currency to org base
  // (covers the case where currentOrg wasn't ready when defaultValues ran).
  useEffect(() => {
    if (!isEditing && baseCurrency && !form.formState.dirtyFields.currency) {
      form.setValue("currency", baseCurrency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency, isEditing]);

  if (!mounted) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isEditing) {
        await updateClient.mutateAsync({ id: client.id, updates: values });
        posthog.capture("client_updated", { client_type: values.type });
      } else {
        await createClient.mutateAsync({
          ...values,
          org_id: orgId,
          status: "active",
        });
        posthog.capture("client_created", { client_type: values.type, currency: values.currency });
        form.reset();
      }
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "add"} client`;
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
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name or display name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default billing currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CLIENT_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                        {code === baseCurrency ? " (org default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="billing@client.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+256..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Physical Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Street, City, Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tax_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID / TIN</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    <SelectItem value="Net 7">Net 7</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={createClient.isPending || updateClient.isPending}
        >
          {createClient.isPending || updateClient.isPending
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Add Client"}
        </Button>
      </form>
    </Form>
  );
}
