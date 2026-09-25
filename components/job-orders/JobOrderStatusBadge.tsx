import { JobOrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface JobOrderStatusBadgeProps {
  status?: JobOrderStatus | null;
  className?: string;
}

/**
 * Renders a job order's status pill. Unlike StatusBadge (shared/StatusBadge.tsx),
 * job order statuses are org-configurable — each org defines its own set
 * (job_order_statuses table) with a free-text label and optional color, so
 * this can't be driven off a static status-string map the way invoice/
 * employee statuses are.
 */
export function JobOrderStatusBadge({ status, className }: JobOrderStatusBadgeProps) {
  if (!status) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground", className)}>
        <span className="size-1.5 rounded-full bg-current opacity-70" />
        Unknown
      </span>
    );
  }

  const color = status.color || "#64748b";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status.label}
    </span>
  );
}
