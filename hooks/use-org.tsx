"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Organisation {
  id: string;
  name: string;
  slug: string;
}

interface OrganisationMemberResponse {
  organisations: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface OrgContextType {
  currentOrg: Organisation | null;
  organisations: Organisation[];
  isLoading: boolean;
  setOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organisation | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchOrgs = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('organisations(id, name, slug)')
        .eq('user_id', user.id);

      if (data && !error) {
        const orgs = (data as unknown as OrganisationMemberResponse[])
          .map((item) => item.organisations)
          .filter((org): org is Organisation => org !== null);

        setOrganisations(orgs);

        // Try to restore from localStorage or pick first one
        const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem("axis_current_org_id") : null;
        const found = orgs.find(o => o.id === savedOrgId);

        if (found) {
          setCurrentOrg(found);
        } else if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
          if (typeof window !== 'undefined') {
            localStorage.setItem("axis_current_org_id", orgs[0].id);
          }
        }
      }
    } else {
      setOrganisations([]);
      setCurrentOrg(null);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const setOrg = (orgId: string) => {
    const found = organisations.find(o => o.id === orgId);
    if (found) {
      setCurrentOrg(found);
      localStorage.setItem("axis_current_org_id", found.id);
    }
  };

  return (
    <OrgContext.Provider value={{
      currentOrg,
      organisations,
      isLoading,
      setOrg,
      refreshOrgs: fetchOrgs
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}
