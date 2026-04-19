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
