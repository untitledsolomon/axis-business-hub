"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DollarSign, Users, FileText, TrendingUp, ArrowUpRight } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Analytics</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">$45,231</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Clients</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">+12</div></CardContent></Card>
      </div>

      <Card className="p-6">
        <CardTitle className="mb-4">Revenue Growth</CardTitle>
        <RevenueChart />
      </Card>
    </div>
  );
}
