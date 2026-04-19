import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, createClient } from "@/lib/clients/queries";

export function useClients(orgId: string) {
  return useQuery({
    queryKey: ["clients", orgId],
    queryFn: () => getClients(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", variables.org_id] });
    },
  });
}
