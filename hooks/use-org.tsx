"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Organisation {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  settings: Record<string, unknown> | null;
  logo_url: string | null;
  tagline: string | null;
  address_line1: string | null;
  address_line2: string | null;
  contact_email: string | null;
  phone1: string | null;
  phone2: string | null;
}

interface OrganisationMemberResponse {
  organisations: {
    id: string;
    name: string;
    slug: string;
    base_currency: string;
    onboarding_step: number;
    onboarding_completed_at: string | null;
    settings: Record<string, unknown> | null;
    logo_url: string | null;
    tagline: string | null;
    address_line1: string | null;
    address_line2: string | null;
    contact_email: string | null;
    phone1: string | null;
    phone2: string | null;
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
  const supabase = typeof window === 'undefined' ? null : createClient();

  const fetchOrgs = useCallback(async () => {
    if (!supabase) {
      setOrganisations([]);
      setCurrentOrg(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('organisations(id, name, slug, base_currency, onboarding_step, onboarding_completed_at, settings, logo_url, tagline, address_line1, address_line2, contact_email, phone1, phone2)')
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
    if (supabase) {
      fetchOrgs();
    } else {
      setIsLoading(false);
    }
  }, [fetchOrgs, supabase]);

  const setOrg = (orgId: string) => {
    const found = organisations.find(o => o.id === orgId);
    if (found) {
      setCurrentOrg(found);
      localStorage.setItem("axis_current_org_id", found.id);
    }
  };

  const value: OrgContextType = {
    currentOrg,
    organisations,
    isLoading,
    setOrg,
    refreshOrgs: fetchOrgs,
  };

  return (
    <OrgContext.Provider value={value}>
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
