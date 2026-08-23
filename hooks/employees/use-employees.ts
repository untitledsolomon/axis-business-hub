import { useQuery } from "@tanstack/react-query";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  terminateEmployee,
  deleteEmployee,
} from "@/lib/employees/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { Employee } from "@/lib/types";

export function useEmployees(orgId: string) {
  return useQuery({
    queryKey: ["employees", orgId],
    queryFn: () => getEmployees(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useEmployee(orgId: string, employeeId: string) {
  return useQuery({
    queryKey: ["employees", orgId, employeeId],
    queryFn: () => getEmployee(orgId, employeeId),
    enabled: typeof window !== 'undefined' && !!orgId && !!employeeId,
  });
}

export function useCreateEmployee(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: Omit<Employee, "id" | "org_id" | "created_at" | "updated_at">) =>
      createEmployee({ ...vars, org_id: orgId }),
    invalidateKeys: () => [["employees", orgId]],
    successMessage: "Employee added",
    fallbackErrorMessage: "Failed to add employee",
  });
}

export function useUpdateEmployee(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string; updates: Parameters<typeof updateEmployee>[1] }) =>
      updateEmployee(vars.id, vars.updates),
    invalidateKeys: (vars) => [["employees", orgId], ["employees", orgId, vars.id]],
    successMessage: "Employee updated",
    fallbackErrorMessage: "Failed to update employee",
  });
}

export function useTerminateEmployee(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string }) => terminateEmployee(vars.id),
    invalidateKeys: (vars) => [["employees", orgId], ["employees", orgId, vars.id]],
    successMessage: "Employee marked as terminated",
    fallbackErrorMessage: "Failed to update employee status",
  });
}

export function useDeleteEmployee(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string }) => deleteEmployee(vars.id),
    invalidateKeys: () => [["employees", orgId]],
    successMessage: "Employee deleted",
    fallbackErrorMessage: "Failed to delete employee",
  });
}
