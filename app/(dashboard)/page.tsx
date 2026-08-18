"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
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
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Hello, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening across your business today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue This Month"
          value={summary.isLoading ? "—" : fmtUGX(summary.revenueThisMonth)}
          icon={<Wallet className="h-4 w-4 text-axis-blue" />}
          trend={
            summary.isLoading
              ? undefined
              : { value: fmtPct(summary.revenueChangePct), positive: summary.revenueChangePct >= 0 }
          }
        />
        <StatCard
          title="Active Clients"
          value={summary.isLoading ? "—" : summary.activeClients.toString()}
          icon={<Users className="h-4 w-4 text-axis-blue" />}
        />
        <StatCard
          title="Outstanding Invoices"
          value={summary.isLoading ? "—" : summary.outstandingCount.toString()}
          icon={<FileText className="h-4 w-4 text-axis-blue" />}
          subtitle={summary.isLoading ? undefined : `${fmtUGX(summary.outstandingTotal)} total`}
        />
        <StatCard
          title="Net Profit"
          value={summary.isLoading ? "—" : fmtUGX(summary.netProfitThisMonth)}
          icon={<TrendingUp className="h-4 w-4 text-axis-blue" />}
          trend={
            summary.isLoading
              ? undefined
              : { value: fmtPct(summary.netProfitChangePct), positive: summary.netProfitChangePct >= 0 }
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <RevenueChart />
        </div>
        <div className="col-span-3">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
