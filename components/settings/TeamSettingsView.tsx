"use client";

import { useOrg } from "@/hooks/use-org";
import { useTeamMembers } from "@/hooks/organisation/use-team";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

const roleStyles: Record<string, string> = {
  owner: "bg-axis-blue/10 text-axis-blue border-axis-blue/20",
  admin: "bg-axis-blue/10 text-axis-blue border-axis-blue/20",
  accountant: "bg-axis-amber/10 text-axis-amber border-axis-amber/20",
  hr_manager: "bg-axis-amber/10 text-axis-amber border-axis-amber/20",
  inventory_manager: "bg-axis-green/10 text-axis-green border-axis-green/20",
  sales: "bg-axis-green/10 text-axis-green border-axis-green/20",
  staff: "bg-axis-gray/10 text-axis-gray border-axis-gray/20",
  read_only: "bg-axis-gray/10 text-axis-gray border-axis-gray/20",
};
const defaultRoleStyle = "bg-axis-gray/10 text-axis-gray border-axis-gray/20";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            People with access to {currentOrg?.name ?? "this organisation"}.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-axis-blue-light" disabled>
          <UserPlus className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-axis-light animate-pulse rounded-md" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No team members found.
            </p>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-axis-blue text-white text-xs">
                        {initials(
                          member.profile?.full_name ?? null,
                          member.profile?.email ?? "?"
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {member.profile?.full_name || member.profile?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={roleStyles[member.role] ?? defaultRoleStyle}
                  >
                    {roleLabel(member.role)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
