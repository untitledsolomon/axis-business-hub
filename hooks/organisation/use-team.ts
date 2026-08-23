import { useQuery } from "@tanstack/react-query";
import { getTeamMembers, getPendingInvitations, createInvitation, revokeInvitation, acceptInvitation } from "@/lib/organisation/team-queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";

export function useTeamMembers(orgId: string) {
  return useQuery({
    queryKey: ["team-members", orgId],
    queryFn: () => getTeamMembers(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function usePendingInvitations(orgId: string) {
  return useQuery({
    queryKey: ["org-invitations", orgId],
    queryFn: () => getPendingInvitations(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateInvitation(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { email: string; role: string }) => createInvitation({ ...vars, org_id: orgId }),
    invalidateKeys: () => [["org-invitations", orgId]],
    successMessage: "Invite created",
    fallbackErrorMessage: "Failed to create invite",
  });
}

export function useRevokeInvitation(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { id: string }) => revokeInvitation(vars.id),
    invalidateKeys: () => [["org-invitations", orgId]],
    successMessage: "Invite revoked",
    fallbackErrorMessage: "Failed to revoke invite",
  });
}

export function useAcceptInvitation() {
  return useCrudMutation({
    mutationFn: (vars: { code: string }) => acceptInvitation(vars.code),
    invalidateKeys: () => [["team-members"], ["organisations"]],
    successMessage: "You've joined the organisation",
    fallbackErrorMessage: "Failed to accept invite",
  });
}
