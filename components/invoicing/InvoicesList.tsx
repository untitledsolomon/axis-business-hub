"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
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
import { Plus, Search, Filter, Receipt, CheckCircle, FileDown, AlertTriangle } from "lucide-react";
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
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";
import { InvoiceActions } from "@/components/invoicing/InvoiceActions";
import { ActionTooltip } from "@/components/shared/ActionTooltip";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { useState, useEffect } from "react";
import { formatShortDate } from "@/lib/format-date";

export function InvoicesList() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "voided">("all");
  const { currentOrg } = useOrg();
  const { data: invoices, isLoading, isError, refetch } = useInvoices(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    let next = invoices;
    if (statusFilter !== "all") {
      next = next.filter((invoice) => invoice.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return next;

    return next.filter((invoice) => {
      return (
        invoice.invoice_number.toLowerCase().includes(q) ||
        (invoice.client?.name ?? "").toLowerCase().includes(q) ||
        (invoice.client?.company_name ?? "").toLowerCase().includes(q) ||
        invoice.currency.toLowerCase().includes(q)
      );
    });
  }, [invoices, search, statusFilter]);

  const totals = useMemo(() => {
    const list = invoices ?? [];
    return {
      all: list.reduce((s, i) => s + i.grand_total, 0),
      paid: list.filter((i) => i.status === "paid").reduce((s, i) => s + i.grand_total, 0),
      outstanding: list
        .filter((i) => ["sent", "viewed", "partial", "overdue", "draft"].includes(i.status))
        .reduce((s, i) => s + i.grand_total, 0),
      overdue: list.filter((i) => i.status === "overdue").length,
    };
  }, [invoices]);

  const fmt = (cents: number) =>
    `UGX ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Manage your customer billing and track payments."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <ActionTooltip label="Create a new invoice for a client">
              <DialogTrigger asChild>
                <Button aria-label="Create Invoice">
                  <Plus className="size-4" />
                  Create Invoice
                </Button>
              </DialogTrigger>
            </ActionTooltip>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Add line items and client details to generate a new invoice.</DialogDescription>
              </DialogHeader>
              {currentOrg ? (
                <InvoiceForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before creating an invoice.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <SummaryBar
          stats={[
            { label: "Total invoiced", value: isLoading ? "—" : fmt(totals.all), icon: <Receipt className="size-4" /> },
            { label: "Paid", value: isLoading ? "—" : fmt(totals.paid), icon: <CheckCircle className="size-4" />, tone: "success" },
            { label: "Outstanding", value: isLoading ? "—" : fmt(totals.outstanding), icon: <FileDown className="size-4" /> },
            { label: "Overdue", value: isLoading ? "—" : totals.overdue.toString(), icon: <AlertTriangle className="size-4" />, tone: totals.overdue > 0 ? "destructive" : "default" },
          ]}
        />

        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="relative ml-0 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "paid", "sent", "partial", "overdue", "draft"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === "all" ? "All" : filter === "paid" ? "Paid" : filter === "sent" ? "Sent" : filter === "partial" ? "Partial" : filter === "overdue" ? "Overdue" : "Draft"}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="ml-auto" aria-label="Filter">
              <Filter className="size-4" />
            </Button>
          </div>

          <Table aria-label="Invoices list">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
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
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="numeric font-medium">
                      <Link href={`/invoices/${invoice.id}`} className="hover:text-primary hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.client?.name || "—"}</TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {invoice.issue_date ? formatShortDate(invoice.issue_date) : "—"}
                    </TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {invoice.due_date ? formatShortDate(invoice.due_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="numeric text-right font-medium">
                      {invoice.currency} {(invoice.grand_total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {currentOrg && <InvoiceActions orgId={currentOrg.id} invoice={invoice} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {search ? "No invoices match your search." : "No invoices yet"}
                      </h3>
                      {!search && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Get started by creating your first invoice.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsFormOpen(true)}
                          >
                            <Plus className="size-4" />
                            Create Invoice
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {invoices && invoices.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Showing {invoices.length} of {invoices.length} invoices</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
