"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeliveryForms } from "@/hooks/delivery-forms/use-delivery-forms";
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
import { Plus, Search, Truck, AlertTriangle } from "lucide-react";
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
import { DeliveryForm } from "@/components/delivery-forms/DeliveryForm";
import { ActionTooltip } from "@/components/shared/ActionTooltip";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatShortDate } from "@/lib/format-date";
import { useCanEdit } from "@/hooks/use-feature-flag";

export function DeliveryFormsList() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const { currentOrg } = useOrg();
  const canEdit = useCanEdit();
  const orgId = currentOrg?.id || "";
  const { data: deliveryForms, isLoading, isError, refetch } = useDeliveryForms(orgId);
  const searchParams = useSearchParams();
  const prefillJobOrderId = searchParams.get("job_order") ?? undefined;
  const [isFormOpen, setIsFormOpen] = useState(!!prefillJobOrderId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredDeliveryForms = useMemo(() => {
    if (!deliveryForms) return [];

    const q = search.trim().toLowerCase();
    if (!q) return deliveryForms;

    return deliveryForms.filter((deliveryForm) => {
      return (
        deliveryForm.delivery_number.toLowerCase().includes(q) ||
        (deliveryForm.client?.name ?? "").toLowerCase().includes(q) ||
        (deliveryForm.recipient_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [deliveryForms, search]);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Delivery Forms"
        description="Record what's been picked up or delivered, across one or more job orders."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <ActionTooltip label="Create a new delivery form">
              <DialogTrigger asChild>
                <Button aria-label="Create Delivery Form" disabled={!canEdit}>
                  <Plus className="size-4" />
                  Create Delivery Form
                </Button>
              </DialogTrigger>
            </ActionTooltip>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Delivery Form</DialogTitle>
                <DialogDescription>
                  A client can pick up multiple job orders together, or one job order can be delivered in batches.
                </DialogDescription>
              </DialogHeader>
              {currentOrg ? (
                <DeliveryForm orgId={currentOrg.id} fromJobOrderId={prefillJobOrderId} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before creating a delivery form.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <div className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative ml-0 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search delivery forms…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Table aria-label="Delivery forms list">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Delivery #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="text-right">Job Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
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
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-10" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDeliveryForms.length > 0 ? (
                filteredDeliveryForms.map((deliveryForm) => (
                  <TableRow key={deliveryForm.id}>
                    <TableCell className="numeric font-medium">
                      <Link href={`/delivery-forms/${deliveryForm.id}`} className="hover:text-primary hover:underline">
                        {deliveryForm.delivery_number}
                      </Link>
                    </TableCell>
                    <TableCell>{deliveryForm.client?.name || "—"}</TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {deliveryForm.delivery_date ? formatShortDate(deliveryForm.delivery_date) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{deliveryForm.recipient_name || "—"}</TableCell>
                    <TableCell className="numeric text-right">{deliveryForm.items?.length ?? 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="h-12 w-12 text-muted-foreground opacity-20" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {search ? "No delivery forms match your search." : "No delivery forms yet"}
                      </h3>
                      {!search && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Get started by creating your first delivery form.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsFormOpen(true)}
                          >
                            <Plus className="size-4" />
                            Create Delivery Form
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {deliveryForms && deliveryForms.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Showing {deliveryForms.length} of {deliveryForms.length} delivery forms</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
