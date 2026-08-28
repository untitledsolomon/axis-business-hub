"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ImagePlus, Palette } from "lucide-react";
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
  const { data: org, isLoading, isError, refetch } = useOrganisation(orgId);
  const updateOrg = useUpdateOrganisation();
  const [templateFile, setTemplateFile] = useState<{ fileName: string; uploadedAt: string | null } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logoAssets, setLogoAssets] = useState<Array<{ path: string; url: string; name: string }>>([]);
  const [logosLoading, setLogosLoading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const loadLogoAssets = useCallback(async () => {
    if (!orgId) return;
    setLogosLoading(true);
    setLogoError(null);
    try {
      const response = await fetch(`/api/organisation-assets?orgId=${encodeURIComponent(orgId)}`);
      const result = await response.json() as { assets?: Array<{ path: string; url: string; name: string }>; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load saved logos");
      setLogoAssets(result.assets ?? []);
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Unable to load saved logos");
    } finally {
      setLogosLoading(false);
    }
  }, [orgId]);

  async function deleteLogoAsset(path: string, url: string) {
    if (form.getValues("logo_url") === url) { toast.error("Select another logo before deleting the active one."); return; }
    if (!window.confirm("Delete this saved logo? This cannot be undone.")) return;
    const response = await fetch("/api/organisation-assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, path }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { toast.error(result.error ?? "Unable to delete logo"); return; }
    await loadLogoAssets();
    toast.success("Saved logo deleted");
  }

  async function deleteTemplate() {
    if (!window.confirm("Delete this custom invoice template? The classic template will be selected.")) return;
    const response = await fetch(`/api/invoice-template?orgId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { toast.error(result.error ?? "Unable to delete template"); return; }
    form.setValue("invoice_template_id", "classic", { shouldDirty: true });
    form.setValue("invoice_template_storage_path", "", { shouldDirty: true });
    setTemplateFile(null);
    await updateOrg.mutateAsync({ orgId, updates: { invoice_template_id: "classic", invoice_template_storage_path: null } });
    toast.success("Custom template deleted");
  }

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
      fetch(`/api/invoice-template?orgId=${encodeURIComponent(orgId)}`)
        .then((response) => response.ok ? response.json() : null)
        .then((file) => file?.fileName && setTemplateFile({ fileName: file.fileName, uploadedAt: file.uploadedAt }))
        .catch(() => undefined);
      void loadLogoAssets();
    }
  }, [org, orgId, form, loadLogoAssets]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { invoice_template_id, invoice_template_storage_path, invoice_brand_color, ...profileUpdates } = values;
      await updateOrg.mutateAsync({
        orgId,
        updates: {
          ...profileUpdates,
          invoice_template_id,
          invoice_template_storage_path: invoice_template_storage_path || null,
          invoice_brand_color,
        },
      });
      toast.success("Organisation profile updated");
    } catch (error) {
      toast.error("Failed to update organisation profile");
      console.error(error);
    }
  }

  async function saveInvoiceSettings() {
    const values = form.getValues();
    if (values.invoice_template_id === "custom" && !values.invoice_template_storage_path?.trim()) {
      toast.error("Upload a custom HTML template first");
      return;
    }
    try {
      await updateOrg.mutateAsync({
        orgId,
        updates: {
          invoice_template_id: values.invoice_template_id,
          invoice_template_storage_path: values.invoice_template_storage_path || null,
          invoice_brand_color: values.invoice_brand_color,
        },
      });
      toast.success("Invoice design saved");
    } catch (error) {
      toast.error("Failed to save invoice design");
      console.error(error);
    }
  }

  function previewTemplate() {
    const values = form.getValues();
    const data: InvoicePdfData = {
      org: { name: org?.name ?? "Organisation", logo_url: values.logo_url || org?.logo_url || null, address: org?.address ?? null, brand_color: values.invoice_brand_color },
      invoice: { number: "PREVIEW-001", issue_date: new Date().toISOString().slice(0, 10), due_date: new Date().toISOString().slice(0, 10), currency: org?.base_currency ?? "UGX", notes: "Thank you for your business." },
      client: { name: "Sample Client", company_name: "Sample Company", email: "client@example.com", phone: null },
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
      await updateOrg.mutateAsync({
        orgId,
        updates: { invoice_template_id: "custom", invoice_template_storage_path: result.path },
      });
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
      const body = new FormData();
      body.append("orgId", orgId);
      body.append("file", file);
      const response = await fetch("/api/organisation-assets", { method: "POST", body });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Logo upload failed");
      form.setValue("logo_url", result.url, { shouldValidate: true });
      await updateOrg.mutateAsync({ orgId, updates: { logo_url: result.url } });
      await loadLogoAssets();
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

  if (isError || !org) {
    return (
      <>
        <PageHeader title="Organisation Settings" description="Manage your organisation profile." />
        <div className="panel max-w-2xl p-6">
          <h2 className="font-display text-sm font-semibold text-foreground">Organisation unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">We could not load this organisation. Try again before changing any settings.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>Try again</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Organisation Settings" description="Manage your organisation profile." />
      <div className="grid max-w-5xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Organisation Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              This information appears on invoices, reports, and payslips.
            </p>
          </CardHeader>
          <CardContent>
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
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
                  <div className="flex items-center gap-2"><ImagePlus className="size-4 text-primary" /><label className="text-sm font-medium" htmlFor="org_logo_upload">Organisation logo</label></div>
                  <p className="mt-1 text-xs text-muted-foreground">Choose a saved logo or upload a new one. PNG, JPG, or SVG up to 2MB.</p>
                  <Input id="org_logo_upload" type="file" accept="image/*" className="mt-3" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogo(file);
                    event.target.value = "";
                  }} />
                  {form.watch("logo_url") && (
                    <button type="button" className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => {
                      form.setValue("logo_url", "");
                      void updateOrg.mutateAsync({ orgId, updates: { logo_url: null } });
                    }}>Remove logo</button>
                  )}
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved logos</p>{logosLoading && <span className="text-xs text-muted-foreground">Loading...</span>}</div>
                  {logoError ? <p className="text-sm text-destructive">{logoError}</p> : logoAssets.length === 0 && !logosLoading ? <p className="text-sm text-muted-foreground">Uploaded logos will appear here for reuse.</p> : <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {logoAssets.map((asset) => {
                      const active = form.watch("logo_url") === asset.url;
                      return <button key={asset.path} type="button" className={`group relative aspect-square overflow-hidden rounded-lg border bg-background text-left transition-colors ${active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/60"}`} onClick={() => { form.setValue("logo_url", asset.url, { shouldDirty: true }); void updateOrg.mutateAsync({ orgId, updates: { logo_url: asset.url } }); }} aria-label={`Use ${asset.name}`}>
                        <Image src={asset.url} alt={asset.name} fill className="object-contain p-2" unoptimized />
                        {active && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
                        <span role="button" tabIndex={0} className="absolute bottom-1 right-1 hidden rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-destructive shadow group-hover:block" onClick={(event) => { event.stopPropagation(); void deleteLogoAsset(asset.path, asset.url); }}>Delete</span>
                      </button>;
                    })}
                  </div>}
                </div>
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
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between gap-3"><CardTitle>Invoice Design</CardTitle><span className="text-primary">✦</span></div>
            <p className="text-sm text-muted-foreground">Choose the layout used for invoices generated by this organisation.</p>
          </CardHeader>
          <CardContent>
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
            {form.watch("invoice_template_id") === "custom" && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <label className="text-sm font-medium" htmlFor="invoice_template_file">Custom HTML template</label>
              <Input id="invoice_template_file" type="file" accept=".html,.htm" className="mt-2" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTemplate(file); event.target.value = ""; }} />
              <p className="mt-2 text-xs text-muted-foreground">Upload an HTML file up to 500KB. Script tags and inline event handlers are blocked.</p>
              {templateFile && <div className="mt-2 flex flex-wrap items-center gap-3"><p className="text-xs text-muted-foreground">Saved template: {templateFile.fileName}{templateFile.uploadedAt ? `, uploaded ${new Date(templateFile.uploadedAt).toLocaleDateString()}` : ""}</p><button type="button" className="text-xs font-medium text-destructive hover:underline" onClick={() => void deleteTemplate()}>Delete template</button></div>}
              {uploadError && <p className="mt-1 text-sm text-destructive">{uploadError}</p>}
              {form.formState.errors.invoice_template_storage_path?.message && <p className="mt-1 text-sm text-destructive">{form.formState.errors.invoice_template_storage_path.message}</p>}
            </div>}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={previewTemplate}><Palette className="size-4" /> Preview</Button><Button type="button" onClick={() => void saveInvoiceSettings()} disabled={updateOrg.isPending || uploading}>{updateOrg.isPending ? "Saving..." : "Save Invoice Design"}</Button></div>
          </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
