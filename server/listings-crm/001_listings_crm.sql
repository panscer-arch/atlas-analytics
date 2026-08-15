CREATE TABLE IF NOT EXISTS atlas_crm_members (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atlas_crm_records (
  id text PRIMARY KEY,
  dedupe_key text NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE atlas_crm_records ADD COLUMN IF NOT EXISTS dedupe_key text NULL;
DROP INDEX IF EXISTS atlas_crm_records_domain_unique;
CREATE UNIQUE INDEX IF NOT EXISTS atlas_crm_records_dedupe_key_unique
  ON atlas_crm_records (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND dedupe_key <> '';

CREATE TABLE IF NOT EXISTS atlas_crm_tasks (
  id text PRIMARY KEY,
  plan_date date NOT NULL,
  record_id text NULL REFERENCES atlas_crm_records(id) ON DELETE SET NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS atlas_crm_tasks_plan_date_idx ON atlas_crm_tasks (plan_date);
CREATE INDEX IF NOT EXISTS atlas_crm_tasks_record_id_idx ON atlas_crm_tasks (record_id);

CREATE TABLE IF NOT EXISTS atlas_crm_audit (
  id text PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS atlas_crm_audit_entity_idx
  ON atlas_crm_audit (entity_type, entity_id, created_at DESC);
