"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrg } from "@/hooks/use-org";
import {
  useCreateEmployeeAttendance,
  useCreateEmployeeShift,
  useEmployeeAttendance,
  useEmployeeShifts,
} from "@/hooks/employees/use-employees";
import { Employee, EmployeeAttendanceStatus, EmployeeShiftStatus } from "@/lib/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatShortDate } from "@/lib/format-date";
import { CalendarDays, Clock3, CheckCircle2 } from "lucide-react";

interface ShiftAttendancePanelProps {
  employee: Employee;
}

const shiftDefaults: {
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: "standard" | "opening" | "closing" | "support";
  status: EmployeeShiftStatus;
  notes: string;
} = {
  shift_date: new Date().toISOString().slice(0, 10),
  start_time: "09:00",
  end_time: "17:00",
  shift_type: "standard",
  status: "scheduled",
  notes: "",
};

const attendanceDefaults: {
  attendance_date: string;
  status: EmployeeAttendanceStatus;
  notes: string;
} = {
  attendance_date: new Date().toISOString().slice(0, 10),
  status: "scheduled",
  notes: "",
};

export function ShiftAttendancePanel({ employee }: ShiftAttendancePanelProps) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";

  const { data: shifts = [], isLoading: shiftsLoading } = useEmployeeShifts(orgId, employee.id);
  const { data: attendance = [], isLoading: attendanceLoading } = useEmployeeAttendance(orgId, employee.id);
  const createShift = useCreateEmployeeShift(orgId);
  const createAttendance = useCreateEmployeeAttendance(orgId);

  const [shiftForm, setShiftForm] = useState(shiftDefaults);
  const [attendanceForm, setAttendanceForm] = useState(attendanceDefaults);

  const sortedShifts = useMemo(
    () => [...shifts].sort((a, b) => new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime()),
    [shifts]
  );

  const sortedAttendance = useMemo(
    () => [...attendance].sort((a, b) => new Date(a.attendance_date).getTime() - new Date(b.attendance_date).getTime()),
    [attendance]
  );

  async function handleShiftSubmit() {
    await createShift.mutateAsync({
      employee_id: employee.id,
      org_id: orgId,
      shift_date: shiftForm.shift_date,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      shift_type: shiftForm.shift_type,
      status: shiftForm.status,
      notes: shiftForm.notes || undefined,
    });
    setShiftForm(shiftDefaults);
  }

  async function handleAttendanceSubmit() {
    await createAttendance.mutateAsync({
      employee_id: employee.id,
      org_id: orgId,
      attendance_date: attendanceForm.attendance_date,
      status: attendanceForm.status,
      notes: attendanceForm.notes || undefined,
      shift_id: null,
    });
    setAttendanceForm(attendanceDefaults);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Shift roster</h2>
            <p className="text-xs text-muted-foreground">Assign and review scheduled work blocks</p>
          </div>
          <CalendarDays className="size-4 text-primary" />
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Date
              <Input type="date" value={shiftForm.shift_date} onChange={(e) => setShiftForm((prev) => ({ ...prev, shift_date: e.target.value }))} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Type
              <Select
                value={shiftForm.shift_type}
                onValueChange={(value) =>
                  setShiftForm((prev) => ({
                    ...prev,
                    shift_type: value as "standard" | "opening" | "closing" | "support",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Start
              <Input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm((prev) => ({ ...prev, start_time: e.target.value }))} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              End
              <Input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm((prev) => ({ ...prev, end_time: e.target.value }))} />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Status
              <Select
                value={shiftForm.status}
                onValueChange={(value) =>
                  setShiftForm((prev) => ({
                    ...prev,
                    status: value as EmployeeShiftStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="space-y-1 text-xs text-muted-foreground">
            Notes
            <Textarea rows={2} placeholder="Optional shift notes" value={shiftForm.notes} onChange={(e) => setShiftForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </label>

          <Button className="w-full" onClick={handleShiftSubmit} disabled={createShift.isPending}>
            {createShift.isPending ? "Saving shift..." : "Add shift"}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {shiftsLoading ? (
            <div className="text-sm text-muted-foreground">Loading roster…</div>
          ) : sortedShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
          ) : (
            sortedShifts.slice(0, 4).map((shift) => (
              <div key={shift.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{shift.shift_type}</p>
                  <StatusBadge status={shift.status} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {formatShortDate(shift.shift_date)}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {shift.start_time} - {shift.end_time}
                </div>
                {shift.notes && <p className="mt-2 text-xs text-muted-foreground">{shift.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Attendance</h2>
            <p className="text-xs text-muted-foreground">Track daily presence and exceptions</p>
          </div>
          <CheckCircle2 className="size-4 text-primary" />
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            Attendance date
            <Input type="date" value={attendanceForm.attendance_date} onChange={(e) => setAttendanceForm((prev) => ({ ...prev, attendance_date: e.target.value }))} />
          </label>

          <label className="space-y-1 text-xs text-muted-foreground">
            Status
            <Select
              value={attendanceForm.status}
              onValueChange={(value) =>
                setAttendanceForm((prev) => ({
                  ...prev,
                  status: value as EmployeeAttendanceStatus,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="half_day">Half day</SelectItem>
                <SelectItem value="approved_leave">Approved leave</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1 text-xs text-muted-foreground">
            Notes
            <Textarea rows={2} placeholder="Optional attendance note" value={attendanceForm.notes} onChange={(e) => setAttendanceForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </label>

          <Button className="w-full" onClick={handleAttendanceSubmit} disabled={createAttendance.isPending}>
            {createAttendance.isPending ? "Saving..." : "Record attendance"}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {attendanceLoading ? (
            <div className="text-sm text-muted-foreground">Loading attendance…</div>
          ) : sortedAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance entries yet.</p>
          ) : (
            sortedAttendance.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{formatShortDate(entry.attendance_date)}</p>
                  <StatusBadge status={entry.status} />
                </div>
                {entry.notes && <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
