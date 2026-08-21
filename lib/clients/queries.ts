import { createClient as getSupabaseClient } from "@/lib/supabase/client";
import { Client } from "@/lib/types";

export async function getClients(orgId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Client[];
}

export async function getClient(orgId: string, clientId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", clientId)
    .single();

  if (error) throw error;
  return data as Client;
}

export async function createClient(client: Omit<Client, "id" | "created_at" | "updated_at">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(client)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

export async function updateClient(clientId: string, updates: Partial<Omit<Client, "id" | "org_id" | "created_at" | "updated_at">>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", clientId)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

export async function deleteClient(clientId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    // 23503 = Postgres foreign_key_violation. clients.id is referenced by
    // invoices with ON DELETE RESTRICT, so this is the expected/common
    // failure mode, not an edge case — give a real answer instead of
    // surfacing the raw Postgres error text.
    if (error.code === "23503") {
      throw new Error(
        "This client has invoices on record and can't be deleted. Archive the client instead, or remove their invoices first."
      );
    }
    throw error;
  }
}

/** Clients with any invoices can't be hard-deleted (see deleteClient) — this
 * is the recommended alternative: keep the record but mark it inactive so
 * it drops out of active lists without breaking invoice history. */
export async function archiveClient(clientId: string) {
  return updateClient(clientId, { status: "inactive" });
}
