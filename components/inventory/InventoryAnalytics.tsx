"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOrg } from "@/hooks/use-org";
import { useItems, useOrgItemMovements } from "@/hooks/items/use-items";
import { useDailySales } from "@/hooks/finance/use-daily-sales";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Timeframe = "last_30_days" | "this_month" | "this_quarter" | "this_year";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  last_30_days: "Last 30 days",
  this_month: "This month",
  this_quarter: "This quarter",
  this_year: "This year",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function fmtUGX(cents: number) {
  return `UGX ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function timeframeStart(timeframe: Timeframe, now: Date): Date {
  switch (timeframe) {
    case "last_30_days":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "this_quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterStartMonth, 1);
    }
    case "this_year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function InventoryAnalytics() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const [timeframe, setTimeframe] = useState<Timeframe>("this_month");

  const { data: items = [], isLoading: itemsLoading } = useItems(orgId);
  const from = useMemo(() => timeframeStart(timeframe, new Date()).toISOString(), [timeframe]);
  const { data: movements = [], isLoading: movementsLoading } = useOrgItemMovements(orgId, { from });
  const { data: dailySales = [], isLoading: salesLoading } = useDailySales(orgId, { from: from.slice(0, 10) });

  const isLoading = itemsLoading || movementsLoading || salesLoading;

  const activeItems = useMemo(() => items.filter((i) => i.status !== "archived"), [items]);

  const inventoryValueAtCost = useMemo(
    () => activeItems.reduce((sum, i) => sum + i.current_quantity * i.cost_price, 0),
    [activeItems]
  );
  const inventoryValueAtSelling = useMemo(
    () => activeItems.reduce((sum, i) => sum + i.current_quantity * i.selling_price, 0),
    [activeItems]
  );

  const salesMovements = useMemo(
    () => movements.filter((m) => m.movement_type === "sale"),
    [movements]
  );

  const unitsSold = useMemo(
    () => salesMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0),
    [salesMovements]
  );

  // Revenue sold: use the actual amount charged per item sale
  // (daily_sales.amount = unit_sale_price × quantity, already net of any
  // discount), not the item's current list price — this is the real
  // money collected, not an approximation.
  const itemSalesInPeriod = useMemo(
    () => dailySales.filter((s) => s.item_id),
    [dailySales]
  );
  const revenueSold = useMemo(
    () => itemSalesInPeriod.reduce((sum, s) => sum + s.amount, 0),
    [itemSalesInPeriod]
  );
  const totalDiscountGiven = useMemo(
    () => itemSalesInPeriod.reduce((sum, s) => sum + (s.discount_amount ?? 0), 0),
    [itemSalesInPeriod]
  );

  const categoryValue = useMemo(() => {
    const map = new Map<string, number>();
    activeItems.forEach((item) => {
      const value = item.current_quantity * item.cost_price;
      map.set(item.category, (map.get(item.category) ?? 0) + value);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeItems]);

  const salesByMonth = useMemo(() => {
    const now = new Date();
    const buckets: { name: string; units: number; date: Date }[] = [];
    const monthsBack = timeframe === "this_year" ? 12 : timeframe === "this_quarter" ? 3 : 6;
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ name: MONTHS[d.getMonth()], units: 0, date: d });
    }
    salesMovements.forEach((m) => {
      const d = new Date(m.created_at);
      const bucket = buckets.find((b) => b.date.getFullYear() === d.getFullYear() && b.date.getMonth() === d.getMonth());
      if (bucket) bucket.units += Math.abs(m.quantity);
    });
    return buckets;
  }, [salesMovements, timeframe]);

  const lowStockCount = activeItems.filter((i) => i.current_quantity <= i.reorder_level).length;

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Inventory analytics</h2>
          <p className="text-xs text-muted-foreground">Value on hand and movement over time</p>
        </div>
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
          <SelectTrigger className="w-40" aria-label="Select timeframe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((tf) => (
              <SelectItem key={tf} value={tf}>{TIMEFRAME_LABELS[tf]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Value at cost</p>
          <p className="numeric mt-1 font-mono text-lg font-semibold text-foreground">
            {isLoading ? "—" : fmtUGX(inventoryValueAtCost)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Value at selling price</p>
          <p className="numeric mt-1 font-mono text-lg font-semibold text-foreground">
            {isLoading ? "—" : fmtUGX(inventoryValueAtSelling)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Units sold ({TIMEFRAME_LABELS[timeframe].toLowerCase()})</p>
          <p className="numeric mt-1 font-mono text-lg font-semibold text-foreground">
            {isLoading ? "—" : unitsSold.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Revenue from item sales</p>
          <p className="numeric mt-1 font-mono text-lg font-semibold text-success">
            {isLoading ? "—" : fmtUGX(revenueSold)}
          </p>
        </div>
      </div>

      {totalDiscountGiven > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-warning">{fmtUGX(totalDiscountGiven)}</span> given in discounts across {itemSalesInPeriod.length} item sale{itemSalesInPeriod.length === 1 ? "" : "s"} this period.
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Units sold by month</p>
          <div className="mt-2 h-56">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-muted" />
            ) : salesByMonth.every((b) => b.units === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sales recorded in this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByMonth} margin={{ left: -18, right: 6, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} units`, "Sold"]}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "var(--shadow-card)",
                    }}
                  />
                  <Bar dataKey="units" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Stock value by category</p>
          <div className="mt-2 h-56">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-muted" />
            ) : categoryValue.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No stock value to chart yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryValue}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {categoryValue.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [fmtUGX(value), name]}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "var(--shadow-card)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    wrapperStyle={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {lowStockCount > 0 && (
        <p className="mt-4 text-xs text-warning">
          {lowStockCount} item{lowStockCount === 1 ? "" : "s"} at or below reorder level.
        </p>
      )}
    </section>
  );
}
