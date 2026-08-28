"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/hooks/use-org";
import { formatMoney } from "@/lib/currency";
import { useDailySales } from "@/hooks/finance/use-daily-sales";
import { useExpenses } from "@/hooks/finance/use-expenses";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { ExpenseForm } from "@/components/finance/ExpenseForm";
import { QuickSaleForm } from "@/components/finance/QuickSaleForm";
import { Plus, Minus, Wallet, Receipt, ShoppingBag, FileText } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DailySummaryView() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  const { data: sales, isLoading: salesLoading } = useDailySales(orgId, {
    from: selectedDate,
    to: selectedDate,
  });
  const { data: expenses, isLoading: expensesLoading } = useExpenses(orgId, {
    from: selectedDate,
    to: selectedDate,
  });
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(orgId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Invoices "marked paid that day" — the invoices table doesn't track a
  // separate paid_at timestamp, so this uses updated_at on paid invoices as
  // the best available signal for "paid today." Good enough for a same-day
  // reconciliation glance; not meant to be a precise accounting record.
  const invoicesPaidToday = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(
      (inv) => inv.status === "paid" && inv.updated_at?.slice(0, 10) === selectedDate
    );
  }, [invoices, selectedDate]);

  const quickSalesTotal = (sales ?? []).reduce((s, sale) => s + sale.amount, 0);
  const invoicesPaidTotal = invoicesPaidToday.reduce((s, inv) => s + inv.grand_total, 0);
  const totalRevenue = quickSalesTotal + invoicesPaidTotal;
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const netCash = totalRevenue - totalExpenses;

  const isLoading = salesLoading || expensesLoading || invoicesLoading;

  const baseCurrency = currentOrg?.base_currency ?? "UGX";
  const fmt = (minorAmount: number) => formatMoney(minorAmount, baseCurrency);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Daily Summary"
        description="A snapshot of the day's revenue, expenses, and net cash position — not a formal period close."
        actions={
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-44"
          />
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
            <Button
              size="lg"
              className="h-auto w-full justify-start gap-3 bg-axis-blue py-4 hover:bg-axis-blue-light"
              onClick={() => setIsSaleDialogOpen(true)}
            >
              <Plus className="size-5" />
              <div className="text-left">
                <p className="font-semibold">Log a sale</p>
                <p className="text-xs font-normal opacity-90">Record a walk-in or non-invoiced sale</p>
              </div>
            </Button>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Log Sale</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <QuickSaleForm orgId={currentOrg.id} onSuccess={() => setIsSaleDialogOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before logging a sale.
                </p>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <Button
              size="lg"
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-4"
              onClick={() => setIsExpenseDialogOpen(true)}
            >
              <Minus className="size-5" />
              <div className="text-left">
                <p className="font-semibold">Log an expense</p>
                <p className="text-xs font-normal text-muted-foreground">Transport, lunch, rent, and more</p>
              </div>
            </Button>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Log Expense</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <ExpenseForm orgId={currentOrg.id} onSuccess={() => setIsExpenseDialogOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before logging an expense.
                </p>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <SummaryBar
          stats={[
            { label: "Quick sales + paid invoices", value: isLoading ? "—" : fmt(totalRevenue), icon: <ShoppingBag className="size-4" />, tone: "success" },
            { label: "Expenses logged", value: isLoading ? "—" : fmt(totalExpenses), icon: <Receipt className="size-4" /> },
            {
              label: "Net cash position",
              value: isLoading ? "—" : fmt(netCash),
              icon: <Wallet className="size-4" />,
              tone: netCash < 0 && !isLoading ? "destructive" : "default",
            },
            { label: "Invoices paid today", value: isLoading ? "—" : String(invoicesPaidToday.length), icon: <FileText className="size-4" /> },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel">
            <div className="border-b border-border p-4">
              <p className="font-display text-sm font-semibold text-foreground">Quick sales</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : sales && sales.length > 0 ? (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <Link href={`/finance/daily-sales/${sale.id}`} className="hover:text-primary hover:underline">
                            {sale.description}
                          </Link>
                        </TableCell>
                        <TableCell className="numeric text-right">{fmt(sale.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                        No quick sales logged for this day yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="panel">
            <div className="border-b border-border p-4">
              <p className="font-display text-sm font-semibold text-foreground">Expenses</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : expenses && expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Link href={`/finance/expenses/${expense.id}`} className="hover:text-primary hover:underline">
                            {expense.description}
                          </Link>
                        </TableCell>
                        <TableCell className="numeric text-right">{fmt(expense.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                        No expenses logged for this day yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
