import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getClients, getClient, createClient, updateClient, deleteClient, archiveClient } from "@/lib/clients/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";
import { Client } from "@/lib/types";
import { useOrg } from "@/hooks/use-org";

export function useClients(orgId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["clients", orgId],
    queryFn: () => getClients(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useClient(orgId: string, clientId: string) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["clients", orgId, clientId],
    queryFn: () => getClient(orgId, clientId),
    enabled: typeof window !== 'undefined' && !!orgId && !!clientId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useCreateClient() {
  return useCrudMutation<Parameters<typeof createClient>[0], Client>({
    mutationFn: createClient,
    invalidateKeys: (variables) => [["clients", variables.org_id]],
    successMessage: "Client added successfully",
    fallbackErrorMessage: "Failed to add client",
  });
}

export function useUpdateClient(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string; updates: Partial<Client> }, Client>({
    mutationFn: ({ id, updates }) => updateClient(id, updates),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", orgId, variables.id] });
      return [["clients", orgId]];
    },
    successMessage: "Client updated",
    fallbackErrorMessage: "Failed to update client",
  });
}

export function useDeleteClient(orgId: string) {
  return useCrudMutation<{ id: string }, void>({
    mutationFn: ({ id }) => deleteClient(id),
    invalidateKeys: () => [["clients", orgId]],
    successMessage: "Client deleted",
    fallbackErrorMessage: "Failed to delete client",
  });
}

export function useArchiveClient(orgId: string) {
  const queryClient = useQueryClient();
  return useCrudMutation<{ id: string }, Client>({
    mutationFn: ({ id }) => archiveClient(id),
    invalidateKeys: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", orgId, variables.id] });
      return [["clients", orgId]];
    },
    successMessage: "Client archived",
    fallbackErrorMessage: "Failed to archive client",
  });
}
