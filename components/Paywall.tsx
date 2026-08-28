// components/Paywall.tsx
'use client';

import { useEffect, useState } from 'react';
import { openCheckout, subscribeToCheckoutEvents } from '@/lib/paddle';
import { AXIS_PLANS, type AxisPlanId, type BillingInterval } from '@/lib/paddle-plans';
import { useAuth } from '@/hooks/use-auth';
import { useOrg } from '@/hooks/use-org';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  useEffect(() => {
    subscribeToCheckoutEvents((event) => {
      if (event.name === 'checkout.completed') {
        setIsLoading(null);
        onSuccess?.();
      }
      if (event.name === 'checkout.closed') {
        setIsLoading(null);
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
      setError('This plan is not available right now. Please try again shortly.');
      return;
    }

    setIsLoading(planId);
    setError(null);

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
      <div className="mx-auto flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-1">
        <Button type="button" size="sm" variant={interval === 'month' ? 'default' : 'ghost'} onClick={() => setInterval('month')}>
          Monthly
        </Button>
        <Button type="button" size="sm" variant={interval === 'year' ? 'default' : 'ghost'} onClick={() => setInterval('year')}>
          Annual
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {AXIS_PLANS.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="text-sm text-muted-foreground">{interval === 'year' ? 'Annual billing' : 'Monthly billing'}</p>
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
          </Card>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
