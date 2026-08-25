"use client";

import { useQuery } from "@tanstack/react-query";
import { getActivityLog } from "@/lib/shared/activity";

export function useActivityLog(orgId: string, limit = 25, offset = 0) {
  return useQuery({
    queryKey: ["activity-log", orgId, limit, offset],
    queryFn: () => getActivityLog(orgId, limit, offset),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}