"use client";

import { useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { useTeamMembers, usePendingInvitations, useRevokeInvitation } from "@/hooks/organisation/use-team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteMemberForm } from "@/components/settings/InviteMemberForm";
import { useDeferredModalOpen } from "@/hooks/shared/use-deferred-modal-open";
import { UserPlus, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgInvitation } from "@/lib/types";

const roleTone: Record<string, string> = {
  owner: "bg-primary-soft text-primary",
  admin: "bg-primary-soft text-primary",
  accountant: "bg-warning-soft text-warning-foreground",
  hr_manager: "bg-warning-soft text-warning-foreground",
  inventory_manager: "bg-success-soft text-success",
  sales: "bg-success-soft text-success",
  staff: "bg-muted text-muted-foreground",
  read_only: "bg-muted text-muted-foreground",
};
const defaultRoleTone = "bg-muted text-muted-foreground";

function initials(name: string | null, email: string) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function TeamSettingsView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: members, isLoading, isError: membersError, refetch: refetchMembers } = useTeamMembers(orgId);
  const { data: invitations, isLoading: invitesLoading, isError: invitesError, refetch: refetchInvitations } = usePendingInvitations(orgId);
  const revokeInvitation = useRevokeInvitation(orgId);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<OrgInvitation | null>(null);
  const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);
  const openRevokeConfirm = useDeferredModalOpen(setIsRevokeConfirmOpen);

  async function handleRevoke() {
    if (!revokeTarget) return;
    await revokeInvitation.mutateAsync({ id: revokeTarget.id });
    setIsRevokeConfirmOpen(false);
    setRevokeTarget(null);
  }

  return (
    <>
      <PageHeader
        title="Team"
        description={`People with access to ${currentOrg?.name ?? "this organisation"}.`}
        actions={
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Invite Member">
                <UserPlus className="size-4" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <InviteMemberForm orgId={currentOrg.id} onSuccess={() => setIsInviteOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before inviting anyone.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4">
        <div className="panel overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : membersError ? (
            <div className="p-6 text-center">
              <p className="text-sm text-destructive">Team members could not be loaded.</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetchMembers()}>Try again</Button>
            </div>
          ) : !members || members.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No team members found.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary-soft text-xs text-primary">
                        {initials(member.profile?.full_name ?? null, member.profile?.email ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.profile?.full_name || member.profile?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      roleTone[member.role] ?? defaultRoleTone
                    )}
                  >
                    {roleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(invitesLoading || invitesError || (invitations && invitations.length > 0)) && (
          <div className="panel overflow-hidden">
            <div className="border-b border-border p-4">
              <p className="font-display text-sm font-semibold text-foreground">Pending Invites</p>
            </div>
            {invitesLoading ? (
              <div className="space-y-3 p-6">
                <div className="h-10 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : invitesError ? (
              <div className="p-6 text-center">
                <p className="text-sm text-destructive">Pending invitations could not be loaded.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetchInvitations()}>Try again</Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invitations!.map((invite) => (
                  <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{invite.email}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" /> Code {invite.code} · expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          roleTone[invite.role] ?? defaultRoleTone
                        )}
                      >
                        {roleLabel(invite.role)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Revoke invite for ${invite.email}`}
                        onClick={() => {
                          setRevokeTarget(invite);
                          openRevokeConfirm();
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={isRevokeConfirmOpen} onOpenChange={setIsRevokeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite code for {revokeTarget?.email} will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
              disabled={revokeInvitation.isPending}
            >
              {revokeInvitation.isPending ? "Revoking…" : "Revoke Invite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
