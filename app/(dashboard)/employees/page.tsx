import { Metadata } from "next";
import { EmployeesView } from "@/components/employees/EmployeesView";

export const metadata: Metadata = {
  title: "Employees",
  description: "Manage your team, roles, and employment status.",
};

export default function EmployeesPage() {
  return <EmployeesView />;
}
