"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { InventoryAnalytics } from "@/components/inventory/InventoryAnalytics";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrg } from "@/hooks/use-org";
import { formatMoney } from "@/lib/currency";
import { useArchiveItem, useDeleteItem, useItems } from "@/hooks/items/use-items";
import { ItemForm } from "@/components/inventory/ItemForm";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { useCanEdit } from "@/hooks/use-feature-flag";

export function InventoryView() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "low-stock" | "archived">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const { currentOrg } = useOrg();
  const canEdit = useCanEdit();
  const orgId = currentOrg?.id ?? "";
  const { data: items, isLoading, isError, refetch } = useItems(orgId);
  const archiveItem = useArchiveItem(orgId);
  const deleteItem = useDeleteItem(orgId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return [];

    let next = items;
    if (statusFilter === "active") {
      next = next.filter((item) => item.status === "active");
    } else if (statusFilter === "low-stock") {
      next = next.filter((item) => item.status !== "archived" && item.current_quantity <= item.reorder_level);
    } else if (statusFilter === "archived") {
      next = next.filter((item) => item.status === "archived");
    }

    const q = search.trim().toLowerCase();
    if (!q) return next;
    return next.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        (item.sku ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const lowStockItems = (items ?? []).filter(
    (item) => item.status !== "archived" && item.current_quantity <= item.reorder_level
  );
  const lowStockCount = lowStockItems.length;
  const totalUnits = (items ?? []).reduce((sum, item) => sum + item.current_quantity, 0);
  const issuedAssets = (items ?? []).filter((item) => {
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    return item.status !== "archived" && (meta.custody_status === "issued" || typeof meta.assigned_employee_id === "string");
  });
  const lifecycleItems = (items ?? []).filter((item) => {
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    return item.status !== "archived" && (typeof meta.lifecycle_stage === "string" || typeof meta.asset_status === "string");
  });
  const editingItem = items?.find((item) => item.id === editingItemId) ?? null;
  const deletingItem = items?.find((item) => item.id === deletingItemId) ?? null;

  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const fmt = (minorAmount: number) => formatMoney(minorAmount, baseCurrency);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Track stock, reorder points, and move inventory across your stores and teams."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Add item" disabled={!canEdit}>
                <Plus className="size-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Item</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <ItemForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before adding inventory.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4">
        <SummaryBar
          stats={[
            { label: "Items", value: isLoading ? "—" : String(items?.length ?? 0), icon: <Package className="size-4" /> },
            { label: "Units on hand", value: isLoading ? "—" : String(totalUnits), icon: <Package className="size-4" /> },
            { label: "Low stock", value: isLoading ? "—" : String(lowStockCount), icon: <TrendingDown className="size-4" />, tone: lowStockCount > 0 ? "warning" : "default" },
          ]}
        />

        <InventoryAnalytics />

        <section className="panel p-4">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Operational overview</h2>
              <p className="text-xs text-muted-foreground">The stock checks you handle most often.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Low stock</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{lowStockCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Issued assets</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{issuedAssets.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lifecycle tracked</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{lifecycleItems.length}</p>
            </div>
          </div>
        </section>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TrendingDown className="size-4" />
            <span>
              {lowStockCount} item{lowStockCount === 1 ? "" : "s"} are at or below their reorder level.
            </span>
          </div>
        )}

        <Dialog open={!!editingItemId && !!editingItem} onOpenChange={(open) => !open && setEditingItemId(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>Update the stocked item details and thresholds.</DialogDescription>
            </DialogHeader>
            {editingItem && <ItemForm orgId={orgId} item={editingItem} onSuccess={() => setEditingItemId(null)} />}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingItemId && !!deletingItem} onOpenChange={(open) => !open && setDeletingItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deletingItem?.name ?? "item"}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the item from inventory. Archive instead if you want to preserve it for history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (canEdit && deletingItemId) {
                    await deleteItem.mutateAsync({ id: deletingItemId });
                    setDeletingItemId(null);
                  }
                }}
                disabled={!canEdit || deleteItem.isPending}
              >
                {deleteItem.isPending ? "Deleting…" : "Delete item"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="font-display text-sm font-semibold text-foreground">Stock list</p>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "active", "low-stock", "archived"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className="h-8"
                >
                  {filter === "all" ? "All" : filter === "active" ? "Active" : filter === "low-stock" ? "Low stock" : "Archived"}
                </Button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Search inventory…"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Selling</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">Couldn&apos;t load inventory.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center text-muted-foreground">
                    No inventory items yet. Add your first item to start tracking stock.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/inventory/${item.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                            {item.name}
                          </Link>
                          <StatusBadge status={item.status} />
                        </div>
                        {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{item.sku ?? "—"}</TableCell>
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell className={item.current_quantity <= item.reorder_level ? "text-amber-600" : ""}>
                      {item.current_quantity}
                    </TableCell>
                    <TableCell className="numeric">{fmt(item.cost_price)}</TableCell>
                    <TableCell className="numeric">
                      <div className="flex items-center justify-between gap-3">
                        <span>{fmt(item.selling_price)}</span>
                        <StockAdjustmentDialog
                          item={item}
                          orgId={orgId}
                          trigger={<Button variant="outline" size="sm">Adjust</Button>}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="w-12">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`More actions for ${item.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/${item.id}`}>
                              <Eye className="size-4" /> View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(event) => {
                            event.preventDefault();
                            setEditingItemId(item.id);
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
                              setDeletingItemId(item.id);
                            }}
                          >
                            <Trash2 className="size-4" /> Delete item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
