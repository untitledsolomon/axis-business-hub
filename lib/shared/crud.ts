import { createClient as getSupabaseClient } from "@/lib/supabase/client";

/**
 * Generic, reusable Supabase CRUD helpers. Every module (clients, invoices,
 * items, accounts, tax rates, bank accounts, employees, ...) can build its
 * typed query functions on top of these instead of hand-rolling the same
 * select/update/delete boilerplate per table.
 *
 * These are intentionally thin — they don't know about business rules
 * (e.g. "posting" a journal entry, "marking an invoice paid") since those
 * often need an RPC for atomicity/authorization. Use these for straight
 * single-table reads/writes, and write a dedicated RPC + query function
 * for anything that needs to touch more than one table or enforce a
 * status transition (see lib/invoicing/queries.ts for an example of both
 * styles used together).
 *
 * Usage:
 *   export async function getClient(orgId: string, id: string) {
 *     return getRecord<Client>("clients", orgId, id);
 *   }
 *   export async function updateClient(id: string, updates: Partial<Client>) {
 *     return updateRecord<Client>("clients", id, updates);
 *   }
 *   export async function deleteClient(id: string) {
 *     return deleteRecord("clients", id);
 *   }
 */

export async function getRecords<T>(
  table: string,
  orgId: string,
  options?: { select?: string; orderBy?: { column: string; ascending?: boolean } }
): Promise<T[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from(table)
    .select(options?.select ?? "*")
    .eq("org_id", orgId);

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as T[];
}

export async function getRecord<T>(
  table: string,
  orgId: string,
  id: string,
  options?: { select?: string }
): Promise<T> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select(options?.select ?? "*")
    .eq("org_id", orgId)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as T;
}

export async function createRecord<T>(table: string, record: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(table).insert(record).select().single();

  if (error) throw error;
  return data as T;
}

export async function updateRecord<T>(
  table: string,
  id: string,
  updates: Record<string, unknown>
): Promise<T> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(table).update(updates).eq("id", id).select().single();

  if (error) throw error;
  return data as T;
}

export async function deleteRecord(table: string, id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}
