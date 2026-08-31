// lib/plan-limits.ts
//
// Thin wrapper around the DB-side modular plan limits system
// (see supabase/migrations/20260831000002_modular_plan_limits.sql).
//
// The DB is the source of truth and the actual enforcement boundary
// (triggers on organisation_members/accounts/bank_accounts reject inserts
// that exceed a plan's limit even if this helper is bypassed). This file
// exists so the UI can check capacity ahead of time — e.g. disable an
// "Add user" button and show "5 of 5 used" — without duplicating the
// limit numbers in TypeScript.
//
// Adding a new limit (counted or metered) requires no changes here: add
// rows to plan_limits (and plan_counted_resources, for counted limits) in
// a migration, and these functions pick it up automatically.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Resource identifiers, matching the `resource` column in plan_limits.
 *  Not an exhaustive union on purpose — new resources (e.g. "ai_audits")
 *  can be added in the DB and referenced here as plain strings until
 *  they're common enough to warrant a named constant. */
export type PlanResource = "users" | "chart_accounts" | "bank_accounts" | (string & {});

export interface ResourceUsage {
  resource: PlanResource;
  used: number;
  max: number | null; // null = unlimited
  atCapacity: boolean;
}

/** Whether the org has room for `increment` more of `resource`
 *  (default 1). Mirrors has_capacity_for() in the DB — call this before
 *  attempting an insert to give the user a clean error instead of a
 *  failed trigger, but don't rely on it for security: the DB trigger is
 *  the real gate. */
export async function hasCapacityFor(
  supabase: SupabaseClient,
  orgId: string,
  resource: PlanResource,
  increment = 1
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_capacity_for", {
    p_org_id: orgId,
    p_resource: resource,
    p_increment: increment,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Current usage count for a counted resource (e.g. how many users an
 *  org currently has). Only meaningful for limit_type = 'counted'
 *  resources; for metered resources use getResourceUsage instead. */
export async function getCountedResourceUsage(
  supabase: SupabaseClient,
  orgId: string,
  resource: PlanResource
): Promise<number> {
  const { data, error } = await supabase.rpc("get_counted_resource_usage", {
    p_org_id: orgId,
    p_resource: resource,
  });
  if (error) throw error;
  return data as number;
}

/** Record `amount` (default 1) of metered usage against a resource for
 *  the current billing period (e.g. after running an AI audit). Call
 *  this only after hasCapacityFor has confirmed room, at the point the
 *  feature is actually used — not speculatively. */
export async function consumeMeteredUsage(
  supabase: SupabaseClient,
  orgId: string,
  resource: PlanResource,
  amount = 1
): Promise<number> {
  const { data, error } = await supabase.rpc("consume_metered_usage", {
    p_org_id: orgId,
    p_resource: resource,
    p_amount: amount,
  });
  if (error) throw error;
  return data as number;
}

/** Fetch the org's plan_id and its full limit row for one resource, for
 *  building a "3 of 5 users" style display. Returns null max for
 *  unlimited or unconfigured resources. */
export async function getResourceUsage(
  supabase: SupabaseClient,
  orgId: string,
  resource: PlanResource
): Promise<ResourceUsage> {
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("org_id", orgId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subError) throw subError;

  const planId = sub?.plan_id as string | undefined;

  let max: number | null = null;
  if (planId) {
    const { data: limitRow, error: limitError } = await supabase
      .from("plan_limits")
      .select("max_value")
      .eq("plan_id", planId)
      .eq("resource", resource)
      .maybeSingle();
    if (limitError) throw limitError;
    max = (limitRow?.max_value as number | null) ?? null;
  }

  const used = await getCountedResourceUsage(supabase, orgId, resource);

  return {
    resource,
    used,
    max,
    atCapacity: max !== null && used >= max,
  };
}
