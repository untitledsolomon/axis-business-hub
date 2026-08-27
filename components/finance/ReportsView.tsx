"use client";

import { useMemo, useState } from "react";
import { useOrg } from "@/hooks/use-org";
import {
  useTrialBalance,
  useProfitAndLoss,
  useBalanceSheet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Scale, TrendingUp, Landmark } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import type { BalanceSheetRow, ProfitAndLossRow, TrialBalanceRow } from "@/lib/types";

const fmt = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function toCSV(headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Trial balance, profit & loss, and balance sheet — computed directly from posted journal entries."
      />
      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">
            <TrendingUp className="mr-1.5 size-3.5" /> Profit &amp; Loss
          </TabsTrigger>
          <TabsTrigger value="balance-sheet">
            <Landmark className="mr-1.5 size-3.5" /> Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="trial-balance">
            <Scale className="mr-1.5 size-3.5" /> Trial Balance
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pnl">
          <ProfitAndLossTab orgId={orgId} />
        </TabsContent>
        <TabsContent value="balance-sheet">
          <BalanceSheetTab orgId={orgId} />
        </TabsContent>
        <TabsContent value="trial-balance">
          <TrialBalanceTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------
// Profit & Loss
// ---------------------------------------------------------------------

function ProfitAndLossTab({ orgId }: { orgId: string }) {
  const [startDate, setStartDate] = useState(firstOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const { data: rows, isLoading } = useProfitAndLoss(orgId, startDate, endDate);

  const grouped = useMemo(() => {
    const revenue = (rows ?? []).filter((r) => r.account_category === "revenue");
    const expense = (rows ?? []).filter((r) => r.account_category === "expense");
    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
    return { revenue, expense, totalRevenue, totalExpense, net: totalRevenue - totalExpense };
  }, [rows]);

  const exportCSV = () => {
    const headers = ["Section", "Code", "Account", "Amount"];
    const dataRows: (string | number)[][] = [
      ...grouped.revenue.map((r) => ["Revenue", r.account_code, r.account_name, (r.amount / 100).toFixed(2)]),
      ["Revenue", "", "Total Revenue", (grouped.totalRevenue / 100).toFixed(2)],
      ...grouped.expense.map((r) => ["Expense", r.account_code, r.account_name, (r.amount / 100).toFixed(2)]),
      ["Expense", "", "Total Expenses", (grouped.totalExpense / 100).toFixed(2)],
      ["Net", "", "Net Income", (grouped.net / 100).toFixed(2)],
    ];
    downloadCSV(`profit-and-loss_${startDate}_to_${endDate}.csv`, toCSV(headers, dataRows));
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">From</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">To</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows?.length}>
          <Download className="mr-1.5 size-3.5" /> Export CSV
        </Button>
      </div>

      <SummaryBar
        isLoading={isLoading}
        stats={[
          { label: "Total Revenue", value: fmt(grouped.totalRevenue) },
          { label: "Total Expenses", value: fmt(grouped.totalExpense) },
          {
            label: "Net Income",
            value: fmt(grouped.net),
            tone: grouped.net >= 0 ? "success" : "destructive",
          },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !rows?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No posted transactions in this period.
        </p>
      ) : (
        <div className="panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <PnLSection title="Revenue" rows={grouped.revenue} total={grouped.totalRevenue} />
              <PnLSection title="Expenses" rows={grouped.expense} total={grouped.totalExpense} />
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Net Income</TableCell>
                <TableCell className={`numeric text-right ${grouped.net >= 0 ? "text-success" : "text-destructive"}`}>
                  {fmt(grouped.net)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PnLSection({ title, rows, total }: { title: string; rows: ProfitAndLossRow[]; total: number }) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <TableRow key={r.account_id}>
          <TableCell className="pl-6 text-sm">
            <span className="text-muted-foreground">{r.account_code}</span> {r.account_name}
          </TableCell>
          <TableCell className="numeric text-right text-sm">{fmt(r.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-medium">
        <TableCell className="pl-6 text-sm">Total {title}</TableCell>
        <TableCell className="numeric text-right text-sm">{fmt(total)}</TableCell>
      </TableRow>
    </>
  );
}

// ---------------------------------------------------------------------
// Balance Sheet
// ---------------------------------------------------------------------

function BalanceSheetTab({ orgId }: { orgId: string }) {
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const { data: rows, isLoading } = useBalanceSheet(orgId, asOfDate);

  const grouped = useMemo(() => {
    const assets = (rows ?? []).filter((r) => r.account_category === "asset");
    const liabilities = (rows ?? []).filter((r) => r.account_category === "liability");
    const equity = (rows ?? []).filter((r) => r.account_category === "equity");
    const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
    const totalEquity = equity.reduce((s, r) => s + r.balance, 0);
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
  }, [rows]);

  const balances = grouped.totalAssets === grouped.totalLiabilities + grouped.totalEquity;

  const exportCSV = () => {
    const headers = ["Section", "Code", "Account", "Balance"];
    const dataRows: (string | number)[][] = [
      ...grouped.assets.map((r) => ["Assets", r.account_code, r.account_name, (r.balance / 100).toFixed(2)]),
      ["Assets", "", "Total Assets", (grouped.totalAssets / 100).toFixed(2)],
      ...grouped.liabilities.map((r) => ["Liabilities", r.account_code, r.account_name, (r.balance / 100).toFixed(2)]),
      ["Liabilities", "", "Total Liabilities", (grouped.totalLiabilities / 100).toFixed(2)],
      ...grouped.equity.map((r) => ["Equity", r.account_code, r.account_name, (r.balance / 100).toFixed(2)]),
      ["Equity", "", "Total Equity", (grouped.totalEquity / 100).toFixed(2)],
    ];
    downloadCSV(`balance-sheet_${asOfDate}.csv`, toCSV(headers, dataRows));
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">As of</label>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows?.length}>
          <Download className="mr-1.5 size-3.5" /> Export CSV
        </Button>
      </div>

      <SummaryBar
        isLoading={isLoading}
        stats={[
          { label: "Total Assets", value: fmt(grouped.totalAssets) },
          { label: "Total Liabilities", value: fmt(grouped.totalLiabilities) },
          { label: "Total Equity", value: fmt(grouped.totalEquity) },
          {
            label: "Balances",
            value: balances ? "Yes" : "No — check ledger",
            tone: balances ? "success" : "destructive",
          },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assets</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <BalanceSheetRows rows={grouped.assets} />
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="numeric text-right">{fmt(grouped.totalAssets)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Liabilities &amp; Equity</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Liabilities
                  </TableCell>
                </TableRow>
                <BalanceSheetRows rows={grouped.liabilities} />
                <TableRow className="font-medium">
                  <TableCell className="pl-6 text-sm">Total Liabilities</TableCell>
                  <TableCell className="numeric text-right text-sm">{fmt(grouped.totalLiabilities)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Equity
                  </TableCell>
                </TableRow>
                <BalanceSheetRows rows={grouped.equity} />
                <TableRow className="font-medium">
                  <TableCell className="pl-6 text-sm">Total Equity</TableCell>
                  <TableCell className="numeric text-right text-sm">{fmt(grouped.totalEquity)}</TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total Liabilities &amp; Equity</TableCell>
                  <TableCell className="numeric text-right">
                    {fmt(grouped.totalLiabilities + grouped.totalEquity)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceSheetRows({ rows }: { rows: BalanceSheetRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <TableRow key={r.account_id ?? r.account_code}>
          <TableCell className="pl-6 text-sm">
            <span className="text-muted-foreground">{r.account_code}</span> {r.account_name}
          </TableCell>
          <TableCell className="numeric text-right text-sm">{fmt(r.balance)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------
// Trial Balance
// ---------------------------------------------------------------------

function TrialBalanceTab({ orgId }: { orgId: string }) {
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const { data: rows, isLoading } = useTrialBalance(orgId, asOfDate);

  const totals = useMemo(() => {
    const debit = (rows ?? []).reduce((s, r) => s + r.total_debit, 0);
    const credit = (rows ?? []).reduce((s, r) => s + r.total_credit, 0);
    return { debit, credit };
  }, [rows]);

  const balances = totals.debit === totals.credit;

  const exportCSV = () => {
    const headers = ["Code", "Account", "Category", "Debit", "Credit"];
    const dataRows: (string | number)[][] = (rows ?? [])
      .filter((r) => r.total_debit !== 0 || r.total_credit !== 0)
      .map((r: TrialBalanceRow) => [
        r.account_code,
        r.account_name,
        r.account_category,
        (r.total_debit / 100).toFixed(2),
        (r.total_credit / 100).toFixed(2),
      ]);
    dataRows.push(["", "", "Total", (totals.debit / 100).toFixed(2), (totals.credit / 100).toFixed(2)]);
    downloadCSV(`trial-balance_${asOfDate}.csv`, toCSV(headers, dataRows));
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">As of</label>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows?.length}>
          <Download className="mr-1.5 size-3.5" /> Export CSV
        </Button>
      </div>

      <SummaryBar
        isLoading={isLoading}
        stats={[
          { label: "Total Debits", value: fmt(totals.debit) },
          { label: "Total Credits", value: fmt(totals.credit) },
          {
            label: "Balances",
            value: balances ? "Yes" : "No — check ledger",
            tone: balances ? "success" : "destructive",
          },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? [])
                .filter((r) => r.total_debit !== 0 || r.total_credit !== 0)
                .map((r) => (
                  <TableRow key={r.account_id}>
                    <TableCell className="text-sm text-muted-foreground">{r.account_code}</TableCell>
                    <TableCell className="text-sm">{r.account_name}</TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">{r.account_category}</TableCell>
                    <TableCell className="numeric text-right text-sm">
                      {r.total_debit ? fmt(r.total_debit) : ""}
                    </TableCell>
                    <TableCell className="numeric text-right text-sm">
                      {r.total_credit ? fmt(r.total_credit) : ""}
                    </TableCell>
                  </TableRow>
                ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="numeric text-right">{fmt(totals.debit)}</TableCell>
                <TableCell className="numeric text-right">{fmt(totals.credit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
