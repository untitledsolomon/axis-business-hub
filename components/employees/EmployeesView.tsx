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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, MoreHorizontal, Mail, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrg } from "@/hooks/use-org";
import { useEmployees } from "@/hooks/employees/use-employees";

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-axis-green/10 text-axis-green border-axis-green/20";
    case "on_leave":
      return "bg-axis-amber/10 text-axis-amber border-axis-amber/20";
    case "terminated":
      return "bg-axis-red/10 text-axis-red border-axis-red/20";
    default:
      return "bg-axis-gray/10 text-axis-gray border-axis-gray/20";
  }
}

function statusLabel(status: string) {
  const spaced = status.replace("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Employees</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s workforce and team structure.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-axis-blue-light" disabled title="Coming soon">
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" disabled title="Coming soon">
          Filters
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Role & Department</TableHead>
              <TableHead className="font-semibold">Hire Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Loading employees...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {search
                    ? "No employees match your search."
                    : "No employees added yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-axis-light/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-axis-blue/10 text-axis-blue text-xs">
                          {initials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{employee.full_name}</span>
                        {employee.email && (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Mail className="mr-1 h-3 w-3" /> {employee.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium capitalize">{employee.role}</span>
                      {employee.department && (
                        <span className="text-xs text-muted-foreground">{employee.department}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center">
                      <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                      {new Date(employee.hire_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(employee.status)}>
                      {statusLabel(employee.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open menu for ${employee.full_name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {employee.full_name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem disabled>View Profile</DropdownMenuItem>
                        <DropdownMenuItem disabled>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem disabled>Manage Permissions</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-axis-red" disabled>
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
      </div>
    </div>
  );
}
