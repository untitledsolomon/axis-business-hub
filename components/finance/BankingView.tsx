"use client";

import { useBankAccounts, useJournalEntries } from "@/hooks/finance/use-finance";
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
import { Plus, Landmark, MoreHorizontal, ArrowRightLeft, Wallet } from "lucide-react";
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
import { BankAccountForm } from "@/components/finance/BankAccountForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { useState, useEffect, useMemo } from "react";
import { computeAccountBalance } from "@/lib/finance/balance";

export function BankingView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: bankAccounts, isLoading } = useBankAccounts(currentOrg?.id || "");
  const { data: entries, isLoading: entriesLoading } = useJournalEntries(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const ba of bankAccounts || []) {
      map.set(ba.id, computeAccountBalance(ba.account_id, entries || [], "asset"));
    }
    return map;
  }, [bankAccounts, entries]);

  const balancesLoading = isLoading || entriesLoading;

  const totalCash = useMemo(() => {
    if (balancesLoading) return 0;
    return (bankAccounts ?? []).reduce((s, a) => s + (balances.get(a.id) || 0), 0);
  }, [bankAccounts, balances, balancesLoading]);

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Banking"
        description="Balances and sync health for every connected account."
        actions={
          <>
            <Button variant="outline">
              <ArrowRightLeft className="size-4" /> Transfer
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button aria-label="Add Account">
                  <Plus className="size-4" /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Bank Account</DialogTitle>
                </DialogHeader>
                {currentOrg ? (
                  <BankAccountForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    You need an active organisation before adding a bank account.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Cash on hand"
            value={balancesLoading ? "—" : fmt(totalCash)}
            icon={<Wallet className="size-4" />}
            subtitle={`Across ${bankAccounts?.length ?? 0} account${bankAccounts?.length === 1 ? "" : "s"}`}
          />
          <StatCard title="Connected accounts" value={isLoading ? "—" : String(bankAccounts?.length ?? 0)} icon={<Landmark className="size-4" />} />
        </div>

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="panel p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-4 h-8 w-28" />
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            ))}
          </div>
        ) : bankAccounts && bankAccounts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {bankAccounts.map((account) => (
              <div key={account.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Landmark className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-foreground">{account.name}</p>
                      <p className="numeric truncate text-xs text-muted-foreground">
                        {account.bank_name || "—"} · {account.account_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="numeric mt-4 text-2xl font-semibold tracking-tight text-foreground">
                  {balancesLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    `${account.currency} ${fmt(balances.get(account.id) || 0)}`
                  )}
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View Transactions
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel flex flex-col items-center justify-center border-dashed py-12 text-center">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="text-sm font-semibold text-foreground">No bank accounts yet</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Add your first bank account or cash float to start tracking balances.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsFormOpen(true)}>
              <Plus className="size-4" /> Add Account
            </Button>
          </div>
        )}

        {bankAccounts && bankAccounts.length > 0 && (
          <div className="panel">
            <div className="border-b border-border p-4">
              <p className="font-display text-sm font-semibold text-foreground">All accounts</p>
            </div>
            <Table aria-label="Bank accounts list">
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-muted-foreground">{account.bank_name || "—"}</TableCell>
                    <TableCell className="numeric text-xs text-muted-foreground">{account.account_number || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{account.currency}</TableCell>
                    <TableCell className="numeric text-right">
                      {balancesLoading ? "—" : fmt(balances.get(account.id) || 0)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open menu for ${account.name}`}>
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open menu for {account.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Import Statement</DropdownMenuItem>
                          <DropdownMenuItem>Reconcile</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
