import { Metadata } from "next";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DollarSign, Users, FileText, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your business performance, recent activities, and key metrics.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to your business operating system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$45,231.89"
          icon={<DollarSign className="h-4 w-4 text-axis-blue" />}
          trend={{ value: "20.1%", positive: true }}
        />
        <StatCard
          title="Active Clients"
          value="+2350"
          icon={<Users className="h-4 w-4 text-axis-blue" />}
          trend={{ value: "10.5%", positive: true }}
        />
        <StatCard
          title="Outstanding Invoices"
          value="12"
          icon={<FileText className="h-4 w-4 text-axis-blue" />}
          trend={{ value: "4.2%", positive: false }}
        />
        <StatCard
          title="Net Profit"
          value="$12,432.00"
          icon={<TrendingUp className="h-4 w-4 text-axis-blue" />}
          trend={{ value: "12.3%", positive: true }}
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
