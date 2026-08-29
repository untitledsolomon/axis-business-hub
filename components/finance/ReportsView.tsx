"use client";

import { useMemo, useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { formatMoney, toMajorUnits } from "@/lib/currency";
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
  const currencyCode = currentOrg?.base_currency || "USD";

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
          <ProfitAndLossTab orgId={orgId} currencyCode={currencyCode} />
        </TabsContent>
        <TabsContent value="balance-sheet">
          <BalanceSheetTab orgId={orgId} currencyCode={currencyCode} />
        </TabsContent>
        <TabsContent value="trial-balance">
          <TrialBalanceTab orgId={orgId} currencyCode={currencyCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------
// Profit & Loss
// ---------------------------------------------------------------------

function ProfitAndLossTab({ orgId, currencyCode }: { orgId: string; currencyCode: string }) {
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
      ...grouped.revenue.map((r) => ["Revenue", r.account_code, r.account_name, toMajorUnits(r.amount, currencyCode).toFixed(2)]),
      ["Revenue", "", "Total Revenue", toMajorUnits(grouped.totalRevenue, currencyCode).toFixed(2)],
      ...grouped.expense.map((r) => ["Expense", r.account_code, r.account_name, toMajorUnits(r.amount, currencyCode).toFixed(2)]),
      ["Expense", "", "Total Expenses", toMajorUnits(grouped.totalExpense, currencyCode).toFixed(2)],
      ["Net", "", "Net Income", toMajorUnits(grouped.net, currencyCode).toFixed(2)],
    ];
    downloadCSV(`profit-and-loss_${startDate}_to_${endDate}.csv`, toCSV(headers, dataRows));
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/25 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
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
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows?.length}>
          <Download className="mr-1.5 size-3.5" /> Export CSV
        </Button>
      </div>

      <SummaryBar
        isLoading={isLoading}
        stats={[
          { label: "Total Revenue", value: formatMoney(grouped.totalRevenue, currencyCode) },
          { label: "Total Expenses", value: formatMoney(grouped.totalExpense, currencyCode) },
          {
            label: "Net Income",
            value: formatMoney(grouped.net, currencyCode),
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
              <PnLSection title="Revenue" rows={grouped.revenue} total={grouped.totalRevenue} currencyCode={currencyCode} />
              <PnLSection title="Expenses" rows={grouped.expense} total={grouped.totalExpense} currencyCode={currencyCode} />
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Net Income</TableCell>
                <TableCell className={`numeric text-right ${grouped.net >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatMoney(grouped.net, currencyCode)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PnLSection({
  title,
  rows,
  total,
  currencyCode,
}: {
  title: string;
  rows: ProfitAndLossRow[];
  total: number;
  currencyCode: string;
}) {
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
          <TableCell className="numeric text-right text-sm">{formatMoney(r.amount, currencyCode)}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-medium">
        <TableCell className="pl-6 text-sm">Total {title}</TableCell>
        <TableCell className="numeric text-right text-sm">{formatMoney(total, currencyCode)}</TableCell>
      </TableRow>
    </>
  );
}

// ---------------------------------------------------------------------
// Balance Sheet
// ---------------------------------------------------------------------

function BalanceSheetTab({ orgId, currencyCode }: { orgId: string; currencyCode: string }) {
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
      ...grouped.assets.map((r) => ["Assets", r.account_code, r.account_name, toMajorUnits(r.balance, currencyCode).toFixed(2)]),
      ["Assets", "", "Total Assets", toMajorUnits(grouped.totalAssets, currencyCode).toFixed(2)],
      ...grouped.liabilities.map((r) => ["Liabilities", r.account_code, r.account_name, toMajorUnits(r.balance, currencyCode).toFixed(2)]),
      ["Liabilities", "", "Total Liabilities", toMajorUnits(grouped.totalLiabilities, currencyCode).toFixed(2)],
      ...grouped.equity.map((r) => ["Equity", r.account_code, r.account_name, toMajorUnits(r.balance, currencyCode).toFixed(2)]),
      ["Equity", "", "Total Equity", toMajorUnits(grouped.totalEquity, currencyCode).toFixed(2)],
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
          { label: "Total Assets", value: formatMoney(grouped.totalAssets, currencyCode) },
          { label: "Total Liabilities", value: formatMoney(grouped.totalLiabilities, currencyCode) },
          { label: "Total Equity", value: formatMoney(grouped.totalEquity, currencyCode) },
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
                <BalanceSheetRows rows={grouped.assets} currencyCode={currencyCode} />
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="numeric text-right">{formatMoney(grouped.totalAssets, currencyCode)}</TableCell>
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
                <BalanceSheetRows rows={grouped.liabilities} currencyCode={currencyCode} />
                <TableRow className="font-medium">
                  <TableCell className="pl-6 text-sm">Total Liabilities</TableCell>
                  <TableCell className="numeric text-right text-sm">{formatMoney(grouped.totalLiabilities, currencyCode)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Equity
                  </TableCell>
                </TableRow>
                <BalanceSheetRows rows={grouped.equity} currencyCode={currencyCode} />
                <TableRow className="font-medium">
                  <TableCell className="pl-6 text-sm">Total Equity</TableCell>
                  <TableCell className="numeric text-right text-sm">{formatMoney(grouped.totalEquity, currencyCode)}</TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total Liabilities &amp; Equity</TableCell>
                  <TableCell className="numeric text-right">
                    {formatMoney(grouped.totalLiabilities + grouped.totalEquity, currencyCode)}
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

function BalanceSheetRows({ rows, currencyCode }: { rows: BalanceSheetRow[]; currencyCode: string }) {
  return (
    <>
      {rows.map((r) => (
        <TableRow key={r.account_id ?? r.account_code}>
          <TableCell className="pl-6 text-sm">
            <span className="text-muted-foreground">{r.account_code}</span> {r.account_name}
          </TableCell>
          <TableCell className="numeric text-right text-sm">{formatMoney(r.balance, currencyCode)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------
// Trial Balance
// ---------------------------------------------------------------------

function TrialBalanceTab({ orgId, currencyCode }: { orgId: string; currencyCode: string }) {
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
        toMajorUnits(r.total_debit, currencyCode).toFixed(2),
        toMajorUnits(r.total_credit, currencyCode).toFixed(2),
      ]);
    dataRows.push([
      "",
      "",
      "Total",
      toMajorUnits(totals.debit, currencyCode).toFixed(2),
      toMajorUnits(totals.credit, currencyCode).toFixed(2),
    ]);
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
          { label: "Total Debits", value: formatMoney(totals.debit, currencyCode) },
          { label: "Total Credits", value: formatMoney(totals.credit, currencyCode) },
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
                      {r.total_debit ? formatMoney(r.total_debit, currencyCode) : ""}
                    </TableCell>
                    <TableCell className="numeric text-right text-sm">
                      {r.total_credit ? formatMoney(r.total_credit, currencyCode) : ""}
                    </TableCell>
                  </TableRow>
                ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="numeric text-right">{formatMoney(totals.debit, currencyCode)}</TableCell>
                <TableCell className="numeric text-right">{formatMoney(totals.credit, currencyCode)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
