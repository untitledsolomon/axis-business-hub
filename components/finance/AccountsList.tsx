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
import { Plus, Search, MoreHorizontal, Download, FileText, Wallet, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AccountForm } from "@/components/finance/AccountForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { computeAccountBalance } from "@/lib/finance/balance";

export function AccountsList() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: accounts, isLoading, isError, refetch } = useAccounts(currentOrg?.id || "");
  const { data: entries, isLoading: entriesLoading } = useJournalEntries(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts || []) {
      map.set(acc.id, computeAccountBalance(acc.id, entries || [], acc.category));
    }
    return map;
  }, [accounts, entries]);

  const balancesLoading = isLoading || entriesLoading;

  const totals = useMemo(() => {
    if (!accounts) return { assets: 0, liabilities: 0, revenue: 0, expenses: 0 };
    const sum = (category: string) =>
      accounts
        .filter((a) => a.category === category)
        .reduce((s, a) => s + (balances.get(a.id) || 0), 0);
    return {
      assets: sum("asset"),
      liabilities: sum("liability"),
      revenue: sum("revenue"),
      expenses: sum("expense"),
    };
  }, [accounts, balances]);

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts ?? [];
    const q = search.toLowerCase();
    return (accounts ?? []).filter(
      (a) => a.name.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q) || a.sub_type?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const fmt = (minorAmount: number) => formatMoney(minorAmount, baseCurrency);

  const exportCsv = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = filteredAccounts.map((account) => [account.name, account.code || "", account.category, fmt(balances.get(account.id) || 0)]);
    const csv = [["Name", "Code", "Category", "Balance"], ...rows].map((row) => row.map((value) => escape(String(value))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "chart-of-accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="The account structure every journal entry posts against."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" /> Export
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button aria-label="Add Account">
                  <Plus className="size-4" /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                </DialogHeader>
                {currentOrg ? (
                  <AccountForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    You need an active organisation before adding an account.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="space-y-4 ">
        <SummaryBar
          isLoading={balancesLoading}
          stats={[
            { label: "Total assets", value: fmt(totals.assets), icon: <Wallet className="size-4" /> },
            { label: "Total liabilities", value: fmt(totals.liabilities), icon: <Landmark className="size-4" /> },
            { label: "Revenue", value: fmt(totals.revenue), icon: <TrendingUp className="size-4" />, tone: "success" },
            { label: "Expenses", value: fmt(totals.expenses), icon: <TrendingDown className="size-4" /> },
          ]}
        />

        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="font-display text-sm font-semibold text-foreground">All accounts</p>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search accounts…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub-type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="numeric text-muted-foreground">{account.code}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {account.parent_id && <span className="mr-2 text-muted-foreground">↳</span>}
                        {account.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {account.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{account.sub_type}</TableCell>
                    <TableCell className="numeric text-right">
                      {balancesLoading ? (
                        <Skeleton className="ml-auto h-4 w-20" />
                      ) : (
                        fmt(balances.get(account.id) || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Open menu">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href="/finance/ledger">View transactions</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>Edit account</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>Archive account</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
                      <h3 className="text-sm font-semibold text-foreground">No accounts found</h3>
                      <p className="text-sm text-muted-foreground">
                        Get started by adding your first financial account.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsFormOpen(true)}>
                        <Plus className="size-4" /> Add Account
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
