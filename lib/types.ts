export type ClientStatus = 'active' | 'inactive' | 'lead';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
