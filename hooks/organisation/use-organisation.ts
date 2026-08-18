import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrganisation, updateOrganisation, OrganisationProfile } from "@/lib/organisation/queries";

export function useOrganisation(orgId: string) {
  return useQuery({
    queryKey: ["organisation", orgId],
    queryFn: () => getOrganisation(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useUpdateOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, updates }: { orgId: string; updates: Partial<Omit<OrganisationProfile, "id" | "slug">> }) =>
      updateOrganisation(orgId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organisation", variables.orgId] });
    },
  });
}
