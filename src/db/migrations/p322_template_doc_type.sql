-- Per-doc-type template filtering. Each admin-uploaded template is now
-- scoped to one of Docs / Slides / Table / PDF so the Template Picker
-- only shows relevant options. Safe to re-run.

ALTER TABLE note_templates
  ADD COLUMN IF NOT EXISTS doc_type text NOT NULL DEFAULT 'doc'
  CHECK (doc_type IN ('doc','slides','table','pdf'));

NOTIFY pgrst, 'reload schema';
