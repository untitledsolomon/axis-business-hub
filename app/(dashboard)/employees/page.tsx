import { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Employees",
  description: "Manage your team, roles, and employment status.",
};

const employees = [
  {
    id: "1",
    name: "John Doe",
    email: "john@axis.com",
    role: "Admin",
    department: "Management",
    status: "active",
    hireDate: "Jan 15, 2024",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@axis.com",
    role: "Sales",
    department: "Sales",
    status: "active",
    hireDate: "Mar 10, 2024",
  },
  {
    id: "3",
    name: "Robert Johnson",
    email: "robert@axis.com",
    role: "Accountant",
    department: "Finance",
    status: "active",
    hireDate: "Feb 05, 2024",
  },
  {
    id: "4",
    name: "Sarah Williams",
    email: "sarah@axis.com",
    role: "Staff",
    department: "Operations",
    status: "on_leave",
    hireDate: "Dec 20, 2023",
  },
  {
    id: "5",
    name: "Michael Brown",
    email: "michael@axis.com",
    role: "Inventory Manager",
    department: "Logistics",
    status: "active",
    hireDate: "May 01, 2024",
  },
];

export default function EmployeesPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-axis-green/10 text-axis-green border-axis-green/20";
      case "on_leave":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "terminated":
        return "bg-axis-red/10 text-axis-red border-axis-red/20";
      default:
        return "bg-axis-gray/10 text-axis-gray border-axis-gray/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Employees</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s workforce and team structure.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
          />
        </div>
        <Button variant="outline">Filters</Button>
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
            {employees.map((employee) => (
              <TableRow key={employee.id} className="hover:bg-axis-light/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-axis-blue/10 text-axis-blue text-xs">
                        {employee.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Mail className="mr-1 h-3 w-3" /> {employee.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{employee.role}</span>
                    <span className="text-xs text-muted-foreground">{employee.department}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="flex items-center">
                    <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                    {employee.hireDate}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(employee.status)}>
                    {employee.status.replace("_", " ").charAt(0).toUpperCase() + employee.status.replace("_", " ").slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Open menu for ${employee.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu for {employee.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit Details</DropdownMenuItem>
                      <DropdownMenuItem>Manage Permissions</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-axis-red">Terminate Employment</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
