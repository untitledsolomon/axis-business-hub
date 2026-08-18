"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, UserPlus, ReceiptText } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useClients } from "@/hooks/clients/use-clients";

interface ActivityItem {
  id: string;
  type: "invoice" | "client";
  title: string;
  description: string;
  time: string;
  timestamp: number;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentActivity() {
  const { currentOrg } = useOrg();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(currentOrg?.id ?? "");
  const { data: clients, isLoading: clientsLoading } = useClients(currentOrg?.id ?? "");

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    (invoices ?? []).forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        type: "invoice",
        title:
          inv.status === "paid"
            ? "Invoice paid"
            : inv.status === "draft"
            ? "Invoice drafted"
            : "Invoice created",
        description: `${inv.invoice_number} · ${inv.client?.name ?? "Unknown client"} · ${inv.currency} ${(inv.grand_total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        time: timeAgo(inv.created_at),
        timestamp: new Date(inv.created_at).getTime(),
      });
    });

    (clients ?? []).forEach((client) => {
      items.push({
        id: `client-${client.id}`,
        type: "client",
        title: "New client added",
        description: client.company_name || client.name,
        time: timeAgo(client.created_at),
        timestamp: new Date(client.created_at).getTime(),
      });
    });

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  }, [invoices, clients]);

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "invoice":
        return <FileText size={16} className="text-axis-blue" />;
      case "client":
        return <UserPlus size={16} className="text-axis-green" />;
      default:
        return <ReceiptText size={16} />;
    }
  };

  const isLoading = invoicesLoading || clientsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-axis-light animate-pulse rounded-md" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No activity yet. Create a client or invoice to get started.
          </p>
        ) : (
          <div className="space-y-5">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                    activity.type === "invoice" && "bg-axis-blue/10",
                    activity.type === "client" && "bg-axis-green/10"
                  )}
                >
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{activity.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
