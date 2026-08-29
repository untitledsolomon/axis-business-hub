import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  isLoading?: boolean;
  icon: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  subtitle?: string;
  tone?: "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const badgeTone: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

export function StatCard({ title, value, isLoading = false, icon, trend, subtitle, tone = "primary", className }: StatCardProps) {
  return (
    <div className={cn("panel panel-hover flex min-h-[9.5rem] flex-col p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg [&>svg]:size-3.5", badgeTone[tone])}>
          {isLoading ? <Skeleton className="size-7 rounded-lg" /> : icon}
        </span>
      </div>
      <p className="numeric mt-4 font-mono text-2xl font-semibold leading-none tracking-tight text-foreground">{isLoading ? <Skeleton className="h-8 w-28" /> : value}</p>
      {trend && !isLoading && (
        <div className="mt-1 flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}
          >
            {trend.positive ? "+" : ""}{trend.value}
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
      {subtitle && !trend && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
