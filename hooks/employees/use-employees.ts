import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "@/lib/employees/queries";

export function useEmployees(orgId: string) {
  return useQuery({
    queryKey: ["employees", orgId],
    queryFn: () => getEmployees(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}
