Manual steps to sync remote Supabase migrations into the repository

If Supabase shows "Remote migration versions not found in local migrations directory", follow these steps to copy remote migrations into your repo and prevent future mismatches.

1. Open Supabase Dashboard
   - Go to your project → Database → Migrations

2. For each migration listed in the dashboard that is NOT present in your repo's `supabase/migrations/` directory:
   a. Click the migration entry.
   b. Click "View SQL" or "Download".
   c. Copy the SQL text exactly.
   d. In your repo, create a file at `supabase/migrations/<exact-filename>.sql` and paste the SQL.
      - Use the exact filename shown in the Supabase dashboard, e.g. `20260701000000_example.sql`.

3. Commit and push the new migration files:
   ```bash
   git add supabase/migrations/<missing-files>.sql
   git commit -m "chore(supabase): add missing remote migrations"
   git push origin main
   ```

4. Re-run the migration push (if you need to update DB functions/objects):
   ```bash
   supabase db push
   ```

5. Verify in Supabase Dashboard that all migration filenames are present locally and marked applied.

6. Prevent recurrence: add the GitHub Action `.github/workflows/supabase-migrations-guard.yml` (already added) and set secrets:
   - `SUPABASE_ACCESS_TOKEN` (create short-lived or service token)
   - `SUPABASE_PROJECT_REF` (your project ref)

The Action will fail PRs when remote migrations exist that are not in the repo, preventing this class of deployment error.

If you'd like, authorise an automated sync (I can prepare a workflow that fetches remote migrations and pushes them to the repo), but that requires a Supabase access token in the repo secrets. Contact me if you want that automated flow.
