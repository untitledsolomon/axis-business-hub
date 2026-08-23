"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useEmployee } from "@/hooks/employees/use-employees";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeActions } from "@/components/employees/EmployeeActions";
import { formatShortDate } from "@/lib/format-date";
import { ArrowLeft, AlertTriangle, Users, Mail, Phone, Briefcase } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface EmployeeDetailProps {
  employeeId: string;
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";
  const { data: employee, isLoading, isError, refetch } = useEmployee(orgId, employeeId);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isError) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <div className="rounded-full bg-destructive-soft p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this employee</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching this from the server. Please try again.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3 rounded-lg border border-border p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Employee not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This employee may have been deleted, or you may not have access to their record.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/employees">
            <ArrowLeft className="size-4" />
            Back to Employees
          </Link>
        </Button>
      </div>

      <PageHeader
        title={employee.full_name}
        description={employee.role}
        actions={<EmployeeActions orgId={orgId} employee={employee} showViewDetails={false} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="bg-primary-soft text-sm text-primary">
                {initials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{employee.full_name}</p>
              <StatusBadge status={employee.status} />
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {employee.email && (
              <div className="flex justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" /> Email
                </span>
                <span className="text-foreground">{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" /> Phone
                </span>
                <span className="text-foreground">{employee.phone}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-border pb-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="size-4" /> Department
              </span>
              <span className="text-foreground">{employee.department || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hire Date</span>
              <span className="numeric text-foreground">{formatShortDate(employee.hire_date)}</span>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {employee.notes || "No notes on file."}
          </p>
        </section>
      </div>
    </>
  );
}
