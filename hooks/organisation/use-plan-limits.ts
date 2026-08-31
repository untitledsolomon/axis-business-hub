// hooks/organisation/use-plan-limits.ts
//
// React Query wrapper around lib/plan-limits.ts, for UI display
// ("3 of 5 users used") and pre-emptive capacity checks. The DB trigger
// remains the actual enforcement boundary — this hook only improves the
// user-facing experience around that boundary.

import { useQuery } from "@tanstack/react-query";
import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { getResourceUsage, type PlanResource, type ResourceUsage } from "@/lib/plan-limits";

export function useResourceUsage(orgId: string, resource: PlanResource) {
  return useQuery<ResourceUsage>({
    queryKey: ["plan-resource-usage", orgId, resource],
    queryFn: () => getResourceUsage(getSupabaseClient(), orgId, resource),
    enabled: typeof window !== "undefined" && !!orgId,
  });
}
