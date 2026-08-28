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
import { useClients } from "@/hooks/clients/use-clients";
import { useTaxRates } from "@/hooks/finance/use-finance";
import { useCreateInvoice, useNextInvoiceNumber } from "@/hooks/invoicing/use-invoices";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useOrg } from "@/hooks/use-org";
import { toMinorUnits } from "@/lib/currency";

// Currencies clients might reasonably be billed in from Uganda/East Africa —
// extend as needed. Matches the minor-unit table in lib/currency.ts.
const INVOICE_CURRENCIES = ["UGX", "USD", "SSP", "KES", "TZS", "RWF", "EUR", "GBP"];

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unit_price: z.number().min(0),
  tax_rate_id: z.string().optional(),
});

const formSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  currency: z.string().min(1, "Currency is required"),
  exchange_rate: z.number().positive("Exchange rate must be greater than 0"),
  notes: z.string().optional(),
  payment_terms: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

interface InvoiceFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function InvoiceForm({ orgId, onSuccess }: InvoiceFormProps) {
  const { currentOrg } = useOrg();
  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const { data: clients } = useClients(orgId);
  const { data: taxRates } = useTaxRates(orgId);
  const { data: nextNumber } = useNextInvoiceNumber(orgId);
  const createInvoice = useCreateInvoice();
  const [mounted, setMounted] = useState(false);
  const [setupPrompt, setSetupPrompt] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      invoice_number: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currency: baseCurrency,
      exchange_rate: 1.0,
      notes: "",
      payment_terms: "Net 30",
      items: [{ description: "", quantity: 1, unit_price: 0, tax_rate_id: "" }],
    },
  });

  useEffect(() => {
    if (nextNumber) {
      form.setValue("invoice_number", nextNumber);
    }
  }, [nextNumber, form]);

  // Once the org loads, default a fresh form to its base currency (covers the
  // case where currentOrg wasn't ready yet when defaultValues was evaluated).
  useEffect(() => {
    if (baseCurrency && !form.formState.isDirty) {
      form.setValue("currency", baseCurrency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);

  const watchCurrency = form.watch("currency");

  // A client's own default currency (clients.currency) is a reasonable
  // starting point when they're selected — e.g. a South Sudan client set up
  // with currency=USD — but the user can still override it per invoice.
  const handleClientChange = (clientId: string) => {
    form.setValue("client_id", clientId);
    const client = clients?.find((c) => c.id === clientId);
    if (client?.currency && !form.formState.dirtyFields.currency) {
      form.setValue("currency", client.currency);
      if (client.currency === baseCurrency) form.setValue("exchange_rate", 1.0);
    }
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  if (!mounted) return null;

  const watchItems = form.watch("items");

  const calculateTotals = () => {
    let subtotal = 0;
    let tax_total = 0;

    watchItems.forEach((item) => {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      subtotal += lineTotal;

      if (item.tax_rate_id && taxRates) {
        const taxRate = taxRates.find(r => r.id === item.tax_rate_id);
        if (taxRate) {
          tax_total += lineTotal * (Number(taxRate.rate) / 100);
        }
      }
    });

    return {
      subtotal,
      tax_total,
      grand_total: subtotal + tax_total,
    };
  };

  const totals = calculateTotals();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const missingFields = [
        !currentOrg?.contact_email && "invoice contact email",
        !currentOrg?.address_line1 && "business address",
        !baseCurrency && "base currency",
      ].filter(Boolean) as string[];
      if (missingFields.length > 0) {
        setSetupPrompt(`Complete your ${missingFields.join(", ")} before creating an invoice.`);
        return;
      }
      setSetupPrompt(null);
      const currency = values.currency;

      const invoiceItems = values.items.map(item => {
        const lineTotal = item.quantity * item.unit_price;
        let taxAmount = 0;
        if (item.tax_rate_id && taxRates) {
          const taxRate = taxRates.find(r => r.id === item.tax_rate_id);
          if (taxRate) {
            taxAmount = lineTotal * (Number(taxRate.rate) / 100);
          }
        }

        return {
          description: item.description,
          quantity: item.quantity,
          // Minor units depend on the invoice's currency, not always cents —
          // UGX stores whole shillings (0 decimal digits), USD/SSP store cents.
          unit_price: toMinorUnits(item.unit_price, currency),
          tax_rate_id: item.tax_rate_id || undefined,
          total: toMinorUnits(lineTotal + taxAmount, currency),
        };
      });

      const grandTotalMinor = toMinorUnits(totals.grand_total, currency);

      await createInvoice.mutateAsync({
        invoice: {
          org_id: orgId,
          client_id: values.client_id,
          invoice_number: values.invoice_number,
          issue_date: values.issue_date,
          due_date: values.due_date,
          status: "draft",
          subtotal: toMinorUnits(totals.subtotal, currency),
          tax_total: toMinorUnits(totals.tax_total, currency),
          discount_total: 0,
          grand_total: grandTotalMinor,
          currency,
          exchange_rate: currency === baseCurrency ? 1.0 : values.exchange_rate,
          notes: values.notes,
          payment_terms: values.payment_terms,
        },
        items: invoiceItems,
      });

      posthog.capture("invoice_created", {
        item_count: invoiceItems.length,
        currency,
        grand_total: grandTotalMinor,
      });
      toast.success("Invoice created successfully");
      form.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create invoice";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {setupPrompt && (
          <div role="alert" className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
            <p>{setupPrompt}</p>
            <Link href="/settings" className="mt-1 inline-block font-semibold underline-offset-4 hover:underline">Open organisation settings</Link>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={handleClientChange} defaultValue={field.value}>
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
            name="invoice_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Number</FormLabel>
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
            name="issue_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === baseCurrency) form.setValue("exchange_rate", 1.0);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INVOICE_CURRENCIES.map((code) => (
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
          {watchCurrency !== baseCurrency && (
            <FormField
              control={form.control}
              name="exchange_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange rate (1 {watchCurrency} = ? {baseCurrency})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unit_price: 0, tax_rate_id: "" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-start sm:border-0 sm:p-0"
              >
                <div className="col-span-2 sm:col-span-5">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Item description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Qty"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.tax_rate_id`}
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Tax" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {taxRates?.map((tax) => (
                              <SelectItem key={tax.id} value={tax.id}>
                                {tax.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    <span className="sr-only">Remove item</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 pt-6 border-t sm:grid-cols-2">
          <div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Payment instructions, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-col space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono">UGX {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Tax:</span>
              <span className="font-mono">UGX {totals.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1 text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-axis-blue font-mono">UGX {totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full bg-axis-blue hover:bg-axis-blue-light" disabled={createInvoice.isPending}>
          {createInvoice.isPending ? "Creating Invoice..." : "Create Invoice"}
        </Button>
      </form>
    </Form>
  );
}
