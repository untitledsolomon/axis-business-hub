"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useJobOrder, useJobOrderCostTypes, useAddJobOrderCost, useDeleteJobOrderCost } from "@/hooks/job-orders/use-job-orders";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { JobOrderStatusBadge } from "@/components/job-orders/JobOrderStatusBadge";
import { JobOrderActions } from "@/components/job-orders/JobOrderActions";
import { ArrowLeft, Package, AlertTriangle, Mail, Phone, Lock, Trash2, Plus } from "lucide-react";
import { formatShortDate } from "@/lib/format-date";
import { formatMoney as fmtMoney, toMinorUnits } from "@/lib/currency";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { toast } from "sonner";

interface JobOrderDetailProps {
  jobOrderId: string;
}

export function JobOrderDetail({ jobOrderId }: JobOrderDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";
  const hasCosting = useFeatureFlag("job_costing");

  const { data: jobOrder, isLoading, isError, refetch } = useJobOrder(orgId, jobOrderId);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isError) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <div className="rounded-full bg-destructive-soft p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this job order</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching this from the server. Please try again.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!jobOrder) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Job order not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This job order may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/job-orders">Back to Job Orders</Link>
        </Button>
      </div>
    );
  }

  const totalCost = (jobOrder.costs ?? []).reduce((sum, c) => sum + c.amount, 0);
  const margin = jobOrder.amount_paid - totalCost;

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/job-orders">
            <ArrowLeft className="size-4" />
            Back to Job Orders
          </Link>
        </Button>
      </div>

      <PageHeader
        title={jobOrder.job_order_number}
        description={jobOrder.due_date ? `Due ${formatShortDate(jobOrder.due_date)}` : "No due date set"}
        actions={<JobOrderActions orgId={orgId} jobOrder={jobOrder} showViewDetails={false} />}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <JobOrderStatusBadge status={jobOrder.status} />
          {jobOrder.quotation && (
            <Link href={`/quotations/${jobOrder.quotation.id}`} className="text-xs text-primary hover:underline">
              From quotation {jobOrder.quotation.quotation_number} →
            </Link>
          )}
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Quantity</p><p className="numeric mt-1 text-xl font-semibold text-foreground">{jobOrder.quantity}</p></div>
          <div><p className="text-xs text-muted-foreground">Amount paid</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{fmtMoney(jobOrder.amount_paid, jobOrder.currency)}</p></div>
          {hasCosting ? (
            <>
              <div><p className="text-xs text-muted-foreground">Total cost</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{fmtMoney(totalCost, jobOrder.currency)}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className={`numeric mt-1 text-lg font-semibold ${margin < 0 ? "text-destructive" : "text-foreground"}`}>
                  {fmtMoney(margin, jobOrder.currency)}
                </p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <Lock className="size-3.5 shrink-0" />
              Cost tracking and margin calculation are available on the Pro and Advanced plans.
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="panel p-5 lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{jobOrder.description}</p>
            </div>

            {jobOrder.notes && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{jobOrder.notes}</p>
              </div>
            )}

            {hasCosting && (
              <div className="border-t border-border pt-4">
                <JobOrderCosts orgId={orgId} jobOrder={jobOrder} />
              </div>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Client</h2>
            {jobOrder.client ? (
              <div className="mt-3 space-y-2">
                <p className="font-medium text-foreground">{jobOrder.client.name}</p>
                {jobOrder.client.company_name && (
                  <p className="text-sm text-muted-foreground">{jobOrder.client.company_name}</p>
                )}
                {jobOrder.client.email && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5" /> {jobOrder.client.email}
                  </div>
                )}
                {jobOrder.client.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" /> {jobOrder.client.phone}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link href={`/clients`}>View client</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No client on record for this job order.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

const costSchema = z.object({
  cost_type_id: z.string().min(1, "Cost type is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  notes: z.string().optional(),
});

function JobOrderCosts({ orgId, jobOrder }: { orgId: string; jobOrder: NonNullable<ReturnType<typeof useJobOrder>["data"]> }) {
  const { data: costTypes } = useJobOrderCostTypes(orgId);
  const addCost = useAddJobOrderCost(orgId);
  const deleteCost = useDeleteJobOrderCost(orgId, jobOrder.id);

  const form = useForm<z.infer<typeof costSchema>>({
    resolver: zodResolver(costSchema),
    defaultValues: { cost_type_id: "", amount: 0, notes: "" },
  });

  async function onSubmit(values: z.infer<typeof costSchema>) {
    try {
      await addCost.mutateAsync({
        org_id: orgId,
        job_order_id: jobOrder.id,
        cost_type_id: values.cost_type_id,
        amount: toMinorUnits(values.amount, jobOrder.currency),
        notes: values.notes || undefined,
      });
      form.reset({ cost_type_id: "", amount: 0, notes: "" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add cost";
      toast.error(message);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Costs</h2>

      {!costTypes || costTypes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No cost types configured yet. Add cost types (e.g. materials, labour) in Settings to start tracking margin.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <Table aria-label="Job order costs">
              <TableHeader>
                <TableRow>
                  <TableHead>Cost type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrder.costs && jobOrder.costs.length > 0 ? (
                  jobOrder.costs.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>{cost.cost_type?.label ?? "—"}</TableCell>
                      <TableCell className="numeric text-right">{fmtMoney(cost.amount, jobOrder.currency)}</TableCell>
                      <TableCell className="text-muted-foreground">{cost.notes || "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-axis-red"
                          onClick={() => deleteCost.mutateAsync({ id: cost.id })}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove cost</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No costs recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start">
              <FormField
                control={form.control}
                name="cost_type_id"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Cost type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costTypes.map((ct) => (
                          <SelectItem key={ct.id} value={ct.id}>
                            {ct.label}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Notes (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" disabled={addCost.isPending}>
                <Plus className="size-4" /> Add
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
