"use client";

import { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardSummary, DashboardTimeframe, TIMEFRAME_LABELS } from "@/hooks/dashboard/use-dashboard-summary";
import { useAuth } from "@/hooks/use-auth";
import { Users, FileText, TrendingUp, Wallet } from "lucide-react";

function fmtUGX(value: number) {
  return `UGX ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number) {
  return `${Math.abs(value).toFixed(1)}%`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("this_month");
  const summary = useDashboardSummary(timeframe);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const revenueLabel = timeframe === "this_month" ? "Revenue This Month" : `Revenue (${TIMEFRAME_LABELS[timeframe]})`;
  const profitLabel = timeframe === "this_month" ? "Net Profit" : `Net Profit (${TIMEFRAME_LABELS[timeframe]})`;

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}!`}
        description="Here's what's happening across your business today."
        actions={
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as DashboardTimeframe)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Select timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TIMEFRAME_LABELS) as DashboardTimeframe[]).map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {TIMEFRAME_LABELS[tf]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="space-y-4 ">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={revenueLabel}
            value={summary.isLoading ? "—" : fmtUGX(summary.revenueThisMonth)}
            icon={<Wallet className="size-4" />}
            trend={
              summary.isLoading || !summary.hasComparisonPeriod
                ? undefined
                : { value: fmtPct(summary.revenueChangePct), positive: summary.revenueChangePct >= 0 }
            }
          />
          <StatCard
            title="Active Clients"
            value={summary.isLoading ? "—" : summary.activeClients.toString()}
            icon={<Users className="size-4" />}
          />
          <StatCard
            title="Outstanding Invoices"
            value={summary.isLoading ? "—" : summary.outstandingCount.toString()}
            icon={<FileText className="size-4" />}
            subtitle={summary.isLoading ? undefined : `${fmtUGX(summary.outstandingTotal)} total`}
          />
          <StatCard
            title={profitLabel}
            value={summary.isLoading ? "—" : fmtUGX(summary.netProfitThisMonth)}
            icon={<TrendingUp className="size-4" />}
            trend={
              summary.isLoading || !summary.hasComparisonPeriod
                ? undefined
                : { value: fmtPct(summary.netProfitChangePct), positive: summary.netProfitChangePct >= 0 }
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RevenueChart timeframe={timeframe} />
          <RecentActivity />
        </div>
      </div>
    </>
  );
}
