// components/Paywall.tsx
'use client';

import { useEffect, useState } from 'react';
import { openCheckout, subscribeToCheckoutEvents } from '@/lib/paddle';
import { AXIS_PLANS, type AxisPlanId, type BillingInterval } from '@/lib/paddle-plans';
import { useAuth } from '@/hooks/use-auth';
import { useOrg } from '@/hooks/use-org';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles } from 'lucide-react';

const planDetails: Record<AxisPlanId, { description: string; features: string[]; recommended?: boolean }> = {
  starter: { description: 'The essentials for getting organised.', features: ['Core invoicing', 'Client and item management', 'Basic reports'] },
  pro: { description: 'A complete operating system for growing teams.', features: ['Everything in Starter', 'Team permissions', 'Advanced finance reports'], recommended: true },
  advanced: { description: 'More control for complex organisations.', features: ['Everything in Pro', 'Priority support', 'Advanced automation'] },
};

interface PaywallProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Replaces the old RevenueCat-hosted paywall widget. Paddle has no
 * equivalent "presentPaywall" that renders a full pricing UI into a
 * container — Paddle.js drives a checkout overlay for a single price at a
 * time — so this component renders Axis's own plan/interval picker and
 * opens Paddle's overlay checkout once a price is chosen.
 */
export function Paywall({ onSuccess, onCancel }: PaywallProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { currentOrg } = useOrg();
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [isLoading, setIsLoading] = useState<AxisPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'success' | 'closed'>('idle');

  useEffect(() => {
    subscribeToCheckoutEvents((event) => {
      if (event.name === 'checkout.error' || event.name === 'checkout.payment.error') {
        setIsLoading(null);
        setError(event.detail === 'transaction_default_checkout_url_not_set'
          ? 'Paddle checkout is not fully configured. Set a default checkout URL in Paddle Dashboard, then redeploy or retry.'
          : `${event.code}: ${event.detail}`);
        console.error('Paddle checkout error', {
          code: event.code,
          detail: event.detail,
          type: event.type,
        });
        return;
      }
      if (event.name === 'checkout.completed') {
        setIsLoading(null);
        setCheckoutState('success');
        onSuccess?.();
      }
      if (event.name === 'checkout.closed') {
        setIsLoading(null);
        setCheckoutState('closed');
        onCancel?.();
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to initialize checkout.');
    });
    // Only needs to run once — Paddle's eventCallback is registered
    // globally at init time, not per checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPlan = async (planId: AxisPlanId) => {
    if (isAuthLoading || !currentOrg) {
      setError('Your account is still loading. Please try again shortly.');
      return;
    }
    if (!user) {
      setError('You must be signed in to subscribe.');
      return;
    }

    const plan = AXIS_PLANS.find((p) => p.id === planId);
    const priceId = plan?.priceIds[interval];
    if (!priceId) {
      setError(`This plan has no ${interval} Paddle price configured for the production deployment.`);
      return;
    }

    setIsLoading(planId);
    setError(null);
    setCheckoutState('idle');

    try {
      const sessionResponse = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id }),
      });
      const session = await sessionResponse.json() as { token?: string; error?: string };
      if (!sessionResponse.ok || !session.token) {
        throw new Error(session.error ?? 'Could not start checkout.');
      }

      await openCheckout({
        priceId,
        checkoutToken: session.token,
        email: user.email,
      });
      // Success/close handled via subscribeToCheckoutEvents above.
    } catch (err) {
      setIsLoading(null);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {checkoutState === 'success' && <div role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="font-medium text-foreground">Payment received</p><p className="mt-1 text-sm text-muted-foreground">Your subscription is being activated. Refresh billing status in a moment if it does not appear automatically.</p></div>}
      {checkoutState === 'closed' && <div role="status" className="rounded-lg border border-border bg-muted/40 p-4"><p className="font-medium text-foreground">Checkout closed</p><p className="mt-1 text-sm text-muted-foreground">No payment was taken. Choose a plan whenever you are ready.</p></div>}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-1">
        <Button type="button" size="sm" variant={interval === 'month' ? 'default' : 'ghost'} onClick={() => setInterval('month')}>
          Monthly
        </Button>
        <Button type="button" size="sm" variant={interval === 'year' ? 'default' : 'ghost'} onClick={() => setInterval('year')}>
          Annual
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {AXIS_PLANS.map((plan) => {
          const details = planDetails[plan.id];
          return <Card key={plan.id} className={`relative flex flex-col ${details.recommended ? 'border-primary shadow-md shadow-primary/10' : ''}`}>
            {details.recommended && <div className="absolute right-4 top-0 flex -translate-y-1/2 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"><Sparkles className="size-3" /> Recommended</div>}
            <CardHeader className="pb-3"><CardTitle className="text-xl">{plan.name}</CardTitle><p className="text-sm text-muted-foreground">{details.description}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="font-display text-2xl font-semibold">{interval === 'year' ? 'Annual' : 'Monthly'}<span className="ml-1 text-sm font-normal text-muted-foreground">billing</span></p>
              <ul className="my-6 space-y-3 text-sm text-muted-foreground">{details.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}</ul>
              {!plan.priceIds[interval] && (
                <p className="mt-2 text-xs text-muted-foreground">
                  This plan is not configured for {interval} billing.
                </p>
              )}
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isLoading !== null || isAuthLoading || !currentOrg || !plan.priceIds[interval]}
                className="mt-auto w-full"
              >
                {isLoading === plan.id ? 'Opening checkout...' : 'Start 7-day free trial'}
              </Button>
            </CardContent>
          </Card>;
        })}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
