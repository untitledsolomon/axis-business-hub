import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface SummaryStat {
  label: string;
  value: string;
  icon?: ReactNode;
  isLoading?: boolean;
  tone?: "default" | "success" | "warning" | "destructive";
}

const toneClasses: Record<NonNullable<SummaryStat["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

/**
 * Compact inline summary row used at the top of list/detail pages.
 * Replaces stacks of full StatCards with a single low-height strip so the
 * page gets to its real content (table, filters) faster.
 */
export function SummaryBar({ stats, className, isLoading }: { stats: SummaryStat[]; className?: string; isLoading?: boolean }) {
  return (
    <div
      className={cn(
        "panel flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5",
        className
      )}
    >
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex min-w-[8.5rem] items-center gap-2">
          {i > 0 && <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />}
          {stat.icon && !isLoading && !stat.isLoading && (
            <span className="text-muted-foreground [&>svg]:size-3.5">{stat.icon}</span>
          )}
          <span className="text-xs text-muted-foreground">{stat.label}</span>
          <span className={cn("numeric ml-auto font-mono text-sm font-semibold", toneClasses[stat.tone ?? "default"])}>
            {isLoading || stat.isLoading ? <Skeleton className="h-4 w-20" /> : stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
