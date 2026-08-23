"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleDashed, ClipboardList, PackageCheck, Route } from "lucide-react";
import { SummaryBar } from "@/components/shared/SummaryBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useClients } from "@/hooks/clients/use-clients";
import { useItems, useUpdateItem } from "@/hooks/items/use-items";
import { useOrg } from "@/hooks/use-org";

function getMeta(item: { metadata?: Record<string, unknown> } | undefined) {
  return (item?.metadata ?? {}) as Record<string, unknown>;
}

const stages = ["acquired", "in_prep", "listed", "leased", "sold", "service"] as const;

export function LifecycleView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: items = [], isLoading } = useItems(orgId);
  const { data: clients = [] } = useClients(orgId);
  const updateItem = useUpdateItem(orgId);

  const clientMap = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const lifecycleItems = items.filter((item) => {
    const meta = getMeta(item);
    return item.status !== "archived" && (!!meta.lifecycle_stage || !!meta.asset_status || !!meta.vin || !!meta.registration);
  });

  const stageCounts = stages.reduce((acc, stage) => {
    acc[stage] = lifecycleItems.filter((item) => getMeta(item).lifecycle_stage === stage).length;
    return acc;
  }, {} as Record<string, number>);

  const handleStageChange = async (itemId: string, nextStage: string, clientId?: string) => {
    const item = items.find((entry) => entry.id === itemId);
    const meta = getMeta(item);
    await updateItem.mutateAsync({
      id: itemId,
      updates: {
        metadata: {
          ...meta,
          lifecycle_stage: nextStage,
          asset_status: nextStage,
          updated_stage_at: new Date().toISOString(),
          ...(clientId ? { assigned_client_id: clientId, assigned_client_name: clientMap.get(clientId) ?? "Client" } : {}),
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset lifecycle"
        description="Move assets from acquisition to service, sale, or lease without creating a separate asset module."
        actions={
          <Link
            href="/inventory"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Inventory overview
          </Link>
        }
      />

      <SummaryBar
        stats={[
          { label: "Tracked", value: isLoading ? "—" : String(lifecycleItems.length), icon: <ClipboardList className="size-4" /> },
          { label: "In prep", value: isLoading ? "—" : String(stageCounts.in_prep ?? 0), icon: <PackageCheck className="size-4" /> },
          { label: "Listed", value: isLoading ? "—" : String(stageCounts.listed ?? 0), icon: <Route className="size-4" /> },
          { label: "Service", value: isLoading ? "—" : String(stageCounts.service ?? 0), icon: <CircleDashed className="size-4" /> },
        ]}
      />

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">VIN</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Mileage</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p>No lifecycle data yet.</p>
                      <p className="text-xs text-muted-foreground">Add stock in the inventory module and assign a VIN, stage, or client to begin tracking.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = getMeta(item);
                  const currentStage = typeof meta.lifecycle_stage === "string" ? meta.lifecycle_stage : "acquired";
                  const clientId = typeof meta.assigned_client_id === "string" ? meta.assigned_client_id : "";
                  const clientName = typeof meta.assigned_client_name === "string" ? meta.assigned_client_name : "Unassigned";

                  return (
                    <tr key={item.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{typeof meta.vin === "string" ? meta.vin : "—"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={currentStage}
                          onChange={(event) => handleStageChange(item.id, event.target.value, clientId || undefined)}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          {stages.map((stage) => (
                            <option key={stage} value={stage}>{stage.replace("_", " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={clientId}
                          onChange={(event) => handleStageChange(item.id, currentStage, event.target.value || undefined)}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">No client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">{clientName}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{typeof meta.mileage === "number" ? `${meta.mileage} km` : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={currentStage} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
