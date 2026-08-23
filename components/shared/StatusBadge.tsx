import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPill = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning-foreground",
        danger: "bg-destructive-soft text-destructive",
        teal: "bg-teal-soft text-teal-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusTone = NonNullable<VariantProps<typeof statusPill>["tone"]>;

const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
  // Invoices
  paid: { label: "Paid", tone: "success" },
  sent: { label: "Sent", tone: "info" },
  viewed: { label: "Viewed", tone: "info" },
  partial: { label: "Partial", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  voided: { label: "Voided", tone: "neutral" },
  // Journal entries
  posted: { label: "Posted", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  void: { label: "Void", tone: "neutral" },
  // Employees
  active: { label: "Active", tone: "success" },
  on_leave: { label: "On Leave", tone: "warning" },
  terminated: { label: "Terminated", tone: "danger" },
  // Shift + attendance
  scheduled: { label: "Scheduled", tone: "info" },
  confirmed: { label: "Confirmed", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  present: { label: "Present", tone: "success" },
  late: { label: "Late", tone: "warning" },
  absent: { label: "Absent", tone: "danger" },
  half_day: { label: "Half Day", tone: "warning" },
  approved_leave: { label: "Approved Leave", tone: "teal" },
  // Asset custody + lifecycle
  available: { label: "Available", tone: "success" },
  issued: { label: "Issued", tone: "warning" },
  returned: { label: "Returned", tone: "info" },
  acquired: { label: "Acquired", tone: "info" },
  in_prep: { label: "In Prep", tone: "warning" },
  listed: { label: "Listed", tone: "info" },
  leased: { label: "Leased", tone: "teal" },
  sold: { label: "Sold", tone: "success" },
  service: { label: "Service", tone: "neutral" },
  // Clients / connections
  inactive: { label: "Inactive", tone: "neutral" },
  blocked: { label: "Blocked", tone: "danger" },
  connected: { label: "Connected", tone: "success" },
  disconnected: { label: "Disconnected", tone: "neutral" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Renders a consistently-styled status pill for any known status value
 * across the app (invoices, journal entries, employees, clients,
 * connections). Falls back to a plain neutral pill with the raw status
 * text for anything not in the map, rather than silently rendering
 * nothing for an unrecognized status.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const entry = STATUS_MAP[status];
  const label = entry?.label ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  const tone = entry?.tone ?? "neutral";

  return (
    <span className={cn(statusPill({ tone }), className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
