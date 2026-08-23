import { Metadata } from "next";
import { EmployeeDetail } from "@/components/employees/EmployeeDetail";

export const metadata: Metadata = {
  title: "Employee Profile",
  description: "Contact info, role, and employment status for this employee.",
};

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params;
  return <EmployeeDetail employeeId={id} />;
}
