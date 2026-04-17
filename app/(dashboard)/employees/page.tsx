"use client";

import { Plus, Search, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Employee } from "@/lib/types";

const mockEmployees: Employee[] = [
  { id: "1", firstName: "John", lastName: "Doe", email: "john@axis.com", role: "admin", status: "active", hireDate: "2023-01-01", createdAt: "", updatedAt: "" },
  { id: "2", firstName: "Sarah", lastName: "Smith", email: "sarah@axis.com", role: "manager", status: "active", hireDate: "2023-06-15", createdAt: "", updatedAt: "" },
];

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Employees</h1>
        <Button className="bg-axis-blue hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockEmployees.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-axis-light text-axis-blue"><User size={24} /></div>
                <div>
                  <h3 className="font-bold">{e.firstName} {e.lastName}</h3>
                  <Badge variant="outline">{e.role}</Badge>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2"><Mail size={14} />{e.email}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
