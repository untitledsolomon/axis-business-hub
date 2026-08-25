-- Employee profile media and organisation-scoped documents.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id)
);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view employee documents" ON employee_documents;
CREATE POLICY "Members can view employee documents" ON employee_documents FOR SELECT USING
  (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = employee_documents.org_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Members can manage employee documents" ON employee_documents;
CREATE POLICY "Members can manage employee documents" ON employee_documents FOR ALL USING
  (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = employee_documents.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'hr_manager')));

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', true), ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Organisation members can upload employee files" ON storage.objects;
CREATE POLICY "Organisation members can upload employee files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('employee-photos', 'employee-documents') AND EXISTS (
  SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND org_id::text = (storage.foldername(name))[1]
));
DROP POLICY IF EXISTS "Organisation members can read employee files" ON storage.objects;
CREATE POLICY "Organisation members can read employee files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('employee-photos', 'employee-documents') AND EXISTS (
  SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND org_id::text = (storage.foldername(name))[1]
));
DROP POLICY IF EXISTS "Organisation managers can delete employee files" ON storage.objects;
CREATE POLICY "Organisation managers can delete employee files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('employee-photos', 'employee-documents') AND EXISTS (
  SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'hr_manager') AND org_id::text = (storage.foldername(name))[1]
));
