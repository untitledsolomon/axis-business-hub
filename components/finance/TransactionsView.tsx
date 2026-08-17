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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Filter, Receipt } from "lucide-react";
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
import { useState, useEffect, useMemo } from "react";
import type { JournalEntry } from "@/lib/types";

type TxType = "income" | "expense" | "other";

interface DerivedTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TxType;
  amount: number; // in cents
  status: string;
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
  };
}

export function TransactionsView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: entries, isLoading } = useJournalEntries(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const transactions = useMemo(() => {
    if (!entries) return [];
    const derived = entries.map(deriveTransaction);
    if (!search.trim()) return derived;
    const q = search.toLowerCase();
    return derived.filter(
      (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [entries, search]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Transactions</h1>
          <p className="text-muted-foreground">
            A real-time ledger of all organization financial activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-axis-blue hover:bg-blue-800" aria-label="Record Transaction">
                <Plus className="mr-2 h-4 w-4" /> Record Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Record Transaction</DialogTitle>
              </DialogHeader>
              {currentOrg && (
                <JournalEntryForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
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
              <TableHead className="font-semibold w-[150px]">Date</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-axis-light/30">
                  <TableCell className="text-sm">{transaction.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="h-4 w-4 text-axis-green shrink-0" />
                      ) : transaction.type === "expense" ? (
                        <ArrowDownLeft className="h-4 w-4 text-axis-red shrink-0" />
                      ) : (
                        <div className="h-4 w-4 shrink-0" />
                      )}
                      <span className="font-medium truncate">{transaction.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-axis-light text-axis-gray border-none">
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={
                      transaction.type === "income"
                        ? "text-axis-green font-semibold"
                        : transaction.type === "expense"
                        ? "text-axis-red font-semibold"
                        : "font-semibold"
                    }
                  >
                    {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                    {(transaction.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        transaction.status === "posted"
                          ? "bg-axis-green/5 text-axis-green border-axis-green/20"
                          : "bg-axis-gray/5 text-axis-gray border-axis-gray/20"
                      }
                    >
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Open menu for ${transaction.description}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {transaction.description}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Journal Entry</DropdownMenuItem>
                        <DropdownMenuItem>View Attachment</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-axis-red">Void Transaction</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-semibold">No transactions found</h3>
                    <p className="text-muted-foreground">
                      Get started by recording your first transaction.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-axis-blue text-axis-blue"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Record Transaction
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
