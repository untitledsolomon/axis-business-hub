"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/hooks/use-org";
import { useExpenses, useDeleteExpense, sumExpenses } from "@/hooks/finance/use-expenses";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpenseForm } from "@/components/finance/ExpenseForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { formatShortDate } from "@/lib/format-date";
import { Expense } from "@/lib/types";
import {
  Plus,
  Search,
  MoreHorizontal,
  Receipt,
  Copy,
  Trash2,
  Eye,
  TrendingDown,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport",
  meals: "Meals",
  supplies: "Supplies",
  rent: "Rent",
  utilities: "Utilities",
  salaries: "Salaries",
  other: "Other",
};

export function ExpensesList() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [duplicateFrom, setDuplicateFrom] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: expenses, isLoading, isError, refetch } = useExpenses(orgId, {
    category: category === "all" ? undefined : category,
  });
  const deleteExpense = useDeleteExpense(orgId);
  const openDeleteConfirm = useDeferredModalOpen(setIsDeleteConfirmOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[e.category] || e.category).toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const total = sumExpenses(filtered);

  function handleDuplicate(expense: Expense) {
    setDuplicateFrom(expense);
    setIsFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteExpense.mutateAsync({ id: deleteTarget.id });
    setIsDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Log transport, meals, rent, and other business expenses — posts to the ledger automatically."
        actions={
          <Dialog
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) setDuplicateFrom(null);
            }}
          >
            <DialogTrigger asChild>
              <Button aria-label="Log Expense">
                <Plus className="size-4" /> Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>{duplicateFrom ? "Duplicate Expense" : "Log Expense"}</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <ExpenseForm
                  orgId={currentOrg.id}
                  defaultValues={
                    duplicateFrom
                      ? {
                          amount: duplicateFrom.amount / 100,
                          category: duplicateFrom.category,
                          description: duplicateFrom.description,
                          expense_date: new Date().toISOString().slice(0, 10),
                          payment_method: duplicateFrom.payment_method,
                          paid_from_account_id: duplicateFrom.paid_from_account_id || "",
                          expense_account_id: duplicateFrom.expense_account_id || "",
                          recurrence: duplicateFrom.recurrence,
                        }
                      : undefined
                  }
                  onSuccess={() => {
                    setIsFormOpen(false);
                    setDuplicateFrom(null);
                  }}
                />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before logging an expense.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Total (filtered)"
            value={isLoading ? "—" : `UGX ${(total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon={<TrendingDown className="size-4" />}
          />
          <StatCard
            title="Entries"
            value={isLoading ? "—" : String(filtered.length)}
            icon={<Receipt className="size-4" />}
          />
        </div>

        <div className="panel">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="font-display text-sm font-semibold text-foreground">All expenses</p>
            <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search expenses…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="numeric text-muted-foreground">
                        {formatShortDate(expense.expense_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/finance/expenses/${expense.id}`} className="hover:text-primary hover:underline">
                          {expense.description}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {expense.payment_method.replace("_", " ")}
                      </TableCell>
                      <TableCell className="numeric text-right font-medium">
                        UGX {(expense.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Open menu for ${expense.description}`}>
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu for {expense.description}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/finance/expenses/${expense.id}`}>
                                <Eye className="size-4" /> View details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDuplicate(expense)}>
                              <Copy className="size-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeleteTarget(expense);
                                openDeleteConfirm();
                              }}
                            >
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="text-sm font-semibold text-foreground">No expenses yet</h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                          Log your first expense — transport, lunch, rent, whatever it is — and it&apos;ll
                          post to the ledger automatically.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsFormOpen(true)}>
                          <Plus className="size-4" /> Log Expense
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the expense record. The linked journal entry will remain on the ledger
              for audit purposes — void it separately from the General Ledger if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? "Deleting…" : "Delete Expense"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
