"use client";

import { useAccounts, useJournalEntries } from "@/hooks/finance/use-finance";
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
import { Plus, Search, Filter, MoreHorizontal, Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AccountForm } from "@/components/finance/AccountForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableErrorState } from "@/components/shared/TableErrorState";
import { useState, useEffect, useMemo } from "react";
import { computeAccountBalance } from "@/lib/finance/balance";

export function AccountsList() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: accounts, isLoading, isError, refetch } = useAccounts(currentOrg?.id || "");
  const { data: entries, isLoading: entriesLoading } = useJournalEntries(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        description="View and manage your organization's financial accounts."
        actions={
          <>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="bg-axis-blue hover:bg-axis-blue-light" aria-label="Add Account">
                  <Plus className="mr-2 h-4 w-4" /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                </DialogHeader>
                {currentOrg ? (
                  <AccountForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    You need an active organisation before adding an account.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
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
              <TableHead className="font-semibold w-[100px]">Code</TableHead>
              <TableHead className="font-semibold">Account Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Sub-type</TableHead>
              <TableHead className="text-right font-semibold">Balance</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableErrorState colSpan={6} onRetry={() => refetch()} />
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : accounts && accounts.length > 0 ? (
              accounts.map((account) => (
                <TableRow key={account.id} className="hover:bg-axis-light/30">
                  <TableCell className="font-mono text-sm">{account.code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {account.parent_id && <span className="ml-4 mr-2 text-muted-foreground">↳</span>}
                      {account.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {account.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{account.sub_type}</TableCell>
                  <TableCell className="text-right font-mono">
                    {balancesLoading ? (
                      <Skeleton className="h-4 w-20 ml-auto" />
                    ) : (
                      ((balances.get(account.id) || 0) / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Open menu">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View transactions</DropdownMenuItem>
                        <DropdownMenuItem>Edit account</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-axis-red">Archive account</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-semibold">No accounts found</h3>
                    <p className="text-muted-foreground">
                      Get started by adding your first financial account.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-axis-blue text-axis-blue"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Account
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
