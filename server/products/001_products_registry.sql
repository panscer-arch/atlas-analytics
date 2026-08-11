CREATE TABLE IF NOT EXISTS atlas_products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  item_type text NOT NULL,
  parent_id text REFERENCES atlas_products(id) ON DELETE SET NULL,
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  executor_name text NOT NULL DEFAULT '',
  responsible_name text NOT NULL DEFAULT '',
  lifecycle_stage text NOT NULL,
  delivery_state text NOT NULL,
  availability text NOT NULL,
  priority text NOT NULL,
  current_focus text NOT NULL DEFAULT '',
  next_step text NOT NULL DEFAULT '',
  review_date text NOT NULL DEFAULT '',
  target_date text NOT NULL DEFAULT '',
  block_reason text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_confirmation boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atlas_product_links (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES atlas_products(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  environment text NOT NULL,
  verified_at timestamptz,
  check_status text NOT NULL DEFAULT 'UNCHECKED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atlas_product_entries (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES atlas_products(id) ON DELETE CASCADE,
  type text NOT NULL,
  author_name text NOT NULL,
  body_md text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  supersedes_entry_id text REFERENCES atlas_product_entries(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS atlas_product_audit_events (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES atlas_products(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_name text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS atlas_products_stage_idx ON atlas_products(lifecycle_stage);
CREATE INDEX IF NOT EXISTS atlas_products_state_idx ON atlas_products(delivery_state);
CREATE INDEX IF NOT EXISTS atlas_products_executor_idx ON atlas_products(executor_name);
CREATE INDEX IF NOT EXISTS atlas_products_activity_idx ON atlas_products(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS atlas_products_parent_idx ON atlas_products(parent_id);
CREATE INDEX IF NOT EXISTS atlas_products_search_idx ON atlas_products USING gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(full_description, ''))
);
CREATE INDEX IF NOT EXISTS atlas_product_links_product_idx ON atlas_product_links(product_id);
CREATE INDEX IF NOT EXISTS atlas_product_entries_product_idx ON atlas_product_entries(product_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS atlas_product_audit_product_idx ON atlas_product_audit_events(product_id, created_at DESC);
