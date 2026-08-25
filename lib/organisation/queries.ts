import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { validateCustomTemplate } from "@/lib/invoicing/templates/interpolate";

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
  invoice_custom_html: string | null;
  invoice_brand_color: string;
}

export async function getOrganisation(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, slug, logo_url, address, registration_number, tax_id, base_currency, fiscal_year_start_month, country, invoice_template_id, invoice_custom_html, invoice_brand_color")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data as OrganisationProfile;
}

export interface InvoiceTemplateSettings {
  templateId: string;
  customHtml: string | null;
  brandColor: string;
}

export async function updateInvoiceTemplateSettings(orgId: string, settings: InvoiceTemplateSettings) {
  const validTemplateIds = ["classic", "modern", "minimal", "custom"];
  const validationError = !validTemplateIds.includes(settings.templateId)
    ? "Unknown invoice template."
    : settings.templateId === "custom" && !settings.customHtml?.trim()
      ? "A custom HTML template is required."
      : settings.templateId === "custom" && settings.customHtml
        ? validateCustomTemplate(settings.customHtml)
        : null;
  if (validationError) throw new Error(validationError);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .update({
      invoice_template_id: settings.templateId,
      invoice_custom_html: settings.templateId === "custom" ? settings.customHtml : null,
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
