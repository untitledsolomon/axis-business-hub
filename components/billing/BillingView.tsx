"use client";

import { Paywall } from "@/components/Paywall";
import { useAxisPro } from "@/hooks/useAxisPro";
import { useOrg } from "@/hooks/use-org";
import { AXIS_PLANS } from "@/lib/paddle-plans";
import { useState } from "react";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

export function BillingView() {
  const { currentOrg, isLoading: isOrgLoading } = useOrg();
  const { subscription, isProUser, isLoading, error, refresh } = useAxisPro();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateBilling = async (action: string) => {
    if (!currentOrg) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: currentOrg.id, action }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Billing update failed");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Billing update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const changePlan = async (priceId: string) => {
    if (!currentOrg) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: currentOrg.id, action: "change-plan", priceId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Plan change failed");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isOrgLoading || isLoading) return <div className="py-12 text-sm text-muted-foreground">Loading billing…</div>;
  if (!currentOrg) return <div className="py-12 text-sm text-muted-foreground">Create or select an organisation to manage billing.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage access for {currentOrg.name}.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {subscription ? (
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <h2 className="mt-1 font-display text-xl font-semibold capitalize">{subscription.planId}</h2>
            </div>
            <span className="rounded-full bg-teal-soft px-3 py-1 text-sm font-medium capitalize text-teal-foreground">{subscription.status}</span>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Trial ends</dt><dd className="mt-1 font-medium">{formatDate(subscription.trialEndsAt)}</dd></div>
            <div><dt className="text-muted-foreground">Current period ends</dt><dd className="mt-1 font-medium">{formatDate(subscription.currentPeriodEnd)}</dd></div>
          </dl>
          {subscription.cancelAtPeriodEnd && <p className="mt-5 text-sm text-amber-700">Your subscription is scheduled to end at the current period.</p>}
          {actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="text-sm font-medium text-primary hover:underline" onClick={() => refresh()}>Refresh status</button>
            {subscription.cancelAtPeriodEnd ? (
              <button disabled={isUpdating} className="text-sm font-medium text-primary hover:underline disabled:opacity-50" onClick={() => updateBilling("resume")}>Resume subscription</button>
            ) : (
              <button disabled={isUpdating} className="text-sm font-medium text-destructive hover:underline disabled:opacity-50" onClick={() => updateBilling("cancel")}>Cancel at period end</button>
            )}
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-medium">Change plan</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {AXIS_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  disabled={isUpdating || plan.id === subscription.planId || !plan.priceIds.month}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium capitalize hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => changePlan(plan.priceIds.month)}
                >
                  {plan.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Start your trial</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a plan to unlock Axis for your organisation.</p>
          <div className="mt-6"><Paywall onSuccess={refresh} /></div>
        </section>
      )}

      {subscription && !isProUser && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This subscription does not currently provide access. Update your billing details in Paddle or choose a new plan.</div>}
    </div>
  );
}