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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateItem, useUpdateItem } from "@/hooks/items/use-items";
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
  cost_price: z.coerce.number().int().nonnegative(),
  selling_price: z.coerce.number().int().nonnegative(),
  location: z.string().optional(),
});

interface ItemFormProps {
  orgId: string;
  item?: Item;
  onSuccess?: () => void;
}

export function ItemForm({ orgId, item, onSuccess }: ItemFormProps) {
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
      cost_price: item?.cost_price ?? 0,
      selling_price: item?.selling_price ?? 0,
      location: item?.location ?? "",
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
      cost_price: item?.cost_price ?? 0,
      selling_price: item?.selling_price ?? 0,
      location: item?.location ?? "",
    });
  }, [item, form]);

  if (!mounted) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
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
            cost_price: values.cost_price,
            selling_price: values.selling_price,
            location: values.location || undefined,
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
          cost_price: values.cost_price,
          selling_price: values.selling_price,
          location: values.location || undefined,
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
                <FormLabel>Cost Price (cents)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
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
                <FormLabel>Selling Price (cents)</FormLabel>
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
