"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/hooks/use-org";
import { useDailySales, useDeleteDailySale, sumDailySales } from "@/hooks/finance/use-daily-sales";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickSaleForm } from "@/components/finance/QuickSaleForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { formatShortDate } from "@/lib/format-date";
import { DailySale } from "@/lib/types";
import { Plus, Search, MoreHorizontal, ShoppingBag, Trash2, Eye, TrendingUp } from "lucide-react";

export function DailySalesList() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DailySale | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: sales, isLoading, isError, refetch } = useDailySales(orgId);
  const deleteDailySale = useDeleteDailySale(orgId);
  const openDeleteConfirm = useDeferredModalOpen(setIsDeleteConfirmOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    if (!sales) return [];
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) => s.description.toLowerCase().includes(q));
  }, [sales, search]);

  const total = sumDailySales(filtered);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDailySale.mutateAsync({ id: deleteTarget.id });
    setIsDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Quick Sales"
        description="Log walk-in and non-invoiced sales — posts to the ledger automatically."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Log Sale">
                <Plus className="size-4" /> Log Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Log Sale</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <QuickSaleForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before logging a sale.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4">
        <SummaryBar
          stats={[
            {
              label: "Total (filtered)",
              value: isLoading ? "—" : `UGX ${(total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              icon: <TrendingUp className="size-4" />,
              tone: "success",
            },
            { label: "Entries", value: isLoading ? "—" : String(filtered.length), icon: <ShoppingBag className="size-4" /> },
          ]}
        />

        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="font-display text-sm font-semibold text-foreground">All sales</p>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sales…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="numeric text-muted-foreground">
                        {formatShortDate(sale.sale_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/finance/daily-sales/${sale.id}`} className="hover:text-primary hover:underline">
                          {sale.description}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {sale.payment_method.replace("_", " ")}
                      </TableCell>
                      <TableCell className="numeric text-right font-medium">
                        UGX {(sale.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Open menu for ${sale.description}`}>
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu for {sale.description}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/finance/daily-sales/${sale.id}`}>
                                <Eye className="size-4" /> View details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeleteTarget(sale);
                                openDeleteConfirm();
                              }}
                            >
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="text-sm font-semibold text-foreground">No sales logged yet</h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                          Log a walk-in sale that doesn&apos;t need a formal invoice — it&apos;ll post to the
                          ledger automatically.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsFormOpen(true)}>
                          <Plus className="size-4" /> Log Sale
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the sale record. The linked journal entry will remain on the ledger for
              audit purposes — void it separately from the General Ledger if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteDailySale.isPending}
            >
              {deleteDailySale.isPending ? "Deleting…" : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
