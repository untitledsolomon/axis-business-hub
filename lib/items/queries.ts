import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import type { Item, ItemMovement, ItemMovementType } from "@/lib/types";

export async function getItems(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Item[];
}

export async function getItem(orgId: string, itemId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", itemId)
    .single();

  if (error) throw error;
  return data as Item;
}

export async function getItemMovements(orgId: string, itemId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("item_movements")
    .select("*")
    .eq("org_id", orgId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ItemMovement[];
}

export async function getOrgItemMovements(orgId: string, filters?: { from?: string; to?: string }) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("item_movements")
    .select("*, item:items(id, name, category)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;

  if (error) throw error;
  return data as (ItemMovement & { item?: { id: string; name: string; category: string } })[];
}

export async function createItem(item: Omit<Item, "id" | "created_at" | "updated_at">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("items").insert(item).select().single();

  if (error) throw error;
  return data as Item;
}

export async function updateItem(itemId: string, updates: Partial<Item>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function deleteItem(itemId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);

  if (error) throw error;
}

export async function archiveItem(itemId: string) {
  return updateItem(itemId, { status: "archived" });
}

export async function updateItemQuantity(params: {
  org_id: string;
  item_id: string;
  quantity_change: number;
  movement_type: ItemMovementType;
  reference?: string;
  notes?: string;
  unit_cost?: number;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("update_item_quantity_v1", {
    p_org_id: params.org_id,
    p_item_id: params.item_id,
    p_quantity_change: params.quantity_change,
    p_movement_type: params.movement_type,
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
    p_unit_cost: params.unit_cost ?? 0,
  });

  if (error) throw error;
  return data as Item;
}
