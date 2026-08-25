"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useDailySale, useDeleteDailySale } from "@/hooks/finance/use-daily-sales";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageHeader } from "@/components/shared/PageHeader";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { formatShortDate } from "@/lib/format-date";
import { ArrowLeft, AlertTriangle, ShoppingBag, Trash2, BookOpen } from "lucide-react";

interface DailySaleDetailProps {
  saleId: string;
}

export function DailySaleDetail({ saleId }: DailySaleDetailProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: sale, isLoading, isError, refetch } = useDailySale(orgId, saleId);
  const deleteDailySale = useDeleteDailySale(orgId);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const openDeleteConfirm = useDeferredModalOpen(setIsDeleteConfirmOpen);

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
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this sale</h3>
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
        <div className="space-y-3 rounded-lg border border-border p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Sale not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This sale may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/finance/daily-sales">Back to Quick Sales</Link>
        </Button>
      </div>
    );
  }

  async function handleDelete(event: Event) {
    event.preventDefault();
    if (!sale) return;
    await deleteDailySale.mutateAsync({ id: sale.id });
    setIsDeleteConfirmOpen(false);
    router.push("/finance/daily-sales");
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/finance/daily-sales">
            <ArrowLeft className="size-4" />
            Back to Quick Sales
          </Link>
        </Button>
      </div>

      <PageHeader
        title={sale.description}
        description={formatShortDate(sale.sale_date)}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              openDeleteConfirm();
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Sale total</p><p className="numeric mt-1 text-2xl font-semibold text-foreground">UGX {(sale.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment method</p><p className="mt-1 text-lg font-semibold capitalize text-foreground">{sale.payment_method.replace("_", " ")}</p></div>
            <div><p className="text-xs text-muted-foreground">Quantity</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{sale.quantity ?? "—"}</p></div>
          </div>
        </section>
        <section className="panel p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="numeric font-semibold text-foreground">
                UGX {(sale.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Payment method</span>
              <span className="capitalize text-foreground">{sale.payment_method.replace("_", " ")}</span>
            </div>
            {sale.revenue_account && (
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">Revenue account</span>
                <span className="text-foreground">{sale.revenue_account.name}</span>
              </div>
            )}
            {sale.received_into_account && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received into</span>
                <span className="text-foreground">{sale.received_into_account.name}</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Ledger trace</h2>
          <div className="mt-3 space-y-2">
            {sale.journal_entry_id ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/transactions/${sale.journal_entry_id}`}>
                  <BookOpen className="size-4" /> View journal entry
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No linked journal entry found.</p>
            )}
          </div>
        </section>
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
              onClick={(e) => handleDelete(e.nativeEvent)}
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
