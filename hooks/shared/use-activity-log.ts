"use client";

import { useQuery } from "@tanstack/react-query";
import { getActivityEntityNames, getActivityLog } from "@/lib/shared/activity";
import { useOrg } from "@/hooks/use-org";

export function useActivityLog(orgId: string, limit = 25, offset = 0) {
  const { isLoading: orgLoading } = useOrg();
  const query = useQuery({
    queryKey: ["activity-log", orgId, limit, offset],
    queryFn: () => getActivityLog(orgId, limit, offset),
    enabled: typeof window !== "undefined" && !!orgId,
  });
  return { ...query, isLoading: orgLoading || query.isPending };
}

export function useActivityEntityNames(orgId: string) {
  return useQuery({
    queryKey: ["activity-entities", orgId],
    queryFn: () => getActivityEntityNames(orgId),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}