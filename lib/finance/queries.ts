import { createClient } from "@/lib/supabase/client";
import { Account, TaxRate, BankAccount, JournalEntry } from "@/lib/types";

// Accounts
export async function getAccounts(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("code", { ascending: true });

  if (error) throw error;
  return data as Account[];
}

export async function createAccount(account: Omit<Account, "id" | "created_at" | "updated_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

// Tax Rates
export async function getTaxRates(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tax_rates")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as TaxRate[];
}

export async function createTaxRate(taxRate: Omit<TaxRate, "id" | "created_at" | "updated_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tax_rates")
    .insert(taxRate)
    .select()
    .single();

  if (error) throw error;
  return data as TaxRate;
}

export async function updateTaxRate(
  taxRateId: string,
  updates: Partial<Pick<TaxRate, "name" | "rate" | "is_active">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tax_rates")
    .update(updates)
    .eq("id", taxRateId)
    .select()
    .single();

  if (error) throw error;
  return data as TaxRate;
}

// Bank Accounts
export async function getBankAccounts(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(`
      *,
      account:accounts(*)
    `)
    .eq("org_id", orgId);

  if (error) throw error;
  return data;
}

export async function createBankAccount(bankAccount: Omit<BankAccount, "id" | "created_at" | "updated_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert(bankAccount)
    .select()
    .single();

  if (error) throw error;
  return data as BankAccount;
}

// Journal Entries
export async function getJournalEntries(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select(`
      *,
      lines:journal_entry_lines(*, account:accounts(id, name, category))
    `)
    .eq("org_id", orgId)
    .order("entry_date", { ascending: false });

  if (error) throw error;
  return data as JournalEntry[];
}

export async function getJournalEntry(orgId: string, entryId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select(`
      *,
      lines:journal_entry_lines(*, account:accounts(id, name, category, code))
    `)
    .eq("org_id", orgId)
    .eq("id", entryId)
    .single();

  if (error) throw error;
  return data as JournalEntry;
}

export async function voidJournalEntry(params: {
  org_id: string;
  entry_id: string;
  reason?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("void_journal_entry_v1", {
    p_org_id: params.org_id,
    p_entry_id: params.entry_id,
    p_reason: params.reason ?? null,
  });

  if (error) throw error;
  return data as JournalEntry;
}

export async function createJournalEntry(
  entry: {
    org_id: string;
    entry_date: string;
    reference?: string;
    description?: string;
    status: string;
  },
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
  }[]
) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_journal_entry_v1", {
    p_org_id: entry.org_id,
    p_entry_date: entry.entry_date,
    p_reference: entry.reference,
    p_description: entry.description,
    p_status: entry.status,
    p_lines: lines
  });

  if (error) throw error;
  return data;
}
