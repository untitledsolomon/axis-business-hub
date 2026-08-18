"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Webhook,
  KeyRound,
  Banknote,
  MessageCircle,
  Calendar,
} from "lucide-react";

interface Integration {
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: "connected" | "available" | "planned";
}

const integrations: Integration[] = [
  {
    name: "Resend (Email)",
    description: "Send invoices, payslips, and notification emails.",
    icon: Mail,
    status: "planned",
  },
  {
    name: "Flutterwave",
    description: "Accept online invoice payments via card and mobile money.",
    icon: Banknote,
    status: "planned",
  },
  {
    name: "WhatsApp Business",
    description: "Deliver invoices and payment reminders via WhatsApp.",
    icon: MessageCircle,
    status: "planned",
  },
  {
    name: "Google Calendar",
    description: "Sync leave calendars and payroll run dates.",
    icon: Calendar,
    status: "planned",
  },
  {
    name: "Webhooks",
    description: "Send real-time event data to an external system.",
    icon: Webhook,
    status: "planned",
  },
  {
    name: "API Keys",
    description: "Generate keys for custom integrations.",
    icon: KeyRound,
    status: "planned",
  },
];

const statusConfig: Record<Integration["status"], { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-axis-green/10 text-axis-green border-axis-green/20" },
  available: { label: "Available", className: "bg-axis-blue/10 text-axis-blue border-axis-blue/20" },
  planned: { label: "Coming Soon", className: "bg-axis-gray/10 text-axis-gray border-axis-gray/20" },
};

export function ConnectionsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Connections & Integrations</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Connect Axis to the tools you already use. These integrations are on
          our roadmap — reach out if one of these is a priority for your business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const status = statusConfig[integration.status];
          return (
            <Card key={integration.name} className="overflow-hidden">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="bg-axis-blue/10 p-2.5 rounded-lg text-axis-blue">
                    <integration.icon size={20} />
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {integration.description}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled className="mt-1 w-fit">
                  {integration.status === "connected" ? "Manage" : "Notify Me"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
