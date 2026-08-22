import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccounts,
  createAccount,
  getTaxRates,
  createTaxRate,
  getBankAccounts,
  createBankAccount,
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  voidJournalEntry,
} from "@/lib/finance/queries";
import { useCrudMutation } from "@/hooks/shared/use-crud-mutation";

// Accounts
export function useAccounts(orgId: string) {
  return useQuery({
    queryKey: ["accounts", orgId],
    queryFn: () => getAccounts(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts", variables.org_id] });
    },
  });
}

// Tax Rates
export function useTaxRates(orgId: string) {
  return useQuery({
    queryKey: ["tax-rates", orgId],
    queryFn: () => getTaxRates(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTaxRate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tax-rates", variables.org_id] });
    },
  });
}

// Bank Accounts
export function useBankAccounts(orgId: string) {
  return useQuery({
    queryKey: ["bank-accounts", orgId],
    queryFn: () => getBankAccounts(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBankAccount,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", variables.org_id] });
    },
  });
}

// Journal Entries
export function useJournalEntries(orgId: string) {
  return useQuery({
    queryKey: ["journal-entries", orgId],
    queryFn: () => getJournalEntries(orgId),
    enabled: typeof window !== 'undefined' && !!orgId,
  });
}

export function useJournalEntry(orgId: string, entryId: string) {
  return useQuery({
    queryKey: ["journal-entries", orgId, entryId],
    queryFn: () => getJournalEntry(orgId, entryId),
    enabled: typeof window !== 'undefined' && !!orgId && !!entryId,
  });
}

export function useVoidJournalEntry(orgId: string) {
  return useCrudMutation({
    mutationFn: (vars: { entry_id: string; reason?: string }) =>
      voidJournalEntry({ org_id: orgId, entry_id: vars.entry_id, reason: vars.reason }),
    invalidateKeys: (vars) => [
      ["journal-entries", orgId],
      ["journal-entries", orgId, vars.entry_id],
    ],
    successMessage: "Journal entry voided",
    fallbackErrorMessage: "Failed to void journal entry",
  });
}

interface CreateJournalEntryParams {
  entry: {
    org_id: string;
    entry_date: string;
    reference?: string;
    description?: string;
    status: string;
  };
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entry, lines }: CreateJournalEntryParams) => createJournalEntry(entry, lines),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", variables.entry.org_id] });
    },
  });
}
