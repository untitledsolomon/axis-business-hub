"use client";

import { useAuth } from "@/hooks/use-auth";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, FileText, TrendingUp, ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardClient() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/invoices">View Invoices</Link></Button>
          <Button className="bg-axis-blue hover:bg-blue-800" asChild><Link href="/invoices">Create Invoice</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-axis-green flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" /> +20.1%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RevenueChart />

        <Card className="col-span-3">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Invoice #INV-002 sent", client: "Global Tech", time: "2 hours ago" },
                { title: "Payment received", client: "Acme Corp", time: "5 hours ago" },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-axis-light text-axis-blue"><Clock size={14} /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.client} • {activity.time}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs" asChild><Link href="/analytics">View All</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
