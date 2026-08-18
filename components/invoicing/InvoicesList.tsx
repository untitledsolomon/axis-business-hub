"use client";

import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useOrg } from "@/hooks/use-org";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreHorizontal, FileDown, Send, CheckCircle, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableErrorState } from "@/components/shared/TableErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export function InvoicesList() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: invoices, isLoading, isError, refetch } = useInvoices(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage your customer billing and track payments."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-axis-blue hover:bg-axis-blue-light" aria-label="Create Invoice">
                <Plus className="mr-2 h-4 w-4" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <InvoiceForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  You need an active organisation before creating an invoice.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table aria-label="Invoices list">
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold w-[120px]">Invoice #</TableHead>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Issue Date</TableHead>
              <TableHead className="font-semibold">Due Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableErrorState colSpan={7} onRetry={() => refetch()} />
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : invoices && invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-axis-light/30">
                  <TableCell className="font-medium font-mono text-sm">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.client?.name || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM dd, yyyy") : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {invoice.due_date ? format(new Date(invoice.due_date), "MMM dd, yyyy") : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right font-semibold font-mono text-axis-blue">
                    {invoice.currency} {(invoice.grand_total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open menu for ${invoice.invoice_number}`}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {invoice.invoice_number}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <FileDown className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="mr-2 h-4 w-4" /> Send to Client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-axis-red">Void Invoice</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-semibold">No invoices yet</h3>
                    <p className="text-muted-foreground">
                      Get started by creating your first invoice.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-axis-blue text-axis-blue"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create Invoice
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
