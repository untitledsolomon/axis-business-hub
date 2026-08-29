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

export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';
export type EmployeeShiftStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
export type EmployeeAttendanceStatus = 'scheduled' | 'present' | 'late' | 'absent' | 'half_day' | 'approved_leave';

export interface Employee {
  id: string;
  org_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  status: EmployeeStatus;
  hire_date: string;
  notes?: string;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeShift {
  id: string;
  org_id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: EmployeeShiftStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAttendance {
  id: string;
  org_id: string;
  employee_id: string;
  shift_id?: string | null;
  attendance_date: string;
  status: EmployeeAttendanceStatus;
  notes?: string;
  check_in?: string | null;
  check_out?: string | null;
  created_at: string;
  updated_at: string;
}

export type ItemStatus = 'active' | 'inactive' | 'archived';
export type ItemMovementType = 'sale' | 'purchase' | 'adjustment' | 'issue' | 'return' | 'transfer';

export interface Item {
  id: string;
  org_id: string;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  status: ItemStatus;
  current_quantity: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  location?: string;
  metadata: Record<string, unknown>;
  can_sell: boolean;
  can_custody: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemMovement {
  id: string;
  org_id: string;
  item_id: string;
  movement_type: ItemMovementType;
  quantity: number;
  unit_cost: number;
  reference?: string;
  notes?: string;
  created_at: string;
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
  account?: {
    id: string;
    name: string;
    category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    code?: string;
  };
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface OrgInvitation {
  id: string;
  org_id: string;
  email: string;
  role: string;
  code: string;
  invited_by?: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_by?: string;
  accepted_at?: string;
  created_at: string;
}

// Expenses & Daily Sales
export type ExpenseRecurrence = 'one_off' | 'daily' | 'weekly' | 'monthly';
export type ExpensePaymentMethod = 'cash' | 'bank' | 'mobile_money';
export type ExpenseCategory = 'transport' | 'meals' | 'supplies' | 'rent' | 'utilities' | 'salaries' | 'other';

export interface Expense {
  id: string;
  org_id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number; // In cents
  recurrence: ExpenseRecurrence;
  payment_method: ExpensePaymentMethod;
  expense_account_id?: string;
  paid_from_account_id?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  expense_account?: { id: string; name: string; code?: string };
  paid_from_account?: { id: string; name: string; code?: string };
  journal_entry?: { id: string; status: string };
}

export interface DailySale {
  id: string;
  org_id: string;
  sale_date: string;
  description: string;
  amount: number; // In cents
  payment_method: ExpensePaymentMethod;
  revenue_account_id?: string;
  received_into_account_id?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  revenue_account?: { id: string; name: string; code?: string };
  received_into_account?: { id: string; name: string; code?: string };
  item_id?: string;
  quantity?: number;
  unit_list_price?: number; // cents
  unit_sale_price?: number; // cents
  discount_amount?: number; // cents
  discount_pct?: number;
  item_movement_id?: string;
  item?: { id: string; name: string; sku?: string };
  journal_entry?: { id: string; status: string };
}

// ---------------------------------------------------------------------
// Reporting & Analytics (report RPCs in 20260826000004_reporting_functions.sql)
// ---------------------------------------------------------------------

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_category: AccountCategory;
  sub_type?: string;
  total_debit: number; // cents
  total_credit: number; // cents
  balance: number; // cents, signed per account's normal balance side
}

export interface ProfitAndLossRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_category: AccountCategory;
  sub_type?: string;
  amount: number; // cents, positive for both revenue and expense lines
}

export interface BalanceSheetRow {
  account_id: string | null; // null for the synthetic Retained Earnings row
  account_code: string;
  account_name: string;
  account_category: AccountCategory;
  sub_type?: string;
  balance: number; // cents
}

export interface AccountLedgerRow {
  entry_date: string;
  journal_entry_id: string;
  reference?: string;
  description?: string;
  debit: number; // cents
  credit: number; // cents
  running_balance: number; // cents
}

export interface RevenueTrendRow {
  month: string; // first day of month, ISO date
  revenue: number; // cents
  expenses: number; // cents
  net: number; // cents
}

export type ARAgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export interface ARAgingRow {
  invoice_id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  due_date: string;
  days_overdue: number;
  bucket: ARAgingBucket;
  amount_due: number; // cents
}

export interface ExpenseBreakdownRow {
  category: string;
  total: number; // cents
}

export interface TopClientRow {
  client_id: string;
  client_name: string;
  invoice_count: number;
  total_invoiced: number; // cents
  total_paid: number; // cents
}

export interface ClientProfitabilityRow {
  client_id: string;
  client_name: string;
  invoice_count: number;
  revenue: number;
  collected: number;
  outstanding: number;
}

export interface CashFlowRow { month: string; inflow: number; outflow: number; net: number; }
export interface ExpenseTrendRow { month: string; category: string; total: number; }
export interface ComparativePeriodRow { period_key: string; period_label: string; revenue: number; expenses: number; net: number; }
