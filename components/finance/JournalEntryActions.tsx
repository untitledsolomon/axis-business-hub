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
import { useVoidJournalEntry } from "@/hooks/finance/use-finance";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { JournalEntry } from "@/lib/types";
import { MoreHorizontal, Eye, XCircle } from "lucide-react";
import posthog from "posthog-js";

interface JournalEntryActionsProps {
  orgId: string;
  entry: JournalEntry;
  /** Show a "View journal entry" entry — omit on the detail page itself. */
  showViewDetails?: boolean;
}

export function JournalEntryActions({ orgId, entry, showViewDetails = true }: JournalEntryActionsProps) {
  const router = useRouter();
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);

  const voidEntry = useVoidJournalEntry(orgId);
  // See use-deferred-modal-open.ts — opening a Dialog/AlertDialog
  // synchronously from a DropdownMenuItem's onSelect races Radix's own
  // dropdown unmount (two focus-traps mounting at once), which leaves the
  // page unresponsive to all pointer input until a hard refresh. Deferring
  // the open by a tick is what actually fixes it; preventDefault() alone
  // (stopping onSelect's default focus-return) is not sufficient on its own.
  const openVoidConfirm = useDeferredModalOpen(setIsVoidConfirmOpen);

  const isVoided = entry.status === "void";
  const canVoid = !isVoided;

  async function handleVoid(event?: Event) {
    // AlertDialogAction auto-closes on click by default. If that auto-close
    // races this async mutation (dialog unmounts while the request is still
    // pending), the same stale-focus-trap issue as above can resurface.
    // preventDefault() stops the auto-close so setIsVoidConfirmOpen(false)
    // below — which only runs once the mutation actually finishes — is the
    // only thing that closes it.
    event?.preventDefault();
    await voidEntry.mutateAsync({ entry_id: entry.id });
    posthog.capture("journal_entry_voided", { entry_status: entry.status });
    setIsVoidConfirmOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <ActionTooltip label="More actions">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Open menu for ${entry.description || entry.reference || "journal entry"}`}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">
                Open menu for {entry.description || entry.reference || "journal entry"}
              </span>
            </Button>
          </DropdownMenuTrigger>
        </ActionTooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {showViewDetails && (
            <DropdownMenuItem onSelect={() => router.push(`/transactions/${entry.id}`)}>
              <Eye className="size-4" /> View Journal Entry
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault(); // see openVoidConfirm above for why
              openVoidConfirm();
            }}
            disabled={!canVoid}
          >
            <XCircle className="size-4" /> Void Transaction
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isVoidConfirmOpen} onOpenChange={setIsVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the journal entry as void. It stays on record for your audit trail, but
              no longer counts toward Transactions, Ledger, Banking totals, or account balances.
              This can&apos;t be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => handleVoid(e.nativeEvent)}
              disabled={voidEntry.isPending}
            >
              {voidEntry.isPending ? "Voiding…" : "Void Transaction"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
