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
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { useDeleteEmployee, useTerminateEmployee } from "@/hooks/employees/use-employees";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { Employee } from "@/lib/types";
import { MoreHorizontal, Eye, Pencil, UserX, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { useCanEdit } from "@/hooks/use-feature-flag";

interface EmployeeActionsProps {
  orgId: string;
  employee: Employee;
  /** Show a "View profile" entry — omit on the detail page itself. */
  showViewDetails?: boolean;
}

export function EmployeeActions({ orgId, employee, showViewDetails = true }: EmployeeActionsProps) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTerminateConfirmOpen, setIsTerminateConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const terminateEmployee = useTerminateEmployee(orgId);
  const deleteEmployee = useDeleteEmployee(orgId);
  const openEdit = useDeferredModalOpen(setIsEditOpen);
  const openTerminateConfirm = useDeferredModalOpen(setIsTerminateConfirmOpen);
  const openDeleteConfirm = useDeferredModalOpen(setIsDeleteConfirmOpen);

  async function handleTerminate(event: Event) {
    // See ClientActions.tsx handleDelete for why preventDefault + this
    // pattern is required here.
    event.preventDefault();
    await terminateEmployee.mutateAsync({ id: employee.id });
    posthog.capture("employee_terminated", {});
    setIsTerminateConfirmOpen(false);
  }

  async function handleDelete(event: Event) {
    event.preventDefault();
    await deleteEmployee.mutateAsync({ id: employee.id });
    posthog.capture("employee_deleted", {});
    setIsDeleteConfirmOpen(false);
    if (showViewDetails === false) {
      router.push("/employees");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Open menu for ${employee.full_name}`}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu for {employee.full_name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {showViewDetails && (
            <DropdownMenuItem asChild>
              <Link href={`/employees/${employee.id}`}>
                <Eye className="size-4" /> View Profile
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={!canEdit}
            onSelect={(e) => {
              e.preventDefault();
              openEdit();
            }}
          >
            <Pencil className="size-4" /> Edit Details
          </DropdownMenuItem>
          {employee.status !== "terminated" && (
            <DropdownMenuItem
              disabled={!canEdit}
              onSelect={(e) => {
                e.preventDefault();
                openTerminateConfirm();
              }}
            >
              <UserX className="size-4" /> Terminate Employment
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            disabled={!canEdit}
            onSelect={(e) => {
              e.preventDefault();
              openDeleteConfirm();
            }}
          >
            <Trash2 className="size-4" /> Delete Employee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update this employee&apos;s role, contact, and status.</DialogDescription>
          </DialogHeader>
          <EmployeeForm orgId={orgId} employee={employee} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTerminateConfirmOpen} onOpenChange={setIsTerminateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate {employee.full_name}&apos;s employment?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the employee as terminated. Their record stays on file — this does not
              delete them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => handleTerminate(e.nativeEvent)}
              disabled={terminateEmployee.isPending}
            >
              {terminateEmployee.isPending ? "Updating…" : "Terminate Employment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {employee.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the employee record. Consider terminating employment instead
              if you want to keep the record on file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => handleDelete(e.nativeEvent)}
              disabled={deleteEmployee.isPending}
            >
              {deleteEmployee.isPending ? "Deleting…" : "Delete Employee"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
