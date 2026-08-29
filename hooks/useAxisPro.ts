// hooks/useAxisPro.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AxisPlanId } from '@/lib/paddle-plans';
import { useOrg } from '@/hooks/use-org';

export interface AxisSubscription {
  planId: AxisPlanId | 'unknown';
  status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled';
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  paddlePriceId: string | null;
  billingInterval: 'month' | 'year' | null;
}

export type EntitlementState = 'active' | 'trialing' | 'expired_readonly' | 'no_org';

interface UseAxisProResult {
  isProUser: boolean;
  entitlementState: EntitlementState;
  subscription: AxisSubscription | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const ENTITLED_STATUSES = new Set(['trialing', 'active']);

/**
 * Replaces the old RevenueCat-backed hook of the same name. Entitlement is
 * no longer read from a client SDK's CustomerInfo — Paddle.js doesn't
 * expose one — it's read from the `subscriptions` table, which the
 * /api/paddle/webhook route keeps in sync with Paddle's subscription
 * events. Same public shape (isProUser, isLoading, error, refresh) so call
 * sites elsewhere in the app don't need to change.
 */
export function useAxisPro(): UseAxisProResult {
  const { currentOrg, isLoading: isOrgLoading } = useOrg();
  const [subscription, setSubscription] = useState<AxisSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubscription(null);
        return;
      }

      if (!currentOrg) {
        setSubscription(null);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end, trial_ends_at, cancel_at_period_end, paddle_price_id')
        .eq('org_id', currentOrg.id)
        .in('status', ['trialing', 'active', 'past_due', 'paused'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;

      setSubscription(
        data
          ? {
              planId: (data.plan_id as AxisPlanId) ?? 'unknown',
              status: data.status,
              currentPeriodEnd: data.current_period_end,
              trialEndsAt: data.trial_ends_at,
              cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
              paddlePriceId: data.paddle_price_id,
              billingInterval: data.paddle_price_id?.includes('year') ? 'year' : data.paddle_price_id ? 'month' : null,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load subscription info'));
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (!isOrgLoading) fetchSubscription();
  }, [fetchSubscription, isOrgLoading]);

  return {
    isProUser: subscription ? ENTITLED_STATUSES.has(subscription.status) : false,
    entitlementState: !currentOrg
      ? 'no_org'
      : subscription?.status === 'trialing'
        ? 'trialing'
        : subscription?.status === 'active'
          ? 'active'
          : 'expired_readonly',
    subscription,
    isLoading,
    error,
    refresh: fetchSubscription,
  };
}
