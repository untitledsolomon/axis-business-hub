import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  subtitle?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, subtitle, className }: StatCardProps) {
  return (
    <div className={cn("panel p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span className="text-muted-foreground [&>svg]:size-3.5">{icon}</span>
      </div>
      <p className="numeric mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {trend && (
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
