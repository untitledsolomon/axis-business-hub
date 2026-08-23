"use client";

import { useMemo } from "react";
import { useClients } from "@/hooks/clients/use-clients";
import { useEmployees } from "@/hooks/employees/use-employees";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useItems } from "@/hooks/items/use-items";
import { useOrg } from "@/hooks/use-org";

export type NotificationPriority = "high" | "medium" | "low";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  type: "invoice" | "inventory" | "staff" | "client";
  href: string;
  createdAt: string;
}

export function useNotifications() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";

  const { data: invoices = [] } = useInvoices(orgId);
  const { data: items = [] } = useItems(orgId);
  const { data: employees = [] } = useEmployees(orgId);
  const { data: clients = [] } = useClients(orgId);

  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    const overdue = invoices.filter((invoice) => invoice.status === "overdue");
    overdue.slice(0, 3).forEach((invoice) => {
      list.push({
        id: `overdue-${invoice.id}`,
        title: "Overdue invoice",
        message: `${invoice.invoice_number} for ${invoice.client?.name ?? "a client"} is past due.`,
        priority: "high",
        type: "invoice",
        href: `/invoices/${invoice.id}`,
        createdAt: invoice.due_date,
      });
    });

    const lowStock = items.filter((item) => item.status !== "archived" && item.current_quantity <= item.reorder_level);
    lowStock.slice(0, 3).forEach((item) => {
      list.push({
        id: `low-stock-${item.id}`,
        title: "Low stock alert",
        message: `${item.name} is at ${item.current_quantity} (${item.unit}) and below reorder level.`,
        priority: "medium",
        type: "inventory",
        href: `/inventory/${item.id}`,
        createdAt: item.updated_at,
      });
    });

    const onLeave = employees.filter((employee) => employee.status === "on_leave");
    onLeave.slice(0, 2).forEach((employee) => {
      list.push({
        id: `leave-${employee.id}`,
        title: "Team update",
        message: `${employee.full_name} is currently on leave.`,
        priority: "medium",
        type: "staff",
        href: `/employees/${employee.id}`,
        createdAt: employee.updated_at,
      });
    });

    const inactiveClients = clients.filter((client) => client.status === "inactive");
    inactiveClients.slice(0, 2).forEach((client) => {
      list.push({
        id: `client-${client.id}`,
        title: "Client watch",
        message: `${client.name} is marked inactive and may need follow-up.`,
        priority: "low",
        type: "client",
        href: `/clients/${client.id}`,
        createdAt: client.updated_at,
      });
    });

    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [clients, employees, invoices, items]);

  return {
    notifications,
    unreadCount: notifications.length,
  };
}
