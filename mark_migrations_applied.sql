-- Mark the three migrations as applied in remote schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name, installed_on, status)
VALUES
  ('20260823000005', 'inventory_foundation', NOW(), 'success'),
  ('20260827000002', 'paddle_subscriptions', NOW(), 'success'),
  ('20260828000004', 'organisation_billing', NOW(), 'success')
ON CONFLICT (version) DO NOTHING;

-- Verify they were inserted
SELECT version, name, status FROM supabase_migrations.schema_migrations 
WHERE version IN ('20260823000005', '20260827000002', '20260828000004')
ORDER BY version;
