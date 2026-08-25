"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useActivityLog } from "@/hooks/shared/use-activity-log";
import { activityDescription } from "@/lib/shared/activity";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentActivity() {
  const { currentOrg } = useOrg();
  const { data: activities, isLoading } = useActivityLog(currentOrg?.id ?? "", 6);

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-foreground">Recent activity</h2><p className="text-xs text-muted-foreground">Across your workspace</p></div><Link href="/activity" className="text-xs font-medium text-primary hover:underline">View all</Link></div>

      {isLoading ? (
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !activities?.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {activities?.map((activity) => {
            const formatted = activityDescription(activity);
            return (
            <li key={activity.id} className="flex gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary-soft text-primary">
                  <Activity className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{formatted.title}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(activity.created_at)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{formatted.description}</p>
              </div>
            </li>
          ); })}
        </ul>
      )}
    </section>
  );
}
