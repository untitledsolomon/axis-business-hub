"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";

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

  const [weekStart, setWeekStart] = useState(() => { const date = new Date(); date.setDate(date.getDate() - date.getDay()); date.setHours(0, 0, 0, 0); return date; });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); return date; }), [weekStart]);
  const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
  const weekEnd = weekDays[6];
  const weekShifts = shifts.filter((shift) => weekDays.some((day) => toDateKey(day) === shift.shift_date));
  const weekAttendance = attendance.filter((entry) => weekDays.some((day) => toDateKey(day) === entry.attendance_date));

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

  return <section className="panel p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-foreground">Weekly schedule</h2><p className="text-xs text-muted-foreground">Shifts and attendance at a glance</p></div>
      <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart((date) => { const next = new Date(date); next.setDate(next.getDate() - 7); return next; })}><ChevronLeft className="size-4" /></Button><span className="min-w-40 text-center text-sm font-medium">{formatShortDate(toDateKey(weekStart))} - {formatShortDate(toDateKey(weekEnd))}</span><Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart((date) => { const next = new Date(date); next.setDate(next.getDate() + 7); return next; })}><ChevronRight className="size-4" /></Button></div>
      <div className="flex gap-2"><ShiftDialog form={shiftForm} setForm={setShiftForm} onSubmit={handleShiftSubmit} pending={createShift.isPending} /><AttendanceDialog form={attendanceForm} setForm={setAttendanceForm} onSubmit={handleAttendanceSubmit} pending={createAttendance.isPending} /></div>
    </div>
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7 divide-x divide-border rounded-lg border border-border">
        {weekDays.map((day) => { const key = toDateKey(day); const dayShifts = weekShifts.filter((shift) => shift.shift_date === key); const dayAttendance = weekAttendance.find((entry) => entry.attendance_date === key); return <div key={key} className="min-h-44 bg-muted/10 p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p><p className="mt-1 text-lg font-semibold text-foreground">{day.getDate()}</p><div className="mt-3 space-y-2">{dayShifts.map((shift) => <div key={shift.id} className="rounded-md border border-primary/20 bg-primary-soft p-2"><p className="text-xs font-semibold text-primary">{shift.shift_type}</p><p className="mt-1 text-xs text-muted-foreground">{shift.start_time} - {shift.end_time}</p><StatusBadge status={shift.status} /></div>)}{dayAttendance && <div className="flex items-center gap-1.5 text-xs"><span className="size-2 rounded-full bg-success" /> <StatusBadge status={dayAttendance.status} /></div>}{!dayShifts.length && !dayAttendance && <p className="text-xs text-muted-foreground">Open</p>}</div></div>; })}
      </div>
    </div>
    {(shiftsLoading || attendanceLoading) && <p className="mt-3 text-xs text-muted-foreground">Updating schedule...</p>}
  </section>;
}

function ShiftDialog({ form, setForm, onSubmit, pending }: { form: typeof shiftDefaults; setForm: Dispatch<SetStateAction<typeof shiftDefaults>>; onSubmit: () => Promise<void>; pending: boolean }) {
  return <Dialog><DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Add shift</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Schedule shift</DialogTitle></DialogHeader><div className="space-y-3"><label className="space-y-1 text-xs text-muted-foreground">Date<Input type="date" value={form.shift_date} onChange={(event) => setForm((prev) => ({ ...prev, shift_date: event.target.value }))} /></label><div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs text-muted-foreground">Start<Input type="time" value={form.start_time} onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))} /></label><label className="space-y-1 text-xs text-muted-foreground">End<Input type="time" value={form.end_time} onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))} /></label></div><label className="space-y-1 text-xs text-muted-foreground">Type<Select value={form.shift_type} onValueChange={(value) => setForm((prev) => ({ ...prev, shift_type: value as typeof prev.shift_type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="opening">Opening</SelectItem><SelectItem value="closing">Closing</SelectItem><SelectItem value="support">Support</SelectItem></SelectContent></Select></label><label className="space-y-1 text-xs text-muted-foreground">Status<Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as EmployeeShiftStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></label><Textarea placeholder="Optional shift notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /><Button className="w-full" onClick={onSubmit} disabled={pending}>{pending ? "Saving..." : "Save shift"}</Button></div></DialogContent></Dialog>;
}

function AttendanceDialog({ form, setForm, onSubmit, pending }: { form: typeof attendanceDefaults; setForm: Dispatch<SetStateAction<typeof attendanceDefaults>>; onSubmit: () => Promise<void>; pending: boolean }) {
  return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><CalendarDays className="size-4" /> Record attendance</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Record attendance</DialogTitle></DialogHeader><div className="space-y-3"><label className="space-y-1 text-xs text-muted-foreground">Date<Input type="date" value={form.attendance_date} onChange={(event) => setForm((prev) => ({ ...prev, attendance_date: event.target.value }))} /></label><label className="space-y-1 text-xs text-muted-foreground">Status<Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as EmployeeAttendanceStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="present">Present</SelectItem><SelectItem value="late">Late</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="half_day">Half day</SelectItem><SelectItem value="approved_leave">Approved leave</SelectItem></SelectContent></Select></label><Textarea placeholder="Optional attendance note" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /><Button className="w-full" onClick={onSubmit} disabled={pending}>{pending ? "Saving..." : "Save attendance"}</Button></div></DialogContent></Dialog>;
}
