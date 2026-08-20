"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, UserPlus } from "lucide-react";
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

  const isLoading = invoicesLoading || clientsLoading;

  return (
    <section className="panel p-5">
      <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
      <p className="text-xs text-muted-foreground">Across your workspace</p>

      {isLoading ? (
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No activity yet. Create a client or invoice to get started.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {activities.map((activity) => (
            <li key={activity.id} className="flex gap-3">
              <Avatar className="size-8">
                <AvatarFallback
                  className={
                    activity.type === "invoice"
                      ? "bg-primary-soft text-primary"
                      : "bg-success-soft text-success"
                  }
                >
                  {activity.type === "invoice" ? (
                    <FileText className="size-3.5" />
                  ) : (
                    <UserPlus className="size-3.5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{activity.title}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{activity.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
