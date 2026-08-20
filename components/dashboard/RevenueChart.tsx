"use client";

import { useMemo } from "react";
import { useOrg } from "@/hooks/use-org";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
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

export function RevenueChart() {
  const { currentOrg } = useOrg();
  const { data: invoices, isLoading } = useInvoices(currentOrg?.id ?? "");

  const data = useMemo(() => {
    const now = new Date();
    const buckets: { name: string; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ name: MONTHS[d.getMonth()], revenue: 0 });
    }

    (invoices ?? []).forEach((inv) => {
      if (inv.status !== "paid" && inv.status !== "partial") return;
      const issueDate = new Date(inv.issue_date);
      const now2 = new Date();
      const monthsAgo =
        (now2.getFullYear() - issueDate.getFullYear()) * 12 +
        (now2.getMonth() - issueDate.getMonth());
      if (monthsAgo < 0 || monthsAgo > 5) return;
      const bucketIndex = 5 - monthsAgo;
      buckets[bucketIndex].revenue += inv.grand_total / 100;
    });

    return buckets;
  }, [invoices]);

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
          <p className="text-xs text-muted-foreground">Paid invoices, last 6 months</p>
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
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                formatter={(value: number) => [`UGX ${value.toLocaleString()}`, "Revenue"]}
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
