"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, CalendarClock, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOrg } from "@/hooks/use-org";
import { useEmployees } from "@/hooks/employees/use-employees";
import { useItems, useUpdateItem } from "@/hooks/items/use-items";
import { cn } from "@/lib/utils";

function getMeta(item: { metadata?: Record<string, unknown> } | undefined) {
  return (item?.metadata ?? {}) as Record<string, unknown>;
}

export function CustodyView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: items = [], isLoading } = useItems(orgId);
  const { data: employees = [] } = useEmployees(orgId);
  const updateItem = useUpdateItem(orgId);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<Record<string, string>>({});

  const custodyItems = useMemo(() => {
    return items.filter((item) => {
      const meta = getMeta(item);
      return item.status !== "archived" && (meta.assigned_employee_id || meta.custody_status === "issued");
    });
  }, [items]);

  const assignedCount = custodyItems.length;
  const dueSoonCount = custodyItems.filter((item) => {
    const due = getMeta(item).expected_return_at;
    if (typeof due !== "string" || !due) return false;
    const dueDate = new Date(due).getTime();
    const sevenDays = 1000 * 60 * 60 * 24 * 7;
    return Number.isFinite(dueDate) && dueDate - Date.now() <= sevenDays;
  }).length;
  const availableCount = items.filter((item) => {
    const meta = getMeta(item);
    return item.status !== "archived" && !meta.assigned_employee_id && meta.custody_status !== "issued";
  }).length;

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee.full_name]));
  }, [employees]);

  async function handleIssue(itemId: string) {
    const employeeId = selectedEmployeeId[itemId] || employees[0]?.id;
    if (!employeeId) return;
    const employee = employees.find((person) => person.id === employeeId);
    const item = items.find((entry) => entry.id === itemId);
    const meta = getMeta(item);

    await updateItem.mutateAsync({
      id: itemId,
      updates: {
        metadata: {
          ...meta,
          custody_status: "issued",
          assigned_employee_id: employeeId,
          assigned_employee_name: employee?.full_name ?? "Employee",
          issued_at: new Date().toISOString(),
          expected_return_at: meta.expected_return_at ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          condition: meta.condition ?? "good",
        },
      },
    });
  }

  async function handleReturn(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    const meta = getMeta(item);

    await updateItem.mutateAsync({
      id: itemId,
      updates: {
        metadata: {
          ...meta,
          custody_status: "returned",
          assigned_employee_id: null,
          assigned_employee_name: null,
          returned_at: new Date().toISOString(),
        },
      },
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset custody"
        description="Track which equipment or assets are assigned to staff and due back for review."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/inventory">Inventory overview</a>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Assigned" value={isLoading ? "—" : String(assignedCount)} icon={<UserRound className="size-4" />} />
        <StatCard title="Due soon" value={isLoading ? "—" : String(dueSoonCount)} icon={<CalendarClock className="size-4" />} />
        <StatCard title="Available" value={isLoading ? "—" : String(availableCount)} icon={<ShieldCheck className="size-4" />} />
      </div>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 font-medium">Due back</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p>No asset assignments yet.</p>
                      <p className="text-xs text-muted-foreground">Add stock in the inventory module to begin issuing items to staff.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = getMeta(item);
                  const employeeId = typeof meta.assigned_employee_id === "string" ? meta.assigned_employee_id : "";
                  const assigned = employeeMap.get(employeeId) ?? (typeof meta.assigned_employee_name === "string" ? meta.assigned_employee_name : "Unassigned");
                  const dueDate = typeof meta.expected_return_at === "string" ? meta.expected_return_at : "";
                  const status = typeof meta.custody_status === "string" ? meta.custody_status : employeeId ? "issued" : "available";
                  const isIssued = status === "issued";

                  return (
                    <tr key={item.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku || "No SKU"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isIssued ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">{assigned}</span>
                          </div>
                        ) : (
                          <select
                            value={selectedEmployeeId[item.id] ?? ""}
                            onChange={(event) => setSelectedEmployeeId((current) => ({ ...current, [item.id]: event.target.value }))}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Select employee</option>
                            {employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", item.status === "active" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                          {typeof meta.condition === "string" ? meta.condition : "good"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {dueDate ? new Date(dueDate).toLocaleDateString() : "Not set"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={isIssued ? "issued" : "available"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isIssued ? (
                            <Button variant="outline" size="sm" onClick={() => handleReturn(item.id)}>
                              Return
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleIssue(item.id)} disabled={!selectedEmployeeId[item.id] && !employees[0]}>
                              <ArrowLeftRight className="mr-2 size-3.5" /> Issue
                            </Button>
                          )}
                        </div>
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
