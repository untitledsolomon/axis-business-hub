"use client";

import { useJournalEntries } from "@/hooks/finance/use-finance";
import { useOrg } from "@/hooks/use-org";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreHorizontal, FileSpreadsheet, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { TableErrorState } from "@/components/shared/TableErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
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

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
        description="The source of truth for all financial transactions and journal entries."
        actions={
          <>
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" /> Audit Log
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="bg-axis-blue hover:bg-axis-blue-light" aria-label="New Journal Entry">
                  <Plus className="mr-2 h-4 w-4" /> New Journal Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>New Journal Entry</DialogTitle>
                </DialogHeader>
                {currentOrg ? (
                  <JournalEntryForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    There&apos;s nothing to record against yet — set up your organisation&apos;s Chart of Accounts first.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="ledger">Account Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
          </div>

          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-axis-light/50">
                  <TableHead className="font-semibold w-[120px]">Date</TableHead>
                  <TableHead className="font-semibold w-[120px]">Reference</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Total Amount</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableErrorState colSpan={6} onRetry={() => refetch()} />
                ) : isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-axis-light/30">
                      <TableCell className="text-sm">{entry.entry_date}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.reference || "—"}</TableCell>
                      <TableCell className="font-medium">{entry.description || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(entryTotal(entry) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Open menu for ${entry.reference || entry.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
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
                              <DropdownMenuItem className="text-axis-red">Void Entry</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-axis-green">Post Entry</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileSpreadsheet className="h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="text-lg font-semibold">No journal entries found</h3>
                        <p className="text-muted-foreground">
                          Get started by recording your first journal entry.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4 border-axis-blue text-axis-blue"
                          onClick={() => setIsFormOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> New Journal Entry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4 pt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white border rounded-md border-dashed">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold">Detailed Ledger View</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Select an account to view its full transaction history and running balance.
            </p>
            <Button variant="outline" className="mt-4 border-axis-blue text-axis-blue">
              Select Account
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
