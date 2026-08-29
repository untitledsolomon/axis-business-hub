"use client";

import { useMemo, useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { formatMoney, toMajorUnits } from "@/lib/currency";
import {
  useRevenueTrend,
  useARAging,
  useExpenseBreakdown,
  useClientProfitability,
  useCashFlow,
  useExpenseTrend,
  useComparativePeriods,
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
import { Button } from "@/components/ui/button";

const fmtShort = (amount: number) => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
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

// Chart colors pulled from the app's --chart-1..5 design tokens (see
// app/globals.css) rather than raw hex, matching the pattern already
// established in components/dashboard/RevenueChart.tsx. Keeps Analytics in
// the same visual family as the rest of the app, including dark mode, where
// hardcoded hex previously stayed static.
const CHART_NAVY = "hsl(var(--chart-1))";
const CHART_TEAL = "hsl(var(--chart-2))";
const CHART_SUCCESS = "hsl(var(--chart-3))";
const CHART_AMBER = "hsl(var(--chart-4))";
const CHART_DESTRUCTIVE = "hsl(var(--chart-5))";
const PIE_COLORS = [CHART_NAVY, CHART_TEAL, CHART_SUCCESS, CHART_AMBER, CHART_DESTRUCTIVE];

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
  const currencyCode = currentOrg?.base_currency || "USD";

  const [startDate, setStartDate] = useState(monthsAgoISO(5)); // trailing 6 months incl. current
  const [endDate, setEndDate] = useState(todayISO());
  const asOfDate = todayISO();
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string | null>(null);

  const { data: trend, isLoading: trendLoading } = useRevenueTrend(orgId, startDate, endDate);
  const { data: aging, isLoading: agingLoading } = useARAging(orgId, asOfDate);
  const { data: expenseBreakdown, isLoading: expenseLoading } = useExpenseBreakdown(orgId, startDate, endDate);
  const { data: profitability, isLoading: profitabilityLoading } = useClientProfitability(orgId, startDate, endDate, 10);
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlow(orgId, startDate, endDate);
  const { data: expenseTrend, isLoading: expenseTrendLoading } = useExpenseTrend(orgId, startDate, endDate);
  const { data: comparativePeriods, isLoading: comparativeLoading } = useComparativePeriods(orgId, asOfDate);

  const trendChartData = useMemo(
    () =>
      (trend ?? []).map((r) => ({
        month: monthLabel(r.month),
        Revenue: toMajorUnits(r.revenue, currencyCode),
        Expenses: toMajorUnits(r.expenses, currencyCode),
        Net: toMajorUnits(r.net, currencyCode),
      })),
    [currencyCode, trend]
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
    return AGING_BUCKET_ORDER.map((bucket) => ({
      bucket,
      amount: toMajorUnits(map.get(bucket) ?? 0, currencyCode),
    }));
  }, [aging, currencyCode]);

  const expenseChartData = useMemo(
    () => (expenseBreakdown ?? []).map((r) => ({ name: r.category, value: toMajorUnits(r.total, currencyCode) })),
    [currencyCode, expenseBreakdown]
  );

  const cashFlowChartData = useMemo(
    () => (cashFlow ?? []).map((r) => ({ month: monthLabel(r.month), Inflow: toMajorUnits(r.inflow, currencyCode), Outflow: toMajorUnits(r.outflow, currencyCode), Net: toMajorUnits(r.net, currencyCode) })),
    [cashFlow, currencyCode]
  );

  const expenseTrendChartData = useMemo(() => {
    const categories = [...new Set((expenseTrend ?? []).map((r) => r.category))];
    type ExpenseTrendRow = { month: string } & Record<string, number | string>;
    const byMonth = new Map<string, ExpenseTrendRow>();
    for (const row of expenseTrend ?? []) {
      const values: ExpenseTrendRow = byMonth.get(row.month) ?? { month: monthLabel(row.month) };
      values[row.category] = toMajorUnits(row.total, currencyCode);
      byMonth.set(row.month, values);
    }
    return { categories, rows: [...byMonth.values()] };
  }, [currencyCode, expenseTrend]);

  const filteredAging = useMemo(
    () => selectedAgingBucket ? (aging ?? []).filter((row) => row.bucket === selectedAgingBucket) : (aging ?? []),
    [aging, selectedAgingBucket]
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

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-muted/25 p-3">
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
          { label: "Revenue (period)", value: formatMoney(periodTotals.revenue, currencyCode) },
          { label: "Expenses (period)", value: formatMoney(periodTotals.expenses, currencyCode) },
          {
            label: "Net (period)",
            value: formatMoney(periodTotals.net, currencyCode),
            tone: periodTotals.net >= 0 ? "success" : "destructive",
          },
          {
            label: "Outstanding AR",
            value: formatMoney(totalOutstanding, currencyCode),
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
          <p className="py-12 text-center text-sm text-muted-foreground">No posted transactions in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => fmtShort(Number(v))} />
              <Tooltip formatter={(v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke={CHART_SUCCESS} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke={CHART_DESTRUCTIVE} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net" stroke={CHART_NAVY} strokeWidth={2} dot={false} />
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
              <BarChart data={agingByBucket} onClick={(state) => {
                const bucket = state?.activePayload?.[0]?.payload?.bucket as string | undefined;
                if (bucket) setSelectedAgingBucket((current) => current === bucket ? null : bucket);
              }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="bucket" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => fmtShort(Number(v))} />
                <Tooltip formatter={(v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
                <Bar dataKey="amount" fill={CHART_AMBER} radius={[4, 4, 0, 0]} />
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
        {/* Client profitability */}
        <div className="panel">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Client Profitability</h3>
          </div>
          {profitabilityLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !profitability?.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No invoices in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitability.map((c) => (
                  <TableRow key={c.client_id}>
                    <TableCell className="text-sm">{c.client_name}</TableCell>
                    <TableCell className="numeric text-right text-sm">{c.invoice_count}</TableCell>
                    <TableCell className="numeric text-right text-sm">{formatMoney(c.revenue, currencyCode)}</TableCell>
                    <TableCell className="numeric text-right text-sm">{formatMoney(c.collected, currencyCode)}</TableCell>
                    <TableCell className="numeric text-right text-sm">{formatMoney(c.outstanding, currencyCode)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* AR aging detail */}
        <div className="panel">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">Invoice Aging Drill-down</h3>{selectedAgingBucket && <Button variant="ghost" size="sm" onClick={() => setSelectedAgingBucket(null)}>Show all</Button>}</div>
          </div>
          {agingLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !filteredAging.length ? (
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
                {filteredAging.slice(0, 12).map((r) => (
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
                    <TableCell className="numeric text-right text-sm">
                      {formatMoney(r.amount_due, currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Cash Flow</h3>
          <p className="mb-3 text-xs text-muted-foreground">Actual cash and bank movement, separate from accrual-based P&amp;L.</p>
          {cashFlowLoading ? <Skeleton className="h-64 w-full" /> : !cashFlowChartData.length ? <p className="py-12 text-center text-sm text-muted-foreground">No cash movements in this period.</p> : <ResponsiveContainer width="100%" height={260}><BarChart data={cashFlowChartData}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => fmtShort(Number(v))} /><Tooltip /><Legend /><Bar dataKey="Inflow" fill={CHART_SUCCESS} /><Bar dataKey="Outflow" fill={CHART_DESTRUCTIVE} /></BarChart></ResponsiveContainer>}
        </div>
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Expense Trend by Category</h3>
          {expenseTrendLoading ? <Skeleton className="h-64 w-full" /> : !expenseTrendChartData.rows.length ? <p className="py-12 text-center text-sm text-muted-foreground">No expenses in this period.</p> : <ResponsiveContainer width="100%" height={260}><LineChart data={expenseTrendChartData.rows}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => fmtShort(Number(v))} /><Tooltip /><Legend />{expenseTrendChartData.categories.map((category, index) => <Line key={category} type="monotone" dataKey={category} stroke={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer>}
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Comparative Periods</h3>
        {comparativeLoading ? <Skeleton className="h-32 w-full" /> : <Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader><TableBody>{(comparativePeriods ?? []).map((period) => <TableRow key={period.period_key}><TableCell>{period.period_label}</TableCell><TableCell className="numeric text-right">{formatMoney(period.revenue, currencyCode)}</TableCell><TableCell className="numeric text-right">{formatMoney(period.expenses, currencyCode)}</TableCell><TableCell className="numeric text-right">{formatMoney(period.net, currencyCode)}</TableCell></TableRow>)}</TableBody></Table>}
      </div>
    </div>
  );
}
