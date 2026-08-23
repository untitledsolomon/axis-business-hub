"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordItemMovement } from "@/hooks/items/use-items";
import { Item } from "@/lib/types";

const formSchema = z.object({
  movement_type: z.enum(["purchase", "sale", "adjustment", "issue", "return", "transfer"]),
  quantity_change: z.coerce.number().int(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  unit_cost: z.coerce.number().int().nonnegative().optional(),
});

interface StockAdjustmentDialogProps {
  item: Item;
  orgId: string;
  trigger?: React.ReactNode;
}

export function StockAdjustmentDialog({ item, orgId, trigger }: StockAdjustmentDialogProps) {
  const [open, setOpen] = useState(false);
  const recordItemMovement = useRecordItemMovement(orgId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      movement_type: "adjustment",
      quantity_change: 0,
      reference: "",
      notes: "",
      unit_cost: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await recordItemMovement.mutateAsync({
      item_id: item.id,
      quantity_change: values.quantity_change,
      movement_type: values.movement_type,
      reference: values.reference || undefined,
      notes: values.notes || undefined,
      unit_cost: values.unit_cost,
    });
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline" size="sm">Adjust Stock</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust {item.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select movement" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity_change"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity change</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit cost (cents)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={recordItemMovement.isPending}>
              {recordItemMovement.isPending ? "Updating stock..." : "Apply adjustment"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
