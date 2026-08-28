"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CalendarDays, Check, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { Paywall } from "@/components/Paywall";
import { useAxisPro } from "@/hooks/useAxisPro";
import { useOrg } from "@/hooks/use-org";
import { AXIS_PLANS, type BillingInterval } from "@/lib/paddle-plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

export function BillingView() {
  const { currentOrg, isLoading: isOrgLoading } = useOrg();
  const { subscription, isProUser, isLoading, error, refresh } = useAxisPro();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [cancelOpen, setCancelOpen] = useState(false);

  const updateBilling = async (action: string, priceId?: string) => {
    if (!currentOrg) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch("/api/billing/subscription", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: currentOrg.id, action, priceId }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Billing update failed");
      setCancelOpen(false);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Billing update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isOrgLoading || isLoading) return <div className="py-12 text-sm text-muted-foreground">Loading billing...</div>;
  if (!currentOrg) return <div className="py-12"><p className="text-sm text-muted-foreground">Create or select an organisation to manage billing.</p><Link className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/onboarding">Go to onboarding</Link></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description={`Manage access and payment settings for ${currentOrg.name}.`} />
      {error && <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{error.message}</div>}
      {subscription ? <>
        <Card className="overflow-hidden"><div className="h-1 bg-primary" /><CardHeader className="flex flex-row items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Current plan</p><CardTitle className="mt-1 text-2xl capitalize">{subscription.planId}</CardTitle></div><Badge variant={subscription.status === "past_due" ? "destructive" : "default"} className="capitalize">{subscription.status.replace("_", " ")}</Badge></CardHeader><CardContent>
          <div className="grid gap-4 border-y border-border py-5 sm:grid-cols-3"><div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-primary" /><div><p className="text-xs text-muted-foreground">Renews</p><p className="mt-1 text-sm font-medium">{formatDate(subscription.currentPeriodEnd)}</p></div></div><div className="flex items-start gap-3"><CreditCard className="mt-0.5 size-4 text-primary" /><div><p className="text-xs text-muted-foreground">Billing cycle</p><p className="mt-1 text-sm font-medium">{subscription.billingInterval === "year" ? "Annual" : "Monthly"}</p></div></div><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-primary" /><div><p className="text-xs text-muted-foreground">Access</p><p className="mt-1 text-sm font-medium">{isProUser ? "Active" : "Needs attention"}</p></div></div></div>
          {subscription.cancelAtPeriodEnd && <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-foreground">Your plan will end on {formatDate(subscription.currentPeriodEnd)}.</p>}{subscription.status === "past_due" && <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-foreground">Payment failed. Update your payment method in Paddle to restore access.</p>}{actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}
          <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void refresh()}><RotateCcw className="size-4" /> Refresh status</Button>{subscription.cancelAtPeriodEnd ? <Button size="sm" onClick={() => void updateBilling("resume")} disabled={isUpdating}>Resume subscription</Button> : <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={isUpdating}>Cancel at period end</Button>}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Change plan</CardTitle><p className="text-sm text-muted-foreground">Choose a tier and billing cycle. Paddle will show any prorated amount before confirming.</p></CardHeader><CardContent><div className="mb-4 flex w-fit gap-1 rounded-lg border border-border bg-muted p-1"><Button size="sm" variant={interval === "month" ? "default" : "ghost"} onClick={() => setInterval("month")}>Monthly</Button><Button size="sm" variant={interval === "year" ? "default" : "ghost"} onClick={() => setInterval("year")}>Annual</Button></div><div className="grid gap-3 sm:grid-cols-3">{AXIS_PLANS.map((plan) => { const selected = plan.id === subscription.planId && interval === subscription.billingInterval; const priceId = plan.priceIds[interval]; return <button key={plan.id} type="button" disabled={isUpdating || !priceId || selected} onClick={() => void updateBilling("change-plan", priceId)} className={`rounded-lg border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"}`}><div className="flex items-center justify-between"><span className="font-medium">{plan.name}</span>{selected && <Check className="size-4 text-primary" />}</div><p className="mt-2 text-xs text-muted-foreground">{priceId ? `${interval === "year" ? "Annual" : "Monthly"} billing` : "Not configured"}</p></button>; })}</div></CardContent></Card>
        <div className="grid gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle>Payment method</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Payment details are securely managed by Paddle.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => setActionError("Use the Paddle customer portal from your billing email to update payment details.")}>Manage in Paddle</Button></CardContent></Card><Card><CardHeader><CardTitle>Billing history</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Invoices and receipts are available in Paddle and are sent to your billing email.</p></CardContent></Card></div>
      </> : <Card><CardHeader><CardTitle>Start your trial</CardTitle><p className="text-sm text-muted-foreground">Choose a plan to unlock Axis for your organisation.</p></CardHeader><CardContent><Paywall onSuccess={refresh} /></CardContent></Card>}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel at period end?</AlertDialogTitle><AlertDialogDescription>Your organisation will keep access until the current billing period ends. You can resume the subscription before then.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep subscription</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void updateBilling("cancel")}>Cancel subscription</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
