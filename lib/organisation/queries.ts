import { createClient as getSupabaseClient } from "@/lib/supabase/client";

export interface OrganisationProfile {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  registration_number: string | null;
  tax_id: string | null;
  base_currency: string;
  fiscal_year_start_month: number;
  country: string;
}

export async function getOrganisation(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, slug, logo_url, address, registration_number, tax_id, base_currency, fiscal_year_start_month, country")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data as OrganisationProfile;
}

export async function updateOrganisation(
  orgId: string,
  updates: Partial<Omit<OrganisationProfile, "id" | "slug">>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;
  return data as OrganisationProfile;
}
