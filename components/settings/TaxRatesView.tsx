"use client";

import { useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { useTaxRates, useUpdateTaxRate } from "@/hooks/finance/use-finance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Percent, MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { TaxRateForm } from "@/components/settings/TaxRateForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { TaxRate } from "@/lib/types";

export function TaxRatesView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: taxRates, isLoading } = useTaxRates(orgId);
  const updateTaxRate = useUpdateTaxRate(orgId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxRate | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<TaxRate | null>(null);
  const [isToggleConfirmOpen, setIsToggleConfirmOpen] = useState(false);

  const openEdit = useDeferredModalOpen(setIsEditOpen);
  const openToggleConfirm = useDeferredModalOpen(setIsToggleConfirmOpen);

  async function handleToggleActive() {
    if (!toggleTarget) return;
    await updateTaxRate.mutateAsync({
      id: toggleTarget.id,
      updates: { is_active: !toggleTarget.is_active },
    });
    setIsToggleConfirmOpen(false);
    setToggleTarget(null);
  }

  return (
    <>
      <PageHeader
        title="Tax Rates"
        description="Manage tax rates applied to your invoices and expenses."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Add Tax Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Add Tax Rate</DialogTitle>
              </DialogHeader>
              <TaxRateForm orgId={orgId} onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="">
        <div className="panel max-w-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Loading tax rates...
                    </TableCell>
                  </TableRow>
                ) : !taxRates || taxRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No tax rates yet. Add your first one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  taxRates.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="font-medium">{tax.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <Percent className="mr-1 h-3 w-3" />
                          <span className="numeric text-foreground">{tax.rate.toFixed(2)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tax.is_active ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Open menu for ${tax.name}`}>
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu for {tax.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setEditTarget(tax);
                                openEdit();
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                setToggleTarget(tax);
                                openToggleConfirm();
                              }}
                            >
                              {tax.is_active ? "Deactivate" : "Reactivate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Tax Rate</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <TaxRateForm
              orgId={orgId}
              taxRate={editTarget}
              onSuccess={() => {
                setIsEditOpen(false);
                setEditTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isToggleConfirmOpen} onOpenChange={setIsToggleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? "Deactivate" : "Reactivate"} {toggleTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? "Deactivated tax rates won't appear as an option on new invoices, but existing invoices that use it are unaffected."
                : "This tax rate will become available to select on new invoices again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={toggleTarget?.is_active ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={handleToggleActive}
              disabled={updateTaxRate.isPending}
            >
              {updateTaxRate.isPending ? "Saving…" : toggleTarget?.is_active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
