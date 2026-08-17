# Regent Axis — V1 Roadmap (Done-for-You ERP)

**Status:** Active build plan
**Supersedes:** Old `PLAN.md` in the axis-business-hub repo (40-week SaaS-scale roadmap — kept for historical reference only, not to be followed)
**Model:** Done-for-you service (base retainer + per-client setup fee), not self-serve SaaS
**Window:** 2-3 months, no fixed deadline — paced by Trevix/Next Level retainers covering runway in the meantime

---

## 1. Positioning (agreed)

Axis is **not** being built as a QuickBooks/Zoho competitor priced to match them. It is a done-for-you business operations system, sold with setup + onboarding + an ongoing retainer, to a small number of known-relationship clients. Pricing floor: ~$140/mo (~520,000 UGX) base retainer, scaled up with a per-client setup fee based on actual scope/complexity — not flat across clients.

Target clients (all warm contacts, no pitches made yet):
- **Tekowa Engineering** — basic ledger/bookkeeping, replacing an Excel-based "60 Minute Business Ledger" workflow
- **Excom Security** (South Sudan) — ledger + client management (they serve companies/individuals) + HR/employee management + equipment/weapons asset tracking, linked to employees
- **Etihad** (auto company, South Sudan) — ledger + client management (institutions + individuals) + vehicle asset tracking (VIN, condition, lifecycle — closer to Excom's asset model than Next Level's retail stock)

Internal testing clients (already Solomon's own businesses):
- **Trevix Media** — core ledger/finance testing
- **Next Level Store** — core ledger/finance + retail inventory + HR/shift testing (only test case with shift-based staffing)

**Scope discipline:** Build for known, current needs of these five businesses. Do not pre-build speculative features for "what a client might want later." Confirm actual requirements with Excom/Etihad/Tekowa before adding anything beyond what's outlined here.

---

## 2. Actual Codebase State (verified by direct code inspection, not the old plan doc)

### Real and wired end-to-end
| Module | Evidence |
|---|---|
| Auth | Real Supabase `signInWithPassword` calls, working login/signup |
| Multi-tenant orgs | Org switching, RLS-backed schema |
| Clients | `ClientsList.tsx` calls real `useClients(orgId)` hook → live Supabase data |
| Invoices | `InvoicesList.tsx` calls real `useInvoices(orgId)` hook → live Supabase data |
| Chart of Accounts | `AccountsList.tsx` calls real `useAccounts(orgId)` hook → live Supabase data |
| Invoice PDF generation | Real Supabase Edge Function (`generate-invoice-pdf`) |

### Schema/query layer exists, but page UI still shows mock data
| Module | Evidence |
|---|---|
| Transactions | `transactions/page.tsx` has hardcoded array, not calling any hook |
| Ledger (journal entries) | `finance/ledger/page.tsx` has hardcoded array |
| Banking | `finance/banking/page.tsx` has hardcoded array |
| Tax Rates | `settings/tax-rates/page.tsx` has hardcoded array (deprioritized anyway — see §4) |
| Dashboard widgets | RevenueChart, InventoryStatus, RecentActivity, TopProducts all render mock data |

### Does not exist yet — needs to be designed and built
| Module | Notes |
|---|---|
| Employee/HR module | `employees/page.tsx` is a stub with a hardcoded array; no schema, no shift/attendance logic |
| Item-tracking core (inventory + assets) | No table, no schema, no queries anywhere in the codebase |

**Bottom line:** the financial core (accounts, clients, invoices, auth, multi-tenancy) is genuinely solid — not a rebuild. What remains is (a) wiring four pages from mock to real data, and (b) designing and building two genuinely new modules.

---

## 3. Core Architectural Decision: One Item-Tracking Model, Multiple Views

Next Level Store (retail stock), Excom (weapons/equipment custody), and Etihad (vehicle lifecycle) all need "inventory" — but these are not the same shape of problem:

- **Next Level (retail):** SKU, cost/sale price, quantity on-hand, reorder threshold, tied to sales/invoicing
- **Excom (asset custody):** item issued to / returned from a specific employee, condition, serial number, maintenance history — custody-tracking, not stock-counting
- **Etihad (asset lifecycle):** VIN, condition, mileage, registration, status through acquisition → prep → listing → sale/lease → service

**Decision:** Build one flexible underlying `items` data model (item, quantity, location/custody, status) with different UI/workflow views layered on top per use case:
- A **stock view** (Next Level): deplete on sale, reorder alerts
- A **custody view** (Excom): issue/return workflow, linked to employee records
- A **lifecycle view** (Etihad): status-stage tracking, linked to client records for sale/lease

This avoids building three unrelated inventory systems. The custody view depends on the HR module (employee records) existing first.

---

## 4. Explicitly Out of Scope for V1

- **Tax calculation logic** — Uganda's system is annual/fixed; South Sudan's is not codified with clear boards/laws. Not worth building rigid logic against unstable ground. Revisit later if a client specifically needs it.
- **Self-serve signup, public pricing page, self-service billing** — this is a done-for-you engagement model, not a SaaS product, for now. Multi-tenant architecture stays clean enough to support this later without a rebuild.
- **POS, procurement/vendor management, payroll automation, automations/workflow engine** — all present in the old PLAN.md's 40-week vision; none needed for the five current businesses. Do not build ahead of demonstrated need.
- **Full accounting/tax compliance suite** (as imagined in old PLAN.md) — out of scope; this is not being positioned as a QuickBooks replacement.

---

## 5. Build Sequence

### Phase 1 — Finish Wiring the Core
Goal: everything that already has a schema/query layer actually renders real data.
- [x] Wire `transactions/page.tsx` to real transaction/journal data — now `TransactionsView`, classifies each journal entry as income/expense by joined account category, backed by `useJournalEntries`
- [x] Wire `finance/ledger/page.tsx` to real journal entries — now `LedgerView`, backed by `useJournalEntries`, "New Journal Entry" wired to existing `JournalEntryForm`
- [x] Wire `finance/banking/page.tsx` to real bank account data — now `BankingView`, backed by `useBankAccounts`, "Add Account" wired to existing `BankAccountForm`
- [ ] Wire dashboard widgets (RevenueChart, RecentActivity) to real aggregated data
- [ ] Verify Clients/Invoices/Accounts pages handle real-world data cleanly (edge cases, empty states, error states)
- [x] Confirm client management UI needs no further schema changes — confirmed sufficient as-is
- [ ] Compute real running balance for bank accounts (currently shows placeholder — balance must be derived from the linked GL account's journal entries; not yet implemented, flagged in code)

**Exit criteria:** Trevix and Next Level Store's real transactions can be entered and reported on accurately, end to end, with no mock data remaining in the core financial flow.

### Phase 2 — Item-Tracking Core
Goal: one flexible schema + the retail stock view (fastest to validate, testable on Next Level Store immediately).
- [ ] Design `items` table (item, quantity, location/custody state, status, metadata)
- [ ] Build stock view: add/remove stock, cost/sale price, low-stock indication
- [ ] Wire `InventoryStatus.tsx` dashboard widget to real data
- [ ] Test against Next Level Store's actual accessories/stationery inventory

**Exit criteria:** Next Level Store's real stock can be tracked and depletes correctly against real sales.

### Phase 3 — HR / Employee Module
Goal: employee records + shift/attendance, built for known needs (not speculative future needs).
- [ ] Design employee records schema (name, role, contact, status, etc.)
- [ ] Build shift/roster scheduling
- [ ] Build attendance tracking
- [ ] Test against Next Level Store's actual shift-based staff (only current business with shift staffing)

**Exit criteria:** Real employee shifts for Next Level Store can be scheduled and attendance recorded.

### Phase 4 — Custody/Lifecycle Views on Item-Tracking Core
Goal: extend the Phase 2 core to support Excom's and Etihad's asset-tracking needs, now that HR (employee linking) exists.
- [ ] Build custody view: issue/return workflow, item ↔ employee linking (for Excom's future use)
- [ ] Build lifecycle view: status-stage tracking, item ↔ client linking (for Etihad's future use)
- [ ] These are informed by actual conversations with Excom/Etihad before finalizing — do not assume requirements

**Exit criteria:** Ready to demo relevant view once each client's actual needs are confirmed.

### Phase 5 — Dogfooding & Hardening
- [ ] Run Trevix and Next Level Store on the live system for real day-to-day use, not just test data
- [ ] Fix any calculation/data-integrity issues found in real usage (financial accuracy is the highest-trust-risk area)
- [ ] Polish UI/UX pass across all wired modules

**Exit criteria:** Solomon is comfortable demoing the system live, on real data, without caveats.

### Phase 6 — Pitch Prep
- [ ] Confirm actual requirements with Tekowa, Excom, Etihad (do not build further based on assumption before this)
- [ ] Scope any final gaps specific to each client's confirmed needs
- [ ] Prepare setup fee + retainer pricing per client based on real scope discussed
- [ ] Pitch, using Trevix/Next Level as live proof rather than a synthetic demo

---

## 6. Parallel Track (Not Blocking the Above)

- Formalize retainer agreements with **Trevix** and **Next Level Store** for the work already being done for them — this can start immediately and helps cover the ~500k UGX/month floor without depending on external client closes.

---

## 7. Open Items to Revisit Later (Not Now)

- Self-serve tier (small business / solo entrepreneur segment) — a real future direction, matches the "hybrid" model discussed, but not built until the done-for-you track is proven with the first 3-5 clients.
- Payment infrastructure / payment gateway aggregation — explicitly parked as a future project once Regent has revenue and legal/compliance runway (BOU Payment Systems licensing applies in Uganda). Not part of Axis v1.
- Tax logic for Uganda/South Sudan — revisit only if a specific paying client requires it.
