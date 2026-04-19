export type ClientType = 'individual' | 'company';
export type ClientStatus = 'active' | 'inactive' | 'blocked';

export interface Client {
  id: string;
  org_id: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  type: ClientType;
  status: ClientStatus;
  currency: string;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'voided';

export interface InvoiceItem {
  id: string;
  org_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number; // In cents
  tax_rate_id?: string;
  discount_amount?: number; // In cents
  total: number; // In cents
  created_at: string;
}

export interface Invoice {
  id: string;
  org_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number; // In cents
  tax_total: number; // In cents
  discount_total: number; // In cents
  grand_total: number; // In cents
  currency: string;
  exchange_rate: number;
  notes?: string;
  payment_terms?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  items?: InvoiceItem[];
}

export type EmployeeRole = 'admin' | 'staff' | 'manager';
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  hireDate: string;
  salary?: number;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'sales' | 'marketing' | 'operations' | 'payroll' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string;
  description: string;
  relatedId?: string; // e.g., Invoice ID or Employee ID
  relatedType?: 'invoice' | 'employee' | 'client';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  activeClients: number;
  cashFlow: { date: string; income: number; expense: number }[];
}

// Finance Module Types
export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  org_id: string;
  parent_id?: string;
  code: string;
  name: string;
  description?: string;
  category: AccountCategory;
  sub_type?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  org_id: string;
  name: string;
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  org_id: string;
  account_id: string;
  name: string;
  bank_name?: string;
  account_number?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type JournalEntryStatus = 'draft' | 'posted' | 'void';

export interface JournalEntry {
  id: string;
  org_id: string;
  entry_date: string;
  reference?: string;
  description?: string;
  status: JournalEntryStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  org_id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number; // In cents
  credit: number; // In cents
  description?: string;
  created_at: string;
}
