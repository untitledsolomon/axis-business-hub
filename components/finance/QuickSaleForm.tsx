"use client";

import { useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccounts } from "@/hooks/finance/use-finance";
import { useCreateDailySale, useCreateItemSale } from "@/hooks/finance/use-daily-sales";
import { useItems } from "@/hooks/items/use-items";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Account } from "@/lib/types";
import { formatMoney, toMajorUnits, toMinorUnits } from "@/lib/currency";
import { useOrg } from "@/hooks/use-org";

const freeTextSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().min(1, "Description is required"),
  sale_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "bank", "mobile_money"]),
  received_into_account_id: z.string().min(1, "Select where this was received into"),
  revenue_account_id: z.string().min(1, "Select a revenue account"),
});

const itemSaleSchema = z.object({
  item_id: z.string().min(1, "Select an item"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unit_sale_price: z.coerce.number().min(0, "Price can't be negative"),
  description: z.string().optional(),
  sale_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "bank", "mobile_money"]),
  received_into_account_id: z.string().min(1, "Select where this was received into"),
  revenue_account_id: z.string().min(1, "Select a revenue account"),
});

type FreeTextValues = z.infer<typeof freeTextSchema>;
type ItemSaleValues = z.infer<typeof itemSaleSchema>;

interface QuickSaleFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function QuickSaleForm({ orgId, onSuccess }: QuickSaleFormProps) {
  const { currentOrg } = useOrg();
  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const fmt = (minorAmount: number) => formatMoney(minorAmount, baseCurrency);
  const [mode, setMode] = useState<"item" | "freeform">("item");
  const { data: accounts } = useAccounts(orgId);
  const { data: items = [] } = useItems(orgId);
  const createDailySale = useCreateDailySale(orgId);
  const createItemSale = useCreateItemSale(orgId);

  const cashBankAccounts = (accounts ?? []).filter((a: Account) => a.category === "asset");
  const revenueAccounts = (accounts ?? []).filter((a: Account) => a.category === "revenue");
  const sellableItems = useMemo(
    () => items.filter((item) => item.can_sell && item.status === "active"),
    [items]
  );

  const freeTextForm = useForm<FreeTextValues>({
    resolver: zodResolver(freeTextSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      sale_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      received_into_account_id: "",
      revenue_account_id: "",
    },
  });

  const itemForm = useForm<ItemSaleValues>({
    resolver: zodResolver(itemSaleSchema),
    defaultValues: {
      item_id: "",
      quantity: 1,
      unit_sale_price: 0,
      description: "",
      sale_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      received_into_account_id: "",
      revenue_account_id: "",
    },
  });

  const selectedItemId = itemForm.watch("item_id");
  const selectedItem = sellableItems.find((i) => i.id === selectedItemId);
  const quantity = itemForm.watch("quantity") || 0;
  const unitSalePriceMajor = itemForm.watch("unit_sale_price") || 0;
  const unitSalePriceMinor = toMinorUnits(unitSalePriceMajor, baseCurrency);
  const listPriceMinor = selectedItem?.selling_price ?? 0;
  const discountPerUnit = Math.max(listPriceMinor - unitSalePriceMinor, 0);
  const totalDiscount = discountPerUnit * quantity;
  const discountPct = listPriceMinor > 0 ? (discountPerUnit / listPriceMinor) * 100 : 0;
  const total = unitSalePriceMinor * quantity;

  function handleSelectItem(itemId: string) {
    itemForm.setValue("item_id", itemId);
    const item = sellableItems.find((i) => i.id === itemId);
    if (item) {
      itemForm.setValue("unit_sale_price", toMajorUnits(item.selling_price, baseCurrency));
    }
  }

  async function onSubmitItemSale(values: ItemSaleValues) {
    try {
      await createItemSale.mutateAsync({
        item_id: values.item_id,
        quantity: values.quantity,
        unit_sale_price: toMinorUnits(values.unit_sale_price, baseCurrency),
        sale_date: values.sale_date,
        payment_method: values.payment_method,
        revenue_account_id: values.revenue_account_id,
        received_into_account_id: values.received_into_account_id,
        description: values.description,
      });
      posthog.capture("item_sale_logged", { quantity: values.quantity, discount_pct: discountPct });
      itemForm.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log sale";
      toast.error(message);
    }
  }

  async function onSubmitFreeText(values: FreeTextValues) {
    try {
      await createDailySale.mutateAsync({
        sale_date: values.sale_date,
        description: values.description,
        amount: toMinorUnits(values.amount, baseCurrency),
        payment_method: values.payment_method,
        revenue_account_id: values.revenue_account_id,
        received_into_account_id: values.received_into_account_id,
      });
      posthog.capture("daily_sale_logged", {});
      freeTextForm.reset();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log sale";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "item" | "freeform")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="item">Sell an item</TabsTrigger>
          <TabsTrigger value="freeform">Other sale</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "item" ? (
        <Form {...itemForm}>
          <form onSubmit={itemForm.handleSubmit(onSubmitItemSale)} className="space-y-4">
            <FormField
              control={itemForm.control}
              name="item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select onValueChange={handleSelectItem} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={sellableItems.length ? "Select item" : "No sellable items"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sellableItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} — {item.current_quantity} in stock
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedItem && (
              <p className="text-xs text-muted-foreground">
                List price {fmt(selectedItem.selling_price)} · {selectedItem.current_quantity} {selectedItem.unit}(s) available
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={itemForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={selectedItem?.current_quantity}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="unit_sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per unit (UGX)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedItem && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="numeric font-mono font-semibold text-foreground">{fmt(total)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Discount given</span>
                    <span className="numeric font-mono font-medium text-warning">
                      {fmt(totalDiscount)} ({discountPct.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={itemForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Sold with discount for bulk order" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={itemForm.control}
                name="sale_date"
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
                control={itemForm.control}
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
            </div>

            <FormField
              control={itemForm.control}
              name="received_into_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Received into</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cashBankAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={itemForm.control}
              name="revenue_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue account (Chart of Accounts)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {revenueAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-axis-blue hover:bg-axis-blue-light"
              disabled={createItemSale.isPending || sellableItems.length === 0}
            >
              {createItemSale.isPending ? "Logging…" : "Log Sale"}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...freeTextForm}>
          <form onSubmit={freeTextForm.handleSubmit(onSubmitFreeText)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={freeTextForm.control}
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
                control={freeTextForm.control}
                name="sale_date"
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
              control={freeTextForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Sticker + A4 printing, walk-ins" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={freeTextForm.control}
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
                control={freeTextForm.control}
                name="received_into_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received into</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cashBankAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={freeTextForm.control}
              name="revenue_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue account (Chart of Accounts)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {revenueAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-axis-blue hover:bg-axis-blue-light"
              disabled={createDailySale.isPending}
            >
              {createDailySale.isPending ? "Logging…" : "Log Sale"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
