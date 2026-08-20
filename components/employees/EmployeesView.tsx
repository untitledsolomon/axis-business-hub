"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, MoreHorizontal, Mail, Users, UserCheck, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { useOrg } from "@/hooks/use-org";
import { useEmployees } from "@/hooks/employees/use-employees";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EmployeesView() {
  const { currentOrg } = useOrg();
  const { data: employees, isLoading } = useEmployees(currentOrg?.id ?? "");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const active = (employees ?? []).filter((e) => e.status === "active").length;
  const onLeave = (employees ?? []).filter((e) => e.status === "on_leave").length;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage your organisation's workforce and team structure."
        actions={
          <Button disabled title="Coming soon">
            <Plus className="size-4" />
            Add Employee
          </Button>
        }
      />

      <div className="space-y-4 ">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Headcount" value={isLoading ? "—" : String(employees?.length ?? 0)} icon={<Users className="size-4" />} />
          <StatCard title="Active" value={isLoading ? "—" : String(active)} icon={<UserCheck className="size-4" />} />
          <StatCard title="On leave" value={isLoading ? "—" : String(onLeave)} icon={<UserMinus className="size-4" />} />
        </div>

        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="font-display text-sm font-semibold text-foreground">Directory</p>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" disabled title="Coming soon">
              Filters
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role & Department</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {search ? "No employees match your search." : "No employees added yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary-soft text-xs text-primary">
                            {initials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{employee.full_name}</p>
                          {employee.email && (
                            <p className="flex items-center truncate text-xs text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" /> {employee.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium capitalize text-foreground">{employee.role}</p>
                      {employee.department && (
                        <p className="text-xs text-muted-foreground">{employee.department}</p>
                      )}
                    </TableCell>
                    <TableCell className="numeric text-muted-foreground">
                      {new Date(employee.hire_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={employee.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open menu for ${employee.full_name}`}>
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open menu for {employee.full_name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>View Profile</DropdownMenuItem>
                          <DropdownMenuItem disabled>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem disabled>Manage Permissions</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>
                            Terminate Employment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>{filtered.length} employee{filtered.length === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
