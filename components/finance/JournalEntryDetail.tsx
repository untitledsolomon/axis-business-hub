"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useJournalEntry } from "@/hooks/finance/use-finance";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { JournalEntryActions } from "@/components/finance/JournalEntryActions";
import { ArrowLeft, Receipt, AlertTriangle } from "lucide-react";
import { formatShortDate } from "@/lib/format-date";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

interface JournalEntryDetailProps {
  entryId: string;
}

export function JournalEntryDetail({ entryId }: JournalEntryDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: entry, isLoading, isError, refetch } = useJournalEntry(orgId, entryId);

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
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this transaction</h3>
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
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Transaction not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This journal entry may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/transactions">Back to Transactions</Link>
        </Button>
      </div>
    );
  }

  const lines = entry.lines || [];
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/transactions">
            <ArrowLeft className="size-4" />
            Back to Transactions
          </Link>
        </Button>
      </div>

      <PageHeader
        title={entry.description || entry.reference || "Untitled entry"}
        description={`${formatShortDate(entry.entry_date)}${
          entry.reference ? ` · Ref ${entry.reference}` : ""
        }`}
        actions={<JournalEntryActions orgId={orgId} entry={entry} showViewDetails={false} />}
      />

      <div className="space-y-4">
        <div>
          <StatusBadge status={entry.status} />
        </div>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Journal lines</h2>
          <div className="mt-4 overflow-x-auto">
            <Table aria-label="Journal entry lines">
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length > 0 ? (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium text-foreground">
                        {line.account ? `${line.account.code ? `${line.account.code} — ` : ""}${line.account.name}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.description || "—"}
                      </TableCell>
                      <TableCell className="numeric text-right">
                        {line.debit ? fmtMoney(line.debit) : ""}
                      </TableCell>
                      <TableCell className="numeric text-right">
                        {line.credit ? fmtMoney(line.credit) : ""}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No lines on this entry.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-sm font-semibold text-foreground">
                    Total
                  </TableCell>
                  <TableCell className="numeric text-right font-semibold text-foreground">
                    {fmtMoney(totalDebit)}
                  </TableCell>
                  <TableCell className="numeric text-right font-semibold text-foreground">
                    {fmtMoney(totalCredit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}
