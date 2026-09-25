"use client";

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
import { ActionTooltip } from "@/components/shared/ActionTooltip";
import { useJobOrderStatuses, useUpdateJobOrderStatus } from "@/hooks/job-orders/use-job-orders";
import { JobOrder } from "@/lib/types";
import { MoreHorizontal, Eye, Truck } from "lucide-react";
import posthog from "posthog-js";
import { useCanEdit } from "@/hooks/use-feature-flag";

interface JobOrderActionsProps {
  orgId: string;
  jobOrder: JobOrder;
  showViewDetails?: boolean;
}

export function JobOrderActions({ orgId, jobOrder, showViewDetails = true }: JobOrderActionsProps) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const { data: statuses } = useJobOrderStatuses(orgId);
  const updateStatus = useUpdateJobOrderStatus(orgId);

  const isTerminal = jobOrder.status?.is_terminal ?? false;

  async function handleStatusChange(statusId: string) {
    if (statusId === jobOrder.status_id) return;
    const toStatus = statuses?.find((s) => s.id === statusId);
    await updateStatus.mutateAsync({ job_order_id: jobOrder.id, status_id: statusId });
    posthog.capture("job_order_status_changed", { from: jobOrder.status?.key, to: toStatus?.key });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionTooltip label="Job order actions">
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions</span>
          </Button>
        </ActionTooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {showViewDetails && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/job-orders/${jobOrder.id}`)}>
              <Eye className="mr-2 size-4" /> View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {canEdit && !isTerminal && (
          <DropdownMenuItem onClick={() => router.push(`/delivery-forms?job_order=${jobOrder.id}`)}>
            <Truck className="mr-2 size-4" /> Add to delivery form
          </DropdownMenuItem>
        )}
        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Move to status</DropdownMenuLabel>
            {statuses?.map((status) => (
              <DropdownMenuItem
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                disabled={status.id === jobOrder.status_id}
              >
                <span className="mr-2 size-2 rounded-full" style={{ backgroundColor: status.color || "#64748b" }} />
                {status.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
