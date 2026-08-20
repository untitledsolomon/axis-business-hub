"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Mail,
  Webhook,
  KeyRound,
  Banknote,
  MessageCircle,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  connected: { label: "Connected", className: "bg-success-soft text-success" },
  available: { label: "Available", className: "bg-primary-soft text-primary" },
  planned: { label: "Coming Soon", className: "bg-muted text-muted-foreground" },
};

export function ConnectionsView() {
  return (
    <>
      <PageHeader
        title="Connections"
        description="Connect Axis to the tools you already use. These integrations are on our roadmap — reach out if one of these is a priority for your business."
      />

      <div className="">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const status = statusConfig[integration.status];
            return (
              <div key={integration.name} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                    <integration.icon size={18} />
                  </span>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}>
                    {status.label}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{integration.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
                </div>
                <Button variant="outline" size="sm" disabled className="mt-1 w-fit">
                  {integration.status === "connected" ? "Manage" : "Notify Me"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
