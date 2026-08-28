"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateItem, useUpdateItem } from "@/hooks/items/use-items";
import { useOrg } from "@/hooks/use-org";
import { toMajorUnits, toMinorUnits } from "@/lib/currency";
import { Item } from "@/lib/types";

const formSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  status: z.enum(["active", "inactive", "archived"]),
  current_quantity: z.coerce.number().int().nonnegative(),
  reorder_level: z.coerce.number().int().nonnegative(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  location: z.string().optional(),
  can_sell: z.boolean(),
  can_custody: z.boolean(),
}).refine((data) => data.can_sell || data.can_custody, {
  message: "Item must be sellable, custody-eligible, or both",
  path: ["can_sell"],
});

interface ItemFormProps {
  orgId: string;
  item?: Item;
  onSuccess?: () => void;
}

export function ItemForm({ orgId, item, onSuccess }: ItemFormProps) {
  const { currentOrg } = useOrg();
  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const createItem = useCreateItem();
  const updateItem = useUpdateItem(orgId);
  const isEditing = !!item;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: item?.sku ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
      category: item?.category ?? "general",
      unit: item?.unit ?? "unit",
      status: item?.status ?? "active",
      current_quantity: item?.current_quantity ?? 0,
      reorder_level: item?.reorder_level ?? 0,
      cost_price: item ? toMajorUnits(item.cost_price, baseCurrency) : 0,
      selling_price: item ? toMajorUnits(item.selling_price, baseCurrency) : 0,
      location: item?.location ?? "",
      can_sell: item?.can_sell ?? true,
      can_custody: item?.can_custody ?? false,
    },
  });

  useEffect(() => {
    form.reset({
      sku: item?.sku ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
      category: item?.category ?? "general",
      unit: item?.unit ?? "unit",
      status: item?.status ?? "active",
      current_quantity: item?.current_quantity ?? 0,
      reorder_level: item?.reorder_level ?? 0,
      cost_price: item ? toMajorUnits(item.cost_price, baseCurrency) : 0,
      selling_price: item ? toMajorUnits(item.selling_price, baseCurrency) : 0,
      location: item?.location ?? "",
      can_sell: item?.can_sell ?? true,
      can_custody: item?.can_custody ?? false,
    });
  }, [item, form]);

  if (!mounted) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const cost_price_cents = toMinorUnits(values.cost_price, baseCurrency);
      const selling_price_cents = toMinorUnits(values.selling_price, baseCurrency);
      if (isEditing && item) {
        await updateItem.mutateAsync({
          id: item.id,
          updates: {
            sku: values.sku || undefined,
            name: values.name,
            description: values.description || undefined,
            category: values.category,
            unit: values.unit,
            status: values.status,
            current_quantity: values.current_quantity,
            reorder_level: values.reorder_level,
            cost_price: cost_price_cents,
            selling_price: selling_price_cents,
            location: values.location || undefined,
            can_sell: values.can_sell,
            can_custody: values.can_custody,
          },
        });
      } else {
        await createItem.mutateAsync({
          org_id: orgId,
          sku: values.sku || undefined,
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          unit: values.unit,
          status: values.status,
          current_quantity: values.current_quantity,
          reorder_level: values.reorder_level,
          cost_price: cost_price_cents,
          selling_price: selling_price_cents,
          location: values.location || undefined,
          can_sell: values.can_sell,
          can_custody: values.can_custody,
          metadata: {},
        });
        form.reset();
      }
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} item`;
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Printer Paper" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="consumable">Consumable</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. box, pcs, kg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="current_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>On Hand</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reorder_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Level</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="cost_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
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
            name="selling_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="can_sell"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-0.5 leading-none">
                  <FormLabel className="font-normal">Sellable</FormLabel>
                  <p className="text-xs text-muted-foreground">Available for quick sale and invoicing</p>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="can_custody"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-0.5 leading-none">
                  <FormLabel className="font-normal">Custody-eligible</FormLabel>
                  <p className="text-xs text-muted-foreground">Can be issued to staff and tracked in Custody</p>
                </div>
              </FormItem>
            )}
          />
          {form.formState.errors.can_sell && (
            <p className="text-sm font-medium text-destructive sm:col-span-2">
              {form.formState.errors.can_sell.message}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={createItem.isPending || updateItem.isPending}>
          {isEditing
            ? updateItem.isPending
              ? "Saving changes..."
              : "Save changes"
            : createItem.isPending
              ? "Creating item..."
              : "Create item"}
        </Button>
      </form>
    </Form>
  );
}
