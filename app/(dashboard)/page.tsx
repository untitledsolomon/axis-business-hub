"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PageHeader } from "@/components/shared/PageHeader";
import { useDashboardSummary } from "@/hooks/dashboard/use-dashboard-summary";
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
  const summary = useDashboardSummary();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName} 👋`}
        description="Here's what's happening across your business today."
      />

      <div className="space-y-4 ">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Revenue This Month"
            value={summary.isLoading ? "—" : fmtUGX(summary.revenueThisMonth)}
            icon={<Wallet className="size-4" />}
            trend={
              summary.isLoading
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
            title="Net Profit"
            value={summary.isLoading ? "—" : fmtUGX(summary.netProfitThisMonth)}
            icon={<TrendingUp className="size-4" />}
            trend={
              summary.isLoading
                ? undefined
                : { value: fmtPct(summary.netProfitChangePct), positive: summary.netProfitChangePct >= 0 }
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RevenueChart />
          <RecentActivity />
        </div>
      </div>
    </>
  );
}
