"use client";

import { useBankAccounts } from "@/hooks/finance/use-finance";
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
import { Plus, Landmark, MoreHorizontal, ArrowRightLeft, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BankAccountForm } from "@/components/finance/BankAccountForm";
import { useState, useEffect } from "react";

export function BankingView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: bankAccounts, isLoading } = useBankAccounts(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Banking</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts, cash floats, and track balances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-axis-blue hover:bg-blue-800" aria-label="Add Account">
                <Plus className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
              </DialogHeader>
              {currentOrg && (
                <BankAccountForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bankAccounts && bankAccounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {/* Running balance is derived from the linked GL account's journal entries
                    and is not yet computed here — see account.account_id */}
                <div className="text-2xl font-bold">
                  {account.currency} —
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {account.bank_name || "—"} • {account.account_number || "N/A"}
                </p>
                <div className="mt-4 flex justify-end items-center">
                  <Button variant="ghost" size="sm" className="h-8 text-axis-blue">
                    View Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white border rounded-md border-dashed">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No bank accounts yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Add your first bank account or cash float to start tracking balances.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-axis-blue text-axis-blue"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        </div>
      )}

      {bankAccounts && bankAccounts.length > 0 && (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table aria-label="Bank accounts list">
            <TableHeader>
              <TableRow className="bg-axis-light/50">
                <TableHead className="font-semibold">Account Name</TableHead>
                <TableHead className="font-semibold">Bank</TableHead>
                <TableHead className="font-semibold">Account Number</TableHead>
                <TableHead className="font-semibold">Currency</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map((account) => (
                <TableRow key={account.id} className="hover:bg-axis-light/30">
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.bank_name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{account.account_number || "—"}</TableCell>
                  <TableCell>{account.currency}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open menu for ${account.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {account.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Import Statement</DropdownMenuItem>
                        <DropdownMenuItem>Reconcile</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-axis-red">Deactivate</DropdownMenuItem>
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
  );
}
