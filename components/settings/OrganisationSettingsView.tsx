"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOrg } from "@/hooks/use-org";
import { useOrganisation, useUpdateOrganisation } from "@/hooks/organisation/use-organisation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { validateCustomTemplate, interpolateTemplate } from "@/lib/invoicing/templates/interpolate";
import { BUILT_IN_TEMPLATES } from "@/lib/invoicing/templates/registry";
import type { InvoicePdfData } from "@/lib/invoicing/templates/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Organisation name is required"),
  logo_url: z.string().optional(),
  address: z.string().optional(),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  base_currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
  invoice_template_id: z.enum(["classic", "modern", "minimal", "custom"]),
  invoice_template_storage_path: z.string().optional(),
  invoice_brand_color: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a valid hex colour"),
}).superRefine((values, context) => {
  if (values.invoice_template_id === "custom" && !values.invoice_template_storage_path?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["invoice_template_storage_path"], message: "Upload a custom HTML template first." });
  }
});

export function OrganisationSettingsView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: org, isLoading } = useOrganisation(orgId);
  const updateOrg = useUpdateOrganisation();
  const [templateFile, setTemplateFile] = useState<{ fileName: string; uploadedAt: string | null } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      logo_url: "",
      address: "",
      registration_number: "",
      tax_id: "",
      base_currency: "UGX",
      country: "Uganda",
      invoice_template_id: "classic",
      invoice_template_storage_path: "",
      invoice_brand_color: "#0f172a",
    },
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        logo_url: org.logo_url ?? "",
        address: org.address ?? "",
        registration_number: org.registration_number ?? "",
        tax_id: org.tax_id ?? "",
        base_currency: org.base_currency,
        country: org.country,
        invoice_template_id: (org.invoice_template_id as "classic" | "modern" | "minimal" | "custom") ?? "classic",
        invoice_template_storage_path: org.invoice_template_storage_path ?? "",
        invoice_brand_color: org.invoice_brand_color ?? "#0f172a",
      });
      if (org.invoice_template_storage_path) {
        fetch(`/api/invoice-template?orgId=${encodeURIComponent(orgId)}`)
          .then((response) => response.ok ? response.json() : null)
          .then((file) => file?.fileName && setTemplateFile({ fileName: file.fileName, uploadedAt: file.uploadedAt }))
          .catch(() => undefined);
      }
    }
  }, [org, orgId, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { invoice_template_id, invoice_template_storage_path, invoice_brand_color, ...profileUpdates } = values;
      await updateOrg.mutateAsync({
        orgId,
        updates: {
          ...profileUpdates,
          invoice_template_id,
          invoice_template_storage_path: invoice_template_id === "custom" ? invoice_template_storage_path || null : null,
          invoice_brand_color,
        },
      });
      toast.success("Organisation profile updated");
    } catch (error) {
      toast.error("Failed to update organisation profile");
      console.error(error);
    }
  }

  function previewTemplate() {
    const values = form.getValues();
    const data: InvoicePdfData = {
      org: { name: org?.name ?? "Organisation", logo_url: values.logo_url || org?.logo_url || null, address: org?.address ?? null, brand_color: values.invoice_brand_color },
      invoice: { number: "PREVIEW-001", issue_date: new Date().toISOString().slice(0, 10), due_date: new Date().toISOString().slice(0, 10), currency: org?.base_currency ?? "UGX", notes: "Thank you for your business." },
      client: { name: "Sample Client", company_name: "Sample Company", email: "client@example.com" },
      items: [{ description: "Sample service", quantity: 2, unit_price_cents: 25000, total_cents: 50000 }],
      totals: { subtotal_cents: 50000, discount_cents: 0, tax_cents: 0, grand_total_cents: 50000 },
    };
    const preview = values.invoice_template_id === "custom" && values.invoice_template_storage_path
      ? fetch(`/api/invoice-template?orgId=${encodeURIComponent(orgId)}&content=true`).then((response) => response.json()).then((result) => {
        if (!result.html) throw new Error(result.error ?? "Unable to load the uploaded template");
        return interpolateTemplate(result.html, data);
      })
      : Promise.resolve((BUILT_IN_TEMPLATES[values.invoice_template_id as keyof typeof BUILT_IN_TEMPLATES] ?? BUILT_IN_TEMPLATES.classic).render(data));
    preview.then((html) => {
      const previewWindow = window.open("", "invoice-preview");
      if (previewWindow) { previewWindow.document.write(html); previewWindow.document.close(); }
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to preview template"));
  }

  async function uploadTemplate(file: File) {
    setUploadError(null);
    if (file.size > 500 * 1024) { setUploadError("Template files must be 500KB or smaller."); return; }
    if (!/\.html?$/i.test(file.name)) { setUploadError("Only .html and .htm files are allowed."); return; }
    const html = await file.text();
    const validationError = validateCustomTemplate(html);
    if (validationError) { setUploadError(validationError); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append("orgId", orgId); body.append("file", file);
      const response = await fetch("/api/invoice-template", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Template upload failed");
      form.setValue("invoice_template_storage_path", result.path, { shouldValidate: true });
      setTemplateFile({ fileName: result.fileName, uploadedAt: result.uploadedAt });
      toast.success("Invoice template uploaded");
    } catch (error) { setUploadError(error instanceof Error ? error.message : "Template upload failed"); }
    finally { setUploading(false); }
  }

  async function uploadLogo(file: File) {
    if (!orgId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for the organisation logo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo files must be 2MB or smaller.");
      return;
    }

    try {
      const path = `${orgId}/logo-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { error } = await supabase.storage.from("organisation-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("organisation-logos").getPublicUrl(path);
      form.setValue("logo_url", data.publicUrl, { shouldValidate: true });
      toast.success("Organisation logo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo upload failed");
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Organisation Settings" description="Manage your organisation profile." />
        <div className="">
          <div className="panel max-w-2xl p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Organisation Settings" description="Manage your organisation profile." />
      <div className="">
        <div className="panel max-w-2xl p-6">
          <div className="mb-6">
            <h2 className="font-display text-sm font-semibold text-foreground">Organisation Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This information appears on invoices, reports, and payslips.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                  {(() => {
                    const logoUrl = form.watch("logo_url");
                    return logoUrl ? (
                      <Image src={logoUrl} alt="Organisation logo" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Logo</span>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium" htmlFor="org_logo_upload">Organisation logo</label>
                  <Input id="org_logo_upload" type="file" accept="image/*" className="mt-2" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogo(file);
                    event.target.value = "";
                  }} />
                  {form.watch("logo_url") && (
                    <button type="button" className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => form.setValue("logo_url", "")}>Remove logo</button>
                  )}
                </div>
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street, city, country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="base_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="UGX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={updateOrg.isPending}>
                {updateOrg.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </div>
        <div className="panel mt-6 max-w-2xl p-6">
          <div className="mb-6">
            <h2 className="font-display text-sm font-semibold text-foreground">Invoice Design</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the layout used for invoices generated by this organisation.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["classic", "modern", "minimal", "custom"] as const).map((templateId) => (
              <label key={templateId} className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" value={templateId} className="sr-only" {...form.register("invoice_template_id")} />
                <span className="font-medium capitalize">{templateId}</span>
                <span className="text-xs text-muted-foreground">{templateId === "custom" ? "Your HTML" : `${BUILT_IN_TEMPLATES[templateId].name} layout`}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="invoice_brand_color">Brand colour</label>
              <Input id="invoice_brand_color" type="color" className="mt-2 h-10 w-20 p-1" disabled={form.watch("invoice_template_id") === "custom"} {...form.register("invoice_brand_color")} />
            </div>
            {form.watch("invoice_template_id") === "custom" && <div>
              <label className="text-sm font-medium" htmlFor="invoice_template_file">Custom HTML template</label>
              <Input id="invoice_template_file" type="file" accept=".html,.htm" className="mt-2" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTemplate(file); event.target.value = ""; }} />
              <p className="mt-2 text-xs text-muted-foreground">Upload an HTML file up to 500KB. Script tags and inline event handlers are blocked.</p>
              {templateFile && <p className="mt-1 text-xs text-muted-foreground">{templateFile.fileName}{templateFile.uploadedAt ? `, uploaded ${new Date(templateFile.uploadedAt).toLocaleDateString()}` : ""}</p>}
              {uploadError && <p className="mt-1 text-sm text-destructive">{uploadError}</p>}
              {form.formState.errors.invoice_template_storage_path?.message && <p className="mt-1 text-sm text-destructive">{form.formState.errors.invoice_template_storage_path.message}</p>}
            </div>}
            <Button type="button" variant="outline" onClick={previewTemplate}>Preview</Button>
          </div>
        </div>
      </div>
    </>
  );
}
