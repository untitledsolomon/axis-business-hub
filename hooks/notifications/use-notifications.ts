"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useClients } from "@/hooks/clients/use-clients";
import { useEmployees } from "@/hooks/employees/use-employees";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useItems } from "@/hooks/items/use-items";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/hooks/use-auth";

export type NotificationPriority = "high" | "medium" | "low";
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  type: string;
  related_entity_id: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}

type StoredNotification = Omit<NotificationItem, "createdAt" | "readAt"> & { created_at: string; read_at: string | null };

export function useNotifications() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const orgId = currentOrg?.id ?? "";
  const queryClient = useQueryClient();
  const invoices = useInvoices(orgId);
  const items = useItems(orgId);
  const employees = useEmployees(orgId);
  const clients = useClients(orgId);
  const query = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: async () => {
      const { data, error } = await createClient().from("notifications").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as StoredNotification[];
    },
    enabled: typeof window !== "undefined" && !!orgId,
  });

  const candidates = useMemo(() => [
    ...(invoices.data ?? []).filter((invoice) => invoice.status === "overdue").map((invoice) => ({ type: "overdue_invoice", related_entity_id: invoice.id, title: "Overdue invoice", message: `${invoice.invoice_number} for ${invoice.client?.name ?? "a client"} is past due.`, priority: "high" as const, href: `/invoices/${invoice.id}` })),
    ...(items.data ?? []).filter((item) => item.status !== "archived" && item.current_quantity <= item.reorder_level).map((item) => ({ type: "low_stock", related_entity_id: item.id, title: "Low stock alert", message: `${item.name} is at ${item.current_quantity} (${item.unit}) and below reorder level.`, priority: "medium" as const, href: `/inventory/${item.id}` })),
    ...(employees.data ?? []).filter((employee) => employee.status === "on_leave").map((employee) => ({ type: "on_leave", related_entity_id: employee.id, title: "Team update", message: `${employee.full_name} is currently on leave.`, priority: "medium" as const, href: `/employees/${employee.id}` })),
    ...(clients.data ?? []).filter((client) => client.status === "inactive").map((client) => ({ type: "inactive_client", related_entity_id: client.id, title: "Client watch", message: `${client.name} is marked inactive and may need follow-up.`, priority: "low" as const, href: `/clients/${client.id}` })),
  ], [clients.data, employees.data, invoices.data, items.data]);

  useEffect(() => {
    const sources = [invoices, items, employees, clients];
    if (!orgId || !user?.id || query.isPending || query.isError || sources.some((source) => source.isPending || source.isError)) return;

    const trackedTypes = new Set(["overdue_invoice", "low_stock", "on_leave", "inactive_client"]);
    const activePairs = new Set(candidates.map((candidate) => `${candidate.type}:${candidate.related_entity_id}`));
    const staleIds = (query.data ?? [])
      .filter((notification) => trackedTypes.has(notification.type) && !activePairs.has(`${notification.type}:${notification.related_entity_id}`))
      .map((notification) => notification.id);

    const client = createClient();
    const writes = candidates.length
      ? [client.from("notifications").upsert(candidates.map((candidate) => ({ ...candidate, org_id: orgId, user_id: user.id })), { onConflict: "org_id,type,related_entity_id", ignoreDuplicates: true })]
      : [];
    if (staleIds.length) writes.push(client.from("notifications").delete().eq("org_id", orgId).in("id", staleIds));
    if (!writes.length) return;
    void Promise.all(writes).then(() => queryClient.invalidateQueries({ queryKey: ["notifications", orgId] }));
  }, [candidates, clients, employees, invoices, items, orgId, query.data, query.isError, query.isPending, queryClient, user?.id]);

  const markAsRead = useMutation({ mutationFn: async (id: string) => { const { error } = await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("org_id", orgId); if (error) throw error; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", orgId] }) });
  const markAllAsRead = useMutation({ mutationFn: async () => { const { error } = await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("org_id", orgId).is("read_at", null); if (error) throw error; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", orgId] }) });
  const notifications = (query.data ?? []).map((item) => ({ id: item.id, title: item.title, message: item.message, priority: item.priority, type: item.type, related_entity_id: item.related_entity_id, href: item.href, createdAt: item.created_at, readAt: item.read_at }));
  return { notifications, unreadCount: notifications.filter((notification) => !notification.readAt).length, markAsRead: markAsRead.mutate, markAllAsRead: markAllAsRead.mutate };
}
