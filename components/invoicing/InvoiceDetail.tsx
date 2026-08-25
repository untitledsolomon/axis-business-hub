"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useInvoice } from "@/hooks/invoicing/use-invoices";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InvoiceActions } from "@/components/invoicing/InvoiceActions";
import { ArrowLeft, Receipt, AlertTriangle, Mail, Phone } from "lucide-react";
import { formatShortDate } from "@/lib/format-date";

function fmtMoney(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

interface InvoiceDetailProps {
  invoiceId: string;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: invoice, isLoading, isError, refetch } = useInvoice(orgId, invoiceId);

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
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this invoice</h3>
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

  if (!invoice) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Invoice not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This invoice may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/invoices">
            <ArrowLeft className="size-4" />
            Back to Invoices
          </Link>
        </Button>
      </div>

      <PageHeader
        title={invoice.invoice_number}
        description={`Issued ${formatShortDate(invoice.issue_date)} · Due ${formatShortDate(invoice.due_date)}`}
        actions={<InvoiceActions orgId={orgId} invoice={invoice} showViewDetails={false} />}
      />

      <div className="space-y-4">
        <div>
          <StatusBadge status={invoice.status} />
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Invoice total</p><p className="numeric mt-1 text-xl font-semibold text-foreground">{fmtMoney(invoice.grand_total, invoice.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{fmtMoney(invoice.subtotal, invoice.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Tax</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{fmtMoney(invoice.tax_total, invoice.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Line items</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{invoice.items?.length ?? 0}</p></div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="panel p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-foreground">Line items</h2>
            <div className="mt-4 overflow-x-auto">
              <Table aria-label="Invoice line items">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="numeric text-right">{item.quantity}</TableCell>
                        <TableCell className="numeric text-right">
                          {fmtMoney(item.unit_price, invoice.currency)}
                        </TableCell>
                        <TableCell className="numeric text-right font-medium">
                          {fmtMoney(item.total, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No line items on this invoice.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="numeric">{fmtMoney(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.discount_total > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="numeric">−{fmtMoney(invoice.discount_total, invoice.currency)}</span>
                </div>
              )}
              {invoice.tax_total > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="numeric">{fmtMoney(invoice.tax_total, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>Total</span>
                <span className="numeric">{fmtMoney(invoice.grand_total, invoice.currency)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{invoice.notes}</p>
              </div>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Client</h2>
            {invoice.client ? (
              <div className="mt-3 space-y-2">
                <p className="font-medium text-foreground">{invoice.client.name}</p>
                {invoice.client.company_name && (
                  <p className="text-sm text-muted-foreground">{invoice.client.company_name}</p>
                )}
                {invoice.client.email && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5" /> {invoice.client.email}
                  </div>
                )}
                {invoice.client.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" /> {invoice.client.phone}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link href={`/clients`}>View client</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No client on record for this invoice.</p>
            )}

            {invoice.payment_terms && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payment terms
                </p>
                <p className="mt-1 text-sm text-foreground">{invoice.payment_terms}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
