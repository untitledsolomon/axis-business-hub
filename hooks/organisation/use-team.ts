import { useQuery } from "@tanstack/react-query";
import { getTeamMembers } from "@/lib/organisation/team-queries";

export function useTeamMembers(orgId: string) {
  return useQuery({
    queryKey: ["team-members", orgId],
    queryFn: () => getTeamMembers(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}
