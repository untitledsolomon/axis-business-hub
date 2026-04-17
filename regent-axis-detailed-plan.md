# Regent Axis — Business Hub
### Detailed Product Plan & Development Roadmap
**Owner:** Regent Systems | **Status:** Pre-Development | **Last Updated:** April 2026

---

## Table of Contents
1. [Vision & Mission](#1-vision--mission)
2. [Target Users & Personas](#2-target-users--personas)
3. [Competitive Landscape](#3-competitive-landscape)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Core Concepts & Data Model](#5-core-concepts--data-model)
6. [Module Breakdown & Feature Checklists](#6-module-breakdown--feature-checklists)
   - 6.1 Core Shell, Auth & Org Setup
   - 6.2 Dashboard & Command Centre
   - 6.3 Finance & Accounting
   - 6.4 Invoicing & Billing
   - 6.5 Expenses & Reimbursements
   - 6.6 Banking & Cash Management
   - 6.7 Tax Management
   - 6.8 HR & People Management
   - 6.9 Payroll
   - 6.10 Inventory & Stock Management
   - 6.11 Procurement & Vendor Management
   - 6.12 CRM & Client Management
   - 6.13 Point of Sale (POS)
   - 6.14 Projects & Billable Work
   - 6.15 Reporting & Analytics
   - 6.16 Documents & File Management
   - 6.17 Automations
   - 6.18 Notifications & Inbox
   - 6.19 Settings & Administration
7. [Design & UX Principles](#7-design--ux-principles)
8. [Tech Stack](#8-tech-stack)
9. [Development Phases](#9-development-phases)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Integrations Roadmap](#11-integrations-roadmap)
12. [Monetisation & Plans](#12-monetisation--plans)
13. [Open Questions & Decisions](#13-open-questions--decisions)

---

## 1. Vision & Mission

**Vision:**  
Regent Axis is a modern, all-in-one business operations hub for SMEs and growing companies across emerging markets — combining accounting, invoicing, HR, payroll, inventory, procurement, CRM, and analytics into a single, coherent platform. It is what QuickBooks would look like if it were rebuilt today: clean, real-time, AI-aware, and designed for teams rather than solo bookkeepers.

**Mission:**  
To give every business — regardless of size or technical sophistication — a professional-grade operations system that replaces the fragmented patchwork of spreadsheets, standalone tools, and manual processes that most SMEs in emerging markets rely on.

**Core Promise:**  
> One system. Every business function. Zero friction.

**Positioning:**  
Axis sits between lightweight SME tools like Wave and Zoho Books (too narrow, accounting-only) and full ERP suites like SAP or Odoo (too heavy, too complex, too expensive). It is designed for the business owner who wants real financial control without hiring an ERP consultant, and for the finance manager who needs proper double-entry accounting without a 300-page manual.

---

## 2. Target Users & Personas

| Segment | Description |
|---|---|
| **Primary** | SMEs (5–200 employees) across East Africa and emerging markets — retail, services, construction, hospitality, agencies |
| **Secondary** | Freelancers and micro-businesses managing clients, invoices, and expenses |
| **Tertiary** | Larger enterprises needing a modular operations layer that connects to existing tools via API |

### Key Personas

**1. The Business Owner / CEO**  
Rarely opens spreadsheets. Wants to open Axis and immediately know: are we making money, do we have cash, is payroll covered, and what's overdue. Cares most about the Dashboard, financial health indicators, and one-click reports they can share with an investor or accountant.

**2. The Finance Manager / Accountant**  
The power user. Needs proper double-entry bookkeeping, a full chart of accounts, bank reconciliation, journal entries, and audit-ready reports. Gets frustrated by tools that hide accounting behind "smart" abstractions that break at tax time. Wants control, traceability, and exportable data.

**3. The HR Manager**  
Manages employee records, leave requests, payroll runs, and compliance. Currently doing this across a mix of spreadsheets and email. Needs a system that handles Uganda's statutory deductions correctly, generates payslips automatically, and gives employees a self-service portal.

**4. The Operations / Inventory Manager**  
Tracks stock across one or more locations, raises purchase orders, receives goods, and manages vendor relationships. Needs to know what's in stock right now, what needs reordering, and what the landed cost of goods is after taxes and freight.

**5. The Sales / Account Manager**  
Creates quotes and invoices for clients, tracks payments, and manages the client relationship. Doesn't want to touch accounting — just needs to create a professional invoice and know when it's been paid. Integrates with Regent CAD for pipeline management.

**6. The Employee (Self-Service)**  
Submits leave requests, views payslips, submits expense claims, and checks their leave balance. Needs a simple, mobile-friendly portal — not a full Axis account.

---

## 3. Competitive Landscape

| Tool | Strength | Weakness | Our Edge |
|---|---|---|---|
| **QuickBooks** | Industry standard, powerful accounting | Expensive, US-centric, no HR/inventory, poor UX | Built for emerging markets, all-in-one, modern UX |
| **Wave** | Free, clean invoicing and accounting | No payroll outside US/CA, no inventory, no HR | Full feature parity + HR + inventory + local compliance |
| **Zoho Books** | Good accounting, integrates with Zoho suite | Requires multiple Zoho apps, adds up in cost | Single unified app, no suite fragmentation |
| **Sage** | Strong in Africa, accounting depth | Outdated UX, expensive, on-premise roots | Cloud-native, modern, faster to set up |
| **Xero** | Beautiful accounting UX | Very expensive, no HR, no inventory | Feature breadth at better price point |
| **Odoo** | Truly all-in-one ERP | Overwhelming complexity, slow, requires implementation partner | Opinionated defaults, much faster to deploy |
| **Spreadsheets** | Free, flexible | No audit trail, breaks at scale, no collaboration | Structure, automation, and compliance without losing flexibility |

**Our differentiators:**
- Africa-first compliance: Uganda PAYE, NSSF, LST, VAT built in — configurable for Kenya, Tanzania, Rwanda, Ghana, Nigeria
- Integrated across all business functions in one product — not a suite of apps
- Regent Ecosystem: connects natively with CAD (CRM), PM (project management), and Forge (content/data)
- AI-assisted operations: smart categorisation, anomaly detection, financial forecasting
- Built for the owner-operator who doesn't have an IT department or implementation consultant

---

## 4. System Architecture Overview

Axis is a **multi-tenant SaaS platform** where each business organisation gets a fully isolated workspace. Modules are independently deployable and can be enabled or disabled per subscription plan. The architecture is designed so that a business can start with invoicing only and progressively activate HR, inventory, and payroll as they grow.

```
Regent Axis Platform
│
├── Core Layer
│   ├── Auth & Identity (Supabase Auth — email, magic link, SSO)
│   ├── Organisation & Multi-Tenancy (org isolation via RLS)
│   ├── RBAC (roles, permissions, module-level access)
│   ├── Notification Engine (in-app, email, WhatsApp)
│   └── Audit Log (all write operations logged with delta)
│
├── Finance Layer
│   ├── Chart of Accounts & General Ledger
│   ├── Invoicing & Billing
│   ├── Expense Management
│   ├── Banking & Cash Management
│   └── Tax Engine
│
├── People Layer
│   ├── HR & Employee Management
│   ├── Payroll Engine
│   ├── Leave & Attendance
│   └── Employee Self-Service Portal
│
├── Operations Layer
│   ├── Inventory & Stock Management
│   ├── Procurement & Purchase Orders
│   ├── Vendor Management
│   └── Point of Sale (POS)
│
├── Client Layer
│   ├── CRM & Client Directory
│   ├── Quotes & Proposals
│   └── Client Portal (invoices, statements, approvals)
│
├── Intelligence Layer
│   ├── Reporting & Analytics
│   ├── Dashboards (role-based)
│   └── AI Insights Engine
│
└── Integrations Layer
    ├── Regent CAD (CRM/pipeline)
    ├── Regent PM (projects/tasks)
    ├── Payment Gateways (Flutterwave, Paystack, MTN MoMo)
    ├── Banking APIs
    └── Open API / Webhooks
```

**Multi-tenancy:** Row Level Security (RLS) on every table. Org ID is on every record. No data bleeds between tenants under any query.

---

## 5. Core Concepts & Data Model

Understanding the entity model before building prevents architectural mistakes.

### Hierarchy
```
Organisation (Tenant)
├── Users (with roles and module permissions)
├── Financial Year (defines accounting periods)
├── Chart of Accounts
│   └── Accounts (Assets, Liabilities, Equity, Revenue, Expenses)
│       └── Journal Entries (debits and credits)
├── Clients / Contacts
│   ├── Invoices
│   ├── Credit Notes
│   └── Statements
├── Vendors / Suppliers
│   ├── Purchase Orders
│   ├── Bills (Vendor Invoices)
│   └── Payments
├── Employees
│   ├── Payroll Records
│   ├── Leave Records
│   └── Expense Claims
├── Products / Services (Catalogue)
│   └── Inventory Movements
└── Projects (optional module)
    └── Time Entries → Billable Invoices
```

### Key Entities

**Organisation**
- Name, logo, address, registration number, tax ID
- Base currency, fiscal year start month
- Country (determines default tax rules and statutory deductions)
- Timezone, date format, number format
- Subscription plan and active modules

**Account (Chart of Accounts)**
- Account code (e.g. 1000, 2000, 4000)
- Account name and description
- Account type: Asset / Liability / Equity / Revenue / Expense
- Sub-type (e.g. Current Asset, Fixed Asset, Cost of Goods Sold)
- Parent account (for hierarchy)
- Currency
- Active / archived status

**Journal Entry**
- Entry date, reference number, description
- Lines: Account, Debit amount, Credit amount
- Linked document (invoice, bill, expense, payroll)
- Created by, approved by
- Status: Draft / Posted / Void

**Invoice**
- Invoice number (auto-incremented, customisable prefix)
- Client, billing address, issue date, due date
- Line items: description, quantity, unit price, tax rate, discount
- Sub-total, tax total, discount total, grand total
- Currency and exchange rate (if multi-currency)
- Status: Draft / Sent / Viewed / Partial / Paid / Overdue / Voided
- Payment records (partial and full)
- Linked journal entry (auto-created on send/payment)

**Employee**
- Personal info: name, DOB, gender, national ID, TIN
- Contact: email, phone, address
- Employment: department, job title, start date, contract type
- Compensation: base salary, allowances, deduction structure
- Bank details for payroll disbursement
- Status: Active / On Leave / Probation / Terminated

**Product / Service**
- Name, SKU, description, category
- Type: Physical (tracked inventory) / Service (no stock) / Digital
- Unit of measure (units, kg, litres, hours, etc.)
- Sale price, cost price
- Tax rate applicable
- Current stock quantity, reorder point, reorder quantity
- Storage location(s)

---

## 6. Module Breakdown & Feature Checklists

---

### 6.1 — Core Shell, Auth & Org Setup

#### Authentication
- [x] Sign up with email and password (Mock implementation)
- [ ] Sign in with magic link (passwordless)
- [ ] OAuth login (Google)
- [ ] Two-factor authentication (TOTP authenticator app)
- [ ] Password reset flow
- [x] Session management (Mocked via cookies/localStorage)
- [ ] Auto-logout after configurable idle period
- [ ] Login activity log (IP, device, timestamp)

#### Organisation Onboarding
- [ ] Guided onboarding wizard on first sign-up
- [ ] Organisation name, logo, address, and contact details
- [ ] Business registration number and tax ID
- [ ] Select base currency and country
- [ ] Set fiscal year start month
- [ ] Choose industry type (Retail, Services, Construction, Hospitality, etc.)
- [ ] Select active modules (invoice only? HR? Inventory?)
- [ ] Invite team members during onboarding
- [ ] Import existing data (clients, products) via CSV during setup

#### Users & Roles
- [ ] Invite users via email with assigned role
- [x] Org-level roles: Owner, Admin, Accountant, HR Manager, Inventory Manager, Sales, Staff, Read-Only (Types defined)
- [ ] Module-level permission overrides per user
- [ ] Custom role builder (enterprise tier)
- [ ] User profile management (name, avatar, phone, job title)
- [ ] Deactivate user without deleting their data
- [ ] Transfer record ownership on deactivation
- [ ] User activity log (what they created, edited, deleted)

#### Org-Level Shell
- [x] Sidebar navigation with module sections
- [x] Topbar: search, notifications, quick-add button, user menu
- [x] Global command palette (Cmd/Ctrl + K — search anything, navigate anywhere)
- [x] Breadcrumb navigation on all internal pages
- [ ] Module switcher (quick-jump between Finance, HR, Inventory, etc.)
- [ ] Organisation switcher (for users who belong to multiple orgs)
- [ ] Dark mode / light mode toggle
- [ ] Keyboard shortcuts throughout

---

### 6.2 — Dashboard & Command Centre

The dashboard is the nerve centre of Axis. It is role-aware — the CEO sees a different default layout than the HR Manager or the Inventory Manager.

#### Financial Dashboard (default for Owner/Finance)
- [x] Cash position card (total across all bank accounts)
- [x] Revenue this month vs last month (with % change indicator)
- [x] Expenses this month vs last month
- [x] Net profit / loss this month
- [ ] Accounts receivable summary (total outstanding, overdue amount, overdue count)
- [ ] Accounts payable summary (what we owe vendors)
- [x] Revenue chart: Bar or line chart (last 12 months)
- [ ] Expense breakdown: Donut chart by category (top 5)
- [ ] Profit margin trend line

#### Operational Widgets
- [ ] Invoices due this week (list with client, amount, days until due)
- [ ] Overdue invoices alert (count + total value, drill-down link)
- [ ] Top clients by revenue (this month / this year)
- [x] Recent transactions feed (last 10 invoice/expense/payment events)
- [ ] Pending approvals badge (expenses, POs, leave requests, payroll)
- [ ] Inventory alerts: items below reorder point
- [ ] Upcoming payroll run date and estimated total

#### HR Dashboard Widgets
- [ ] Headcount by department
- [ ] Employees currently on leave (today)
- [ ] Pending leave requests
- [ ] Next payroll run date and status
- [ ] Recent joiners / upcoming probation end dates
- [ ] Attendance summary for the week

#### Dashboard Customisation
- [ ] Drag-and-drop widget grid (reorder, resize)
- [ ] Add / remove widgets from a library
- [ ] Per-user saved layout (each user can personalise their view)
- [ ] Date range selector applying to all dashboard widgets
- [ ] Role-based default layouts (Owner, Finance, HR, Ops each get a tailored default)
- [ ] Export dashboard as PDF snapshot
- [ ] Full-screen mode for presenting dashboards

#### AI Insight Cards
- [ ] "Revenue is 18% down vs last month — primarily in [Category]"
- [ ] "You have 4 invoices totalling UGX 3.2M that have been overdue for 30+ days"
- [ ] "Cash position is projected to go negative in 12 days based on upcoming bills"
- [ ] "Payroll cost increased 9% this quarter — driven by 2 new hires in Sales"
- [ ] "Inventory item [SKU] has been out of stock for 5 days — last sold 3× per day"
- [ ] AI insight panel can be dismissed, snoozed, or acted on directly

---

### 6.3 — Finance & Accounting

#### Chart of Accounts
- [ ] Default chart of accounts auto-created on org setup (industry-appropriate)
- [ ] Account hierarchy: parent accounts and sub-accounts
- [ ] Account types: Asset, Liability, Equity, Revenue, Expense, Cost of Goods Sold
- [ ] Account sub-types (e.g. Fixed Asset, Current Liability, Operating Expense)
- [ ] Create, edit, archive, and merge accounts
- [ ] Import chart of accounts from CSV
- [ ] Account codes (customisable numbering scheme)
- [ ] Multi-currency accounts
- [ ] Account balance view with drill-down to individual transactions

#### General Ledger & Journal Entries
- [ ] Auto-generated journal entries for all transactions (invoices, bills, payroll, expenses)
- [ ] Manual journal entry creation (debit/credit lines, description, date, reference)
- [ ] Journal entry approval workflow (preparer → approver)
- [ ] Recurring journal entries (monthly depreciation, prepayments, accruals)
- [ ] Journal entry reversal
- [ ] Journal entry attachment support (upload supporting document)
- [ ] Full general ledger view (filterable by account, date range, type)
- [ ] Transaction drill-down from any ledger line to source document
- [ ] Audit trail — every journal entry shows who created it and when

#### Bank Accounts & Reconciliation
- [ ] Add multiple bank accounts (name, account number, bank, currency)
- [ ] Petty cash accounts
- [ ] Manual transaction entry per account
- [ ] CSV transaction import (auto-map columns)
- [ ] Bank statement upload (PDF parsing, Phase 2)
- [ ] Transaction matching (match imported bank lines to recorded transactions)
- [ ] Reconciliation workspace: side-by-side view of bank vs books
- [ ] Unmatched items flagged for review
- [ ] Reconciliation history and lock (lock period once reconciled)
- [ ] Bank transfer recording between internal accounts
- [ ] Opening balance setup for existing accounts

#### Financial Periods
- [ ] Fiscal year and accounting period configuration
- [ ] Period lock (lock a past period to prevent edits)
- [ ] Year-end close process (roll retained earnings to equity)
- [ ] Opening balance import for new orgs migrating from another system

---

### 6.4 — Invoicing & Billing

#### Quote & Proposal Management
- [ ] Create quotes (same line-item structure as invoices)
- [ ] Quote status: Draft / Sent / Accepted / Declined / Expired
- [ ] Quote expiry date with auto-status change
- [ ] One-click convert accepted quote to invoice
- [ ] Send quote via email with branded PDF attachment
- [ ] Client can accept/decline quote via client portal
- [ ] Quote templates
- [ ] Quote revision history

#### Invoice Creation & Management
- [ ] Create invoice from scratch, from quote, or from project time entries
- [x] Invoice number: auto-incremented with configurable prefix (e.g. INV-2026-001) (Mocked list)
- [x] Bill To: client name, address, contact (pulled from client directory) (Mocked list)
- [x] Issue date, due date (auto-calculated from payment terms) (Mocked list)
- [ ] Payment terms: Net 7, Net 14, Net 30, Net 60, Due on Receipt, Custom
- [ ] Line items: item/service, description, quantity, unit, unit price, discount, tax
- [ ] Line-level tax rate selection (multiple tax rates on one invoice)
- [x] Sub-total, tax breakdown, discount, grand total (Mocked list)
- [ ] Notes section (terms, bank details, custom message)
- [ ] Currency (per invoice, with exchange rate)
- [ ] Attach supporting files to invoice
- [ ] Invoice preview (live PDF preview while editing)
- [ ] Save as draft before sending
- [ ] Duplicate invoice

#### Invoice Delivery
- [ ] Send invoice via email (branded template with PDF attachment)
- [ ] Customise email body per invoice
- [ ] Schedule invoice send (send on a future date/time)
- [ ] Send to multiple recipients (CC/BCC)
- [ ] SMS delivery (Phase 2)
- [ ] WhatsApp delivery (Phase 2)
- [ ] Invoice read receipt (mark as "Viewed" when client opens)
- [ ] Delivery log (who it was sent to, when, open status)

#### Invoice Tracking & Payments
- [ ] Invoice status flow: Draft → Sent → Viewed → Partial → Paid → Overdue → Voided
- [ ] Auto-mark Overdue when due date passes
- [ ] Record payment: date, amount, payment method, reference, bank account
- [ ] Partial payment support (multiple payment records per invoice)
- [ ] Overpayment handling (auto-create credit note for excess)
- [ ] Mark as paid with one click (for cash payments)
- [ ] Payment reminders: automated email sequences (3 days before, on due date, 7 days after)
- [ ] Custom reminder schedule per client
- [ ] Bulk invoice actions: mark paid, send reminder, export PDF, void

#### Recurring Invoices
- [ ] Create recurring invoice template
- [ ] Frequency: weekly, monthly, quarterly, annually, custom
- [ ] Start and end date (or indefinite)
- [ ] Auto-send on generation or hold in draft for review
- [ ] Pause and resume recurring invoice
- [ ] Recurring invoice history

#### Credit Notes
- [ ] Create credit note (full or partial) linked to original invoice
- [ ] Apply credit note to a future invoice
- [ ] Refund credit note (record cash refund)
- [ ] Credit note PDF generation and delivery

#### Client Invoice Portal
- [ ] Public client portal URL (unique per client)
- [ ] Client can view all their invoices and statements
- [ ] Client can download PDF invoices
- [ ] Client can pay online via payment gateway (Flutterwave/Paystack)
- [ ] Client can dispute or comment on an invoice
- [ ] Client can accept quotes
- [ ] No login required for basic view (token-based access)
- [ ] Optional client account login for full history access

---

### 6.5 — Expenses & Reimbursements

#### Expense Entry
- [ ] Manual expense entry: date, category, amount, currency, description
- [ ] Expense categories (default set + customisable)
- [ ] Attach receipt (image or PDF — mobile camera capture supported)
- [ ] Receipt OCR: auto-extract amount, date, vendor from uploaded receipt (Phase 2)
- [ ] Mark expense as billable to a client or project
- [ ] Mileage expense entry (distance × rate per km)
- [ ] Per-diem / daily allowance entry
- [ ] Recurring expense setup (monthly subscriptions, rent, etc.)
- [ ] Multi-currency expense entry with auto exchange rate lookup
- [ ] Split expense across multiple categories or cost centres

#### Expense Approval Workflow
- [ ] Employee submits expense claim with receipts
- [ ] Claim routed to assigned approver (configurable by department or amount threshold)
- [ ] Approver can approve, reject, or request clarification
- [ ] Multi-level approval for amounts above threshold (e.g. above UGX 500K needs Finance sign-off)
- [ ] Email and in-app notification at each stage
- [ ] Approval audit trail (who approved, when, notes)
- [ ] Bulk approval for multiple claims

#### Reimbursements
- [ ] Mark approved claim as reimbursed (record payment date and method)
- [ ] Batch reimbursement (pay multiple employees in one action)
- [ ] Export reimbursement list for bank payment processing
- [ ] Employee reimbursement history
- [ ] Reimbursement status visible to employee in self-service portal

#### Expense Reporting
- [ ] Expense summary by category, department, employee, project
- [ ] Receipts audit report (expenses with / without receipts)
- [ ] Out-of-policy expenses flag report
- [ ] Monthly expense trend chart
- [ ] Export expense report as CSV or PDF

---

### 6.6 — Banking & Cash Management

#### Account Management
- [ ] Create and manage multiple bank accounts and cash accounts
- [ ] Set a default account for new transactions
- [ ] Account balance view (current and as of any date)
- [ ] Inter-account transfer recording
- [ ] Foreign currency bank accounts

#### Transaction Management
- [x] Manual transaction entry (date, description, amount, type, category, reference) (Mocked list)
- [ ] CSV import with column mapping wizard
- [ ] Auto-categorise imported transactions (rule-based: if description contains "NSSF" → category = Statutory)
- [ ] Categorisation rules manager (create, edit, delete rules)
- [ ] Bulk categorise selected transactions
- [ ] Split a single transaction across multiple accounts/categories
- [ ] Attach document to any transaction (receipt, statement page)
- [ ] Transaction tagging (custom tags for reporting)
- [ ] Transaction notes

#### Bank Reconciliation
- [ ] Reconciliation workspace: two-pane view (bank statement vs books)
- [ ] Match transactions manually or let the system auto-match by amount and date
- [ ] Bulk confirm matched transactions
- [ ] Flag unmatched items for investigation
- [ ] Create new transaction from unmatched bank line (if missing from books)
- [ ] Opening balance reconciliation for new accounts
- [ ] Reconciliation report (summary of matched, unmatched, adjustments)
- [ ] Lock reconciled period

#### Cash Flow
- [ ] Cash flow statement: Operating / Investing / Financing activities
- [ ] 13-week cash flow forecast (based on outstanding invoices, scheduled bills, payroll)
- [ ] Actual vs projected cash flow chart
- [ ] Cash runway indicator ("Based on current burn, you have ~45 days of cash")
- [ ] Scenario modelling: what-if analysis for large upcoming payments

---

### 6.7 — Tax Management

#### Tax Configuration
- [ ] Create and manage tax rates (name, rate %, type)
- [ ] Tax types: VAT, Withholding Tax, Import Duty, Excise Duty
- [ ] Compound taxes (tax on tax)
- [ ] Tax groups (combine multiple taxes into one line on invoice)
- [ ] Tax-inclusive vs tax-exclusive pricing mode per invoice/product
- [ ] Country-specific presets: Uganda (18% VAT), Kenya (16% VAT), etc.
- [ ] Zero-rated and exempt transaction handling

#### Tax Reporting & Filing
- [ ] VAT return report (Input VAT, Output VAT, Net VAT payable)
- [ ] Monthly / quarterly / annual tax summaries
- [ ] Withholding tax certificates generation
- [ ] Tax liability account tracking (what we owe URA)
- [ ] Record tax payment and reconcile against liability account
- [ ] Export tax reports as PDF or CSV for filing
- [ ] Uganda-specific: VAT Return format compatible with URA requirements (Phase 2)

---

### 6.8 — HR & People Management

#### Employee Profiles
- [x] Full employee record: personal info, contact, emergency contact (Mocked list)
- [ ] National ID / passport number and expiry
- [ ] TIN (Tax Identification Number)
- [ ] NSSF membership number
- [x] Department and job title (Mocked list)
- [ ] Employment type: Full-time / Part-time / Contract / Probation
- [ ] Employment start date and contract end date (with expiry reminders)
- [ ] Reporting manager (for approval workflows and org chart)
- [ ] Custom employee fields (add any field not covered by defaults)
- [ ] Employee profile photo
- [x] Employment status: Active / Probation / On Leave / Suspended / Terminated (Mocked list)

#### Document Management per Employee
- [ ] Upload and store: employment contract, NDA, ID copies, certificates, offer letter
- [ ] Document expiry tracking (ID expiry, work permit, contract renewal)
- [ ] Automatic reminder X days before document expiry (configurable)
- [ ] Document access control (HR-only vs manager-visible)
- [ ] Document version history

#### Departments & Org Structure
- [ ] Create and manage departments
- [ ] Assign employees to departments
- [ ] Set department heads
- [ ] Interactive org chart (visual tree based on reporting lines)
- [ ] Org chart export as image or PDF
- [ ] Cost centre mapping (link department to accounting cost centre)

#### Leave Management
- [ ] Leave types: Annual, Sick, Maternity, Paternity, Compassionate, Study, Unpaid, Public Holidays
- [ ] Leave accrual rules per type (e.g. 1.75 days accrued per month)
- [ ] Leave balance tracking per employee per type
- [ ] Carry-over rules and caps (e.g. max 5 days carry-over per year)
- [ ] Leave request submission by employee (via self-service portal or HR on behalf)
- [ ] Approval workflow: Employee → Manager → HR (configurable levels)
- [ ] Approve, reject, or request amendment with comment
- [ ] Automatic leave balance deduction on approval
- [ ] Team leave calendar (who's off when)
- [ ] Leave conflict detection (flag if too many people off at once)
- [ ] Leave history per employee
- [ ] Public holiday schedule per country (pre-loaded for Uganda, Kenya, etc.)
- [ ] Leave liability report (total value of untaken leave in the org)

#### Attendance & Time
- [ ] Manual attendance log per employee (in/out times)
- [ ] Shift scheduling (define shifts, assign to employees)
- [ ] Overtime tracking and approval
- [ ] Late arrival and early departure flagging
- [ ] Attendance summary report (per employee, per period)
- [ ] Integration with biometric devices (Phase 2 — via CSV import initially)

#### Employee Self-Service Portal
- [ ] Employee login (separate from admin Axis)
- [ ] View personal profile and employment details
- [ ] Submit and track leave requests
- [ ] View leave balances
- [ ] Submit expense claims with receipt upload
- [ ] View and download payslips
- [ ] View company announcements
- [ ] Mobile-optimised (the primary access method for most employees)

#### Recruitment (Phase 2)
- [ ] Create job postings (internal and external)
- [ ] Publish to careers page (embeddable widget)
- [ ] Applicant tracking pipeline (Kanban: Applied → Screened → Interview → Offer → Hired)
- [ ] Interview scheduling (calendar integration)
- [ ] Offer letter generation from template
- [ ] One-click convert hired applicant to employee record
- [ ] Recruitment source tracking (LinkedIn, referral, job board)

#### Offboarding
- [ ] Offboarding checklist per employee (return equipment, revoke access, exit interview)
- [ ] Final leave payout calculation
- [ ] NSSF and tax clearance documentation
- [ ] Deactivate Axis access without deleting records
- [ ] Termination record with reason and date

---

### 6.9 — Payroll

Payroll is one of the most trust-critical modules. Mistakes cost employee trust and create legal liability. It must be precise, auditable, and recoverable.

#### Salary & Compensation Structure
- [ ] Salary structure builder: define components (Basic Salary, Housing Allowance, Transport Allowance, Hardship Allowance, etc.)
- [ ] Allowance types: Fixed / Percentage of basic / Conditional
- [ ] Deduction types: PAYE, NSSF (employee + employer), LST (Local Service Tax), Pension, Loan Repayment, SACCO, Health Insurance, Salary Advance Recovery
- [ ] Multiple salary structures (e.g. different structures for Uganda vs Kenya employees)
- [ ] Assign salary structure to each employee
- [ ] Effective date for salary changes (history preserved)

#### Uganda-Specific Tax Engine (P0)
- [ ] PAYE calculation per current Uganda Revenue Authority bands
- [ ] NSSF: 5% employee + 10% employer on qualifying earnings
- [ ] LST: Monthly LST based on salary band (configurable per local authority)
- [ ] Withholding tax on contractors and non-employees
- [ ] Tax relief for qualifying employees (pension relief, disability)
- [ ] Configurable for Kenya (PAYE, NHIF, NSSF), Tanzania, Rwanda (Phase 2)

#### Payroll Run
- [ ] Create payroll run for a period (month, or custom range)
- [ ] Auto-populate from employee records and salary structures
- [ ] Preview payroll before processing (see all calculations)
- [ ] Flag anomalies: new hires, salary changes, employees on unpaid leave
- [ ] Include / exclude individual employees from a run
- [ ] Add one-time bonuses, commissions, deductions, advances
- [ ] Pro-rate salary for partial month (new hire mid-month, termination mid-month)
- [ ] Payroll approval workflow: Preparer → Finance Manager → Owner
- [ ] Lock payroll after approval (prevent edits)
- [ ] Reverse / rerun payroll if error found before disbursement

#### Payslip Generation
- [ ] Auto-generate payslip PDF per employee per run
- [ ] Branded payslip (company logo, colours)
- [ ] Breakdown: Gross earnings, allowances, deductions, net pay
- [ ] YTD (year-to-date) totals for each component
- [ ] Payslip delivery: email to employee, available in self-service portal
- [ ] Bulk email all payslips in one action
- [ ] Download all payslips as ZIP archive

#### Payroll Disbursement
- [ ] Generate bank payment file (CSV formatted for Stanbic, ABSA, MTN MoMo, Airtel Money — configurable column format per bank)
- [ ] Payment summary: total net pay, breakdown by department, bank account totals
- [ ] Mark payroll as disbursed (record date and method)
- [ ] Individual payment status tracking (paid / pending / failed)
- [ ] Cash payroll option (for businesses paying some employees in cash)

#### Payroll Reporting & Compliance
- [ ] Payroll summary report (all employees, all components, all totals)
- [ ] Department-level payroll cost report
- [ ] PAYE return report (for URA filing — monthly)
- [ ] NSSF return report (for NSSF submission — monthly)
- [ ] P9 Annual Tax Certificate generation per employee (for employee tax filing)
- [ ] Payroll trend chart (cost over 12 months)
- [ ] Payroll audit log (full history of who ran, approved, and modified each run)

---

### 6.10 — Inventory & Stock Management

#### Product Catalogue
- [ ] Create products and services: name, SKU, barcode, description, category, unit of measure
- [ ] Product type: Physical (stocked) / Service (no stock) / Digital / Bundle
- [ ] Product variants (size, colour, weight — each variant is a separate SKU)
- [ ] Product images (multiple per product)
- [ ] Sale price, cost price, margin display
- [ ] Tax rate per product
- [ ] Preferred vendor per product
- [ ] Product notes and internal description
- [ ] Archive products (retain history without showing in active catalogue)
- [ ] Bulk import products from CSV
- [ ] Bulk price update

#### Stock Levels & Locations
- [ ] Multiple warehouse / storage location support
- [ ] Stock quantity per product per location
- [ ] Transfer stock between locations (with transfer record)
- [ ] Set reorder point and reorder quantity per product per location
- [ ] Low stock alerts (in-app + email when stock falls below reorder point)
- [ ] Out-of-stock alerts
- [ ] Opening stock entry (for businesses setting up Axis mid-operation)

#### Stock Movements
- [ ] Every stock change creates a movement record (source: purchase, sale, adjustment, transfer, return)
- [ ] Stock movement history per product (full audit trail)
- [ ] Stock valuation methods: FIFO (First In First Out) or Weighted Average Cost
- [ ] Real-time cost of goods sold (COGS) calculation on sales
- [ ] Landed cost allocation (spread freight, insurance, duty costs across received items)

#### Stock Adjustments
- [ ] Create adjustment entry (increase or decrease stock)
- [ ] Adjustment reasons: Damage / Loss / Theft / Recount / Expiry / Donation
- [ ] Attach supporting document to adjustment
- [ ] Adjustment approval workflow for amounts above threshold
- [ ] Stock count / physical inventory: create a count sheet, enter actual quantities, system calculates variance, generate adjustment

#### Inventory Reporting
- [ ] Current stock report (all products, quantities, values)
- [ ] Low stock report
- [ ] Stock movement report (per product, per period)
- [ ] Stock valuation report (total inventory value at cost)
- [ ] COGS report (per period)
- [ ] Slow-moving stock report (no movement in X days)
- [ ] Stock ageing report (how long has inventory been sitting)
- [ ] Inventory turnover ratio per product

#### Barcode / QR Support (Phase 2)
- [ ] Generate barcode / QR label per product (printable)
- [ ] Scan barcode on mobile to look up product or add to PO/invoice
- [ ] Barcode scanner integration (USB / Bluetooth)

---

### 6.11 — Procurement & Vendor Management

#### Vendor Profiles
- [ ] Vendor name, contact person, email, phone, address
- [ ] Tax ID / TIN
- [ ] Payment terms (Net 30, etc.)
- [ ] Default currency
- [ ] Bank details (for payment)
- [ ] Vendor category (Supplier, Contractor, Service Provider)
- [ ] Internal vendor rating / notes
- [ ] Preferred vendor flag per product
- [ ] Vendor purchase history

#### Purchase Requisitions
- [ ] Any staff member can raise a purchase requisition
- [ ] List of items needed, estimated cost, justification
- [ ] Approval workflow: Staff → Manager → Finance
- [ ] Approved requisitions converted to Purchase Orders
- [ ] Rejected requisitions with reason

#### Purchase Orders
- [ ] Create PO from approved requisition or from scratch
- [ ] PO number (auto-incremented with prefix)
- [ ] Vendor, delivery address, expected delivery date
- [ ] Line items: product/service, quantity, unit price, tax, discount
- [ ] PO approval workflow (configurable by amount threshold)
- [ ] Send PO to vendor via email (branded PDF)
- [ ] PO status: Draft / Pending Approval / Sent / Partially Received / Received / Cancelled
- [ ] Amend PO (with amendment number and change history)
- [ ] Cancel PO

#### Goods Receipt
- [ ] Receive items against an open PO
- [ ] Partial receipt support (receive some lines, leave others open)
- [ ] Goods Receipt Note (GRN) auto-generated on receiving
- [ ] Discrepancy handling: received quantity differs from PO quantity
- [ ] Receiving triggers stock level increase automatically
- [ ] Quality check step (optional: mark items as accepted/rejected before stocking)
- [ ] Return to vendor: create a return note, reverse stock, generate debit note

#### Vendor Bills (Accounts Payable)
- [ ] Create vendor bill from received PO (3-way match: PO → GRN → Bill)
- [ ] Manual bill entry (for services or non-PO purchases)
- [ ] Bill status: Draft / Pending Approval / Approved / Partial / Paid / Overdue
- [ ] Bill approval workflow
- [ ] Record payment against bill
- [ ] Partial payment support
- [ ] Payment scheduling (set a future payment date)
- [ ] Batch payment: pay multiple vendors in one action
- [ ] Vendor statement (all bills and payments for a vendor over a period)
- [ ] Aged payables report

---

### 6.12 — CRM & Client Management

> Deep CRM and lead pipeline is handled by **Regent CAD**. The Axis CRM layer focuses on financial client relationships, not sales pipeline.

#### Client Directory
- [x] Client profiles: name, company, contact person, email, phone, address, tax ID
- [x] Client type: Individual / Company
- [ ] Currency and payment terms per client
- [ ] Credit limit per client (flag invoices that would exceed it)
- [ ] Client category / tags
- [ ] Internal notes on client
- [x] Client status: Active / Inactive / Blocked

#### Client Financial Overview
- [ ] Per-client dashboard: total invoiced, total paid, outstanding, overdue
- [ ] Invoice history for the client
- [ ] Payment history
- [ ] Credit notes issued
- [ ] Client statement (all transactions over a period — PDF exportable)
- [ ] Revenue by client report (top clients, revenue trends)

#### Quotes & Proposals
- [ ] Create and send quotes (see Section 6.4)
- [ ] Quote-to-invoice conversion
- [ ] Quote acceptance tracking

#### Client Communication Log
- [ ] Log calls, meetings, and emails manually
- [ ] Attach documents to communication log entries
- [ ] View full timeline of all client interactions and transactions
- [ ] @mention team member in client notes
- [ ] Link to Regent CAD for full pipeline and deal management

---

### 6.13 — Point of Sale (POS)

For businesses with physical retail locations or counter-based sales.

#### POS Interface
- [ ] Clean, tablet-optimised POS screen
- [ ] Product search and barcode scan to add items
- [ ] Category browsing grid
- [ ] Cart management (add, remove, change quantity, apply discount)
- [ ] Line-level and order-level discount support
- [ ] Tax calculation (auto-applied from product settings)
- [ ] Hold and recall orders
- [ ] Customer lookup and attach to sale
- [ ] Split payment (part cash, part mobile money)

#### Payment Methods
- [ ] Cash payment with change calculator
- [ ] Mobile money: MTN MoMo, Airtel Money
- [ ] Card payment (Visa/Mastercard via integrated terminal)
- [ ] Credit to client account (deferred payment, creates an invoice)

#### Receipts
- [ ] Print receipt (thermal printer support)
- [ ] Email receipt
- [ ] WhatsApp receipt (Phase 2)
- [ ] Configurable receipt header (logo, address, VAT number)

#### POS Operations
- [ ] Open and close till (cash float management)
- [ ] End-of-day summary report (sales, payment breakdown, tips)
- [ ] Till reconciliation (expected cash vs counted cash)
- [ ] Offline mode: queue sales when internet is down, sync when reconnected
- [ ] Multi-cashier support (each cashier logs in with their own PIN)
- [ ] POS sales feed into inventory (stock decrements automatically)
- [ ] POS sales feed into accounting (auto-creates journal entries)

---

### 6.14 — Projects & Billable Work

A lightweight project module for tracking work, time, and costs against clients or internal initiatives. Deep project management lives in **Regent PM** — this module is the financial and billing layer.

#### Projects
- [ ] Create project (name, client, description, start/end dates, budget)
- [ ] Project type: Client-Billable / Internal / Fixed-Fee / Time-and-Materials
- [ ] Assign team members to project
- [ ] Project status: Active / On Hold / Completed / Cancelled
- [ ] Budget tracking: budgeted cost vs actual cost vs invoiced

#### Tasks
- [ ] Simple task list within project (title, assignee, due date, status)
- [ ] Mark tasks billable or non-billable
- [ ] Sync tasks with Regent PM (Phase 2)

#### Time Tracking
- [ ] Start/stop timer on any task or project
- [ ] Manual time log entry (date, hours, description, billable flag)
- [ ] Team time entries view (all members, all projects)
- [ ] Time approval: project manager reviews and approves logged hours
- [ ] Hourly rate per person, per project, or per task type
- [ ] Billable hours calculation (approved billable hours × rate)

#### Project Billing
- [ ] Generate invoice from approved billable time entries
- [ ] Choose time period and which entries to include
- [ ] Invoice preview before sending
- [ ] Milestone-based invoicing (invoice when milestone is reached)
- [ ] Project billing history

#### Project Profitability
- [ ] Project profitability report: Revenue invoiced vs Labour cost vs Expenses
- [ ] Margin per project
- [ ] Budget vs actual (hours and cost)
- [ ] Unbilled time report (approved billable hours not yet invoiced)

---

### 6.15 — Reporting & Analytics

#### Financial Reports (Standard)
- [ ] Profit & Loss Statement (Income Statement)
- [ ] Balance Sheet
- [ ] Cash Flow Statement (Direct and Indirect method)
- [ ] Trial Balance
- [ ] General Ledger (all accounts, all transactions, any date range)
- [ ] Aged Receivables (outstanding invoices by age bucket: 0–30, 31–60, 61–90, 90+ days)
- [ ] Aged Payables (outstanding vendor bills by age bucket)
- [ ] Accounts Receivable Summary (by client)
- [ ] Accounts Payable Summary (by vendor)

#### Operational Reports
- [ ] Sales by product / service
- [ ] Sales by client
- [ ] Revenue by period (monthly, quarterly)
- [ ] Expense by category
- [ ] Expense by department
- [ ] Inventory valuation report
- [ ] COGS report
- [ ] Low stock report
- [ ] Payroll cost by department
- [ ] Leave liability report
- [ ] Project profitability report
- [ ] Time tracking summary

#### Report Features
- [ ] All reports filterable by date range (preset ranges + custom)
- [ ] Drill-down from any report total to source transactions
- [ ] Export every report as PDF or CSV
- [ ] Compare two periods side-by-side (e.g. this month vs last month, this year vs last year)
- [ ] Scheduled report delivery (auto-email a report every week/month to selected users)
- [ ] Report sharing (generate public link to a report snapshot)

#### Custom Report Builder (Phase 2)
- [ ] Drag-and-drop report builder
- [ ] Choose entity (Invoices, Expenses, Transactions, Products, Employees)
- [ ] Select fields / dimensions
- [ ] Add filters and sort order
- [ ] Choose visualisation type (table, bar chart, line chart, pie chart)
- [ ] Save as named custom report
- [ ] Add custom report to dashboard as widget

#### Analytics & Forecasting (AI-Powered)
- [ ] Revenue forecast (next 3 / 6 / 12 months based on historical trends)
- [ ] Cash flow forecast (13-week rolling)
- [ ] Expense anomaly detection ("Office supplies cost 3× the monthly average this month")
- [ ] Client payment behaviour analysis ("Client X pays 22 days late on average")
- [ ] Inventory demand forecasting (predict reorder timing based on sales velocity)

---

### 6.16 — Documents & File Management

- [ ] Central document library per organisation
- [ ] Folder and subfolder creation
- [ ] File upload: PDF, images, Word, Excel, CSV, ZIP
- [ ] File size limit: 25MB per file (configurable per plan)
- [ ] Tag files with categories (Contract, Invoice, Certificate, ID, etc.)
- [ ] Link documents to specific records (employee, client, vendor, transaction)
- [ ] Document version history (upload new version, retain old)
- [ ] Document access control (who can view and who can download)
- [ ] Document expiry reminders (e.g. contract expires in 30 days)
- [ ] Full-text search across document titles and tags
- [ ] Bulk download selected files as ZIP
- [ ] Bulk delete with confirmation
- [ ] Storage usage indicator per plan

---

### 6.17 — Automations

A no-code rule engine to automate repetitive business workflows.
Format: **WHEN [trigger] → IF [condition] → THEN [action]**

#### Triggers
- [ ] Invoice is created
- [ ] Invoice becomes overdue
- [ ] Invoice is viewed by client
- [ ] Invoice is paid
- [ ] Expense is submitted
- [ ] Expense is approved
- [ ] Purchase order is approved
- [ ] Stock falls below reorder point
- [ ] Leave request is submitted
- [ ] Payroll run is created
- [ ] New employee is added
- [ ] Document expiry date is approaching
- [ ] Scheduled date/time (cron-style)
- [ ] Bank transaction imported with matching description

#### Conditions
- [ ] Invoice amount is greater/less than X
- [ ] Client is X / in category X
- [ ] Expense category is X
- [ ] Employee is in department X
- [ ] Stock quantity is below X
- [ ] Leave type is X

#### Actions
- [ ] Send email notification (to specified user, team, or dynamic recipient like assignee)
- [ ] Send in-app notification
- [ ] Send WhatsApp message (Phase 2)
- [ ] Change record status
- [ ] Create a new record (e.g. auto-create PO when stock hits reorder point)
- [ ] Assign to a user
- [ ] Add a tag / label
- [ ] Post a comment / note on the record
- [ ] Trigger a webhook (send data to external system)
- [ ] Create a task in Regent PM (Phase 2)

#### Preset Automation Templates
- [ ] "When invoice is 7 days overdue → send reminder email to client"
- [ ] "When stock falls below reorder point → create draft purchase order from preferred vendor"
- [ ] "When expense is submitted → notify line manager for approval"
- [ ] "When leave request is submitted → notify HR manager"
- [ ] "When new employee is added → send welcome email and create onboarding checklist"
- [ ] "When PO is approved → notify purchasing team"
- [ ] "When invoice is viewed by client → notify account manager"

---

### 6.18 — Notifications & Inbox

- [ ] In-app notification centre (bell icon in topbar)
- [ ] Notification types: approval requests, overdue alerts, payment received, mentions, system events
- [ ] Read / unread state per notification
- [ ] Mark all as read
- [ ] Notification grouping (batch: "3 new expense approvals")
- [ ] Click notification to navigate directly to the relevant record
- [ ] Email notifications (configurable per event type per user)
- [ ] Daily digest email (summary of pending actions and key events)
- [ ] Notification preferences panel (turn off specific event types)
- [ ] Snooze notification (remind me in 1 hour / tomorrow / next week)
- [ ] Browser push notifications (opt-in)
- [ ] WhatsApp notification forwarding (Phase 2)

---

### 6.19 — Settings & Administration

#### Organisation Settings
- [ ] Organisation profile (name, logo, address, registration number, tax ID)
- [ ] Base currency and secondary currencies
- [ ] Fiscal year start month
- [ ] Default payment terms and due date calculation
- [ ] Default invoice language
- [ ] Date format, number format, timezone
- [ ] Country (controls statutory defaults)
- [ ] Public holiday calendar

#### Billing & Subscription
- [ ] View current plan and usage (users, storage, modules)
- [ ] Upgrade / downgrade plan
- [ ] Billing history and invoice download
- [ ] Payment method management
- [ ] Usage alerts (approaching limits)

#### Branding
- [ ] Upload logo (used on invoices, payslips, POs, client portal)
- [ ] Primary brand colour (used in PDF documents)
- [ ] Invoice footer text (bank details, terms, custom message)
- [ ] Payslip branding
- [ ] Custom email domain for notification emails (e.g. noreply@yourbusiness.com)
- [ ] Custom client portal URL (yourbusiness.axis.app or custom domain)

#### Customisation
- [ ] Custom fields builder: add fields to Clients, Employees, Products, Invoices, Expenses
- [ ] Custom field types: Text, Number, Date, Dropdown, Checkbox, URL
- [ ] Custom invoice and PO numbering (prefix, starting number, reset frequency)
- [ ] Custom expense categories
- [ ] Custom leave types
- [ ] Custom employee fields
- [ ] Custom product categories

#### Security & Compliance
- [ ] Role and permission management
- [ ] Two-factor authentication enforcement (require 2FA for all users)
- [ ] IP allowlist (restrict access to specific IP ranges — enterprise)
- [ ] Session timeout settings
- [ ] Full audit log: every create, edit, and delete logged with user and timestamp
- [ ] Audit log export (CSV)
- [ ] Data export: full org data export as JSON/CSV
- [ ] Data deletion / account closure workflow
- [ ] GDPR data request handling

#### Integrations Panel
- [ ] Connected integrations status
- [ ] API key management (generate, revoke, view last used)
- [ ] Webhook endpoint configuration (URL, events to subscribe to, secret key)
- [ ] Webhook delivery log (request/response history, retry failed)
- [ ] OAuth app connections (Google, Slack, etc.)

---

## 7. Design & UX Principles

| Principle | Detail |
|---|---|
| **Trustworthiness first** | Financial software must inspire confidence. Every number must be traceable. Every action must feel deliberate. No ambiguity in what a button does. |
| **Progressive disclosure** | A new business owner should be able to create and send their first invoice in under 5 minutes without reading a manual. Advanced features (journal entries, bank reconciliation, payroll tax engines) reveal themselves as needed. |
| **Data density with clarity** | Finance deals with tables of data. Dense tables are not a UX failure — they are the product. The challenge is making dense data scannable: clear hierarchy, sticky headers, alternating row colours, and action buttons only appearing on hover. |
| **Audit confidence** | Every record shows when it was created, who created it, and what changed. Users should never wonder "did that get saved?" |
| **Mobile-aware for approvals** | Full data entry on mobile is unrealistic. But approving an expense, checking an invoice, or viewing a payslip must work flawlessly on a phone. |
| **Feedback on every action** | Every save, submit, approve, and send has explicit confirmation (toast notification, status change, or email confirmation). Destructive actions require a confirmation dialog. |
| **Keyboard efficiency** | Power users (accountants, finance managers) should be able to navigate tables, create records, and submit forms without reaching for the mouse. Tab order, keyboard shortcuts, and command palette are first-class. |
| **Print and PDF quality** | Invoices, payslips, and reports are external-facing. PDFs must be professional, clean, and branded. This is non-negotiable — it is the face of the client's business. |
| **Dark mode** | Full dark mode from launch. Many accountants work long hours. |
| **Consistent patterns** | Every list page has the same layout: filters top-right, create button top-right, table with sortable columns, row actions on hover. Users learn the pattern once and apply it everywhere. |

---

## 8. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React + TypeScript + Vite | Consistent with Regent ecosystem |
| **Styling** | Tailwind CSS + shadcn/ui | Shared Regent design system |
| **State Management** | Zustand + TanStack Query | Local UI state + server-synced data |
| **Data Tables** | TanStack Table | Sortable, filterable, virtualized tables for large datasets |
| **Rich Text** | Tiptap | Invoice notes, client notes, expense descriptions |
| **Charts** | Recharts | Financial charts, KPI visualisations |
| **PDF Generation** | Puppeteer (server-side via Edge Function) | Invoices, payslips, reports — consistent rendering |
| **File Processing** | Supabase Storage + server-side functions | Receipt storage, document management |
| **Backend / DB** | Supabase (PostgreSQL, Auth, Storage, Realtime) | Multi-tenant with RLS |
| **Auth** | Supabase Auth | Email, magic link, OAuth (Google) |
| **Realtime** | Supabase Realtime | Live dashboard updates, notification push |
| **Email** | Resend | Invoices, payslips, notifications, reminders |
| **Search** | PostgreSQL full-text search → Typesense (Phase 3) | Global search across all records |
| **Payment Gateways** | Flutterwave + Paystack | Online invoice payment, Phase 2 |
| **Mobile Money** | MTN MoMo API + Airtel Money API | East Africa payments, Phase 2 |
| **Hosting** | Vercel (frontend) + Supabase (backend) | |
| **OCR** | Google Cloud Vision or Mindee | Receipt OCR, Phase 2 |
| **AI** | Anthropic Claude API | Insight cards, forecasting, smart categorisation, Phase 3 |

---

## 9. Development Phases

### Phase 0 — Foundation *(Weeks 1–3)*
- [ ] Project scaffold (Vite + React + TS + Tailwind + shadcn)
- [ ] Supabase schema: orgs, users, roles, audit_log, notifications
- [ ] RLS policies: org isolation on all tables
- [ ] Auth flow: signup, email login, magic link, org creation wizard
- [ ] Shell layout: sidebar (module nav), topbar (search, notifications, user menu)
- [ ] RBAC engine: role definitions, permission checks, module-level guards
- [ ] Design system: colour tokens, typography scale, spacing, shadows, component library baseline (Button, Input, Modal, Select, Table, Badge, Avatar, Tooltip, Toast)
- [ ] Command palette (Cmd+K) — navigates to any module/page
- [ ] Audit log: middleware that records every create/update/delete

### Phase 1 — Finance Core *(Weeks 4–11)*
- [ ] Chart of accounts (create, manage, hierarchy)
- [ ] General ledger view
- [ ] Manual journal entries
- [ ] Client directory (CRUD, search, profile)
- [ ] Invoice module: full lifecycle (draft, send, track, pay, void)
- [ ] Invoice PDF generation (branded, professional)
- [ ] Recurring invoices
- [ ] Credit notes
- [ ] Expense entry and categories
- [ ] Expense approval workflow
- [ ] Bank account management
- [ ] Manual transaction entry
- [ ] CSV transaction import
- [ ] Tax rate configuration
- [ ] Financial reports: P&L, Balance Sheet, Cash Flow Statement, Trial Balance
- [ ] Dashboard v1: financial KPIs, revenue chart, expense donut, overdue alert
- [ ] In-app notification centre
- [ ] Email notifications (invoices sent, payments received, approvals)

### Phase 2 — HR & Payroll *(Weeks 12–20)*
- [ ] Employee profiles (full record, documents, custom fields)
- [ ] Department management and org chart
- [ ] Leave types and accrual rules
- [ ] Leave request and approval workflow
- [ ] Team leave calendar
- [ ] Uganda payroll tax engine (PAYE, NSSF, LST)
- [ ] Salary structure builder
- [ ] Payroll run (preview, approve, lock)
- [ ] Payslip generation and delivery (PDF, email)
- [ ] Bank payment file export
- [ ] PAYE and NSSF return reports
- [ ] Employee self-service portal (leave, payslips, expenses)
- [ ] Attendance log
- [ ] Document expiry reminders

### Phase 3 — Inventory & Procurement *(Weeks 21–28)*
- [ ] Product catalogue (CRUD, variants, images)
- [ ] Multi-location stock management
- [ ] Stock movements and adjustment
- [ ] Low stock alerts and reorder points
- [ ] Physical stock count workflow
- [ ] Vendor profiles
- [ ] Purchase requisitions
- [ ] Purchase orders (create, approve, send, receive)
- [ ] Goods receipt and 3-way match
- [ ] Vendor bills and payables
- [ ] Aged payables report
- [ ] Bank reconciliation workspace
- [ ] Advanced financial reports (Aged Receivables, General Ledger drill-down)
- [ ] Document library

### Phase 4 — Advanced & Intelligence *(Weeks 29–40)*
- [ ] Point of Sale (POS) module
- [ ] Project & time tracking module
- [ ] Billable hours → invoice workflow
- [ ] Custom report builder
- [ ] Automations engine (no-code rule builder)
- [ ] Client invoice portal (pay online)
- [ ] Flutterwave / Paystack payment integration
- [ ] Regent PM integration (sync tasks and time entries)
- [ ] Regent CAD integration (link clients, deals, revenue)
- [ ] Cash flow forecasting
- [ ] AI insight cards (Claude API)
- [ ] Receipt OCR
- [ ] Kenya, Tanzania, Rwanda payroll tax engines
- [ ] Multi-currency full support
- [ ] Scheduled report delivery
- [ ] Webhooks and API access

### Phase 5 — Scale & Ecosystem *(Ongoing)*
- [ ] Mobile app (React Native or PWA)
- [ ] Recruitment module
- [ ] Biometric attendance integration
- [ ] Advanced AI: revenue forecasting, anomaly detection, demand planning
- [ ] URA VAT return integration (direct filing)
- [ ] Bank feed integration (open banking / bank API partnerships)
- [ ] White-label tier
- [ ] Enterprise SSO / SAML
- [ ] Community template library
- [ ] Accounting software data migration (QuickBooks, Xero, Wave — import wizard)

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Performance** | Dashboard < 2s load. Large report queries < 5s. Invoice PDF generation < 3s. |
| **Data Accuracy** | Double-entry accounting must always balance. Any imbalance is a critical bug. |
| **Auditability** | Every write operation (create, update, delete) is logged with user ID, timestamp, changed fields, and old/new values. Non-negotiable — required for financial compliance. |
| **Security** | RLS on every table. JWT validation on every API call. No cross-tenant data access under any query path. |
| **Encryption** | Data encrypted at rest (AES-256) and in transit (TLS 1.3). |
| **Availability** | 99.9% uptime SLA. Planned maintenance windows communicated 48h in advance. |
| **Scalability** | Designed for orgs with 1,000 invoices/month, 50,000 transactions/year, 200 employees. PostgreSQL query performance validated at this scale before launch. |
| **Backups** | Automated daily backups. Enterprise: point-in-time recovery (PITR) to any minute in the past 30 days. |
| **PDF Fidelity** | PDFs must render identically across all viewers (no font substitution, no layout shifts). Tested on Acrobat, Chrome, iOS Files, and Android. |
| **Offline** | Graceful degradation — show cached data when offline, queue write actions, sync on reconnect. Critical for markets with intermittent connectivity. Phase 3. |
| **Accessibility** | WCAG 2.1 AA on core flows. Keyboard-navigable data tables. |
| **Compliance** | GDPR-aware data model. Data export and deletion on request. Local data retention rules considered per market. |

---

## 11. Integrations Roadmap

| Integration | Purpose | Priority |
|---|---|---|
| **Regent CAD** | Link clients, deals, and revenue pipeline | P0 — Phase 4 |
| **Regent PM** | Sync projects, tasks, and billable time entries | P0 — Phase 4 |
| **Resend** | Transactional email (invoices, payslips, notifications) | P0 — Phase 1 |
| **Flutterwave** | Online invoice payment (cards, mobile money) | P1 — Phase 4 |
| **Paystack** | Online payment (Kenya, Ghana, Nigeria) | P1 — Phase 4 |
| **MTN MoMo API** | Direct mobile money payment collection | P1 — Phase 4 |
| **Airtel Money API** | Direct mobile money payment collection | P1 — Phase 4 |
| **WhatsApp Business** | Invoice delivery, payment reminders, notifications | P1 — Phase 4 |
| **Google Drive** | Attach Drive files to records, auto-backup docs | P2 — Phase 4 |
| **Google Calendar** | Leave calendar sync, payroll run dates | P2 — Phase 4 |
| **Slack** | Notifications for approvals, payments, alerts | P2 — Phase 4 |
| **URA API** | VAT return direct filing (Uganda) | P2 — Phase 5 |
| **Open Banking / Bank Feeds** | Auto-import bank transactions | P2 — Phase 5 |
| **Zapier / Make** | Custom automation with 1000+ external tools | P2 — Phase 4 |
| **QuickBooks / Xero** | Data migration (import existing records) | P3 — Phase 5 |
| **Anthropic Claude API** | AI insights, smart categorisation, forecasting | P1 — Phase 4 |
| **Open API (REST + Webhooks)** | Custom integrations for enterprise clients | P1 — Phase 4 |

---

## 12. Monetisation & Plans

| Plan | Target | Key Limits | Price Signal |
|---|---|---|---|
| **Free** | Sole traders, very small businesses | 1 user, 5 invoices/month, accounting only, no HR/inventory, 500MB storage | $0 |
| **Starter** | Small businesses (1–10 employees) | 3 users, unlimited invoices, accounting + basic HR + client directory, 5GB storage, no payroll | ~$15–25/mo flat |
| **Growth** | Growing SMEs (10–50 employees) | 10 users, all finance modules, HR + payroll (up to 20 employees), inventory, 20GB storage, basic automations | ~$50–80/mo flat |
| **Business** | Established businesses (50–200 employees) | Unlimited users, all modules, unlimited payroll, POS, projects + time tracking, advanced reporting, automations, API access, 100GB storage | ~$120–200/mo flat |
| **Enterprise** | 200+ employees, multi-branch | Custom pricing, SLA, custom integrations, data residency, dedicated onboarding, unlimited storage | Custom |

**Pricing notes:**
- Flat monthly pricing (not per-seat) makes budgeting predictable for SMEs
- Annual plan at 20% discount
- Payroll add-on: charge per payslip generated above plan limit (e.g. $0.50/payslip above 20)
- Regent Ecosystem bundle: Axis + PM + CAD at 25% discount vs individual pricing
- Non-profit and education pricing available on request
- 14-day free trial on Growth and Business, no credit card required

---

## 13. Open Questions & Decisions

- [ ] **Flat vs per-seat pricing** — Flat monthly pricing is friendlier for SMEs but harder to scale revenue with. Per-seat rewards growth. Final call needed before Phase 1 launch.
- [ ] **Double-entry exposure** — Do we show debits/credits explicitly in the UI, or abstract the accounting and only show it in reports? Accountants want the former; business owners want the latter. Solution: default to abstractions, "Accountant Mode" toggle reveals raw ledger.
- [ ] **Payroll scope at launch** — Uganda only, or Uganda + Kenya simultaneously for Phase 2? Kenya requires different PAYE bands, NHIF, NSSF 2. Significant extra work but doubles addressable market immediately.
- [ ] **POS in Phase 4 or separate product** — POS is a significant UX departure. Is it a module in Axis, or does it deserve a separate lightweight app that syncs to Axis for accounting?
- [ ] **Multi-currency in Phase 1 or Phase 3** — Essential for businesses with international clients but adds significant complexity (exchange rate management, realised/unrealised gains/losses). Decide early.
- [ ] **PDF engine** — Puppeteer on server requires a headless Chromium instance (non-trivial on Vercel). Alternatives: React-PDF (all client-side, easier to maintain), pdfkit (Node), or a PDF API service. Decision affects invoice quality ceiling.
- [ ] **Offline-first scope** — Full offline (service workers + local SQLite) is architecturally very heavy. Is graceful degradation (show last-cached data + queue writes) sufficient for our market, or do we need true offline for inventory/POS?
- [ ] **Receipt OCR timing** — Mindee vs Google Vision vs AWS Textract vs open-source (Tesseract). Cost and accuracy trade-offs. Defer to Phase 2 but decide API vendor before then.
- [ ] **Employee self-service: separate subdomain or embedded** — employees.axis.app vs a /portal route in the main app? Separate subdomain is cleaner for branding and access control.
- [ ] **AI feature gating** — Are AI insight cards a premium feature (Business and above) or available on all plans to drive upgrade conversion?
- [ ] **URA integration priority** — Direct VAT filing with URA would be a major differentiator in Uganda. How much effort, and when does it get prioritised?
- [ ] **White-label timeline** — Several Regent consulting clients could use a white-labeled Axis. Does this come before or after the public product reaches stability?

---

*Regent Systems — Internal Product Document*  
*Axis is part of the Regent Ecosystem alongside CAD (CRM/acquisition), PM (project management), and Forge (CMS/data infrastructure).*
