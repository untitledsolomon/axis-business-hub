'use client';

import { useAxisPro } from '@/hooks/useAxisPro';
import { planHasFeature, type AxisFeature } from '@/lib/paddle-plans';

export function useFeatureFlag(feature: AxisFeature): boolean {
  const { entitlementState, subscription } = useAxisPro();
  if (entitlementState !== 'active' && entitlementState !== 'trialing') return false;
  return planHasFeature(subscription?.planId ?? 'unknown', feature);
}

export function useCanEdit(): boolean {
  const { entitlementState } = useAxisPro();
  return entitlementState === 'active' || entitlementState === 'trialing';
}