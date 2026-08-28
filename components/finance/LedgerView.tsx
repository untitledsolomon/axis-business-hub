"use client";

import { useAccounts, useJournalEntries } from "@/hooks/finance/use-finance";
import { useOrg } from "@/hooks/use-org";
import { formatMoney } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileSpreadsheet, History, ArrowUpRight, ArrowDownLeft, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isDateInTimeframe, TIMEFRAME_LABELS, type DashboardTimeframe } from "@/lib/shared/timeframe";

function entryTotal(entry: { lines?: { debit: number; credit: number }[] }) {
  if (!entry.lines || entry.lines.length === 0) return 0;
  // Total of a balanced journal entry is the sum of its debit legs (== sum of credit legs)
  return entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
}

export function LedgerView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: entries, isLoading, isError, refetch } = useJournalEntries(currentOrg?.id || "");
  const { data: accounts, isLoading: accountsLoading } = useAccounts(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [ledgerTimeframe, setLedgerTimeframe] = useState<DashboardTimeframe>("all_time");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedAccountId && accounts?.[0]) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts?.find((account) => account.id === selectedAccountId);
  const ledgerRows = useMemo(() => {
    if (!selectedAccountId) return [];
    const rows = (entries ?? []).flatMap((entry) => (entry.lines ?? [])
      .filter((line) => line.account_id === selectedAccountId && (ledgerTimeframe === "all_time" || isDateInTimeframe(entry.entry_date, ledgerTimeframe)))
      .map((line) => ({ entry, line })));
    rows.sort((a, b) => a.entry.entry_date.localeCompare(b.entry.entry_date));
    let balance = 0;
    return rows.map(({ entry, line }) => {
      const debitNormal = selectedAccount?.category === "asset" || selectedAccount?.category === "expense";
      balance += debitNormal ? line.debit - line.credit : line.credit - line.debit;
      return { entry, line, balance };
    });
  }, [entries, selectedAccount, selectedAccountId, ledgerTimeframe]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totals = useMemo(() => {
    const list = entries ?? [];
    const debits = list.reduce(
      (s, e) => s + (e.lines?.reduce((ls, l) => ls + (l.debit || 0), 0) ?? 0),
      0
    );
    const credits = list.reduce(
      (s, e) => s + (e.lines?.reduce((ls, l) => ls + (l.credit || 0), 0) ?? 0),
      0
    );
    return { debits, credits };
  }, [entries]);

  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const fmt = (minorAmount: number) => formatMoney(minorAmount, baseCurrency);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="General Ledger"
        description="The source of truth for all financial transactions and journal entries."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/activity">
                <History className="size-4" /> Audit Log
              </Link>
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button aria-label="New Journal Entry">
                  <Plus className="size-4" /> New Journal Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>New Journal Entry</DialogTitle>
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
          </>
        }
      />

      <div className="space-y-4 ">
        <SummaryBar
          isLoading={isLoading}
          stats={[
            { label: "Total debits", value: fmt(totals.debits), icon: <ArrowUpRight className="size-4" /> },
            { label: "Total credits", value: fmt(totals.credits), icon: <ArrowDownLeft className="size-4" /> },
            {
              label: "Out of balance",
              value: fmt(Math.abs(totals.debits - totals.credits)),
              icon: <Scale className="size-4" />,
              tone: !isLoading && totals.debits !== totals.credits ? "warning" : "default",
            },
          ]}
        />

        <Tabs defaultValue="entries" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="ledger">Account Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="pt-4">
            <div className="panel">
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <p className="font-display text-sm font-semibold text-foreground">Journal entries</p>
                <div className="relative ml-auto w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search entries…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[120px]">Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="numeric text-muted-foreground">{entry.entry_date}</TableCell>
                        <TableCell className="numeric">{entry.reference || "—"}</TableCell>
                        <TableCell className="font-medium">{entry.description || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell className="numeric text-right">{fmt(entryTotal(entry))}</TableCell>
                        <TableCell>
                          <JournalEntryActions orgId={currentOrg?.id || ""} entry={entry} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileSpreadsheet className="h-12 w-12 text-muted-foreground opacity-20" />
                          <h3 className="text-sm font-semibold text-foreground">No journal entries found</h3>
                          <p className="text-sm text-muted-foreground">
                            Get started by recording your first journal entry.
                          </p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsFormOpen(true)}>
                            <Plus className="size-4" /> New Journal Entry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="ledger" className="pt-4">
            <div className="panel">
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full sm:w-64" aria-label="Select account"><SelectValue placeholder={accountsLoading ? "Loading accounts…" : "Select account"} /></SelectTrigger>
                  <SelectContent>{(accounts ?? []).map((account) => <SelectItem key={account.id} value={account.id}>{account.code ? `${account.code} ` : ""}{account.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={ledgerTimeframe} onValueChange={(value) => setLedgerTimeframe(value as DashboardTimeframe)}>
                  <SelectTrigger className="w-full sm:w-36" aria-label="Select ledger timeframe"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(TIMEFRAME_LABELS) as DashboardTimeframe[]).map((value) => <SelectItem key={value} value={value}>{TIMEFRAME_LABELS[value]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!selectedAccountId ? <div className="py-12 text-center text-sm text-muted-foreground">Select an account to view its transaction history.</div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Running balance</TableHead></TableRow></TableHeader>
                  <TableBody>{ledgerRows.map(({ entry, line, balance }) => <TableRow key={line.id}><TableCell>{entry.entry_date}</TableCell><TableCell>{line.description || entry.description || entry.reference || "—"}</TableCell><TableCell className="text-right">{line.debit ? fmt(line.debit) : "—"}</TableCell><TableCell className="text-right">{line.credit ? fmt(line.credit) : "—"}</TableCell><TableCell className="text-right font-medium">{fmt(balance)}</TableCell></TableRow>)}{ledgerRows.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">No transactions in this timeframe.</TableCell></TableRow>}</TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
