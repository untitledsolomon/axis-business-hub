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
import {
  useSendQuotationEmail,
  useUpdateQuotationStatus,
  useConvertQuotationToInvoice,
} from "@/hooks/quotations/use-quotations";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { Quotation } from "@/lib/types";
import { MoreHorizontal, Send, CheckCircle, XCircle, Eye, FileOutput } from "lucide-react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { useCanEdit } from "@/hooks/use-feature-flag";

interface QuotationActionsProps {
  orgId: string;
  quotation: Quotation;
  showViewDetails?: boolean;
}

export function QuotationActions({ orgId, quotation, showViewDetails = true }: QuotationActionsProps) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);
  const openConvertConfirm = useDeferredModalOpen(setIsConvertConfirmOpen);

  const sendEmail = useSendQuotationEmail(orgId);
  const updateStatus = useUpdateQuotationStatus(orgId);
  const convertToInvoice = useConvertQuotationToInvoice(orgId);

  const isConverted = quotation.status === "converted";
  const isDeclined = quotation.status === "declined";
  const isExpired = quotation.status === "expired";
  const canSend = canEdit && !isConverted;
  const canConvert = canEdit && !isConverted && quotation.status === "accepted";
  const canChangeStatus = canEdit && !isConverted;

  async function handleSend() {
    if (!quotation.client?.email) {
      toast.error("This client has no email address on file — add one before sending.");
      return;
    }
    await sendEmail.mutateAsync({ quotationId: quotation.id });
    posthog.capture("quotation_email_sent", { quotation_status: quotation.status });
  }

  async function handleStatusChange(status: string) {
    if (status === quotation.status) return;
    await updateStatus.mutateAsync({ quotation_id: quotation.id, status });
    posthog.capture("quotation_status_changed", { from: quotation.status, to: status });
  }

  async function handleConvert(event?: Event) {
    event?.preventDefault();
    const result = await convertToInvoice.mutateAsync({ quotation_id: quotation.id });
    posthog.capture("quotation_converted_to_invoice", { quotation_status: quotation.status });
    setIsConvertConfirmOpen(false);
    if (result) router.push(`/invoices/${result}`);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionTooltip label="Quotation actions">
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </ActionTooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {showViewDetails && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/quotations/${quotation.id}`)}>
                <Eye className="mr-2 size-4" /> View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {canSend && (
            <DropdownMenuItem onClick={handleSend} disabled={sendEmail.isPending}>
              <Send className="mr-2 size-4" /> Send to client
            </DropdownMenuItem>
          )}
          {canConvert && (
            <DropdownMenuItem onClick={openConvertConfirm}>
              <FileOutput className="mr-2 size-4" /> Convert to invoice
            </DropdownMenuItem>
          )}
          {canChangeStatus && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Set status</DropdownMenuLabel>
              {!isDeclined && (
                <DropdownMenuItem onClick={() => handleStatusChange("accepted")}>
                  <CheckCircle className="mr-2 size-4" /> Accepted
                </DropdownMenuItem>
              )}
              {!isDeclined && (
                <DropdownMenuItem onClick={() => handleStatusChange("declined")}>
                  <XCircle className="mr-2 size-4" /> Declined
                </DropdownMenuItem>
              )}
              {!isExpired && (
                <DropdownMenuItem onClick={() => handleStatusChange("expired")}>
                  Expired
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConvertConfirmOpen} onOpenChange={setIsConvertConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a new draft invoice with the same client, items and totals as quotation{" "}
              {quotation.quotation_number}, linked back to it for reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => handleConvert(e.nativeEvent)}>Convert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
