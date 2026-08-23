"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, Package, TrendingDown } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useItems } from "@/hooks/items/use-items";

export function InventoryStatus() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: items, isLoading } = useItems(orgId);

  const totalItems = items?.length ?? 0;
  const lowStockItems = (items ?? []).filter(
    (item) => item.status !== "archived" && item.current_quantity <= item.reorder_level
  );
  const issuedAssets = (items ?? []).filter((item) => {
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    return item.status !== "archived" && (meta.custody_status === "issued" || typeof meta.assigned_employee_id === "string");
  });
  const lifecycleItems = (items ?? []).filter((item) => {
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    return item.status !== "archived" && (typeof meta.lifecycle_stage === "string" || typeof meta.asset_status === "string");
  });
  const unitsOnHand = (items ?? []).reduce((sum, item) => sum + item.current_quantity, 0);

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Inventory status</h2>
          <p className="text-xs text-muted-foreground">Live stock overview</p>
        </div>
        <Link href="/inventory" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="size-3.5" /> Items
              </div>
              <p className="mt-2 text-xl font-semibold text-foreground">{totalItems}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="size-3.5" /> Units on hand
              </div>
              <p className="mt-2 text-xl font-semibold text-foreground">{unitsOnHand}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingDown className="size-3.5" /> Low stock
              </div>
              <p className="mt-2 text-xl font-semibold text-foreground">{lowStockItems.length}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-primary-soft/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Custody</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{issuedAssets.length} issued</p>
            </div>
            <div className="rounded-lg border border-border bg-success-soft/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lifecycle</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{lifecycleItems.length} tracked</p>
            </div>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No items are currently below their reorder level.
            </div>
          ) : (
            <ul className="space-y-2">
              {lowStockItems.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-amber-900">{item.name}</p>
                    <p className="text-xs text-amber-700">
                      {item.current_quantity} in stock · reorder at {item.reorder_level}
                    </p>
                  </div>
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
