"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useDeliveryForm } from "@/hooks/delivery-forms/use-delivery-forms";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { JobOrderStatusBadge } from "@/components/job-orders/JobOrderStatusBadge";
import { ArrowLeft, Truck, AlertTriangle, Mail, Phone } from "lucide-react";
import { formatShortDate } from "@/lib/format-date";

interface DeliveryFormDetailProps {
  deliveryFormId: string;
}

export function DeliveryFormDetail({ deliveryFormId }: DeliveryFormDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: deliveryForm, isLoading, isError, refetch } = useDeliveryForm(orgId, deliveryFormId);

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
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this delivery form</h3>
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

  if (!deliveryForm) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Truck className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Delivery form not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This delivery form may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/delivery-forms">Back to Delivery Forms</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/delivery-forms">
            <ArrowLeft className="size-4" />
            Back to Delivery Forms
          </Link>
        </Button>
      </div>

      <PageHeader
        title={deliveryForm.delivery_number}
        description={`Delivered ${formatShortDate(deliveryForm.delivery_date)}${deliveryForm.recipient_name ? ` · Received by ${deliveryForm.recipient_name}` : ""}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Job orders on this delivery</h2>
          <div className="mt-4 overflow-x-auto">
            <Table aria-label="Delivery form job orders">
              <TableHeader>
                <TableRow>
                  <TableHead>Job Order #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qty Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryForm.items && deliveryForm.items.length > 0 ? (
                  deliveryForm.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="numeric font-medium">
                        {item.job_order ? (
                          <Link href={`/job-orders/${item.job_order.id}`} className="hover:text-primary hover:underline">
                            {item.job_order.job_order_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {item.job_order?.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {item.job_order?.status ? <JobOrderStatusBadge status={item.job_order.status} /> : "—"}
                      </TableCell>
                      <TableCell className="numeric text-right">{item.quantity_delivered}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No job orders on this delivery form.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {deliveryForm.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{deliveryForm.notes}</p>
            </div>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Client</h2>
          {deliveryForm.client ? (
            <div className="mt-3 space-y-2">
              <p className="font-medium text-foreground">{deliveryForm.client.name}</p>
              {deliveryForm.client.company_name && (
                <p className="text-sm text-muted-foreground">{deliveryForm.client.company_name}</p>
              )}
              {deliveryForm.client.email && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5" /> {deliveryForm.client.email}
                </div>
              )}
              {deliveryForm.client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5" /> {deliveryForm.client.phone}
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href={`/clients`}>View client</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No client on record for this delivery form.</p>
          )}
        </section>
      </div>
    </>
  );
}
