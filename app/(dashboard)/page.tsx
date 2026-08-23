"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { InventoryStatus } from "@/components/dashboard/InventoryStatus";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { useClients } from "@/hooks/clients/use-clients";
import { useEmployees } from "@/hooks/employees/use-employees";
import { useItems } from "@/hooks/items/use-items";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardSummary, DashboardTimeframe, TIMEFRAME_LABELS } from "@/hooks/dashboard/use-dashboard-summary";
import { useAuth } from "@/hooks/use-auth";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useOrg } from "@/hooks/use-org";
import { Users, FileText, TrendingUp, Wallet, AlertTriangle, PackageCheck, BriefcaseBusiness } from "lucide-react";

function fmtUGX(value: number) {
  return `UGX ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number) {
  return `${Math.abs(value).toFixed(1)}%`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("this_month");
  const summary = useDashboardSummary(timeframe);
  const { data: invoices = [] } = useInvoices(currentOrg?.id ?? "");
  const { data: employees = [] } = useEmployees(currentOrg?.id ?? "");
  const { data: items = [] } = useItems(currentOrg?.id ?? "");
  const { data: clients = [] } = useClients(currentOrg?.id ?? "");

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "overdue");
  const lowStockItems = items.filter((item) => item.status !== "archived" && item.current_quantity <= item.reorder_level);
  const onLeaveCount = employees.filter((employee) => employee.status === "on_leave").length;
  const paidThisPeriodTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.grand_total, 0) / 100;
  const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + invoice.grand_total, 0) / 100;

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
            subtitle={summary.isLoading ? undefined : `${clients.length} total clients`}
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

        <SummaryBar
          stats={[
            {
              label: "Paid",
              value: summary.isLoading ? "—" : paidInvoices.length.toString(),
              icon: <PackageCheck className="size-4" />,
              tone: "success",
            },
            {
              label: "Overdue",
              value: summary.isLoading ? "—" : `${overdueInvoices.length} (${fmtUGX(overdueTotal)})`,
              icon: <AlertTriangle className="size-4" />,
              tone: overdueInvoices.length > 0 ? "destructive" : "default",
            },
            {
              label: "Low-stock",
              value: summary.isLoading ? "—" : `${lowStockItems.length} of ${items.length}`,
              icon: <TrendingUp className="size-4" />,
              tone: lowStockItems.length > 0 ? "warning" : "default",
            },
            {
              label: "On leave",
              value: summary.isLoading ? "—" : `${onLeaveCount} of ${employees.length}`,
              icon: <BriefcaseBusiness className="size-4" />,
            },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <RevenueChart timeframe={timeframe} />
            <section className="panel p-4">
              <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Link href="/inventory" className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Track stock levels</p>
                </Link>
                <Link href="/inventory/custody" className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Custody</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Issue and return assets</p>
                </Link>
                <Link href="/inventory/lifecycle" className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lifecycle</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Move assets through stages</p>
                </Link>
                <Link href="/employees" className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">People</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Review staffing and leave</p>
                </Link>
              </div>
            </section>
          </div>
          <div className="space-y-4">
            <RecentActivity />
            <InventoryStatus />
          </div>
        </div>
      </div>
    </>
  );
}
