"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ClientForm } from "@/components/clients/ClientForm";
import { useDeleteClient, useArchiveClient } from "@/hooks/clients/use-clients";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { Client } from "@/lib/types";
import { MoreHorizontal, Eye, Pencil, FileText, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import posthog from "posthog-js";

interface ClientActionsProps {
  orgId: string;
  client: Client;
  /** Show a "View details" entry — omit on the detail page itself. */
  showViewDetails?: boolean;
}

export function ClientActions({ orgId, client, showViewDetails = true }: ClientActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const deleteClient = useDeleteClient(orgId);
  const archiveClient = useArchiveClient(orgId);
  const openEdit = useDeferredModalOpen(setIsEditOpen);
  const openDeleteConfirm = useDeferredModalOpen(setIsDeleteConfirmOpen);

  async function handleDelete(event: Event) {
    // See InvoiceActions.tsx handleVoid for why preventDefault is required
    // here — without it, Radix's default auto-close on AlertDialogAction
    // races this async handler's own state update, and a slow/failed
    // mutation leaves the dialog's open-state desynced from what Radix
    // actually unmounted, freezing the whole app's click handling until a
    // hard refresh.
    event.preventDefault();
    try {
      await deleteClient.mutateAsync({ id: client.id });
      posthog.capture("client_deleted", { client_type: client.type });
      setIsDeleteConfirmOpen(false);
      if (showViewDetails === false) {
        // We're on the client's own detail page — it no longer exists.
        router.push("/clients");
      }
    } catch (error: unknown) {
      // deleteClient already surfaces a clear message for the common case
      // (client has invoices, FK restrict) via lib/clients/queries.ts —
      // offer archiving as the actual next step instead of a dead end.
      const message = error instanceof Error ? error.message : "Failed to delete client";
      toast.error(message, {
        action: {
          label: "Archive instead",
          onClick: () => archiveClient.mutate({ id: client.id }),
        },
      });
      setIsDeleteConfirmOpen(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <ActionTooltip label="More actions">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Open menu for ${client.name}`}>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu for {client.name}</span>
            </Button>
          </DropdownMenuTrigger>
        </ActionTooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {showViewDetails && (
            <DropdownMenuItem onSelect={() => router.push(`/clients/${client.id}`)}>
              <Eye className="size-4" /> View details
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              // preventDefault stops Radix's dropdown focus-return from
              // racing the dialog's own focus-trap mount; openEdit further
              // defers the actual open to the next tick so the dropdown's
              // portal has genuinely unmounted first — see
              // use-deferred-modal-open.ts for the full explanation.
              e.preventDefault();
              openEdit();
            }}
          >
            <Pencil className="size-4" /> Edit client
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/invoices?client=${client.id}`}>
              <FileText className="size-4" /> Create invoice
            </Link>
          </DropdownMenuItem>
          {client.status !== "inactive" && (
            <DropdownMenuItem onSelect={() => archiveClient.mutate({ id: client.id })}>
              <Archive className="size-4" /> Archive client
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault(); // see "Edit client" above for why
              openDeleteConfirm();
            }}
          >
            <Trash2 className="size-4" /> Delete client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update this client&apos;s contact details and terms.</DialogDescription>
          </DialogHeader>
          <ClientForm orgId={orgId} client={client} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the client record. If they have any invoices on file, this
              will be blocked and you&apos;ll be offered the option to archive instead — archiving
              hides them from active lists without breaking invoice history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => handleDelete(e.nativeEvent)}
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? "Deleting…" : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
