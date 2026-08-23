import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { Employee, EmployeeAttendance, EmployeeShift } from "@/lib/types";

export async function getEmployees(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data as Employee[];
}

export async function getEmployee(orgId: string, employeeId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", employeeId)
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function createEmployee(employee: Omit<Employee, "id" | "created_at" | "updated_at">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .insert(employee)
    .select()
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(
  employeeId: string,
  updates: Partial<Omit<Employee, "id" | "org_id" | "created_at" | "updated_at">>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", employeeId)
    .select()
    .single();

  if (error) throw error;
  return data as Employee;
}

/** Terminate is a status change, not a delete — keeps the employee's record
 * (and any history that references them) intact, matching how clients are
 * archived rather than hard-deleted. */
export async function terminateEmployee(employeeId: string) {
  return updateEmployee(employeeId, { status: "terminated" });
}

export async function getEmployeeShifts(orgId: string, employeeId?: string) {
  const supabase = getSupabaseClient();
  let query = supabase.from("employee_shifts").select("*").eq("org_id", orgId);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query.order("shift_date", { ascending: true });
  if (error) throw error;
  return data as EmployeeShift[];
}

export async function createEmployeeShift(shift: Omit<EmployeeShift, "id" | "created_at" | "updated_at">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("employee_shifts").insert(shift).select().single();
  if (error) throw error;
  return data as EmployeeShift;
}

export async function updateEmployeeShift(
  shiftId: string,
  updates: Partial<Omit<EmployeeShift, "id" | "org_id" | "employee_id" | "created_at" | "updated_at">>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("employee_shifts").update(updates).eq("id", shiftId).select().single();
  if (error) throw error;
  return data as EmployeeShift;
}

export async function getEmployeeAttendance(orgId: string, employeeId?: string) {
  const supabase = getSupabaseClient();
  let query = supabase.from("employee_attendance").select("*").eq("org_id", orgId);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query.order("attendance_date", { ascending: true });
  if (error) throw error;
  return data as EmployeeAttendance[];
}

export async function createEmployeeAttendance(
  attendance: Omit<EmployeeAttendance, "id" | "created_at" | "updated_at">
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("employee_attendance").insert(attendance).select().single();
  if (error) throw error;
  return data as EmployeeAttendance;
}

export async function updateEmployeeAttendance(
  attendanceId: string,
  updates: Partial<Omit<EmployeeAttendance, "id" | "org_id" | "employee_id" | "created_at" | "updated_at">>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("employee_attendance").update(updates).eq("id", attendanceId).select().single();
  if (error) throw error;
  return data as EmployeeAttendance;
}

export async function deleteEmployee(employeeId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);
  if (error) throw error;
}
