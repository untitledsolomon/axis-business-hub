"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuotation } from "@/hooks/quotations/use-quotations";
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
import { QuotationActions } from "@/components/quotations/QuotationActions";
import { ArrowLeft, FileText, AlertTriangle, Mail, Phone } from "lucide-react";
import { formatShortDate } from "@/lib/format-date";
import { formatMoney as fmtMoney } from "@/lib/currency";

interface QuotationDetailProps {
  quotationId: string;
}

export function QuotationDetail({ quotationId }: QuotationDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: quotation, isLoading, isError, refetch } = useQuotation(orgId, quotationId);

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
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this quotation</h3>
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

  if (!quotation) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Quotation not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This quotation may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/quotations">Back to Quotations</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/quotations">
            <ArrowLeft className="size-4" />
            Back to Quotations
          </Link>
        </Button>
      </div>

      <PageHeader
        title={quotation.quotation_number}
        description={`Issued ${formatShortDate(quotation.issue_date)}${quotation.expiry_date ? ` · Valid until ${formatShortDate(quotation.expiry_date)}` : ""}`}
        actions={<QuotationActions orgId={orgId} quotation={quotation} showViewDetails={false} />}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={quotation.status} />
          {quotation.converted_invoice_id && (
            <Link href={`/invoices/${quotation.converted_invoice_id}`} className="text-xs text-primary hover:underline">
              View converted invoice →
            </Link>
          )}
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Quotation total</p><p className="numeric mt-1 text-xl font-semibold text-foreground">{fmtMoney(quotation.grand_total, quotation.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{fmtMoney(quotation.subtotal, quotation.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Tax</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{fmtMoney(quotation.tax_total, quotation.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Line items</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{quotation.items?.length ?? 0}</p></div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="panel p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-foreground">Line items</h2>
            <div className="mt-4 overflow-x-auto">
              <Table aria-label="Quotation line items">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items && quotation.items.length > 0 ? (
                    quotation.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="numeric text-right">{item.quantity}</TableCell>
                        <TableCell className="numeric text-right">
                          {fmtMoney(item.unit_price, quotation.currency)}
                        </TableCell>
                        <TableCell className="numeric text-right font-medium">
                          {fmtMoney(item.total, quotation.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No line items on this quotation.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="numeric">{fmtMoney(quotation.subtotal, quotation.currency)}</span>
              </div>
              {quotation.discount_total > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="numeric">−{fmtMoney(quotation.discount_total, quotation.currency)}</span>
                </div>
              )}
              {quotation.tax_total > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="numeric">{fmtMoney(quotation.tax_total, quotation.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>Total</span>
                <span className="numeric">{fmtMoney(quotation.grand_total, quotation.currency)}</span>
              </div>
            </div>

            {quotation.terms && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Terms</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{quotation.terms}</p>
              </div>
            )}

            {quotation.notes && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{quotation.notes}</p>
              </div>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Client</h2>
            {quotation.client ? (
              <div className="mt-3 space-y-2">
                <p className="font-medium text-foreground">{quotation.client.name}</p>
                {quotation.client.company_name && (
                  <p className="text-sm text-muted-foreground">{quotation.client.company_name}</p>
                )}
                {quotation.client.email && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5" /> {quotation.client.email}
                  </div>
                )}
                {quotation.client.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" /> {quotation.client.phone}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link href={`/clients`}>View client</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No client on record for this quotation.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
