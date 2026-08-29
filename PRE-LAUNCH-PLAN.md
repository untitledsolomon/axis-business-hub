# Axis — Pre-Launch Plan

**Status:** Active build plan
**Audience:** Any agent (or person) picking up a task from this file
**Relationship to other docs:** `Axis V1 Roadmap.md` covers what modules exist and
why. This file covers what has to happen to the *existing, working* app before
real client money goes through it. Do not re-derive scope from first principles —
everything below was scoped from direct code inspection, not assumption.

---

## 0. Ground rules for any agent working from this file

1. **The app currently builds clean and passes lint with 2 warnings.** That is
   the baseline. Any task you complete must still result in a clean
   `npm run build`. If a task leaves the build broken, the task is not done.
2. **Do not touch RLS policies as a side effect of an unrelated task.** Every
   table currently has correctly-scoped RLS (org-membership joins, role
   gating on writes). If a task requires a schema change, write a new
   migration — never edit an existing shipped migration file.
3. **Never hardcode `/ 100` or `* 100` against a money column.** Use
   `toMinorUnits` / `toMajorUnits` / `formatMoney` from `lib/currency.ts`.
   This exact mistake is already loose in two files (see Task 6) — do not
   reintroduce it elsewhere.
4. **One task, one PR/patch.** Tasks below are scoped to be independently
   shippable. Don't bundle unrelated tasks even if they touch the same file —
   makes review and rollback harder.
5. **If a task says "confirm" or "decide," it is not a code task until that
   decision is made.** Do not silently pick an answer and ship it — surface
   the decision to Solomon first.
6. **Every task lists the files it's expected to touch.** If completing a
   task requires touching a file not listed, stop and check whether the task
   is scoped correctly before proceeding — that's usually a sign the task
   boundary was wrong, not that it's fine to expand.
7. **Read the file before editing it.** Several of these touch code that has
   deliberate, load-bearing comments explaining *why* something looks wrong
   at first glance (e.g. the middleware's `getSession()` choice, the CSP
   origin list). Don't "fix" something back to the more obvious version
   without reading why it isn't that way already.

---

## 1. Security & Infrastructure Hardening

### 1.1 Resolve the 3 high-severity `npm audit` vulnerabilities
- **Files:** `package.json`, `package-lock.json`
- **What:** `postcss` and `sharp` vulnerabilities are inherited from Next.js's
  bundled deps. Fix path is `next@16`, which is a breaking major version
  change.
- **Do:**
  1. Do NOT run `npm audit fix --force` blind — it will bump Next major
     version and can break the build silently in ways `npm run build` alone
     might not catch (App Router behavior changes).
  2. Spike the Next 16 upgrade on a branch. Run full `npm run build`,
     manually click through auth, invoicing, and billing flows against a
     real (or staging) Supabase project — these are the three flows with the
     most middleware/SSR surface area.
  3. If the upgrade is clean, ship it as its own PR, nothing else bundled in.
  4. If it's not clean within a reasonable time-box, report back with what
     broke — do not force it through under deadline pressure. This is a
     decide-with-Solomon fallback if the upgrade proves nontrivial.
- **Do not:** silently downgrade `postcss`/`sharp` standalone — they're
  transitive deps of `next`, pinning them separately will desync from what
  Next actually ships and expects.

### 1.2 Add HSTS header ✅
- **File:** `next.config.ts`
- **What:** CSP already has `upgrade-insecure-requests`; add
  `Strict-Transport-Security` to the same `headers()` array, alongside the
  existing `X-Frame-Options` / `X-Content-Type-Options` entries.
- **Do:** `value: "max-age=63072000; includeSubDomains; preload"` is the
  standard production value. Confirm the deployed domain is HTTPS-only
  end-to-end before adding `preload` (it's a one-way door via the HSTS
  preload list) — if unsure, ship without `preload` first.
- **Do not:** touch the existing CSP directive string or the Paddle/PostHog
  origin constants above it — those have inline comments explaining exactly
  why each origin is there; HSTS is a separate header object in the same
  array, not a modification to CSP.

### 1.3 Decide: `getSession()` vs `getUser()` in middleware ✅
- **File:** `lib/supabase/middleware.ts`
- **What:** This is a decision task, not a code task. Current code
  deliberately uses `getSession()` (local JWT check, no live revocation
  check) instead of `getUser()` (network call, live revocation check) — this
  was a prior fix for a login-loop bug caused by `getUser()` timing out under
  edge-to-Supabase latency. The tradeoff: a revoked/banned session stays
  valid until JWT expiry.
- **Do:** Confirm with Solomon whether this tradeoff is acceptable for
  launch. If not, the fix is NOT "just swap back to `getUser()`" — that
  reintroduces the login-loop bug. The real fix is a bounded timeout + graceful
  fallback (e.g. `Promise.race` against a short timeout, falling back to the
  JWT-only check only if the network call doesn't resolve in time) so you get
  live revocation checking on the common path without the timeout failure
  mode. This is nontrivial — scope it as its own task once the decision is
  made, don't fold it into a "quick fix."
- **Do not:** revert this file to `getUser()` without the timeout-guard
  rework. That is a regression, not a fix.

### 1.4 Clean up repo root clutter ✅
- **Files:** all `*.patch` files at repo root, `*.webp` files at repo root,
  `PLAN.md`, `CHANGELOG-2026-08-18.md`, `reports/*.md`,
  `posthog-mcp-analytics-report.md`, `posthog-warehouse-report.md`
- **Do:** Move everything historical into `/docs/archive/`. Do not delete
  `Axis V1 Roadmap.md`, `README.md`, or this file — those stay at root.
  `PLAN.md` specifically is explicitly superseded per the roadmap doc's own
  header — archive it, don't delete it (historical reference value).
- **Do not:** delete the `.patch` files outright without confirming none of
  them represent unapplied/pending work — check each one's subject line
  against current code state first. If a patch's changes are already present
  in the working tree, it's safe to archive. If not, flag it instead of
  archiving it silently.

### 1.5 Remove real-looking Paddle price IDs from `.env.example` ✅
- **File:** `.env.example`
- **Do:** Replace the `pri_01m11ca5...`-style values with obviously fake
  placeholders (e.g. `pri_your_starter_monthly_price_id`).
- **Do not:** change the real values anywhere they're actually used
  (Paddle dashboard, deployed env vars) — this task only touches the
  committed example file.

---

## 2. Code Quality

### 2.1 Fix `exhaustive-deps` lint warnings ✅
- **Files:** `components/inventory/ItemForm.tsx` (line ~104, missing
  `baseCurrency` dep), `components/invoicing/InvoicesList.tsx` (line ~92,
  missing `toBase` dep)
- **Do:** Both involve currency conversion — do not just add the dep to
  silence the warning without checking whether adding it changes the
  effect's actual behavior (e.g. causes a re-run loop, or fixes a real
  staleness bug where currency conversion was using a stale rate). Test
  manually with a non-base-currency org after the change.
- **Do not:** add `// eslint-disable-next-line` to suppress these instead of
  fixing them — currency math is exactly the category of bug this rule
  exists to catch.

### 2.2 Check if `date-fns` is still needed ✅
- **Files:** `package.json`
- **Do:** `grep -r "from 'date-fns'" --include="*.ts" --include="*.tsx"` (or
  equivalent) across the repo. There is a historical patch
  (`0011-Replace-date-fns-with-dependency-free-Intl.DateTimeF.patch`) titled
  as if this was already fully migrated away. If zero real imports remain,
  remove the dependency. If some remain, leave it and note where.
- **Do not:** remove the dependency if any import still resolves to it —
  confirm with a full grep, not a spot check.

### 2.3 Add test coverage for financial invariants
- **Files:** new test files, location TBD by whatever test runner gets
  chosen (none currently configured — check `package.json` first, there is
  none at time of writing)
- **What:** Zero automated tests exist currently. Do not attempt full
  coverage — prioritize:
  1. `create_journal_entry_v1` RPC — debits always equal credits, entries
     always balance
  2. Invoice status transitions (draft → sent → paid, void/delete paths) —
     these have had two prior desync bugs (see 2.4)
  3. Ledger/sub-ledger reconciliation stays consistent after void/delete
- **Do:** Set up the test runner as its own first commit (likely Vitest,
  given `vitest.config.ts` already exists in the sibling regent-website
  repo — check if there's a reason to match that choice for consistency).
  Then add tests incrementally, one invariant per commit.
- **Do not:** treat this as blocking every other task in this file — this
  can run in parallel with everything else. It blocks *launch*, not other
  pre-launch work.

### 2.4 Structural fix for recurring ledger/sub-ledger desync
- **Files:** likely a new migration under `supabase/migrations/`, plus
  whichever RPC/mutation path is found to be the remaining gap
- **What:** This exact bug class has recurred twice already
  (`0001-fix-finance-close-remaining-ledger-sub-ledger-desync.patch` and
  `20260826000002_fix_void_and_delete_ledger_desync.sql`). Patching the
  symptom a third time is not the goal — find the structural gap.
- **Do:** Investigate whether a DB-level constraint, trigger, or a
  reconciliation check (e.g. a function that can assert ledger totals match
  sub-ledger totals, runnable both as a test and as a periodic health check)
  can make this invariant enforced rather than hoped-for. This is
  investigation-first — do not write a third one-off patch without first
  understanding why the first two didn't close the gap for good.
- **Do not:** ship this without the test from 2.3 covering the specific
  scenario that caused the prior two bugs (void an invoice, delete an
  invoice) — otherwise there's no regression protection.

---

## 3. Paywall & Trial Redesign

**Read this whole section before touching any file in it — the four tasks
below are sequenced and some depend on decisions made in earlier ones.**

### 3.1 Decide: trial semantics ✅
- **Decision task, not code.** Confirm with Solomon before 3.2–3.4:
  - Does every new org get a trial automatically at signup (no card
    required), or does the trial only start once a plan is selected?
  - Trial length — currently "7-day free trial" is hardcoded as button copy
    in `components/Paywall.tsx` with no visible trial-start logic tied to
    it. Confirm 7 days is still correct and that trial start is actually
    wired somewhere (check `subscriptions` table / Paddle trial handling in
    `app/api/paddle/webhook/route.ts` — `SubscriptionTrialing` event exists,
    but confirm this is reachable without requiring checkout first, which
    contradicts "no card required").

### 3.2 Rebuild `EntitlementGate` — remove full-page paywall block ✅
- **Files:** `components/billing/EntitlementGate.tsx`,
  `components/Paywall.tsx`, `hooks/useAxisPro.ts`
- **What:** Current behavior: `EntitlementGate` wraps the entire
  `(dashboard)` layout and fully replaces all children with the pricing
  cards whenever `isProUser` is false. No browse-only state exists.
- **Do:**
  1. `useAxisPro` currently returns a single boolean. This needs to become a
     richer state: `active` / `trialing` / `expired_readonly` / `no_org` (at
     minimum) — not just true/false. Check what `subscriptions.status`
     values already exist in the schema before inventing new ones.
  2. `EntitlementGate` should render `children` (the actual page) in all
     states except perhaps `no_org` — expiry/no-plan should NOT replace the
     page content. Where it currently returns the full-page `<Paywall />`,
     it should instead let the page render and rely on Task 3.3 for the
     read-only enforcement and Task 3.4 for the upsell surface.
  3. `Paywall` itself doesn't need to change shape — it's still the right
     component for an intentional "choose a plan" moment (e.g. settings/billing
     page) — it just stops being the thing that replaces the whole app.
- **Do not:** remove the `/onboarding` and `/settings` exemption logic
  (`exempt` variable) — that's unrelated and still needed regardless of the
  trial/paywall redesign.
- **Do not:** touch `app/(dashboard)/layout.tsx`'s structure beyond how
  `EntitlementGate` is used — this task is about what the gate *does*, not
  where it sits.

### 3.3 Enforce read-only after trial/plan expiry ✅
- **Files:** TBD — likely a shared hook (e.g. `useCanEdit()` or similar)
  consumed by every create/edit/delete action across Clients, Invoices,
  Finance, Inventory, Employees modules. Do not create fifteen separate
  local checks.
- **What:** Per Solomon's decision — expired orgs get read-only access, not
  full lockout. "Read-only" means: can view existing data, cannot create,
  edit, delete, or trigger financial-impacting actions (posting journal
  entries, sending invoices, changing status).
- **Do:**
  1. Client-side: disable/hide the relevant buttons and forms when the
     shared hook reports expired.
  2. **Server-side / RLS-side: this is not optional.** Client-side disabling
     alone is not enforcement — add the actual write-blocking at the RLS
     policy or RPC level (e.g. `create_journal_entry_v1` and other mutating
     RPCs should check org entitlement status, not just role). This mirrors
     how role-gating already works in existing RLS policies (see
     `supabase/migrations/20260420000001_finance_foundation.sql` for the
     existing pattern of role-gated `FOR ALL` policies — entitlement gating
     should follow the same shape, added as a new migration, not by editing
     that file).
- **Do not:** rely on client-side gating alone. This is a financial app —
  every write path must be enforced at the DB/RPC layer, matching the
  standard already set by RLS elsewhere in this codebase.

### 3.4 Add data export for expired/read-only orgs ✅
- **Files:** likely extends `components/finance/ReportsView.tsx`'s existing
  CSV export pattern (it already has CSV export logic for P&L/balance
  sheet/trial balance — reuse that pattern rather than inventing a new one),
  plus new export surfaces for Invoices, Transactions, Chart of Accounts if
  they don't already have one
- **What:** Available even in the expired/read-only state established in
  3.3 — this is explicitly the one thing that should still work when
  everything else is locked down.
- **Do:** Confirm export access is NOT blocked by whatever entitlement check
  gets added in 3.3 — it should be explicitly excluded from the write-lock,
  not just "read" implying it's fine (audit each export code path
  individually).
- **Do not:** build this before 3.3 lands — it depends on the same
  entitlement-state hook to know when to surface itself prominently (e.g. an
  "export your data" banner shown specifically in the expired state).

### 3.5 Fix dashboard's `+100%` fallback display ✅
- **File:** `hooks/dashboard/use-dashboard-summary.ts`, line ~138
  (`pctChange` function)
- **What:** When there's no prior period to compare against (`prev === 0`),
  the function currently returns a hardcoded `100`, which the UI displays as
  "+100%" — misleading for a new org or first month of data.
- **Do:** Change the return type/contract so the UI can distinguish "no
  comparison available" from "actually grew 100%" — e.g. return `null` from
  `pctChange` when `prev === 0`, and have the consuming component render
  "New" or "—" instead of a percentage. Check every call site of this
  function/hook before changing its return shape.
- **Do not:** just clamp or change the fallback number (e.g. to `0`) — that
  has the same underlying problem (implies a real, specific number when
  there isn't one). Fix the semantics, not the value.

---

## 4. Analytics & Reports — Currency Bug

**This is a correctness bug, not a polish item. Sequence it early — it
affects real numbers Solomon and clients will look at.**

### 4.1 Fix hardcoded `/100` in `AnalyticsView.tsx` ✅
- **File:** `components/finance/AnalyticsView.tsx`
- **What:** 5 hardcoded `x / 100` divisions (lines ~40, ~43, ~98–100, ~118,
  ~122) predate the schema change described by Solomon (values used to be
  stored as `value × 100`; they are now stored as `value` directly) and
  were never migrated to the canonical currency helpers.
- **Do:**
  1. Replace every `x / 100` in this file with `toMajorUnits(x, currencyCode)`
     from `lib/currency.ts`.
  2. This requires the org's `base_currency` (or whatever the correct
     per-row currency is — check whether Analytics aggregates are always in
     org base currency or can span currencies) to be in scope at each call
     site. Thread it through props/hook return values as needed.
  3. Read `lib/currency.ts`'s file-header comment before starting — it
     explains why this exact mistake (hardcoded `/100`) is wrong for UGX
     specifically (0 minor-unit digits) independent of the recent data
     format migration.
- **Do not:** assume all orgs are USD — UGX-denominated orgs would have had
  wrong Analytics numbers even under the old data format, not just after the
  migration. Verify the fix against both a UGX and a USD test org if
  possible.

### 4.2 Fix hardcoded `/100` in `ReportsView.tsx` ✅
- **File:** `components/finance/ReportsView.tsx`
- **What:** 12 hardcoded `x / 100` divisions across the P&L, balance sheet,
  and trial balance views/exports (lines ~28, ~113–117, ~232–237, ~372–375).
- **Do:** Same fix as 4.1 — replace with `toMajorUnits`/`formatMoney` as
  appropriate for display vs. CSV export contexts.
- **Do not:** touch `components/invoicing/InvoiceForm.tsx`'s two `/100`
  occurrences (lines ~141, ~175) — those are tax-rate *percentage* math
  (`rate / 100` to convert a percentage to a decimal multiplier), completely
  unrelated to the minor-units bug. Leave them alone.

### 4.3 Sweep for any other stray `/100` or `*100` against money fields ✅
- **Files:** whole repo
- **Do:** After 4.1 and 4.2 land, grep the full `app/`, `components/`,
  `hooks/`, `lib/` trees for `/ 100` and `* 100` again. Anything touching a
  money column (invoices, expenses, daily_sales, journal entry
  debit/credit, account balances) that isn't already going through
  `lib/currency.ts` is a bug of the same class. `components/auth/
  auth-showcase-panel.tsx`'s two `/100` uses are unrelated (SVG chart
  coordinate math, not money) — confirmed not in scope, don't touch.
- **Do not:** do this sweep before 4.1/4.2 are done and confirmed working —
  it's meant to catch anything those two didn't cover, not replace them.

### 4.4 Broaden Analytics page scope ✅
- **File:** `components/finance/AnalyticsView.tsx`
- **What:** Once 4.1 is fixed, separately consider: current page is thin
  (revenue trend, a couple of small charts) relative to what QuickBooks/Zoho
  offer. This is a scope/design task, not just a bugfix.
- **Do:** Treat as its own follow-up project — scope with Solomon what to
  add (aging receivables detail, expense breakdown by category, client
  profitability were mentioned as reference points). Do not fold this into
  4.1's PR — 4.1 is a correctness fix that should ship independently and
  fast; this is a feature addition that can take longer.

---

## 5. UI Polish Pass

- **Files:** app-wide, no fixed file list
- **What:** Solomon's framing: "current UI is good, just needs a bit of
  polishing everywhere" — this is a broad, low-risk-per-change, high-count
  pass, not a redesign.
- **Do:** Treat each page/component as its own small commit. Check
  `frontend-design` conventions already established in the codebase (Tailwind
  CSS variable tokens, shadcn/ui primitives, the navy/teal palette from the
  "axis-shine" design system remap noted in project history) — match
  existing patterns rather than introducing new ones.
- **Do not:** bundle polish changes into the same commits as any functional
  fix above (Sections 1–4) — polish and correctness fixes should be
  reviewable and revertable independently.
- **Sequencing note:** do this pass before Section 7 (screenshots for the
  Regent website) — screenshots taken before polish will need to be redone.

---

## 6. Connections Platform & Branded Email

**Sequenced: 6.1 (scaffolding) → 6.2 (Resend domain) → 6.3 (invoice sending)
→ 6.4 (auth email branding), because each depends on the previous.**

### 6.1 Build generic connections/integrations scaffolding ✅
- **Files:** new — likely `supabase/migrations/` (new `connections` or
  `integrations` table), `lib/connections/` or similar, updates to
  `components/settings/ConnectionsView.tsx` (currently an honest "Coming
  Soon" stub — replace incrementally, not all at once)
- **Do:** Design a generic-enough shape (org_id, provider, credentials/
  config as JSONB, status, verified_at or similar) that Resend-domain
  (6.2), and any future connection (WhatsApp, Calendar, webhooks — all
  currently listed as "planned" in the Connections UI per the 2026-08-18
  changelog) can reuse without a schema rewrite.
- **Do not:** build this as a Resend-specific table — the whole point is
  it's the shared foundation. If Resend-specific fields end up needed,
  they belong in the JSONB config, not new columns.

### 6.2 Resend custom domain verification flow ✅
- **Files:** extends 6.1's scaffolding; new UI in
  `components/settings/ConnectionsView.tsx`
- **What:** Org adds their own sending domain, sees required DNS
  records (SPF/DKIM per Resend's domain verification API), and the app
  polls/checks verification status.
- **Do:** Store the verified domain per-org once confirmed. Fall back
  gracefully (see 6.3) to Regent's own domain if unverified — never leave
  invoice sending broken because an org's domain verification is pending or
  failed.
- **Do not:** block invoice sending on domain verification being complete —
  the fallback is load-bearing, not optional.

### 6.3 Wire invoice sending to per-org verified domain ✅
- **File:** `supabase/functions/send-invoice-email/index.ts`
- **Do:** Read the org's verified domain (from 6.2) if present and
  verified; use it as the `from:` address. Otherwise use Regent's existing
  default domain — this must be the exact same working path as before this
  task, untouched, as the fallback.
- **Do not:** remove or weaken the existing default-domain sending path
  while adding the per-org path — this function currently works for every
  org; it must keep working for orgs that never set up a custom domain.

### 6.4 Brand auth emails via Supabase custom SMTP + Resend
- **Files:** no code changes in this repo — this is a Supabase Dashboard
  configuration task (Authentication → Emails → SMTP Settings, and
  Authentication → Email Templates)
- **Do:**
  1. Enable custom SMTP in the Supabase dashboard, pointed at Resend's SMTP
     credentials, using Regent's own verified sending domain (not a
     per-org domain — auth emails are Regent-branded, not org-branded).
  2. Customize all six default templates (Confirm Signup, Invite User,
     Magic Link, Change Email Address, Reset Password) plus the security
     notification templates, with Regent/Axis branding.
  3. Confirm this is done per-environment if there's a separate staging vs.
     production Supabase project.
- **Do not:** confuse this with 6.2/6.3 — those are per-org invoice-sending
  domains via the app's own Resend integration; this is Regent's own
  branding on Supabase Auth's system emails, configured once, centrally.

---

## 7. Feature Toggles by Plan Tier

### 7.1 Design and build plan-based feature gating ✅
- **Files:** `lib/paddle-plans.ts` (extend `AXIS_PLANS` with a features
  list per plan), new hook (e.g. `useFeatureFlag('inventory')`), RLS/RPC
  enforcement to match
- **What:** 3 tiers exist (`starter`/`pro`/`advanced`, per
  `lib/paddle-plans.ts`); currently `useAxisPro` only distinguishes
  pro/not-pro with no per-feature granularity. Full modules (Inventory, HR,
  Reports/Analytics, etc.) need to be gated per-tier.
- **Do:**
  1. Confirm with Solomon exactly which features map to which tier before
     writing code — this is a business decision, not something to infer
     from current UI.
  2. Extend the plan definitions with an explicit feature list/set.
  3. Client-side: hide/disable nav entries and page access for
     features not in the org's plan.
  4. **Server-side: this is not optional**, same principle as 3.3 — a
     client-side-only gate on a paid feature is not a real gate. Any RPC or
     RLS policy backing a tier-gated feature (e.g. Inventory mutations)
     needs to check plan entitlement, not just org membership/role.
- **Do not:** build this before Section 3's entitlement-state rework lands —
  feature gating and trial/expiry gating are closely related (both check
  "what can this org currently do") and should share the same underlying
  entitlement-status data rather than two parallel systems.

---

## 8. Regent Website — Axis Product Page

**Repo:** `regent-website-20bd8b90` (branch `next-migrate`) — separate repo
from this one.

### 8.1 Replace fake hero mockup with real screenshots
- **File:** `src/app/(public)/axis/page.tsx`
- **What:** Current hero section is a hand-coded fake dashboard mockup with
  hardcoded numbers (`$42.8k`, `$8.4k`, `$19.2k`) — not a real screenshot.
  The module list below it (Invoicing & Clients, Full Ledger Accounting,
  Inventory & Custody, HR & Attendance, Team Roles & Access,
  Multi-Organization) is accurate copy and does not need rewriting.
- **Do:** Once Section 5 (UI polish) is complete in the Axis app, take real
  screenshots of the dashboard, invoicing flow, and ledger/reports view.
  Replace the fake mockup with real product imagery. Keep the existing copy
  and layout structure — this is an imagery swap, not a redesign of the
  page.
- **Do not:** start this before Section 5 is done — screenshots taken
  against the pre-polish UI will need to be redone, which is wasted work.

---

## Suggested execution order

This is a suggestion, not a hard dependency chain except where explicitly
noted above (Sections 3, 6, 7, 8 have internal sequencing that must be
respected). Rough priority:

1. **Section 4** (currency bug) — real numbers are wrong today, fix first.
2. **Section 1.1–1.2, 1.4–1.5** (audit CVE decision, HSTS, cleanup) — cheap,
   low-risk, do early.
3. **Section 3** (paywall/trial rework) — highest product-impact change,
   needs the 3.1 decision made before code starts.
4. **Section 7** (feature toggles) — depends on Section 3's entitlement
   model.
5. **Section 6** (connections + branded email) — independent track, can run
   in parallel with 3/7.
6. **Section 2** (code quality, tests) — ongoing, doesn't block anything
   else, but 2.3/2.4 should land before final launch sign-off.
7. **Section 5** (UI polish) — can run anytime, but must finish before 8.
8. **Section 8** (website screenshots) — last, depends on 5.
9. **Section 1.3** (middleware auth decision) — needs a decision first; the
   actual timeout-guard rework can happen whenever bandwidth allows once
   decided.
