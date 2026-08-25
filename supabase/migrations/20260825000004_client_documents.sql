-- Client contracts and agreements use a private, organisation-scoped bucket.
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id)
);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view client documents" ON client_documents;
CREATE POLICY "Members can view client documents" ON client_documents FOR SELECT USING
  (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = client_documents.org_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Members can manage client documents" ON client_documents;
CREATE POLICY "Members can manage client documents" ON client_documents FOR ALL USING
  (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = client_documents.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'hr_manager')));

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Organisation members can upload client files" ON storage.objects;
CREATE POLICY "Organisation members can upload client files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-documents' AND EXISTS (
  SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND org_id::text = (storage.foldername(name))[1]
));
DROP POLICY IF EXISTS "Organisation members can read client files" ON storage.objects;
CREATE POLICY "Organisation members can read client files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-documents' AND EXISTS (
  SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND org_id::text = (storage.foldername(name))[1]
));
DROP POLICY IF EXISTS "Organisation managers can delete client files" ON storage.objects;
CREATE POLICY "Organisation managers can delete client files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-documents' AND EXISTS (
  SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'hr_manager') AND org_id::text = (storage.foldername(name))[1]
));
