"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface EmployeeDocument {
  id: string;
  org_id: string;
  employee_id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

export function useEmployeeDocuments(orgId: string, employeeId: string) {
  return useQuery({
    queryKey: ["employee-documents", orgId, employeeId],
    queryFn: async () => {
      const { data, error } = await createClient().from("employee_documents").select("*").eq("org_id", orgId).eq("employee_id", employeeId).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmployeeDocument[];
    },
    enabled: typeof window !== "undefined" && !!orgId && !!employeeId,
  });
}

export function useUploadEmployeeDocument(orgId: string, employeeId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const path = `${orgId}/${employeeId}/${crypto.randomUUID()}-${file.name}`;
      const supabase = createClient();
      const upload = await supabase.storage.from("employee-documents").upload(path, file);
      if (upload.error) throw upload.error;
      const { data, error } = await supabase.from("employee_documents").insert({ org_id: orgId, employee_id: employeeId, file_name: file.name, file_url: path, document_type: documentType, uploaded_by: user?.id }).select().single();
      if (error) throw error;
      return data as EmployeeDocument;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-documents", orgId, employeeId] }),
  });
}

export function useDeleteEmployeeDocument(orgId: string, employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (document: EmployeeDocument) => {
      const supabase = createClient();
      const removed = await supabase.storage.from("employee-documents").remove([document.file_url]);
      if (removed.error) throw removed.error;
      const { error } = await supabase.from("employee_documents").delete().eq("id", document.id).eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-documents", orgId, employeeId] }),
  });
}

export async function getEmployeeDocumentUrl(path: string) {
  const { data, error } = await createClient().storage.from("employee-documents").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
