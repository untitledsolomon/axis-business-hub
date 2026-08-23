import { useQuery } from "@tanstack/react-query";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  terminateEmployee,
  deleteEmployee,
  getEmployeeShifts,
  createEmployeeShift,
  updateEmployeeShift,
  getEmployeeAttendance,
  createEmployeeAttendance,
  updateEmployeeAttendance,
} from "@/lib/employees/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { Employee, EmployeeAttendance, EmployeeShift } from "@/lib/types";

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

export function useEmployeeShifts(orgId: string, employeeId?: string) {
  return useQuery({
    queryKey: ["employee-shifts", orgId, employeeId ?? "all"],
    queryFn: () => getEmployeeShifts(orgId, employeeId),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}

export function useCreateEmployeeShift(orgId: string) {
  return useCrudMutation<Omit<EmployeeShift, "id" | "created_at" | "updated_at">, EmployeeShift>({
    mutationFn: (vars) => createEmployeeShift(vars),
    invalidateKeys: () => [["employee-shifts", orgId, "all"]],
    successMessage: "Shift scheduled",
    fallbackErrorMessage: "Failed to schedule shift",
  });
}

export function useUpdateEmployeeShift(orgId: string) {
  return useCrudMutation<{ id: string; updates: Partial<Omit<EmployeeShift, "id" | "org_id" | "employee_id" | "created_at" | "updated_at">> }, EmployeeShift>({
    mutationFn: ({ id, updates }) => updateEmployeeShift(id, updates),
    invalidateKeys: () => [["employee-shifts", orgId, "all"]],
    successMessage: "Shift updated",
    fallbackErrorMessage: "Failed to update shift",
  });
}

export function useEmployeeAttendance(orgId: string, employeeId?: string) {
  return useQuery({
    queryKey: ["employee-attendance", orgId, employeeId ?? "all"],
    queryFn: () => getEmployeeAttendance(orgId, employeeId),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}

export function useCreateEmployeeAttendance(orgId: string) {
  return useCrudMutation<Omit<EmployeeAttendance, "id" | "created_at" | "updated_at">, EmployeeAttendance>({
    mutationFn: (vars) => createEmployeeAttendance(vars),
    invalidateKeys: () => [["employee-attendance", orgId, "all"]],
    successMessage: "Attendance recorded",
    fallbackErrorMessage: "Failed to record attendance",
  });
}

export function useUpdateEmployeeAttendance(orgId: string) {
  return useCrudMutation<{ id: string; updates: Partial<Omit<EmployeeAttendance, "id" | "org_id" | "employee_id" | "created_at" | "updated_at">> }, EmployeeAttendance>({
    mutationFn: ({ id, updates }) => updateEmployeeAttendance(id, updates),
    invalidateKeys: () => [["employee-attendance", orgId, "all"]],
    successMessage: "Attendance updated",
    fallbackErrorMessage: "Failed to update attendance",
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
