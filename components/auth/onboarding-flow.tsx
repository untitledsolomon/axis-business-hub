"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, BarChart3, BriefcaseBusiness, Check, CircleDollarSign, FileText, ImagePlus, Landmark, Phone, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { useUpdateOrganisation } from "@/hooks/organisation/use-organisation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  industry: z.string().min(1, "Choose an industry"),
  companySize: z.string().min(1, "Choose a company size"),
  focus: z.array(z.string()).min(1, "Choose at least one focus"),
  base_currency: z.string().min(1, "Choose a currency"),
  taxRate: z.coerce.number().min(0).max(100),
  chartTemplate: z.enum(["industry", "blank"]),
  contact_email: z.string().email("Enter a valid email").or(z.literal("")),
  tagline: z.string().optional(),
  phone1: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  logo_url: z.string().optional(),
});
type Values = z.infer<typeof schema>;
const industries = ["Retail", "Services", "Manufacturing", "Freelance / Agency", "Other"];
const sizes = ["Solo", "Small team", "Growing team"];
const currencies = ["UGX", "USD", "KES", "TZS", "RWF", "ZAR", "GBP", "EUR"];
const focuses = [
  { value: "Invoicing", label: "Invoicing", detail: "Send polished invoices and track payment", icon: FileText },
  { value: "Accounting/Books", label: "Accounting & books", detail: "Keep your ledger and accounts in order", icon: Landmark },
  { value: "Dashboard & Reporting", label: "Dashboard & reporting", detail: "See the numbers that guide your day", icon: BarChart3 },
];

function OptionCard({ selected, onClick, icon: Icon, title, detail }: { selected: boolean; onClick: () => void; icon?: typeof BriefcaseBusiness; title: string; detail?: string }) {
  return <button type="button" onClick={onClick} className={cn("relative flex min-h-24 flex-col items-start justify-center gap-1 rounded-xl border p-4 text-left transition-colors", selected ? "border-teal bg-teal-soft ring-1 ring-teal" : "border-border bg-background hover:border-teal/60")}>
    {selected && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-teal text-white"><Check className="size-3" /></span>}
    {Icon && <Icon className={cn("mb-1 size-5", selected ? "text-teal" : "text-muted-foreground")} />}
    <span className="text-sm font-semibold">{title}</span>{detail && <span className="text-xs leading-5 text-muted-foreground">{detail}</span>}
  </button>;
}

export function OnboardingFlow() {
  const { currentOrg, refreshOrgs } = useOrg();
  const updateOrg = useUpdateOrganisation();
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(currentOrg?.onboarding_step || 0, 0), 3) + 1);
  const [uploading, setUploading] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { industry: "", companySize: "", focus: [], base_currency: currentOrg?.base_currency || "UGX", taxRate: 0, chartTemplate: "industry", tagline: "", contact_email: "", phone1: "", address_line1: "", address_line2: "", logo_url: "" } });
  const focus = form.watch("focus");
  const values = form.watch();

  useEffect(() => {
    if (!currentOrg) return;
    const onboarding = (currentOrg.settings?.onboarding ?? {}) as Record<string, unknown>;
    form.reset({ industry: String(onboarding.industry ?? ""), companySize: String(onboarding.companySize ?? ""), focus: Array.isArray(onboarding.focus) ? onboarding.focus.map(String) : [], base_currency: currentOrg.base_currency, taxRate: Number(onboarding.taxRate ?? 0), chartTemplate: onboarding.chartTemplate === "blank" ? "blank" : "industry", tagline: currentOrg.tagline ?? "", contact_email: currentOrg.contact_email ?? "", phone1: currentOrg.phone1 ?? "", address_line1: currentOrg.address_line1 ?? "", address_line2: currentOrg.address_line2 ?? "", logo_url: currentOrg.logo_url ?? "" });
  }, [currentOrg, form]);

  async function persist(nextStep: number, complete = false, skip = false) {
    if (!currentOrg) return;
    const supabase = createClient();
    const onboarding = { industry: values.industry, companySize: values.companySize, focus: values.focus, taxRate: values.taxRate, chartTemplate: values.chartTemplate };
    await updateOrg.mutateAsync({ orgId: currentOrg.id, updates: { base_currency: values.base_currency, tagline: values.tagline || null, contact_email: values.contact_email || null, phone1: values.phone1 || null, address_line1: values.address_line1 || null, address_line2: values.address_line2 || null, settings: { ...(currentOrg.settings ?? {}), onboarding, onboarding_skipped: skip } as Record<string, unknown>, onboarding_step: nextStep, onboarding_completed_at: complete ? new Date().toISOString() : null } });
    if (nextStep >= 3 && values.taxRate > 0) {
      const { data: existingTaxRate } = await supabase.from("tax_rates").select("id").eq("org_id", currentOrg.id).eq("name", "Default tax").maybeSingle();
      const taxResult = existingTaxRate
        ? await supabase.from("tax_rates").update({ rate: values.taxRate, is_active: true }).eq("id", existingTaxRate.id)
        : await supabase.from("tax_rates").insert({ org_id: currentOrg.id, name: "Default tax", rate: values.taxRate, is_active: true });
      if (taxResult.error) throw taxResult.error;
    }
    await refreshOrgs();
  }

  async function continueStep() {
    const fields: (keyof Values)[][] = [["industry", "companySize", "contact_email"], ["focus"], ["base_currency", "taxRate", "chartTemplate"], []];
    if (!(await form.trigger(fields[step - 1]))) return;
    try { await persist(step, step === 4); if (step === 4) { toast.success("Your workspace is ready"); router.push(focus.includes("Invoicing") ? "/invoices" : "/"); } else setStep(step + 1); } catch { toast.error("We could not save this step. Please try again."); }
  }

  async function skip() {
    try { await persist(currentOrg?.onboarding_step || 0, false, true); router.push("/"); } catch { toast.error("Unable to skip setup right now"); }
  }

  async function uploadLogo(file: File) {
    if (!currentOrg) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) { toast.error("Choose an image up to 2MB."); return; }
    setUploading(true);
    try { const supabase = createClient(); const path = `${currentOrg.id}/onboarding-logo-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`; const { error } = await supabase.storage.from("organisation-logos").upload(path, file, { upsert: true }); if (error) throw error; const { data } = supabase.storage.from("organisation-logos").getPublicUrl(path); form.setValue("logo_url", data.publicUrl); await updateOrg.mutateAsync({ orgId: currentOrg.id, updates: { logo_url: data.publicUrl } }); } catch (error) { toast.error(error instanceof Error ? error.message : "Logo upload failed"); } finally { setUploading(false); }
  }

  if (!currentOrg) return null;
  return <main className="min-h-screen bg-primary-soft px-4 py-5 text-foreground sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-2xl border border-border bg-background shadow-pop lg:grid-cols-[1.1fr_0.9fr]"><section className="flex flex-col p-5 sm:p-8 lg:p-12"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary font-display font-bold text-primary-foreground">A</span><span className="font-display text-lg font-semibold">AXIS</span></div><button type="button" onClick={() => void skip()} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">Skip for now</button></div><div className="mt-10 flex items-center gap-3"><div className="flex flex-1 gap-1.5">{[1, 2, 3, 4].map((item) => <span key={item} className={cn("h-1.5 flex-1 rounded-full", item <= step ? "bg-teal" : "bg-muted")} />)}</div><span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Step {step} of 4</span></div><div className="mt-10 flex-1"><Form {...form}><form onSubmit={(event) => { event.preventDefault(); void continueStep(); }} className="mx-auto max-w-2xl">
    {step === 1 && <><p className="text-sm font-semibold text-teal">Your business, in focus</p><h1 className="mt-2 font-display text-3xl font-semibold">Set up your business profile.</h1><p className="mt-2 text-sm text-muted-foreground">A few details make invoices and reports feel like they belong to you.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><FormField control={form.control} name="industry" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>What does your business do?</FormLabel><FormControl><div className="grid gap-3 sm:grid-cols-3">{industries.map((item) => <OptionCard key={item} title={item} selected={field.value === item} onClick={() => field.onChange(item)} />)}</div></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="companySize" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Company size</FormLabel><FormControl><div className="grid gap-3 sm:grid-cols-3">{sizes.map((item) => <OptionCard key={item} title={item} selected={field.value === item} onClick={() => field.onChange(item)} />)}</div></FormControl><FormMessage /></FormItem>} /></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="contact_email" render={({ field }) => <FormItem><FormLabel>Invoice contact email</FormLabel><FormControl><Input type="email" placeholder="billing@yourbusiness.com" {...field} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="phone1" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+256 ..." {...field} /></FormControl></FormItem>} /><FormField control={form.control} name="address_line1" render={({ field }) => <FormItem><FormLabel>Address line 1</FormLabel><FormControl><Input placeholder="Street and building" {...field} /></FormControl></FormItem>} /><FormField control={form.control} name="address_line2" render={({ field }) => <FormItem><FormLabel>Address line 2</FormLabel><FormControl><Input placeholder="City, country" {...field} /></FormControl></FormItem>} /></div><div className="mt-4 flex items-center gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><ImagePlus className="size-4 text-teal" />{uploading ? "Uploading..." : "Add a logo"}<Input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} /></label>{values.logo_url && <span className="text-xs text-muted-foreground">Logo added</span>}</div></>}
    {step === 2 && <><p className="text-sm font-semibold text-teal">Make it yours</p><h1 className="mt-2 font-display text-3xl font-semibold">Where should Axis put its energy?</h1><p className="mt-2 text-sm text-muted-foreground">Choose the work you want closest at hand. You can change this later.</p><FormField control={form.control} name="focus" render={({ field }) => <FormItem className="mt-8"><FormControl><div className="grid gap-3">{focuses.map(({ value, label, ...item }) => <OptionCard key={value} title={label} {...item} selected={focus.includes(value)} onClick={() => field.onChange(focus.includes(value) ? focus.filter((item) => item !== value) : [...focus, value])} />)}</div></FormControl><FormMessage /></FormItem>} /></>}
    {step === 3 && <><p className="text-sm font-semibold text-teal">A strong foundation</p><h1 className="mt-2 font-display text-3xl font-semibold">Tune your books.</h1><p className="mt-2 text-sm text-muted-foreground">These defaults shape your first reports. Nothing here is permanent.</p><div className="mt-8 grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="base_currency" render={({ field }) => <FormItem><FormLabel>Base currency</FormLabel><FormControl><select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></FormControl></FormItem>} /><FormField control={form.control} name="taxRate" render={({ field }) => <FormItem><FormLabel>Default tax rate (%)</FormLabel><FormControl><Input type="number" min="0" max="100" step="0.01" {...field} /></FormControl></FormItem>} /></div><FormField control={form.control} name="chartTemplate" render={({ field }) => <FormItem className="mt-6"><FormLabel>Chart of accounts</FormLabel><FormControl><div className="grid gap-3 sm:grid-cols-2"><OptionCard title={`${values.industry || "Industry"} template`} detail="A practical starting point for your business" icon={Landmark} selected={field.value === "industry"} onClick={() => field.onChange("industry")} /><OptionCard title="Start with a blank chart" detail="Build your own account structure" icon={CircleDollarSign} selected={field.value === "blank"} onClick={() => field.onChange("blank")} /></div></FormControl></FormItem>} /></>}
    {step === 4 && <><p className="text-sm font-semibold text-teal">Ready when you are</p><h1 className="mt-2 font-display text-3xl font-semibold">Your workspace is taking shape.</h1><div className="mt-8 grid gap-3 sm:grid-cols-2">{[["Business", values.industry || "Not selected"], ["Focus", values.focus.join(", ") || "Not selected"], ["Currency", values.base_currency], ["Tax default", `${values.taxRate}%`]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div><p className="mt-6 text-sm text-muted-foreground">You can update these choices any time in Organisation Settings.</p></>}
    <div className="mt-10 flex items-center justify-between border-t border-border pt-5"><Button type="button" variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button><Button type="submit">{step === 4 ? (focus.includes("Invoicing") ? "Create first invoice" : "Go to dashboard") : "Continue"}<ArrowRight className="size-4" /></Button></div>
  </form></Form></div></section><aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-20 top-20 size-72 rounded-full border-[32px] border-teal/40" /><div className="absolute -bottom-24 -left-24 size-80 rotate-12 border-[28px] border-primary-foreground/10" /><div className="relative"><Sparkles className="size-7 text-teal" /><h2 className="mt-8 max-w-sm font-display text-4xl font-semibold leading-tight">A clearer day starts with a clearer setup.</h2></div><div className="relative space-y-4 text-sm text-primary-foreground/70"><p className="flex items-center gap-3"><BriefcaseBusiness className="size-4 text-teal" /> Built around your business</p><p className="flex items-center gap-3"><Phone className="size-4 text-teal" /> Ready for real client conversations</p><p className="flex items-center gap-3"><Users className="size-4 text-teal" /> Easy to grow with your team</p></div></aside></div></main>;
}
