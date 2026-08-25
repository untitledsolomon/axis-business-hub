ALTER TABLE organisations
  ADD COLUMN invoice_template_id TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN invoice_custom_html TEXT,
  ADD COLUMN invoice_brand_color TEXT DEFAULT '#0f172a';

ALTER TABLE organisations
  ADD CONSTRAINT organisations_invoice_template_id_check
    CHECK (invoice_template_id IN ('classic', 'modern', 'minimal', 'custom')),
  ADD CONSTRAINT organisations_invoice_custom_html_check
    CHECK (
      invoice_custom_html IS NULL
      OR (invoice_custom_html !~* '<\s*script\b' AND invoice_custom_html !~* '\bon[a-z]+\s*=')
    );
