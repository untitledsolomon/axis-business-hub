"use client";

import { useMemo, useState } from "react";
import { useOrg } from "@/hooks/use-org";
import {
  useRevenueTrend,
  useARAging,
  useExpenseBreakdown,
  useTopClients,
} from "@/hooks/finance/use-reports";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const fmt = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

const fmtShort = (cents: number) => {
  const v = cents / 100;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
};

const monthLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "2-digit" });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoISO(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899"];

const AGING_BUCKET_ORDER = ["current", "1-30", "31-60", "61-90", "90+"] as const;
const AGING_BUCKET_LABEL: Record<string, string> = {
  current: "Current",
  "1-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};
const AGING_BUCKET_CLASS: Record<string, string> = {
  current: "bg-success-soft text-success",
  "1-30": "bg-muted text-muted-foreground",
  "31-60": "bg-warning-soft text-warning-foreground",
  "61-90": "bg-warning-soft text-warning-foreground",
  "90+": "bg-destructive-soft text-destructive",
};

export function AnalyticsView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const [startDate, setStartDate] = useState(monthsAgoISO(5)); // trailing 6 months incl. current
  const [endDate, setEndDate] = useState(todayISO());
  const asOfDate = todayISO();

  const { data: trend, isLoading: trendLoading } = useRevenueTrend(orgId, startDate, endDate);
  const { data: aging, isLoading: agingLoading } = useARAging(orgId, asOfDate);
  const { data: expenseBreakdown, isLoading: expenseLoading } = useExpenseBreakdown(orgId, startDate, endDate);
  const { data: topClients, isLoading: clientsLoading } = useTopClients(orgId, startDate, endDate, 5);

  const trendChartData = useMemo(
    () =>
      (trend ?? []).map((r) => ({
        month: monthLabel(r.month),
        Revenue: r.revenue / 100,
        Expenses: r.expenses / 100,
        Net: r.net / 100,
      })),
    [trend]
  );

  const totalOutstanding = useMemo(
    () => (aging ?? []).reduce((s, r) => s + r.amount_due, 0),
    [aging]
  );
  const overdueOutstanding = useMemo(
    () => (aging ?? []).filter((r) => r.bucket !== "current").reduce((s, r) => s + r.amount_due, 0),
    [aging]
  );

  const agingByBucket = useMemo(() => {
    const map = new Map<string, number>();
    for (const bucket of AGING_BUCKET_ORDER) map.set(bucket, 0);
    for (const row of aging ?? []) map.set(row.bucket, (map.get(row.bucket) ?? 0) + row.amount_due);
    return AGING_BUCKET_ORDER.map((bucket) => ({ bucket, amount: (map.get(bucket) ?? 0) / 100 }));
  }, [aging]);

  const expenseChartData = useMemo(
    () => (expenseBreakdown ?? []).map((r) => ({ name: r.category, value: r.total / 100 })),
    [expenseBreakdown]
  );

  const periodTotals = useMemo(() => {
    const revenue = (trend ?? []).reduce((s, r) => s + r.revenue, 0);
    const expenses = (trend ?? []).reduce((s, r) => s + r.expenses, 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [trend]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Business trends across revenue, expenses, receivables, and clients."
      />

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <SummaryBar
        isLoading={trendLoading}
        stats={[
          { label: "Revenue (period)", value: fmt(periodTotals.revenue) },
          { label: "Expenses (period)", value: fmt(periodTotals.expenses) },
          {
            label: "Net (period)",
            value: fmt(periodTotals.net),
            tone: periodTotals.net >= 0 ? "success" : "destructive",
          },
          {
            label: "Outstanding AR",
            value: fmt(totalOutstanding),
            tone: overdueOutstanding > 0 ? "warning" : "default",
          },
        ]}
      />

      {/* Revenue trend */}
      <div className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Revenue vs Expenses</h3>
        {trendLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : !trendChartData.length ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No posted transactions in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => fmtShort(v * 100)} />
              <Tooltip formatter={(v: number) => (v as number).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* AR Aging */}
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Accounts Receivable Aging</h3>
          {agingLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !agingByBucket.some((b) => b.amount > 0) ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No open invoices.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agingByBucket}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="bucket" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => fmtShort(v * 100)} />
                <Tooltip formatter={(v: number) => (v as number).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Expense Breakdown</h3>
          {expenseLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !expenseChartData.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No expenses in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseChartData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {expenseChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => (v as number).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top clients */}
        <div className="panel">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Top Clients</h3>
          </div>
          {clientsLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !topClients?.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No invoices in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((c) => (
                  <TableRow key={c.client_id}>
                    <TableCell className="text-sm">{c.client_name}</TableCell>
                    <TableCell className="numeric text-right text-sm">{c.invoice_count}</TableCell>
                    <TableCell className="numeric text-right text-sm">{fmt(c.total_invoiced)}</TableCell>
                    <TableCell className="numeric text-right text-sm">{fmt(c.total_paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* AR aging detail */}
        <div className="panel">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Open Invoices</h3>
          </div>
          {agingLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !aging?.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No open invoices.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aging.slice(0, 8).map((r) => (
                  <TableRow key={r.invoice_id}>
                    <TableCell className="text-sm">{r.invoice_number}</TableCell>
                    <TableCell className="text-sm">{r.client_name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${AGING_BUCKET_CLASS[r.bucket]}`}
                      >
                        {AGING_BUCKET_LABEL[r.bucket]}
                      </span>
                    </TableCell>
                    <TableCell className="numeric text-right text-sm">{fmt(r.amount_due)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
