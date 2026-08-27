// components/Paywall.tsx
'use client';

import { useEffect, useState } from 'react';
import { openCheckout, subscribeToCheckoutEvents } from '@/lib/paddle';
import { AXIS_PLANS, type AxisPlanId, type BillingInterval } from '@/lib/paddle-plans';
import { useAuth } from '@/hooks/use-auth';

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
  const { user } = useAuth();
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
      await openCheckout({
        priceId,
        userId: user.id,
        email: user.email,
      });
      // Success/close handled via subscribeToCheckoutEvents above.
    } catch (err) {
      setIsLoading(null);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="paywall-wrapper">
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          className={interval === 'month' ? 'btn-toggle-active' : 'btn-toggle'}
          onClick={() => setInterval('month')}
        >
          Monthly
        </button>
        <button
          className={interval === 'year' ? 'btn-toggle-active' : 'btn-toggle'}
          onClick={() => setInterval('year')}
        >
          Annual
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {AXIS_PLANS.map((plan) => (
          <div key={plan.id} className="plan-card border rounded-lg p-4">
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            <button
              onClick={() => handleSelectPlan(plan.id)}
              disabled={isLoading !== null}
              className="btn-primary mt-4 w-full"
            >
              {isLoading === plan.id ? 'Opening checkout…' : `Start 7-day free trial`}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
    </div>
  );
}
