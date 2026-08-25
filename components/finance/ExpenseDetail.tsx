"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useExpense, useDeleteExpense } from "@/hooks/finance/use-expenses";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { PageHeader } from "@/components/shared/PageHeader";
import { ExpenseForm } from "@/components/finance/ExpenseForm";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { formatShortDate } from "@/lib/format-date";
import { ArrowLeft, AlertTriangle, Receipt, Copy, Trash2, BookOpen } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport",
  meals: "Meals",
  supplies: "Supplies",
  rent: "Rent",
  utilities: "Utilities",
  salaries: "Salaries",
  other: "Other",
};

interface ExpenseDetailProps {
  expenseId: string;
}

export function ExpenseDetail({ expenseId }: ExpenseDetailProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: expense, isLoading, isError, refetch } = useExpense(orgId, expenseId);
  const deleteExpense = useDeleteExpense(orgId);

  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const openDuplicate = useDeferredModalOpen(setIsDuplicateOpen);
  const openDeleteConfirm = useDeferredModalOpen(setIsDeleteConfirmOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isError) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <div className="rounded-full bg-destructive-soft p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this expense</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching this from the server. Please try again.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3 rounded-lg border border-border p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Expense not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This expense may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/finance/expenses">Back to Expenses</Link>
        </Button>
      </div>
    );
  }

  async function handleDelete(event: Event) {
    event.preventDefault();
    if (!expense) return;
    await deleteExpense.mutateAsync({ id: expense.id });
    setIsDeleteConfirmOpen(false);
    router.push("/finance/expenses");
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/finance/expenses">
            <ArrowLeft className="size-4" />
            Back to Expenses
          </Link>
        </Button>
      </div>

      <PageHeader
        title={expense.description}
        description={formatShortDate(expense.expense_date)}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                openDuplicate();
              }}
            >
              <Copy className="size-4" /> Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                openDeleteConfirm();
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="numeric mt-1 text-2xl font-semibold text-foreground">UGX {(expense.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
            <div><p className="text-xs text-muted-foreground">Category</p><p className="mt-1 text-lg font-semibold capitalize text-foreground">{CATEGORY_LABELS[expense.category] || expense.category}</p></div>
            <div><p className="text-xs text-muted-foreground">Recorded</p><p className="numeric mt-1 text-lg font-semibold text-foreground">{formatShortDate(expense.expense_date)}</p></div>
          </div>
        </section>
        <section className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Details</h2>
            <Badge variant="outline" className="capitalize">
              {CATEGORY_LABELS[expense.category] || expense.category}
            </Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="numeric font-semibold text-foreground">
                UGX {(expense.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Payment method</span>
              <span className="capitalize text-foreground">{expense.payment_method.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Recurrence</span>
              <span className="capitalize text-foreground">{expense.recurrence.replace("_", " ")}</span>
            </div>
            {expense.expense_account && (
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">Expense account</span>
                <span className="text-foreground">{expense.expense_account.name}</span>
              </div>
            )}
            {expense.paid_from_account && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid from</span>
                <span className="text-foreground">{expense.paid_from_account.name}</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Ledger trace</h2>
          <div className="mt-3 space-y-2">
            {expense.journal_entry_id ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/transactions/${expense.journal_entry_id}`}>
                  <BookOpen className="size-4" /> View journal entry
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No linked journal entry found.</p>
            )}
          </div>
        </section>
      </div>

      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Duplicate Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            orgId={orgId}
            defaultValues={{
              amount: expense.amount / 100,
              category: expense.category,
              description: expense.description,
              expense_date: new Date().toISOString().slice(0, 10),
              payment_method: expense.payment_method,
              paid_from_account_id: expense.paid_from_account_id || "",
              expense_account_id: expense.expense_account_id || "",
              recurrence: expense.recurrence,
            }}
            onSuccess={() => setIsDuplicateOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
              onClick={(e) => handleDelete(e.nativeEvent)}
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
