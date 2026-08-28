"use client";

import { useMemo } from "react";
import { useOrg } from "@/hooks/use-org";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { DashboardTimeframe } from "@/hooks/dashboard/use-dashboard-summary";
import { toMajorUnits, convertMinorUnits } from "@/lib/currency";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface RevenueChartProps {
  timeframe?: DashboardTimeframe;
}

/** Builds the bucket list (and a matching label + membership test) for a
 * given timeframe. Shorter timeframes bucket by day so the chart still has
 * enough points to read; longer ones bucket by month. */
function buildBuckets(timeframe: DashboardTimeframe, now: Date) {
  if (timeframe === "last_30_days") {
    const buckets: { name: string; date: Date }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({ name: `${d.getDate()}/${d.getMonth() + 1}`, date: d });
    }
    return buckets;
  }

  if (timeframe === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const buckets: { name: string; date: Date }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), quarterStartMonth + i, 1);
      buckets.push({ name: MONTHS[d.getMonth()], date: d });
    }
    return buckets;
  }

  if (timeframe === "this_year") {
    const buckets: { name: string; date: Date }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), i, 1);
      buckets.push({ name: MONTHS[d.getMonth()], date: d });
    }
    return buckets;
  }

  if (timeframe === "all_time") {
    // Last 12 months, same as a rolling year view — "all time" as a daily
    // or monthly-since-founding chart would be unreadable without knowing
    // the org's first transaction date, so this defaults to a sensible
    // 12-month window rather than an unbounded one.
    const buckets: { name: string; date: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ name: MONTHS[d.getMonth()], date: d });
    }
    return buckets;
  }

  // this_month (default): last 6 months, matches prior dashboard behavior.
  const buckets: { name: string; date: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ name: MONTHS[d.getMonth()], date: d });
  }
  return buckets;
}

export function RevenueChart({ timeframe = "this_month" }: RevenueChartProps) {
  const { currentOrg } = useOrg();
  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const { data: invoices, isLoading } = useInvoices(currentOrg?.id ?? "");

  const data = useMemo(() => {
    const now = new Date();
    const buckets = buildBuckets(timeframe, now).map((b) => ({ ...b, revenue: 0 }));
    const isDaily = timeframe === "last_30_days";

    (invoices ?? []).forEach((inv) => {
      if (inv.status !== "paid" && inv.status !== "partial") return;
      const issueDate = new Date(inv.issue_date);

      const bucketIndex = buckets.findIndex((b) =>
        isDaily
          ? b.date.toDateString() === issueDate.toDateString()
          : b.date.getFullYear() === issueDate.getFullYear() && b.date.getMonth() === issueDate.getMonth()
      );
      if (bucketIndex === -1) return;
      // Convert to base currency before summing (invoices can be billed in a
      // different currency than the org's base — see lib/currency.ts), then
      // to major units using the base currency's own decimal digits (UGX has
      // none, unlike the hardcoded /100 this replaced).
      const amountBase = convertMinorUnits(inv.grand_total, inv.currency, baseCurrency, inv.exchange_rate || 1);
      buckets[bucketIndex].revenue += toMajorUnits(amountBase, baseCurrency);
    });

    return buckets;
  }, [invoices, timeframe, baseCurrency]);

  const hasData = data.some((d) => d.revenue > 0);

  if (isLoading) {
    return (
      <section className="panel p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-foreground">Revenue overview</h2>
        <div className="mt-5 h-64 animate-pulse rounded-xl bg-muted" />
      </section>
    );
  }

  return (
    <section className="panel p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Revenue overview</h2>
          <p className="text-xs text-muted-foreground">
            Paid invoices, {timeframe === "last_30_days" ? "last 30 days" : timeframe === "this_quarter" ? "this quarter" : timeframe === "this_year" ? "this year" : timeframe === "all_time" ? "last 12 months" : "last 6 months"}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-chart-1" /> Revenue
        </span>
      </div>
      <div className="mt-5 h-64">
        {!hasData ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No paid invoices yet — revenue will appear here once invoices are paid.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -18, right: 6, top: 4 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                interval={timeframe === "last_30_days" ? 4 : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                formatter={(value: number) => [`${baseCurrency} ${value.toLocaleString()}`, "Revenue"]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "var(--shadow-card)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
