ALTER TABLE organisations
  DROP COLUMN IF EXISTS invoice_custom_html,
  ADD COLUMN IF NOT EXISTS invoice_template_storage_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-templates', 'invoice-templates', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Organisation members can read invoice templates" ON storage.objects;
CREATE POLICY "Organisation members can read invoice templates" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoice-templates'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM organisation_members WHERE user_id = auth.uid()
  )
);

-- Writes are intentionally handled by /api/invoice-template, which validates
-- the HTML before using the service role to upload it.
