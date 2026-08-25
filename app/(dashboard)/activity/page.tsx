"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/hooks/use-org";
import { useActivityLog } from "@/hooks/shared/use-activity-log";
import { activityDescription } from "@/lib/shared/activity";

export default function ActivityPage() {
  const { currentOrg } = useOrg();
  const [entity, setEntity] = useState("all");
  const [offset, setOffset] = useState(0);
  const { data: activities = [], isLoading } = useActivityLog(currentOrg?.id ?? "", 25, offset);
  const entities = useMemo(() => Array.from(new Set(activities.map((activity) => activity.table_name))), [activities]);
  const visible = entity === "all" ? activities : activities.filter((activity) => activity.table_name === entity);
  return <><PageHeader title="Activity" description="A record of changes across your organisation." /><div className="panel"><div className="flex items-center justify-between border-b border-border p-4"><Select value={entity} onValueChange={setEntity}><SelectTrigger className="w-56" aria-label="Filter activity by entity"><SelectValue placeholder="All entities" /></SelectTrigger><SelectContent><SelectItem value="all">All entities</SelectItem>{entities.map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div><Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Activity</TableHead><TableHead>User</TableHead></TableRow></TableHeader><TableBody>{isLoading ? [1, 2, 3].map((i) => <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-48" /></TableCell><TableCell><Skeleton className="h-4 w-32" /></TableCell></TableRow>) : visible.map((activity) => { const formatted = activityDescription(activity); return <TableRow key={activity.id}><TableCell className="text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</TableCell><TableCell><p className="font-medium">{formatted.title}</p><p className="text-xs text-muted-foreground">{formatted.description}</p></TableCell><TableCell>{activity.profile?.full_name || activity.profile?.email || "System"}</TableCell></TableRow>; })}</TableBody></Table><div className="flex justify-end gap-2 border-t border-border p-3"><button className="text-sm text-primary disabled:text-muted-foreground" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous</button><button className="text-sm text-primary disabled:text-muted-foreground" disabled={activities.length < 25} onClick={() => setOffset(offset + 25)}>Next</button></div></div></>;
}