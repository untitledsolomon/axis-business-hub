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
import { Plus, Search, MoreHorizontal, FileSpreadsheet, History, ArrowUpRight, ArrowDownLeft, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { useState, useEffect, useMemo } from "react";

function entryTotal(entry: { lines?: { debit: number; credit: number }[] }) {
  if (!entry.lines || entry.lines.length === 0) return 0;
  // Total of a balanced journal entry is the sum of its debit legs (== sum of credit legs)
  return entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
}

export function LedgerView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: entries, isLoading, isError, refetch } = useJournalEntries(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="General Ledger"
        description="The source of truth for all financial transactions and journal entries."
        actions={
          <>
            <Button variant="outline">
              <History className="size-4" /> Audit Log
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

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Total debits" value={isLoading ? "—" : fmt(totals.debits)} icon={<ArrowUpRight className="size-4" />} />
          <StatCard title="Total credits" value={isLoading ? "—" : fmt(totals.credits)} icon={<ArrowDownLeft className="size-4" />} />
          <StatCard
            title="Out of balance"
            value={isLoading ? "—" : fmt(Math.abs(totals.debits - totals.credits))}
            icon={<Scale className="size-4" />}
          />
        </div>

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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Open menu for ${entry.reference || entry.id}`}
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">
                                  Open menu for {entry.reference || entry.id}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Entry</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {entry.status === "posted" ? (
                                <DropdownMenuItem className="text-destructive">Void Entry</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-success">Post Entry</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            <div className="panel flex flex-col items-center justify-center border-dashed py-12 text-center">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
              <h3 className="text-sm font-semibold text-foreground">Detailed Ledger View</h3>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Select an account to view its full transaction history and running balance.
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Select Account
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
