"use client";

import { useOrg } from "@/hooks/use-org";
import { useTeamMembers } from "@/hooks/organisation/use-team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { data: members, isLoading } = useTeamMembers(currentOrg?.id ?? "");

  return (
    <>
      <PageHeader
        title="Team"
        description={`People with access to ${currentOrg?.name ?? "this organisation"}.`}
        actions={
          <Button disabled>
            <UserPlus className="size-4" /> Invite Member
          </Button>
        }
      />

      <div className="p-4 md:p-6">
        <div className="panel overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No team members found.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
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
      </div>
    </>
  );
}
