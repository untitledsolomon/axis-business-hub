import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

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
};

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-axis-green/10 text-axis-green border-axis-green/20",
  warning: "bg-axis-amber/10 text-axis-amber border-axis-amber/20",
  danger: "bg-axis-red/10 text-axis-red border-axis-red/20",
  info: "bg-axis-blue/10 text-axis-blue border-axis-blue/20",
  neutral: "bg-axis-gray/10 text-axis-gray border-axis-gray/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Renders a consistently-styled badge for any known status value across
 * the app (invoices, journal entries, employees). Falls back to a plain
 * neutral badge with the raw status text for anything not in the map,
 * rather than silently rendering nothing for an unrecognized status.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const entry = STATUS_MAP[status];
  const label = entry?.label ?? status.charAt(0).toUpperCase() + status.slice(1);
  const tone = entry?.tone ?? "neutral";

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  );
}
