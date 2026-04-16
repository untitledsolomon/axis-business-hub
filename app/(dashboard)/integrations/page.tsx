"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, BarChart2, MousePointer2, Users } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Integrations</h1>
        <p className="text-muted-foreground">
          Connect AXIS with your growth engine and content platform.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-axis-blue/10 rounded-lg text-axis-blue">
                <BarChart2 size={24} />
              </div>
              <Badge variant="outline" className="text-axis-green border-axis-green">Active</Badge>
            </div>
            <CardTitle className="mt-4">Regent Growth Engine</CardTitle>
            <CardDescription>
              Convert leads to clients and track conversion value from your marketing funnel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Leads Syncing</p>
                <p className="text-lg font-semibold">124 This Month</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Conv. Value</p>
                <p className="text-lg font-semibold">$8,450.00</p>
              </div>
            </div>
            <Button className="w-full bg-axis-blue">Configure Sync</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-axis-blue/10 rounded-lg text-axis-blue">
                <Globe size={24} />
              </div>
              <Badge variant="outline">Disconnected</Badge>
            </div>
            <CardTitle className="mt-4">Content Platform</CardTitle>
            <CardDescription>
              Attribute revenue to blog posts, resources, and case studies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MousePointer2 size={16} />
              <span>Track attribution across all content assets</span>
            </div>
            <Button variant="outline" className="w-full">Connect Platform</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
