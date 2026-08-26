"use client";

import { useJournalEntries } from "@/hooks/finance/use-finance";
import { useOrg } from "@/hooks/use-org";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, ArrowUpRight, ArrowDownLeft, Filter, Receipt, Scale, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { JournalEntryActions } from "@/components/finance/JournalEntryActions";
import { PageHeader } from "@/components/shared/PageHeader";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { JournalEntry } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isDateInTimeframe, TIMEFRAME_LABELS, type DashboardTimeframe } from "@/lib/shared/timeframe";

type TxType = "income" | "expense" | "other";

interface DerivedTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TxType;
  amount: number; // in cents
  status: string;
  entry: JournalEntry;
}

/**
 * A journal entry can touch many accounts across its lines. For the simplified
 * Transactions view we classify the entry as "income" if its lines touch a
 * revenue account, "expense" if they touch an expense account, and fall back
 * to "other" (e.g. pure asset/liability transfers) otherwise. The displayed
 * amount is the revenue/expense leg specifically, not the full entry total,
 * so it reads correctly as "how much income/expense did this represent."
 */
function deriveTransaction(entry: JournalEntry): DerivedTransaction {
  const lines = entry.lines || [];
  const revenueLine = lines.find((l) => l.account?.category === "revenue");
  const expenseLine = lines.find((l) => l.account?.category === "expense");
  // Invoice payments (mark_invoice_paid_v1) never touch a revenue account —
  // revenue was already recognized when the invoice was raised. The entry
  // instead debits a bank/cash account and credits Accounts Receivable to
  // clear it. On a cash basis that credit-to-AR leg IS the "money in" event,
  // so treat it as income too or it silently falls into "other" and never
  // counts toward Money In.
  const arClearingLine = lines.find(
    (l) => l.account?.category === "asset" && l.account?.name === "Accounts Receivable" && (l.credit || 0) > 0
  );
  const depositLine = lines.find(
    (l) => l.account?.category === "asset" && l.account?.name !== "Accounts Receivable" && (l.debit || 0) > 0
  );

  let type: TxType = "other";
  let amount = 0;
  let category = "General";

  if (revenueLine) {
    type = "income";
    amount = revenueLine.credit || revenueLine.debit || 0;
    category = revenueLine.account?.name || "Revenue";
  } else if (expenseLine) {
    type = "expense";
    amount = expenseLine.debit || expenseLine.credit || 0;
    category = expenseLine.account?.name || "Expense";
  } else if (arClearingLine) {
    type = "income";
    amount = depositLine?.debit || arClearingLine.credit || 0;
    category = "Invoice Payment";
  } else if (lines.length > 0) {
    amount = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    category = lines[0].account?.name || "General";
  }

  return {
    id: entry.id,
    date: entry.entry_date,
    description: entry.description || entry.reference || "Untitled entry",
    category,
    type,
    amount,
    status: entry.status,
    entry,
  };
}

export function TransactionsView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: entries, isLoading, isError, refetch } = useJournalEntries(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("all_time");
  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const transactions = useMemo(() => {
    if (!entries) return [];
    const derived = entries.map(deriveTransaction);
    const byDate = derived.filter((transaction) => {
      const inTimeframe = timeframe === "all_time" || isDateInTimeframe(transaction.date, timeframe);
      return inTimeframe && (!fromDate || transaction.date >= fromDate) && (!toDate || transaction.date <= toDate);
    });
    const byType = typeFilter === "all" ? byDate : byDate.filter((transaction) => transaction.type === typeFilter);
    if (!search.trim()) return byType;
    const q = search.toLowerCase();
    return byType.filter(
      (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [entries, search, timeframe, typeFilter, fromDate, toDate]);

  const totals = useMemo(() => {
    const all = transactions;
    const inflow = all.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const outflow = all.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [transactions]);

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Transactions"
        description="A real-time ledger of all organisation financial activity."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Record Transaction">
                <Plus className="size-4" /> Record Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Record Transaction</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <JournalEntryForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  There&apos;s nothing to record against yet — set up your organisation&apos;s Chart of Accounts first.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <SummaryBar
          isLoading={isLoading}
          stats={[
            { label: "Money in", value: fmt(totals.inflow), icon: <ArrowUpRight className="size-4" />, tone: "success" },
            { label: "Money out", value: fmt(totals.outflow), icon: <ArrowDownLeft className="size-4" /> },
            { label: "Net movement", value: fmt(totals.net), icon: <Scale className="size-4" /> },
          ]}
        />

        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="font-display text-sm font-semibold text-foreground">Activity</p>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={timeframe} onValueChange={(value) => setTimeframe(value as DashboardTimeframe)}>
              <SelectTrigger className="w-full sm:w-36" aria-label="Select timeframe"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(TIMEFRAME_LABELS) as DashboardTimeframe[]).map((value) => <SelectItem key={value} value={value}>{TIMEFRAME_LABELS[value]}</SelectItem>)}</SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Filter"><Filter className="size-4" /></Button></PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-4">
                <p className="text-sm font-semibold">Filter transactions</p>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                  <SelectTrigger aria-label="Transaction type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
                <div className="grid gap-2"><label className="text-xs text-muted-foreground" htmlFor="transaction-from">From</label><Input id="transaction-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
                <div className="grid gap-2"><label className="text-xs text-muted-foreground" htmlFor="transaction-to">To</label><Input id="transaction-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
              </PopoverContent>
            </Popover>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-destructive-soft p-3">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this data</h3>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="numeric text-muted-foreground">{transaction.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full",
                            transaction.type === "income"
                              ? "bg-success-soft text-success"
                              : transaction.type === "expense"
                              ? "bg-destructive-soft text-destructive"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {transaction.type === "income" ? (
                            <ArrowDownLeft className="size-3.5" />
                          ) : transaction.type === "expense" ? (
                            <ArrowUpRight className="size-3.5" />
                          ) : (
                            <Receipt className="size-3.5" />
                          )}
                        </span>
                        <span className="truncate font-medium text-foreground">{transaction.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="border-none bg-muted text-muted-foreground">
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "numeric font-medium",
                        transaction.type === "income"
                          ? "text-success"
                          : transaction.type === "expense"
                          ? "text-destructive"
                          : "text-foreground"
                      )}
                    >
                      {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                      {fmt(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell>
                      <JournalEntryActions orgId={currentOrg?.id || ""} entry={transaction.entry} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
                      <h3 className="text-sm font-semibold text-foreground">No transactions found</h3>
                      <p className="text-sm text-muted-foreground">
                        Get started by recording your first transaction.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsFormOpen(true)}>
                        <Plus className="size-4" /> Record Transaction
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
