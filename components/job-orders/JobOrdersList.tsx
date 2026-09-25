"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useJobOrders, useJobOrderStatuses } from "@/hooks/job-orders/use-job-orders";
import { useOrg } from "@/hooks/use-org";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JobOrderForm } from "@/components/job-orders/JobOrderForm";
import { JobOrderActions } from "@/components/job-orders/JobOrderActions";
import { JobOrderStatusBadge } from "@/components/job-orders/JobOrderStatusBadge";
import { ActionTooltip } from "@/components/shared/ActionTooltip";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { formatShortDate } from "@/lib/format-date";
import { useCanEdit } from "@/hooks/use-feature-flag";

export function JobOrdersList() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { currentOrg } = useOrg();
  const canEdit = useCanEdit();
  const orgId = currentOrg?.id || "";
  const { data: jobOrders, isLoading, isError, refetch } = useJobOrders(orgId);
  const { data: statuses } = useJobOrderStatuses(orgId);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredJobOrders = useMemo(() => {
    if (!jobOrders) return [];

    let next = jobOrders;
    if (statusFilter !== "all") {
      next = next.filter((jobOrder) => jobOrder.status_id === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return next;

    return next.filter((jobOrder) => {
      return (
        jobOrder.job_order_number.toLowerCase().includes(q) ||
        (jobOrder.client?.name ?? "").toLowerCase().includes(q) ||
        jobOrder.description.toLowerCase().includes(q)
      );
    });
  }, [jobOrders, search, statusFilter]);

  const totals = useMemo(() => {
    const list = jobOrders ?? [];
    const activeStatusIds = new Set((statuses ?? []).filter((s) => !s.is_terminal).map((s) => s.id));
    return {
      total: list.length,
      active: list.filter((jo) => activeStatusIds.has(jo.status_id)).length,
      overdue: list.filter((jo) => jo.due_date && new Date(jo.due_date) < new Date() && !jo.status?.is_terminal).length,
    };
  }, [jobOrders, statuses]);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Job Orders"
        description="Internal production and fulfillment tracking, from creation through delivery."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <ActionTooltip label="Create a new job order">
              <DialogTrigger asChild>
                <Button aria-label="Create Job Order" disabled={!canEdit}>
                  <Plus className="size-4" />
                  Create Job Order
                </Button>
              </DialogTrigger>
            </ActionTooltip>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Job Order</DialogTitle>
                <DialogDescription>
                  Job orders can be created directly, or from an accepted quotation.
                </DialogDescription>
              </DialogHeader>
              {currentOrg ? (
                <JobOrderForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before creating a job order.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <SummaryBar
          stats={[
            { label: "Total job orders", value: isLoading ? "—" : totals.total.toString(), icon: <Package className="size-4" /> },
            { label: "Active", value: isLoading ? "—" : totals.active.toString(), icon: <Package className="size-4" />, tone: "success" },
            { label: "Overdue", value: isLoading ? "—" : totals.overdue.toString(), icon: <AlertTriangle className="size-4" />, tone: totals.overdue > 0 ? "destructive" : "default" },
          ]}
          isLoading={isLoading}
        />

        <div className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative ml-0 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search job orders…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              {statuses?.map((status) => (
                <Button
                  key={status.id}
                  type="button"
                  variant={statusFilter === status.id ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setStatusFilter(status.id)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          <Table aria-label="Job orders list">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Job Order #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-destructive-soft p-3">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this data</h3>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Something went wrong while fetching this from the server. Please try again.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredJobOrders.length > 0 ? (
                filteredJobOrders.map((jobOrder) => (
                  <TableRow key={jobOrder.id}>
                    <TableCell className="numeric font-medium">
                      <Link href={`/job-orders/${jobOrder.id}`} className="hover:text-primary hover:underline">
                        {jobOrder.job_order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{jobOrder.client?.name || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{jobOrder.description}</TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {jobOrder.due_date ? formatShortDate(jobOrder.due_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <JobOrderStatusBadge status={jobOrder.status} />
                    </TableCell>
                    <TableCell>
                      {currentOrg && <JobOrderActions orgId={currentOrg.id} jobOrder={jobOrder} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-12 w-12 text-muted-foreground opacity-20" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {search ? "No job orders match your search." : "No job orders yet"}
                      </h3>
                      {!search && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Get started by creating your first job order.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsFormOpen(true)}
                          >
                            <Plus className="size-4" />
                            Create Job Order
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {jobOrders && jobOrders.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Showing {jobOrders.length} of {jobOrders.length} job orders</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
