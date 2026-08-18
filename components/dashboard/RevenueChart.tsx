"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="col-span-2">
        <CardHeader className="pb-0">
          <CardTitle as="h2">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 h-[300px]">
          <div className="w-full h-full bg-axis-light animate-pulse rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-0">
        <CardTitle as="h2">Revenue Overview</CardTitle>
        <p className="text-sm text-muted-foreground">Paid invoices, last 6 months</p>
      </CardHeader>
      <CardContent className="pt-4 h-[300px]">
        {!hasData ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            No paid invoices yet — revenue will appear here once invoices are paid.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                formatter={(value: number) => [`UGX ${value.toLocaleString()}`, "Revenue"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#1E3A8A"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
