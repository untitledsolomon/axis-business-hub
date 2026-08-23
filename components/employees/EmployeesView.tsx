"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Mail, Users, UserCheck, UserMinus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeActions } from "@/components/employees/EmployeeActions";
import { useOrg } from "@/hooks/use-org";
import { useEmployees } from "@/hooks/employees/use-employees";
import { formatShortDate } from "@/lib/format-date";

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
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: employees, isLoading, isError, refetch } = useEmployees(orgId);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage your organisation's workforce and team structure."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Add Employee">
                <Plus className="size-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <EmployeeForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before adding an employee.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
          </div>

          <div className="overflow-x-auto">
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
                {isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-40" />
                        <p className="text-sm text-muted-foreground">Couldn&apos;t load employees.</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="text-sm font-semibold text-foreground">
                          {search ? "No employees match your search." : "No employees added yet"}
                        </h3>
                        {!search && (
                          <>
                            <p className="max-w-sm text-sm text-muted-foreground">
                              Add your first team member to start tracking your workforce.
                            </p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsFormOpen(true)}>
                              <Plus className="size-4" /> Add Employee
                            </Button>
                          </>
                        )}
                      </div>
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
                            <Link
                              href={`/employees/${employee.id}`}
                              className="truncate font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {employee.full_name}
                            </Link>
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
                        {formatShortDate(employee.hire_date)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={employee.status} />
                      </TableCell>
                      <TableCell>
                        <EmployeeActions orgId={orgId} employee={employee} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
