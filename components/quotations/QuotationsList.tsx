"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useQuotations } from "@/hooks/quotations/use-quotations";
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
import { Plus, Search, FileText, CheckCircle, Send, AlertTriangle } from "lucide-react";
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
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { QuotationActions } from "@/components/quotations/QuotationActions";
import { ActionTooltip } from "@/components/shared/ActionTooltip";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatMoney } from "@/lib/currency";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { formatShortDate } from "@/lib/format-date";
import { useCanEdit } from "@/hooks/use-feature-flag";

export function QuotationsList() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "accepted" | "declined" | "converted">("all");
  const { currentOrg } = useOrg();
  const canEdit = useCanEdit();
  const { data: quotations, isLoading, isError, refetch } = useQuotations(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredQuotations = useMemo(() => {
    if (!quotations) return [];

    let next = quotations;
    if (statusFilter !== "all") {
      next = next.filter((quotation) => quotation.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return next;

    return next.filter((quotation) => {
      return (
        quotation.quotation_number.toLowerCase().includes(q) ||
        (quotation.client?.name ?? "").toLowerCase().includes(q) ||
        (quotation.client?.company_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [quotations, search, statusFilter]);

  const totals = useMemo(() => {
    const list = quotations ?? [];
    return {
      total: list.length,
      accepted: list.filter((q) => q.status === "accepted" || q.status === "converted").length,
      pending: list.filter((q) => q.status === "sent" || q.status === "viewed").length,
      converted: list.filter((q) => q.status === "converted").length,
    };
  }, [quotations]);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Send price quotes to clients and convert accepted ones into invoices."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <ActionTooltip label="Create a new quotation for a client">
              <DialogTrigger asChild>
                <Button aria-label="Create Quotation" disabled={!canEdit}>
                  <Plus className="size-4" />
                  Create Quotation
                </Button>
              </DialogTrigger>
            </ActionTooltip>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Quotation</DialogTitle>
                <DialogDescription>Add line items and client details to generate a new quotation.</DialogDescription>
              </DialogHeader>
              {currentOrg ? (
                <QuotationForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before creating a quotation.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <SummaryBar
          stats={[
            { label: "Total quotations", value: isLoading ? "—" : totals.total.toString(), icon: <FileText className="size-4" /> },
            { label: "Accepted", value: isLoading ? "—" : totals.accepted.toString(), icon: <CheckCircle className="size-4" />, tone: "success" },
            { label: "Awaiting response", value: isLoading ? "—" : totals.pending.toString(), icon: <Send className="size-4" /> },
            { label: "Converted to invoice", value: isLoading ? "—" : totals.converted.toString(), icon: <FileText className="size-4" /> },
          ]}
          isLoading={isLoading}
        />

        <div className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative ml-0 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search quotations…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "draft", "sent", "accepted", "declined", "converted"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  className="h-8 capitalize"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          <Table aria-label="Quotations list">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Quotation #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Valid Until</TableHead>
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
              ) : filteredQuotations.length > 0 ? (
                filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="numeric font-medium">
                      <Link href={`/quotations/${quotation.id}`} className="hover:text-primary hover:underline">
                        {quotation.quotation_number}
                      </Link>
                    </TableCell>
                    <TableCell>{quotation.client?.name || "—"}</TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {quotation.issue_date ? formatShortDate(quotation.issue_date) : "—"}
                    </TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {quotation.expiry_date ? formatShortDate(quotation.expiry_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={quotation.status} />
                    </TableCell>
                    <TableCell className="numeric text-right font-medium">
                      {formatMoney(quotation.grand_total, quotation.currency)}
                    </TableCell>
                    <TableCell>
                      {currentOrg && <QuotationActions orgId={currentOrg.id} quotation={quotation} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {search ? "No quotations match your search." : "No quotations yet"}
                      </h3>
                      {!search && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Get started by creating your first quotation.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsFormOpen(true)}
                          >
                            <Plus className="size-4" />
                            Create Quotation
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {quotations && quotations.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Showing {quotations.length} of {quotations.length} quotations</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
