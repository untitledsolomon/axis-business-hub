"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface ClientDocument {
  id: string;
  org_id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

export function useClientDocuments(orgId: string, clientId: string) {
  return useQuery({
    queryKey: ["client-documents", orgId, clientId],
    queryFn: async () => {
      const { data, error } = await createClient().from("client_documents").select("*").eq("org_id", orgId).eq("client_id", clientId).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientDocument[];
    },
    enabled: typeof window !== "undefined" && !!orgId && !!clientId,
  });
}

export function useUploadClientDocument(orgId: string, clientId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const path = `${orgId}/${clientId}/${crypto.randomUUID()}-${file.name}`;
      const supabase = createClient();
      const upload = await supabase.storage.from("client-documents").upload(path, file);
      if (upload.error) throw upload.error;
      const { data, error } = await supabase.from("client_documents").insert({ org_id: orgId, client_id: clientId, file_name: file.name, file_url: path, document_type: documentType, uploaded_by: user?.id }).select().single();
      if (error) throw error;
      return data as ClientDocument;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-documents", orgId, clientId] }),
  });
}

export function useDeleteClientDocument(orgId: string, clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (document: ClientDocument) => {
      const supabase = createClient();
      const removed = await supabase.storage.from("client-documents").remove([document.file_url]);
      if (removed.error) throw removed.error;
      const { error } = await supabase.from("client_documents").delete().eq("id", document.id).eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-documents", orgId, clientId] }),
  });
}

export async function getClientDocumentUrl(path: string) {
  const { data, error } = await createClient().storage.from("client-documents").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
