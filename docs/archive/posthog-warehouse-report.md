# PostHog Data Warehouse Setup Report

## Summary

This report covers the PostHog data warehouse source setup run for the **axis-business-hub** project.

## Sources Processed

### Supabase (Postgres)

**Status:** Needs browser setup — credentials were not provided during the CLI run.

The wizard detected `@supabase/supabase-js` in `package.json` and identified Supabase as an `in-cli` source. When prompted for database credentials, the prompt was cancelled. No source was created in PostHog.

**To complete setup manually, open this URL in your browser:**

[Connect Supabase to PostHog Data Warehouse](https://us.posthog.com/project/569790/data-warehouse/new-source?kind=Supabase&utm_source=wizard&utm_campaign=warehouse-source)

## Files Modified or Created

No project files were modified. This skill only connects external data — it does not edit application source code.

## Manual Steps to Complete Setup

1. Open the link above in your browser (you must be logged into PostHog).
2. In the connection form, use the **Session pooler** credentials (not the direct host):
   - **Host:** `aws-0-<region>.pooler.supabase.com` (find in Supabase → Connect → Session pooler tab)
   - **Port:** `6543`
   - **User:** `postgres.<your-project-ref>` (e.g. `postgres.abcdefghijklmnop`)
   - **Database:** `postgres`
   - **Password:** Your Supabase **database password** (Settings → Database) — NOT the `anon` or `service_role` JWT key.
3. Select the tables you want to sync and choose a sync method (incremental recommended for tables with a timestamp or ID column; full refresh for others).
4. Save — PostHog will begin its first sync.

> **Network note:** PostHog connects from its own infrastructure (not your machine). The Supabase Session pooler is publicly reachable, so no extra firewall rules are needed.
