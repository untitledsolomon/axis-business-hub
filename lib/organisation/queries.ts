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
  invoice_template_id: string;
  invoice_template_storage_path: string | null;
  invoice_brand_color: string;
  tagline: string | null;
  address_line1: string | null;
  address_line2: string | null;
  contact_email: string | null;
  phone1: string | null;
  phone2: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  settings: Record<string, unknown> | null;
}

export async function getOrganisation(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, slug, logo_url, address, registration_number, tax_id, base_currency, fiscal_year_start_month, country, invoice_template_id, invoice_template_storage_path, invoice_brand_color, tagline, address_line1, address_line2, contact_email, phone1, phone2, onboarding_step, onboarding_completed_at, settings")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data as OrganisationProfile;
}

export interface InvoiceTemplateSettings {
  templateId: string;
  storagePath: string | null;
  brandColor: string;
}

export async function updateInvoiceTemplateSettings(orgId: string, settings: InvoiceTemplateSettings) {
  const validTemplateIds = ["classic", "modern", "minimal", "custom"];
  const validationError = !validTemplateIds.includes(settings.templateId)
    ? "Unknown invoice template."
    : settings.templateId === "custom" && !settings.storagePath?.trim()
      ? "Upload a custom HTML template first."
      : null;
  if (validationError) throw new Error(validationError);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .update({
      invoice_template_id: settings.templateId,
      invoice_template_storage_path: settings.templateId === "custom" ? settings.storagePath : null,
      invoice_brand_color: settings.brandColor,
    })
    .eq("id", orgId)
    .select()
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
