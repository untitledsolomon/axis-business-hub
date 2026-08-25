"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOrg } from "@/hooks/use-org";
import { useOrganisation, useUpdateInvoiceTemplateSettings, useUpdateOrganisation } from "@/hooks/organisation/use-organisation";
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
import { Textarea } from "@/components/ui/textarea";
import { interpolateTemplate, validateCustomTemplate } from "@/lib/invoicing/templates/interpolate";
import { BUILT_IN_TEMPLATES } from "@/lib/invoicing/templates/registry";
import type { InvoicePdfData } from "@/lib/invoicing/templates/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Organisation name is required"),
  address: z.string().optional(),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  base_currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
  invoice_template_id: z.enum(["classic", "modern", "minimal", "custom"]),
  invoice_custom_html: z.string().optional(),
  invoice_brand_color: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a valid hex colour"),
}).superRefine((values, context) => {
  if (values.invoice_template_id === "custom" && !values.invoice_custom_html?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["invoice_custom_html"], message: "A custom HTML template is required." });
  } else if (values.invoice_template_id === "custom" && values.invoice_custom_html) {
    const error = validateCustomTemplate(values.invoice_custom_html);
    if (error) context.addIssue({ code: z.ZodIssueCode.custom, path: ["invoice_custom_html"], message: error });
  }
});

export function OrganisationSettingsView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: org, isLoading } = useOrganisation(orgId);
  const updateOrg = useUpdateOrganisation();
  const updateInvoiceSettings = useUpdateInvoiceTemplateSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      registration_number: "",
      tax_id: "",
      base_currency: "UGX",
      country: "Uganda",
      invoice_template_id: "classic",
      invoice_custom_html: "",
      invoice_brand_color: "#0f172a",
    },
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        address: org.address ?? "",
        registration_number: org.registration_number ?? "",
        tax_id: org.tax_id ?? "",
        base_currency: org.base_currency,
        country: org.country,
        invoice_template_id: (org.invoice_template_id as "classic" | "modern" | "minimal" | "custom") ?? "classic",
        invoice_custom_html: org.invoice_custom_html ?? "",
        invoice_brand_color: org.invoice_brand_color ?? "#0f172a",
      });
    }
  }, [org, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { invoice_template_id, invoice_custom_html, invoice_brand_color, ...profileUpdates } = values;
      await updateOrg.mutateAsync({ orgId, updates: profileUpdates });
      await updateInvoiceSettings.mutateAsync({
        orgId,
        settings: {
          templateId: invoice_template_id,
          customHtml: invoice_custom_html || null,
          brandColor: invoice_brand_color,
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
      org: { name: org?.name ?? "Organisation", logo_url: org?.logo_url ?? null, address: org?.address ?? null, brand_color: values.invoice_brand_color },
      invoice: { number: "PREVIEW-001", issue_date: new Date().toISOString().slice(0, 10), due_date: new Date().toISOString().slice(0, 10), currency: org?.base_currency ?? "UGX", notes: "Thank you for your business." },
      client: { name: "Sample Client", company_name: "Sample Company", email: "client@example.com" },
      items: [{ description: "Sample service", quantity: 2, unit_price_cents: 25000, total_cents: 50000 }],
      totals: { subtotal_cents: 50000, discount_cents: 0, tax_cents: 0, grand_total_cents: 50000 },
    };
    const template = values.invoice_template_id === "custom" && values.invoice_custom_html
      ? Promise.resolve(interpolateTemplate(values.invoice_custom_html, data))
      : Promise.resolve((BUILT_IN_TEMPLATES[values.invoice_template_id as keyof typeof BUILT_IN_TEMPLATES] ?? BUILT_IN_TEMPLATES.classic).render(data));
    template.then((html) => {
      const previewWindow = window.open("", "invoice-preview");
      if (previewWindow) { previewWindow.document.write(html); previewWindow.document.close(); }
    });
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
              <label className="text-sm font-medium" htmlFor="invoice_custom_html">Custom HTML template</label>
              <Textarea id="invoice_custom_html" className="mt-2 min-h-52 font-mono text-xs" placeholder="<!doctype html>..." {...form.register("invoice_custom_html")} />
              <p className="mt-2 text-xs text-muted-foreground">Use the org, invoice, client, totals, and items placeholders described in the template guide. Script tags and inline event handlers are blocked.</p>
              {form.formState.errors.invoice_custom_html?.message && <p className="mt-1 text-sm text-destructive">{form.formState.errors.invoice_custom_html.message}</p>}
            </div>}
            <Button type="button" variant="outline" onClick={previewTemplate}>Preview</Button>
          </div>
        </div>
      </div>
    </>
  );
}
