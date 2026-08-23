"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  MoreHorizontal,
  Package,
  Pencil,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOrg } from "@/hooks/use-org";
import { useArchiveItem, useDeleteItem, useItem, useItemMovements } from "@/hooks/items/use-items";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { ItemForm } from "@/components/inventory/ItemForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ItemDetailProps {
  itemId: string;
}

export function ItemDetail({ itemId }: ItemDetailProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: item, isLoading, isError, refetch } = useItem(orgId, itemId);
  const { data: movements, isLoading: movementsLoading } = useItemMovements(orgId, itemId);
  const deleteItem = useDeleteItem(orgId);
  const archiveItem = useArchiveItem(orgId);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isError) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this item</h3>
        <p className="max-w-sm text-sm text-muted-foreground">Something went wrong while fetching this product.</p>
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

  if (!item) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Item not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">This item may have been deleted or you may not have access to it.</p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/inventory">Back to Inventory</Link>
        </Button>
      </div>
    );
  }

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function handleDelete() {
    await deleteItem.mutateAsync({ id: item.id });
    router.push("/inventory");
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/inventory">
            <ArrowLeft className="size-4" />
            Back to Inventory
          </Link>
        </Button>
      </div>

      <PageHeader
        title={item.name}
        description={item.sku ? `SKU: ${item.sku}` : "No SKU on file"}
        actions={
          <div className="flex items-center gap-2">
            <StockAdjustmentDialog
              item={item}
              orgId={orgId}
              trigger={<Button>Adjust Stock</Button>}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={`More actions for ${item.name}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={(event) => {
                  event.preventDefault();
                  setIsEditOpen(true);
                }}>
                  <Pencil className="size-4" /> Edit item
                </DropdownMenuItem>
                {item.status !== "archived" && (
                  <DropdownMenuItem onSelect={() => archiveItem.mutate({ id: item.id })}>
                    <Archive className="size-4" /> Archive item
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    setIsDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="size-4" /> Delete item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details and stock thresholds.</DialogDescription>
          </DialogHeader>
          <ItemForm orgId={orgId} item={item} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item from inventory. If you want to keep the record for history, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete()}
              disabled={deleteItem.isPending}
            >
              {deleteItem.isPending ? "Deleting…" : "Delete item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2"><StatusBadge status={item.status} /></div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">On hand</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{item.current_quantity}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="size-3.5" /> Category</div>
              <p className="mt-2 capitalize text-sm font-medium text-foreground">{item.category}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="size-3.5" /> Reorder</div>
              <p className="mt-2 text-sm font-medium text-foreground">{item.reorder_level}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="size-3.5" /> Unit</div>
              <p className="mt-2 text-sm font-medium text-foreground">{item.unit}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost price</p>
              <p className="mt-2 text-lg font-semibold text-foreground">UGX {fmt(item.cost_price)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selling price</p>
              <p className="mt-2 text-lg font-semibold text-foreground">UGX {fmt(item.selling_price)}</p>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-border pb-2">
              <span className="text-muted-foreground">Location</span>
              <span className="text-right text-foreground">{item.location || "—"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border pb-2">
              <span className="text-muted-foreground">Last updated</span>
              <span className="text-right text-foreground">{new Date(item.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="pt-1">
              <p className="text-muted-foreground">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-foreground">{item.description || "No description saved."}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="panel mt-4">
        <div className="border-b border-border p-4">
          <p className="font-display text-sm font-semibold text-foreground">Stock movement history</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                </TableRow>
              ))
            ) : movements && movements.length > 0 ? (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="numeric text-muted-foreground">{new Date(movement.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{movement.movement_type}</TableCell>
                  <TableCell className={movement.quantity < 0 ? "numeric text-destructive" : "numeric text-success"}>
                    {movement.quantity}
                  </TableCell>
                  <TableCell>{movement.reference || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{movement.notes || "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No stock movements recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
