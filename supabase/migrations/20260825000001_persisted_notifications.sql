CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  href TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  related_entity_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, type, related_entity_id)
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view notifications" ON notifications FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = notifications.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can create notifications" ON notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = notifications.org_id AND user_id = auth.uid()));
CREATE POLICY "Users can update notifications" ON notifications FOR UPDATE USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Members can delete notifications" ON notifications FOR DELETE USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = notifications.org_id AND user_id = auth.uid()));
CREATE INDEX notifications_org_unread_idx ON notifications (org_id, read_at, created_at DESC);