# Axis Business Hub — Overhaul Changelog (2026-08-18)

## Navigation fixes
- **Sidebar rebuilt** (`components/layouts/AppSidebar.tsx`): added a collapsible
  "Finance" group linking to Chart of Accounts, Banking, and General Ledger —
  these pages existed with full Supabase wiring but had no nav entry.
- Fixed `/settings` — was a dead link (only `/settings/tax-rates` existed).
- Removed the `/analytics` nav link — no page existed for it and it wasn't in
  the V1 roadmap; rather than fake a page, the link was removed.
- Active-state highlighting added throughout (leaf links and group headers).

## New pages
- `app/not-found.tsx` — styled 404 page (previously the Next.js default).
- `app/error.tsx` — global error boundary with retry.
- `app/(dashboard)/settings/layout.tsx` — tabbed settings shell.
- `app/(dashboard)/settings/page.tsx` — Organisation profile (read + edit,
  real Supabase read/update).
- `app/(dashboard)/settings/connections/page.tsx` — Connections/integrations
  panel. Honestly labeled "Coming Soon" per the V1 roadmap rather than faking
  working integrations (Resend, Flutterwave, WhatsApp, Calendar, Webhooks, API
  keys are all listed as planned, not connected).
- `app/(dashboard)/settings/team/page.tsx` — real org members list, pulled
  from `organisation_members` joined with `profiles`.

## Real data wired in (previously hardcoded)
- **Dashboard home** (`app/(dashboard)/page.tsx`): stat cards, revenue chart,
  and recent activity feed were 100% mock data. Now computed from real
  Supabase data via a new `useDashboardSummary` hook:
  - Revenue this month (from posted journal entries, revenue accounts)
  - Active client count
  - Outstanding invoice count + total
  - Net profit (revenue − expenses from journal entries), with month-over-month
    % change
  - Revenue chart: real monthly totals from paid/partial invoices, last 6 months
  - Recent activity: merged, time-sorted feed of real invoices + new clients
- **Tax Rates** (`app/(dashboard)/settings/tax-rates`): was a hardcoded array
  despite `useTaxRates`/`useCreateTaxRate` hooks already existing and working.
  Now fully wired, with a working "Add Tax Rate" dialog.
- **Employees** (`app/(dashboard)/employees`): was a hardcoded array, and no
  `employees` table existed. Added:
  - New migration `supabase/migrations/20260817000001_employees_foundation.sql`
    (table + RLS, matching existing schema conventions)
  - `lib/employees/queries.ts`, `hooks/employees/use-employees.ts` — read-only,
    matching your instruction to keep this UI-focused for now
  - Real list view with client-side search; Add/Edit/Terminate actions are
    present in the UI but intentionally disabled (no schema-side mutation
    logic yet — this matches Phase 3 of the V1 roadmap, which explicitly
    scopes full HR workflows as a later phase)

## Visual polish
- Palette: kept the existing axis-blue identity as requested, added a couple
  of supporting tokens (`axis-blue-light`, `axis-amber`) for richer status
  badges without changing the core brand color.
- Settings, Employees, and Dashboard views brought in line with the existing
  card/table/badge conventions already used in Clients/Invoices/Finance.

## ⚠️ Action required before running
1. **Run the new migration** against your Supabase project:
   `supabase/migrations/20260817000001_employees_foundation.sql`
   (creates the `employees` table + RLS policies)
2. `npm install` (network was unavailable in the build sandbox, so
   dependencies were not reinstalled/verified — package.json was not changed,
   so this should be a clean install)
3. `npm run build` to catch any TypeScript issues in your actual environment
   before deploying — all new code was written against the exact types and
   query patterns already in your codebase, but I couldn't run a live
   compiler in this session.

## Deliberately not done (flagging so nothing looks silently skipped)
- Employee create/edit/terminate mutations — UI-only per your instruction.
- Real third-party integrations (email, payments, WhatsApp, etc.) — the V1
  roadmap marks these as unbuilt; the Connections page reflects that honestly
  rather than simulating fake working integrations.
- A `/finance` index page — the Finance sidebar entry is a pure
  expand/collapse group (not a link), so no orphaned index page was needed.
