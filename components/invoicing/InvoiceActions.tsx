"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
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
import { ActionTooltip } from "@/components/shared/ActionTooltip";
import { MarkPaidDialog } from "@/components/invoicing/MarkPaidDialog";
import { useVoidInvoice, useSendInvoiceEmail, useUpdateInvoiceStatus, generateInvoicePdf } from "@/hooks/invoicing/use-invoices";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { Invoice } from "@/lib/types";
import { MoreHorizontal, FileDown, Send, CheckCircle, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import posthog from "posthog-js";

interface InvoiceActionsProps {
  orgId: string;
  invoice: Invoice;
  /** Show a "View details" entry — omit on the detail page itself. */
  showViewDetails?: boolean;
}

export function InvoiceActions({ orgId, invoice, showViewDetails = true }: InvoiceActionsProps) {
  const router = useRouter();
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const voidInvoice = useVoidInvoice(orgId);
  const sendEmail = useSendInvoiceEmail(orgId);
  const updateStatus = useUpdateInvoiceStatus(orgId);
  const openMarkPaid = useDeferredModalOpen(setIsMarkPaidOpen);
  const openVoidConfirm = useDeferredModalOpen(setIsVoidConfirmOpen);

  const isPaid = invoice.status === "paid";
  const isVoided = invoice.status === "voided";
  const canMarkPaid = !isPaid && !isVoided;
  const canVoid = !isPaid && !isVoided;
  const canSend = !isVoided;
  // Manual forward-only status moves through the non-accounting states.
  // 'paid' and 'voided' go through their own dedicated actions above,
  // which post the real journal entries — this menu only ever writes a
  // plain status (plus, on the first draft exit, the accrual entry — see
  // update_invoice_status_v1).
  const manualStatusOptions: { value: "draft" | "sent" | "viewed" | "partial" | "overdue"; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "viewed", label: "Viewed" },
    { value: "partial", label: "Partially Paid" },
    { value: "overdue", label: "Overdue" },
  ];
  const canChangeStatus = !isPaid && !isVoided;

  async function handleStatusChange(status: string) {
    if (status === invoice.status) return;
    await updateStatus.mutateAsync({ invoice_id: invoice.id, status });
    posthog.capture("invoice_status_changed", { from: invoice.status, to: status });
  }

  async function handleDownloadPdf() {
    setIsDownloading(true);
    try {
      const blob = await generateInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      posthog.capture("invoice_pdf_downloaded", { invoice_status: invoice.status });
      toast.success("Invoice PDF downloaded");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate PDF";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSend() {
    if (!invoice.client?.email) {
      toast.error("This client has no email address on file — add one before sending.");
      return;
    }
    await sendEmail.mutateAsync({ invoiceId: invoice.id });
    posthog.capture("invoice_email_sent", { invoice_status: invoice.status });
  }

  async function handleVoid(event?: Event, reason?: string) {
    // AlertDialogAction auto-closes the dialog on click by default (Radix
    // behavior). That auto-close and this async handler's own state update
    // were racing — if the mutation was still pending when Radix closed
    // and unmounted the dialog, our isVoidConfirmOpen state stayed stale
    // at `true`, which left Radix's focus-trap/overlay bookkeeping
    // desynced and made the whole app unresponsive to clicks until a hard
    // refresh. preventDefault() stops the auto-close so our own
    // setIsVoidConfirmOpen(false) below is the only thing that ever closes
    // it, once the mutation actually finishes.
    event?.preventDefault();
    await voidInvoice.mutateAsync({ invoice_id: invoice.id, reason });
    posthog.capture("invoice_voided", { invoice_status: invoice.status });
    setIsVoidConfirmOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <ActionTooltip label="More actions">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Open menu for ${invoice.invoice_number}`}>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu for {invoice.invoice_number}</span>
            </Button>
          </DropdownMenuTrigger>
        </ActionTooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {showViewDetails && (
            <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}`)}>
              <Eye className="size-4" /> View details
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleDownloadPdf} disabled={isDownloading}>
            <FileDown className="size-4" /> {isDownloading ? "Generating…" : "Download PDF"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSend} disabled={!canSend || sendEmail.isPending}>
            <Send className="size-4" /> {sendEmail.isPending ? "Sending…" : "Send to Client"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Set status</DropdownMenuLabel>
          {manualStatusOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => handleStatusChange(opt.value)}
              disabled={!canChangeStatus || updateStatus.isPending || invoice.status === opt.value}
            >
              {invoice.status === opt.value ? `✓ ${opt.label}` : opt.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              // Radix's default onSelect behavior returns focus to the
              // dropdown trigger as the menu closes. That focus-return and
              // this dialog opening on the same tick race each other —
              // Radix can end up with the dropdown's content still holding
              // focus/aria-hidden bookkeeping while a new focus-trap
              // (the dialog) also claims it, which blocks all pointer
              // interaction on the page until a hard refresh. preventDefault
              // stops the immediate focus-return, and openMarkPaid defers
              // the dialog's actual open to the next tick so the dropdown's
              // own unmount finishes first — see use-deferred-modal-open.ts.
              e.preventDefault();
              openMarkPaid();
            }}
            disabled={!canMarkPaid}
          >
            <CheckCircle className="size-4" /> Mark as Paid
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault(); // see Mark as Paid above for why
              openVoidConfirm();
            }}
            disabled={!canVoid}
          >
            <XCircle className="size-4" /> Void Invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid — {invoice.invoice_number}</DialogTitle>
            <DialogDescription>
              Record which account received the payment. This posts a real journal entry.
            </DialogDescription>
          </DialogHeader>
          <MarkPaidDialog orgId={orgId} invoice={invoice} onSuccess={() => setIsMarkPaidOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isVoidConfirmOpen} onOpenChange={setIsVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void {invoice.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the invoice as voided. It stays on record for your history, but no longer
              counts toward outstanding or revenue totals. This can&apos;t be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => handleVoid(e.nativeEvent)}
              disabled={voidInvoice.isPending}
            >
              {voidInvoice.isPending ? "Voiding…" : "Void Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
