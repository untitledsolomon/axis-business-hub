"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useEmployee } from "@/hooks/employees/use-employees";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeActions } from "@/components/employees/EmployeeActions";
import { ShiftAttendancePanel } from "@/components/employees/ShiftAttendancePanel";
import { useDeleteEmployeeDocument, useEmployeeDocuments, getEmployeeDocumentUrl, useUploadEmployeeDocument } from "@/hooks/employees/use-employee-documents";
import { useUpdateEmployee } from "@/hooks/employees/use-employees";
import { formatShortDate } from "@/lib/format-date";
import { ArrowLeft, AlertTriangle, Users, Mail, Phone, Briefcase, Camera, FileText, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface EmployeeDetailProps {
  employeeId: string;
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";
  const { data: employee, isLoading, isError, refetch } = useEmployee(orgId, employeeId);
  const updateEmployee = useUpdateEmployee(orgId);
  const { data: documents = [], isLoading: documentsLoading } = useEmployeeDocuments(orgId, employeeId);
  const uploadDocument = useUploadEmployeeDocument(orgId, employeeId);
  const deleteDocument = useDeleteEmployeeDocument(orgId, employeeId);
  const [documentType, setDocumentType] = useState("other");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isError) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <div className="rounded-full bg-destructive-soft p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this employee</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching this from the server. Please try again.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3 rounded-lg border border-border p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Employee not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This employee may have been deleted, or you may not have access to their record.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/employees">
            <ArrowLeft className="size-4" />
            Back to Employees
          </Link>
        </Button>
      </div>

      <PageHeader
        title={employee.full_name}
        description={employee.role}
        actions={<EmployeeActions orgId={orgId} employee={employee} showViewDetails={false} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="size-12">
              {employee.photo_url && <AvatarImage src={employee.photo_url} alt={employee.full_name} />}
              <AvatarFallback className="bg-primary-soft text-sm text-primary">
                {initials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer text-xs text-primary hover:underline">
              <Camera className="mr-1 inline size-3.5" /> Update photo
              <input className="sr-only" type="file" accept="image/*" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const path = `${orgId}/${employee.id}/${crypto.randomUUID()}-${file.name}`;
                const supabase = (await import("@/lib/supabase/client")).createClient();
                const upload = await supabase.storage.from("employee-photos").upload(path, file, { upsert: true });
                if (upload.error) { toast.error(upload.error.message); return; }
                const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
                await updateEmployee.mutateAsync({ id: employee.id, updates: { photo_url: data.publicUrl } });
                toast.success("Employee photo updated");
              }} />
            </label>
            <div>
              <p className="font-semibold text-foreground">{employee.full_name}</p>
              <StatusBadge status={employee.status} />
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {employee.email && (
              <div className="flex justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" /> Email
                </span>
                <span className="text-foreground">{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" /> Phone
                </span>
                <span className="text-foreground">{employee.phone}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-border pb-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="size-4" /> Department
              </span>
              <span className="text-foreground">{employee.department || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hire Date</span>
              <span className="numeric text-foreground">{formatShortDate(employee.hire_date)}</span>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {employee.notes || "No notes on file."}
          </p>
        </section>
      </div>

      <div className="mt-4">
        <section className="panel mb-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-foreground">Documents</h2><p className="text-xs text-muted-foreground">Store contracts, IDs, and other employee records.</p></div>
            <div className="flex items-center gap-2">
              <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label="Document type">
                <option value="other">Other</option><option value="cv">CV</option><option value="contract">Contract</option><option value="identity">Identity</option>
              </select>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"><FileText className="size-4" /> Upload<input className="sr-only" type="file" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await uploadDocument.mutateAsync({ file, documentType }); toast.success("Document uploaded"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not upload document"); } event.target.value = ""; }} /></label>
            </div>
          </div>
          <div className="mt-4 divide-y divide-border">
            {documentsLoading ? <Skeleton className="h-10 w-full" /> : documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded yet.</p> : documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{document.file_name}</p><p className="text-xs text-muted-foreground">{document.document_type} · {formatShortDate(document.uploaded_at)}</p></div><div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon" aria-label={`Open ${document.file_name}`} onClick={async () => { try { window.open(await getEmployeeDocumentUrl(document.file_url), "_blank", "noopener,noreferrer"); } catch { toast.error("Could not open document"); } }}><ExternalLink className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${document.file_name}`} onClick={async () => { try { await deleteDocument.mutateAsync(document); toast.success("Document deleted"); } catch { toast.error("Could not delete document"); } }}><Trash2 className="size-4 text-destructive" /></Button></div></div>)}
          </div>
        </section>
        <ShiftAttendancePanel employee={employee} />
      </div>
    </>
  );
}
