-- Atlas Admin Finance canonical PostgreSQL schema
-- Version: 1.0 draft
-- Date: 2026-08-05
--
-- This schema is intentionally isolated from product OLTP tables. It stores
-- immutable source evidence, reproducible projections and administrative audit.
-- Money is always an integer in token atomic units; floating point is forbidden.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS admin_finance;

REVOKE ALL ON SCHEMA admin_finance FROM PUBLIC;

CREATE DOMAIN admin_finance.atomic_amount AS numeric(78, 0)
  CHECK (VALUE >= 0);

CREATE DOMAIN admin_finance.evm_address AS bytea
  CHECK (octet_length(VALUE) = 20);

CREATE DOMAIN admin_finance.hash32 AS bytea
  CHECK (octet_length(VALUE) = 32);

CREATE FUNCTION admin_finance.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE TABLE admin_finance.tokens (
  token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  contract_address admin_finance.evm_address,
  symbol text NOT NULL CHECK (symbol ~ '^[A-Z0-9._-]{2,20}$'),
  decimals smallint NOT NULL CHECK (decimals BETWEEN 0 AND 36),
  valid_from_block bigint NOT NULL CHECK (valid_from_block >= 0),
  valid_to_block bigint CHECK (valid_to_block IS NULL OR valid_to_block >= valid_from_block),
  evidence_uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain_id, contract_address, valid_from_block)
);

CREATE TABLE admin_finance.contract_registry (
  contract_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  contract_key text NOT NULL CHECK (contract_key ~ '^[a-z0-9_]+$'),
  contract_address admin_finance.evm_address NOT NULL,
  implementation_address admin_finance.evm_address,
  abi_sha256 admin_finance.hash32 NOT NULL,
  bytecode_sha256 admin_finance.hash32 NOT NULL,
  effective_from_block bigint NOT NULL CHECK (effective_from_block >= 0),
  effective_to_block bigint CHECK (
    effective_to_block IS NULL OR effective_to_block >= effective_from_block
  ),
  evidence_uri text NOT NULL,
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain_id, contract_key, effective_from_block)
);

CREATE TABLE admin_finance.controlled_addresses (
  controlled_address_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  address admin_finance.evm_address NOT NULL,
  perimeter text NOT NULL CHECK (
    perimeter IN ('payout_contract', 'atlas_consolidated', 'company_treasury')
  ),
  address_role text NOT NULL,
  effective_from_block bigint NOT NULL CHECK (effective_from_block >= 0),
  effective_to_block bigint CHECK (
    effective_to_block IS NULL OR effective_to_block >= effective_from_block
  ),
  evidence_uri text NOT NULL,
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain_id, address, perimeter, effective_from_block)
);

CREATE TABLE admin_finance.rulesets (
  ruleset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_key text NOT NULL CHECK (ruleset_key ~ '^[a-z0-9_.-]+$'),
  version text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz CHECK (effective_to IS NULL OR effective_to > effective_from),
  effective_from_block bigint CHECK (effective_from_block IS NULL OR effective_from_block >= 0),
  effective_to_block bigint CHECK (
    effective_to_block IS NULL
    OR effective_from_block IS NULL
    OR effective_to_block >= effective_from_block
  ),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  definition_sha256 admin_finance.hash32 NOT NULL,
  evidence_uri text NOT NULL,
  owner_subject text NOT NULL,
  approver_subject text NOT NULL CHECK (approver_subject <> owner_subject),
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ruleset_key, version)
);

CREATE TRIGGER rulesets_append_only
BEFORE UPDATE OR DELETE ON admin_finance.rulesets
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.gate0_decisions (
  gate_id text PRIMARY KEY CHECK (gate_id ~ '^G0-(0[1-9]|1[0-4])$'),
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('OPEN', 'IN_REVIEW', 'DONE', 'REJECTED')),
  owner_subject text NOT NULL,
  approver_subject text NOT NULL CHECK (approver_subject <> owner_subject),
  evidence_uri text,
  evidence_sha256 admin_finance.hash32,
  effective_from timestamptz,
  decided_at timestamptz,
  audit_event_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    status <> 'DONE'
    OR (
      evidence_uri IS NOT NULL
      AND evidence_sha256 IS NOT NULL
      AND effective_from IS NOT NULL
      AND decided_at IS NOT NULL
      AND audit_event_id IS NOT NULL
    )
  )
);

CREATE TABLE admin_finance.source_batches (
  source_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL CHECK (source_key ~ '^[a-z0-9_.-]+$'),
  schema_version text NOT NULL,
  upstream_cursor text,
  sequence_start bigint,
  sequence_end bigint,
  record_count bigint NOT NULL CHECK (record_count >= 0),
  payload_bytes bigint NOT NULL CHECK (payload_bytes >= 0),
  payload_sha256 admin_finance.hash32 NOT NULL,
  object_version_uri text NOT NULL,
  status text NOT NULL CHECK (status IN ('RECEIVED', 'VALIDATED', 'QUARANTINED', 'PUBLISHED')),
  error_summary jsonb,
  source_started_at timestamptz,
  source_completed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  published_at timestamptz,
  UNIQUE (source_key, payload_sha256)
);

CREATE TABLE admin_finance.forecast_source_watermarks (
  source_key text PRIMARY KEY CHECK (source_key ~ '^[a-z0-9._:/-]{1,255}$'),
  chain_id bigint NOT NULL CHECK (chain_id = 56),
  block_number bigint NOT NULL CHECK (block_number > 0),
  block_hash admin_finance.hash32 NOT NULL,
  generated_at timestamptz NOT NULL,
  source_snapshot_id text NOT NULL CHECK (
    source_snapshot_id ~ '^[A-Za-z0-9._:-]{1,200}$'
  ),
  projection_id uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.forecast_source_snapshot_ids (
  source_key text NOT NULL CHECK (source_key ~ '^[a-z0-9._:/-]{1,255}$'),
  source_snapshot_id text NOT NULL CHECK (
    source_snapshot_id ~ '^[A-Za-z0-9._:-]{1,200}$'
  ),
  projection_id uuid NOT NULL,
  block_number bigint NOT NULL CHECK (block_number > 0),
  first_accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_key, source_snapshot_id)
);

CREATE TRIGGER forecast_source_snapshot_ids_append_only
BEFORE UPDATE OR DELETE ON admin_finance.forecast_source_snapshot_ids
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE FUNCTION admin_finance.accept_forecast_source_checkpoint(
  p_source_key text,
  p_chain_id bigint,
  p_block_number bigint,
  p_block_hash admin_finance.hash32,
  p_generated_at timestamptz,
  p_source_snapshot_id text,
  p_projection_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = admin_finance, pg_temp
AS $$
DECLARE
  current_watermark admin_finance.forecast_source_watermarks%ROWTYPE;
  known_projection_id uuid;
BEGIN
  -- One transaction-level lock serializes all replicas for the same source.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_source_key, 0));

  SELECT projection_id
    INTO known_projection_id
    FROM admin_finance.forecast_source_snapshot_ids
   WHERE source_key = p_source_key
     AND source_snapshot_id = p_source_snapshot_id;

  IF FOUND AND known_projection_id <> p_projection_id THEN
    RAISE EXCEPTION 'source_snapshot_equivocation'
      USING ERRCODE = '23000';
  ELSIF NOT FOUND THEN
    INSERT INTO admin_finance.forecast_source_snapshot_ids (
      source_key, source_snapshot_id, projection_id, block_number
    ) VALUES (
      p_source_key, p_source_snapshot_id, p_projection_id, p_block_number
    );
  END IF;

  SELECT *
    INTO current_watermark
    FROM admin_finance.forecast_source_watermarks
   WHERE source_key = p_source_key
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO admin_finance.forecast_source_watermarks (
      source_key, chain_id, block_number, block_hash, generated_at,
      source_snapshot_id, projection_id
    ) VALUES (
      p_source_key, p_chain_id, p_block_number, p_block_hash, p_generated_at,
      p_source_snapshot_id, p_projection_id
    );
    RETURN 'accepted_initial';
  END IF;

  IF p_chain_id <> current_watermark.chain_id THEN
    RAISE EXCEPTION 'source_chain_mismatch'
      USING ERRCODE = '23000';
  END IF;
  IF p_block_number < current_watermark.block_number THEN
    RAISE EXCEPTION 'source_checkpoint_rollback'
      USING ERRCODE = '23000';
  END IF;
  IF p_generated_at < current_watermark.generated_at THEN
    RAISE EXCEPTION 'source_time_rollback'
      USING ERRCODE = '23000';
  END IF;
  IF p_block_number = current_watermark.block_number
     AND p_block_hash <> current_watermark.block_hash THEN
    RAISE EXCEPTION 'source_checkpoint_equivocation'
      USING ERRCODE = '23000';
  END IF;

  UPDATE admin_finance.forecast_source_watermarks
     SET block_number = p_block_number,
         block_hash = p_block_hash,
         generated_at = p_generated_at,
         source_snapshot_id = p_source_snapshot_id,
         projection_id = p_projection_id,
         accepted_at = now(),
         updated_at = now()
   WHERE source_key = p_source_key;

  RETURN 'accepted_advance';
END;
$$;

CREATE TABLE admin_finance.chain_blocks (
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  block_number bigint NOT NULL CHECK (block_number >= 0),
  block_hash admin_finance.hash32 NOT NULL,
  parent_hash admin_finance.hash32 NOT NULL,
  block_timestamp timestamptz NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  PRIMARY KEY (chain_id, block_hash),
  UNIQUE (chain_id, block_number, block_hash)
);

CREATE TABLE admin_finance.raw_chain_events (
  raw_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  block_number bigint NOT NULL CHECK (block_number >= 0),
  block_hash admin_finance.hash32 NOT NULL,
  tx_hash admin_finance.hash32 NOT NULL,
  tx_index integer NOT NULL CHECK (tx_index >= 0),
  log_index integer NOT NULL CHECK (log_index >= 0),
  contract_address admin_finance.evm_address NOT NULL,
  topic0 admin_finance.hash32 NOT NULL,
  topics jsonb NOT NULL CHECK (jsonb_typeof(topics) = 'array'),
  data_hex text NOT NULL CHECK (data_hex ~ '^0x[0-9a-fA-F]*$'),
  event_at timestamptz NOT NULL,
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain_id, tx_hash, log_index),
  FOREIGN KEY (chain_id, block_hash)
    REFERENCES admin_finance.chain_blocks(chain_id, block_hash)
);

CREATE TRIGGER raw_chain_events_append_only
BEFORE UPDATE OR DELETE ON admin_finance.raw_chain_events
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.chain_event_statuses (
  event_status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_event_id uuid NOT NULL REFERENCES admin_finance.raw_chain_events(raw_event_id),
  status text NOT NULL CHECK (status IN ('OBSERVED', 'CONFIRMED', 'ORPHANED', 'REPLACED')),
  confirmations integer CHECK (confirmations IS NULL OR confirmations >= 0),
  canonical_block_hash admin_finance.hash32,
  reason_code text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raw_event_id, status, observed_at)
);

CREATE TRIGGER chain_event_statuses_append_only
BEFORE UPDATE OR DELETE ON admin_finance.chain_event_statuses
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.token_transfers (
  transfer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_event_id uuid NOT NULL UNIQUE REFERENCES admin_finance.raw_chain_events(raw_event_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  from_address admin_finance.evm_address NOT NULL,
  to_address admin_finance.evm_address NOT NULL,
  amount_atomic admin_finance.atomic_amount NOT NULL,
  transfer_class text NOT NULL CHECK (
    transfer_class IN ('EXTERNAL_IN', 'EXTERNAL_OUT', 'INTERNAL', 'UNKNOWN')
  ),
  classified_by_ruleset_id uuid NOT NULL REFERENCES admin_finance.rulesets(ruleset_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.participants (
  participant_id uuid PRIMARY KEY,
  source_participant_ref text NOT NULL UNIQUE,
  registered_at timestamptz,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'UNKNOWN')),
  current_rank_key text,
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.participant_wallet_refs (
  participant_wallet_ref_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES admin_finance.participants(participant_id),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  wallet_hash admin_finance.hash32 NOT NULL,
  wallet_last4 text NOT NULL CHECK (wallet_last4 ~ '^[0-9a-fA-F]{4}$'),
  vault_secret_ref text NOT NULL,
  linked_at timestamptz NOT NULL,
  unlinked_at timestamptz CHECK (unlinked_at IS NULL OR unlinked_at >= linked_at),
  UNIQUE (chain_id, wallet_hash, linked_at)
);

CREATE TABLE admin_finance.cycles (
  cycle_id uuid PRIMARY KEY,
  source_cycle_ref text NOT NULL UNIQUE,
  participant_id uuid NOT NULL REFERENCES admin_finance.participants(participant_id),
  product_key text NOT NULL,
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  principal_atomic admin_finance.atomic_amount NOT NULL,
  opened_at timestamptz NOT NULL,
  expected_close_at timestamptz,
  actual_close_at timestamptz,
  status text NOT NULL CHECK (
    status IN ('PENDING', 'OPEN', 'MATURED', 'CLAIMABLE', 'CLOSED', 'CANCELLED', 'REVERSED')
  ),
  ruleset_id uuid NOT NULL REFERENCES admin_finance.rulesets(ruleset_id),
  rank_snapshot_key text NOT NULL,
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  source_event_id uuid REFERENCES admin_finance.raw_chain_events(raw_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expected_close_at IS NULL OR expected_close_at >= opened_at),
  CHECK (actual_close_at IS NULL OR actual_close_at >= opened_at)
);

CREATE TABLE admin_finance.cycle_transitions (
  cycle_transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES admin_finance.cycles(cycle_id),
  from_status text,
  to_status text NOT NULL,
  occurred_at timestamptz NOT NULL,
  source_event_id uuid REFERENCES admin_finance.raw_chain_events(raw_event_id),
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  reason_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, to_status, occurred_at)
);

CREATE TABLE admin_finance.claims (
  claim_id uuid PRIMARY KEY,
  source_claim_ref text NOT NULL UNIQUE,
  cycle_id uuid NOT NULL REFERENCES admin_finance.cycles(cycle_id),
  participant_id uuid NOT NULL REFERENCES admin_finance.participants(participant_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  principal_atomic admin_finance.atomic_amount NOT NULL,
  gross_delta_atomic admin_finance.atomic_amount NOT NULL,
  platform_fee_atomic admin_finance.atomic_amount NOT NULL,
  other_deductions_atomic admin_finance.atomic_amount NOT NULL DEFAULT 0,
  participant_net_delta_atomic admin_finance.atomic_amount NOT NULL,
  partner_reward_atomic admin_finance.atomic_amount NOT NULL DEFAULT 0,
  total_contract_outflow_atomic admin_finance.atomic_amount NOT NULL,
  due_at timestamptz,
  claimed_at timestamptz,
  paid_at timestamptz,
  status text NOT NULL CHECK (
    status IN ('ELIGIBLE', 'REQUESTED', 'PENDING', 'FAILED', 'PAID', 'REVERSED', 'EXPIRED')
  ),
  failure_code text,
  ruleset_id uuid NOT NULL REFERENCES admin_finance.rulesets(ruleset_id),
  rank_snapshot_key text NOT NULL,
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  source_event_id uuid REFERENCES admin_finance.raw_chain_events(raw_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    gross_delta_atomic =
      participant_net_delta_atomic + platform_fee_atomic + other_deductions_atomic
  ),
  CHECK (
    total_contract_outflow_atomic =
      principal_atomic + gross_delta_atomic + partner_reward_atomic
  ),
  CHECK (paid_at IS NULL OR claimed_at IS NULL OR paid_at >= claimed_at)
);

CREATE TABLE admin_finance.claim_transitions (
  claim_transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES admin_finance.claims(claim_id),
  from_status text,
  to_status text NOT NULL,
  occurred_at timestamptz NOT NULL,
  attempt_no integer NOT NULL DEFAULT 1 CHECK (attempt_no > 0),
  source_event_id uuid REFERENCES admin_finance.raw_chain_events(raw_event_id),
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, to_status, attempt_no, occurred_at)
);

CREATE TABLE admin_finance.payout_obligations (
  obligation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES admin_finance.participants(participant_id),
  cycle_id uuid REFERENCES admin_finance.cycles(cycle_id),
  claim_id uuid REFERENCES admin_finance.claims(claim_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  obligation_type text NOT NULL CHECK (
    obligation_type IN ('PRINCIPAL', 'DELTA_GROSS', 'PARTNER_REWARD', 'OTHER')
  ),
  trigger_event text NOT NULL CHECK (trigger_event IN ('CYCLE_CREATED', 'CLAIM_DUE', 'MANUAL')),
  amount_atomic admin_finance.atomic_amount NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('FORECAST', 'DUE', 'PAID', 'CANCELLED', 'REVERSED')),
  ruleset_id uuid NOT NULL REFERENCES admin_finance.rulesets(ruleset_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cycle_id IS NOT NULL OR claim_id IS NOT NULL)
);

CREATE TABLE admin_finance.payout_transfer_links (
  obligation_id uuid NOT NULL REFERENCES admin_finance.payout_obligations(obligation_id),
  transfer_id uuid NOT NULL REFERENCES admin_finance.token_transfers(transfer_id),
  allocated_atomic admin_finance.atomic_amount NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (obligation_id, transfer_id)
);

CREATE TABLE admin_finance.ledger_accounts (
  ledger_account_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key text NOT NULL UNIQUE CHECK (account_key ~ '^[a-z0-9_.-]+$'),
  perimeter text NOT NULL CHECK (
    perimeter IN ('payout_contract', 'atlas_consolidated', 'company_treasury')
  ),
  normal_side text NOT NULL CHECK (normal_side IN ('DEBIT', 'CREDIT')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.ledger_transactions (
  ledger_transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_key text NOT NULL UNIQUE,
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  event_at timestamptz NOT NULL,
  source_type text NOT NULL CHECK (
    source_type IN ('TRANSFER', 'CLAIM', 'REWARD', 'FEE', 'ADJUSTMENT', 'REVERSAL')
  ),
  source_ref text NOT NULL,
  reversal_of uuid REFERENCES admin_finance.ledger_transactions(ledger_transaction_id),
  ruleset_id uuid REFERENCES admin_finance.rulesets(ruleset_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.ledger_postings (
  ledger_posting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_transaction_id uuid NOT NULL
    REFERENCES admin_finance.ledger_transactions(ledger_transaction_id),
  ledger_account_id uuid NOT NULL REFERENCES admin_finance.ledger_accounts(ledger_account_id),
  debit_atomic admin_finance.atomic_amount NOT NULL DEFAULT 0,
  credit_atomic admin_finance.atomic_amount NOT NULL DEFAULT 0,
  participant_id uuid REFERENCES admin_finance.participants(participant_id),
  cycle_id uuid REFERENCES admin_finance.cycles(cycle_id),
  claim_id uuid REFERENCES admin_finance.claims(claim_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (debit_atomic > 0 AND credit_atomic = 0)
    OR (credit_atomic > 0 AND debit_atomic = 0)
  )
);

CREATE FUNCTION admin_finance.assert_ledger_transaction_balanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id uuid;
  imbalance numeric(78, 0);
BEGIN
  target_id := COALESCE(NEW.ledger_transaction_id, OLD.ledger_transaction_id);
  SELECT COALESCE(sum(debit_atomic), 0) - COALESCE(sum(credit_atomic), 0)
    INTO imbalance
    FROM admin_finance.ledger_postings
   WHERE ledger_transaction_id = target_id;
  IF imbalance <> 0 THEN
    RAISE EXCEPTION 'Unbalanced ledger transaction %, residual %', target_id, imbalance
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_transaction_balanced
AFTER INSERT OR UPDATE OR DELETE ON admin_finance.ledger_postings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION admin_finance.assert_ledger_transaction_balanced();

CREATE TRIGGER ledger_transactions_append_only
BEFORE UPDATE OR DELETE ON admin_finance.ledger_transactions
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TRIGGER ledger_postings_append_only
BEFORE UPDATE OR DELETE ON admin_finance.ledger_postings
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.balance_checkpoints (
  balance_checkpoint_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  controlled_address_id uuid NOT NULL
    REFERENCES admin_finance.controlled_addresses(controlled_address_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  block_number bigint NOT NULL CHECK (block_number >= 0),
  block_hash admin_finance.hash32 NOT NULL,
  balance_atomic admin_finance.atomic_amount NOT NULL,
  observed_at timestamptz NOT NULL,
  source_batch_id uuid REFERENCES admin_finance.source_batches(source_batch_id),
  UNIQUE (controlled_address_id, token_id, block_hash)
);

CREATE TABLE admin_finance.reconciliation_runs (
  reconciliation_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perimeter text NOT NULL CHECK (
    perimeter IN ('payout_contract', 'atlas_consolidated', 'company_treasury')
  ),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  from_block bigint NOT NULL CHECK (from_block >= 0),
  to_block bigint NOT NULL CHECK (to_block >= from_block),
  opening_balance_atomic admin_finance.atomic_amount NOT NULL,
  external_in_atomic admin_finance.atomic_amount NOT NULL,
  external_out_atomic admin_finance.atomic_amount NOT NULL,
  expected_closing_atomic admin_finance.atomic_amount NOT NULL,
  observed_closing_atomic admin_finance.atomic_amount NOT NULL,
  residual_atomic numeric(78, 0) NOT NULL,
  status text NOT NULL CHECK (status IN ('RUNNING', 'MATCHED', 'MISMATCH', 'FAILED')),
  model_commit text NOT NULL,
  ruleset_id uuid REFERENCES admin_finance.rulesets(ruleset_id),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  CHECK (
    expected_closing_atomic = opening_balance_atomic + external_in_atomic - external_out_atomic
  ),
  CHECK (residual_atomic = observed_closing_atomic - expected_closing_atomic)
);

CREATE TABLE admin_finance.reconciliation_exceptions (
  reconciliation_exception_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id uuid NOT NULL
    REFERENCES admin_finance.reconciliation_runs(reconciliation_run_id),
  exception_type text NOT NULL CHECK (
    exception_type IN (
      'MISSING_SOURCE', 'MISSING_CHAIN', 'AMOUNT_MISMATCH', 'UNKNOWN_RULESET',
      'DUPLICATE', 'REORG', 'UNCLASSIFIED_TRANSFER', 'OTHER'
    )
  ),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  source_ref text,
  amount_atomic numeric(78, 0),
  status text NOT NULL CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ACCEPTED_RISK')),
  owner_subject text,
  resolution_code text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (resolved_at IS NULL OR resolved_at >= opened_at)
);

CREATE TABLE admin_finance.forecast_snapshots (
  forecast_snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL,
  as_of timestamptz NOT NULL,
  horizon_end timestamptz NOT NULL CHECK (horizon_end > as_of),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  ruleset_id uuid NOT NULL REFERENCES admin_finance.rulesets(ruleset_id),
  model_version text NOT NULL,
  model_commit text NOT NULL,
  source_watermark timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('VALID', 'PARTIAL', 'STALE', 'FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (generated_at, token_id, model_version)
);

CREATE TABLE admin_finance.forecast_buckets (
  forecast_bucket_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_snapshot_id uuid NOT NULL
    REFERENCES admin_finance.forecast_snapshots(forecast_snapshot_id),
  bucket_start timestamptz NOT NULL,
  bucket_end timestamptz NOT NULL CHECK (bucket_end > bucket_start),
  principal_due_atomic admin_finance.atomic_amount NOT NULL,
  delta_gross_due_atomic admin_finance.atomic_amount NOT NULL,
  partner_reward_due_atomic admin_finance.atomic_amount NOT NULL,
  pending_partner_creation_due_atomic admin_finance.atomic_amount NOT NULL DEFAULT 0,
  total_outflow_due_atomic admin_finance.atomic_amount NOT NULL,
  expected_inflow_atomic admin_finance.atomic_amount NOT NULL,
  opening_liquidity_atomic admin_finance.atomic_amount NOT NULL,
  closing_liquidity_atomic numeric(78, 0) NOT NULL,
  reserve_target_atomic admin_finance.atomic_amount NOT NULL,
  funding_gap_atomic admin_finance.atomic_amount NOT NULL,
  confidence_low_atomic admin_finance.atomic_amount NOT NULL,
  confidence_high_atomic admin_finance.atomic_amount NOT NULL,
  CHECK (
    total_outflow_due_atomic =
      principal_due_atomic + delta_gross_due_atomic + partner_reward_due_atomic +
      pending_partner_creation_due_atomic
  ),
  CHECK (
    closing_liquidity_atomic =
      opening_liquidity_atomic + expected_inflow_atomic - total_outflow_due_atomic
  ),
  CHECK (confidence_high_atomic >= confidence_low_atomic),
  UNIQUE (forecast_snapshot_id, bucket_start, bucket_end)
);

CREATE TABLE admin_finance.forecast_items (
  forecast_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_snapshot_id uuid NOT NULL
    REFERENCES admin_finance.forecast_snapshots(forecast_snapshot_id),
  forecast_bucket_id uuid NOT NULL
    REFERENCES admin_finance.forecast_buckets(forecast_bucket_id),
  obligation_id uuid REFERENCES admin_finance.payout_obligations(obligation_id),
  cycle_id uuid REFERENCES admin_finance.cycles(cycle_id),
  claim_id uuid REFERENCES admin_finance.claims(claim_id),
  component text NOT NULL CHECK (
    component IN (
      'PRINCIPAL',
      'DELTA_GROSS',
      'PARTNER_REWARD_CLAIM',
      'PARTNER_REWARD_CREATION_PENDING',
      'EXPECTED_INFLOW'
    )
  ),
  amount_atomic admin_finance.atomic_amount NOT NULL,
  probability_basis_points integer NOT NULL CHECK (probability_basis_points BETWEEN 0 AND 10000),
  expected_at timestamptz NOT NULL,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(assumptions) = 'object')
);

CREATE TABLE admin_finance.forecast_actuals (
  forecast_actual_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_item_id uuid NOT NULL REFERENCES admin_finance.forecast_items(forecast_item_id),
  transfer_id uuid REFERENCES admin_finance.token_transfers(transfer_id),
  actual_atomic admin_finance.atomic_amount NOT NULL,
  actual_at timestamptz NOT NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (forecast_item_id, transfer_id)
);

CREATE TABLE admin_finance.participant_notes (
  participant_note_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES admin_finance.participants(participant_id),
  body_ciphertext bytea NOT NULL,
  key_version text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  supersedes_note_id uuid REFERENCES admin_finance.participant_notes(participant_note_id),
  deleted_by_compensation_id uuid
);

CREATE TABLE admin_finance.participant_funding (
  participant_funding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES admin_finance.participants(participant_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  amount_atomic admin_finance.atomic_amount NOT NULL,
  funded_at timestamptz NOT NULL,
  purpose text NOT NULL,
  source_ref text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.adjustment_proposals (
  adjustment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perimeter text NOT NULL CHECK (
    perimeter IN ('payout_contract', 'atlas_consolidated', 'company_treasury')
  ),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  amount_atomic numeric(78, 0) NOT NULL CHECK (amount_atomic <> 0),
  reason_code text NOT NULL,
  reason_text text NOT NULL CHECK (length(reason_text) BETWEEN 10 AND 2000),
  evidence_uri text NOT NULL,
  maker_subject text NOT NULL,
  checker_subject text,
  status text NOT NULL CHECK (
    status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'POSTED', 'REVERSED')
  ),
  proposed_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  posted_ledger_transaction_id uuid
    REFERENCES admin_finance.ledger_transactions(ledger_transaction_id),
  reversal_adjustment_id uuid REFERENCES admin_finance.adjustment_proposals(adjustment_id),
  CHECK (checker_subject IS NULL OR checker_subject <> maker_subject),
  CHECK (
    status NOT IN ('APPROVED', 'POSTED', 'REVERSED')
    OR (checker_subject IS NOT NULL AND decided_at IS NOT NULL)
  )
);

CREATE TABLE admin_finance.alerts (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  status text NOT NULL CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  title text NOT NULL,
  details jsonb NOT NULL CHECK (jsonb_typeof(details) = 'object'),
  deduplication_key text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  resolved_at timestamptz,
  CHECK (last_seen_at >= first_seen_at),
  CHECK (resolved_at IS NULL OR resolved_at >= first_seen_at)
);

CREATE UNIQUE INDEX alerts_one_open_per_key
  ON admin_finance.alerts (deduplication_key)
  WHERE status IN ('OPEN', 'ACKNOWLEDGED');

CREATE TABLE admin_finance.alert_acknowledgements (
  alert_acknowledgement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES admin_finance.alerts(alert_id),
  actor_subject text NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 1000),
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_finance.audit_events (
  audit_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_key text NOT NULL,
  stream_position bigint NOT NULL CHECK (stream_position > 0),
  occurred_at timestamptz NOT NULL,
  actor_subject text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  reason_code text,
  request_id text NOT NULL,
  source_ip_hash admin_finance.hash32,
  user_agent_hash admin_finance.hash32,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  previous_event_hash admin_finance.hash32,
  event_hash admin_finance.hash32 NOT NULL,
  worm_object_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_key, stream_position),
  UNIQUE (event_hash),
  CHECK (
    (stream_position = 1 AND previous_event_hash IS NULL)
    OR (stream_position > 1 AND previous_event_hash IS NOT NULL)
  )
);

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON admin_finance.audit_events
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.reserve_funding_alerts (
  reserve_funding_alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL UNIQUE REFERENCES admin_finance.alerts(alert_id),
  forecast_snapshot_id uuid NOT NULL REFERENCES admin_finance.forecast_snapshots(forecast_snapshot_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  first_breach_at timestamptz NOT NULL,
  peak_gap_at timestamptz NOT NULL,
  minimum_top_up_atomic admin_finance.atomic_amount NOT NULL CHECK (minimum_top_up_atomic > 0),
  peak_gap_atomic admin_finance.atomic_amount NOT NULL CHECK (peak_gap_atomic >= minimum_top_up_atomic),
  reserve_target_atomic admin_finance.atomic_amount NOT NULL CHECK (reserve_target_atomic > 0),
  policy_buffer_atomic admin_finance.atomic_amount,
  created_audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (peak_gap_at >= first_breach_at),
  UNIQUE (forecast_snapshot_id, first_breach_at)
);

CREATE TRIGGER reserve_funding_alerts_append_only
BEFORE UPDATE OR DELETE ON admin_finance.reserve_funding_alerts
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.notification_outbox (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES admin_finance.alerts(alert_id),
  channel text NOT NULL CHECK (channel IN ('IN_APP', 'TELEGRAM', 'EMAIL')),
  checkpoint text NOT NULL CHECK (checkpoint IN ('D_7', 'D_3', 'D_1', 'BREACH')),
  recipient_ref text NOT NULL CHECK (length(recipient_ref) BETWEEN 3 AND 200),
  template_key text NOT NULL,
  template_version text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  payload_sha256 admin_finance.hash32 NOT NULL,
  idempotency_key text NOT NULL UNIQUE CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (
    status IN ('SCHEDULED', 'READY', 'LEASED', 'DELIVERED', 'RETRY', 'FAILED', 'BLOCKED', 'CANCELLED')
  ),
  scheduled_for timestamptz NOT NULL,
  next_attempt_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_token uuid,
  lease_expires_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'LEASED') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK ((status = 'DELIVERED') = (delivered_at IS NOT NULL)),
  CHECK (next_attempt_at IS NULL OR next_attempt_at >= created_at),
  CHECK (updated_at >= created_at)
);

CREATE INDEX notification_outbox_ready_idx
  ON admin_finance.notification_outbox (next_attempt_at, scheduled_for)
  WHERE status IN ('READY', 'RETRY');

CREATE TABLE admin_finance.notification_delivery_attempts (
  notification_delivery_attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES admin_finance.notification_outbox(notification_id),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  provider_request_key text NOT NULL,
  result text NOT NULL CHECK (result IN ('DELIVERED', 'TRANSIENT_FAILURE', 'PERMANENT_FAILURE', 'SKIPPED')),
  provider_status integer CHECK (provider_status IS NULL OR provider_status BETWEEN 100 AND 599),
  provider_message_id text,
  error_code text,
  response_sha256 admin_finance.hash32,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  UNIQUE (notification_id, attempt_number),
  UNIQUE (provider_request_key),
  CHECK (completed_at >= started_at)
);

CREATE TRIGGER notification_delivery_attempts_append_only
BEFORE UPDATE OR DELETE ON admin_finance.notification_delivery_attempts
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE OR REPLACE FUNCTION admin_finance.enqueue_notification(
  p_alert_id uuid,
  p_channel text,
  p_checkpoint text,
  p_recipient_ref text,
  p_template_key text,
  p_template_version text,
  p_payload jsonb,
  p_payload_sha256 admin_finance.hash32,
  p_idempotency_key text,
  p_status text,
  p_scheduled_for timestamptz,
  p_created_audit_event_id uuid
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id uuid;
  v_existing_payload_sha256 admin_finance.hash32;
BEGIN
  INSERT INTO admin_finance.notification_outbox (
    alert_id, channel, checkpoint, recipient_ref, template_key, template_version,
    payload, payload_sha256, idempotency_key, status, scheduled_for,
    next_attempt_at, created_audit_event_id
  ) VALUES (
    p_alert_id, p_channel, p_checkpoint, p_recipient_ref, p_template_key, p_template_version,
    p_payload, p_payload_sha256, p_idempotency_key, p_status, p_scheduled_for,
    CASE WHEN p_status IN ('READY', 'RETRY') THEN p_scheduled_for ELSE NULL END,
    p_created_audit_event_id
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING notification_id INTO v_notification_id;

  IF v_notification_id IS NOT NULL THEN
    RETURN v_notification_id;
  END IF;

  SELECT notification_id, payload_sha256
    INTO v_notification_id, v_existing_payload_sha256
    FROM admin_finance.notification_outbox
   WHERE idempotency_key = p_idempotency_key;

  IF v_existing_payload_sha256 <> p_payload_sha256 THEN
    RAISE EXCEPTION 'notification_idempotency_equivocation'
      USING ERRCODE = '23505';
  END IF;
  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_finance.lease_due_notifications(
  p_lease_token uuid,
  p_now timestamptz,
  p_limit integer,
  p_lease_seconds integer
) RETURNS SETOF admin_finance.notification_outbox
LANGUAGE sql
AS $$
  WITH due AS (
    SELECT notification_id
      FROM admin_finance.notification_outbox
     WHERE (
       (status = 'SCHEDULED' AND scheduled_for <= p_now)
       OR (status IN ('READY', 'RETRY') AND COALESCE(next_attempt_at, scheduled_for) <= p_now)
       OR (status = 'LEASED' AND lease_expires_at <= p_now)
     )
     ORDER BY COALESCE(next_attempt_at, scheduled_for), notification_id
     FOR UPDATE SKIP LOCKED
     LIMIT p_limit
  )
  UPDATE admin_finance.notification_outbox AS outbox
     SET status = 'LEASED',
         lease_token = p_lease_token,
         lease_expires_at = p_now + make_interval(secs => p_lease_seconds),
         updated_at = p_now
    FROM due
   WHERE outbox.notification_id = due.notification_id
  RETURNING outbox.*;
$$;

CREATE OR REPLACE FUNCTION admin_finance.complete_notification_attempt(
  p_notification_id uuid,
  p_lease_token uuid,
  p_provider_request_key text,
  p_result text,
  p_provider_status integer,
  p_provider_message_id text,
  p_error_code text,
  p_response_sha256 admin_finance.hash32,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_retry_at timestamptz,
  p_audit_event_id uuid
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempt_number integer;
  v_status text;
BEGIN
  SELECT attempt_count + 1
    INTO v_attempt_number
    FROM admin_finance.notification_outbox
   WHERE notification_id = p_notification_id
     AND status = 'LEASED'
     AND lease_token = p_lease_token
   FOR UPDATE;

  IF v_attempt_number IS NULL THEN
    RAISE EXCEPTION 'notification_lease_lost'
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO admin_finance.notification_delivery_attempts (
    notification_id, attempt_number, provider_request_key, result,
    provider_status, provider_message_id, error_code, response_sha256,
    started_at, completed_at, audit_event_id
  ) VALUES (
    p_notification_id, v_attempt_number, p_provider_request_key, p_result,
    p_provider_status, p_provider_message_id, p_error_code, p_response_sha256,
    p_started_at, p_completed_at, p_audit_event_id
  );

  v_status := CASE p_result
    WHEN 'DELIVERED' THEN 'DELIVERED'
    WHEN 'TRANSIENT_FAILURE' THEN 'RETRY'
    WHEN 'PERMANENT_FAILURE' THEN 'FAILED'
    WHEN 'SKIPPED' THEN 'BLOCKED'
    ELSE NULL
  END;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'invalid_notification_attempt_result';
  END IF;
  IF v_status = 'RETRY' AND p_retry_at IS NULL THEN
    RAISE EXCEPTION 'notification_retry_time_required';
  END IF;

  UPDATE admin_finance.notification_outbox
     SET status = v_status,
         attempt_count = v_attempt_number,
         next_attempt_at = CASE WHEN v_status = 'RETRY' THEN p_retry_at ELSE NULL END,
         delivered_at = CASE WHEN v_status = 'DELIVERED' THEN p_completed_at ELSE NULL END,
         last_error_code = CASE WHEN v_status IN ('RETRY', 'FAILED', 'BLOCKED') THEN p_error_code ELSE NULL END,
         lease_token = NULL,
         lease_expires_at = NULL,
         updated_at = p_completed_at
   WHERE notification_id = p_notification_id;
  RETURN v_status;
END;
$$;

ALTER TABLE admin_finance.gate0_decisions
  ADD CONSTRAINT gate0_audit_event_fk
  FOREIGN KEY (audit_event_id) REFERENCES admin_finance.audit_events(audit_event_id);

CREATE TABLE admin_finance.export_jobs (
  export_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by text NOT NULL,
  resource_type text NOT NULL,
  filters jsonb NOT NULL CHECK (jsonb_typeof(filters) = 'object'),
  columns jsonb NOT NULL CHECK (jsonb_typeof(columns) = 'array'),
  status text NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'READY', 'EXPIRED', 'FAILED')),
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 1000),
  row_count bigint CHECK (row_count IS NULL OR row_count >= 0),
  encrypted_object_uri text,
  object_sha256 admin_finance.hash32,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE admin_finance.export_downloads (
  export_download_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_job_id uuid NOT NULL REFERENCES admin_finance.export_jobs(export_job_id),
  downloaded_by text NOT NULL,
  request_id text NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id)
);

CREATE TABLE admin_finance.management_growth_plan_versions (
  plan_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('PROPOSED', 'APPROVED', 'RETIRED')),
  monthly_growth_basis_points integer NOT NULL CHECK (monthly_growth_basis_points BETWEEN 0 AND 100000),
  planned_company_revenue_basis_points integer NOT NULL CHECK (planned_company_revenue_basis_points BETWEEN 0 AND 10000),
  day_basis text NOT NULL CHECK (day_basis IN ('CALENDAR_DAYS', 'SOURCE_30_DAY_REFERENCE')),
  owner_subject text NOT NULL,
  approver_subject text,
  approved_at timestamptz,
  effective_from date NOT NULL,
  previous_version_id uuid REFERENCES admin_finance.management_growth_plan_versions(plan_version_id),
  source_note text NOT NULL,
  audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'PROPOSED' AND approver_subject IS NULL AND approved_at IS NULL)
    OR (status IN ('APPROVED', 'RETIRED') AND approver_subject IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE TABLE admin_finance.management_growth_plan_months (
  plan_month_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL REFERENCES admin_finance.management_growth_plan_versions(plan_version_id),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  month_start date NOT NULL CHECK (date_trunc('month', month_start)::date = month_start),
  flow_target_atomic admin_finance.atomic_amount NOT NULL CHECK (flow_target_atomic >= 0),
  daily_reference_atomic admin_finance.atomic_amount NOT NULL CHECK (daily_reference_atomic >= 0),
  planned_company_revenue_atomic admin_finance.atomic_amount NOT NULL CHECK (planned_company_revenue_atomic >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_version_id, month_start)
);

CREATE TRIGGER management_growth_plan_versions_append_only
BEFORE UPDATE OR DELETE ON admin_finance.management_growth_plan_versions
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TRIGGER management_growth_plan_months_append_only
BEFORE UPDATE OR DELETE ON admin_finance.management_growth_plan_months
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.partner_economics_snapshots (
  partner_economics_snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  period_from timestamptz NOT NULL,
  period_to timestamptz NOT NULL,
  as_of_block_number bigint NOT NULL CHECK (as_of_block_number > 0),
  gross_partner_rewards_paid_atomic admin_finance.atomic_amount NOT NULL CHECK (gross_partner_rewards_paid_atomic >= 0),
  atlas_referral_income_atomic admin_finance.atomic_amount NOT NULL CHECK (atlas_referral_income_atomic >= 0),
  atlas_referral_income_creation_atomic admin_finance.atomic_amount NOT NULL CHECK (atlas_referral_income_creation_atomic >= 0),
  atlas_referral_income_claim_atomic admin_finance.atomic_amount NOT NULL CHECK (atlas_referral_income_claim_atomic >= 0),
  capture_rate_basis_points integer NOT NULL CHECK (capture_rate_basis_points BETWEEN 0 AND 10000),
  target_basis_points integer NOT NULL CHECK (target_basis_points BETWEEN 0 AND 10000),
  gap_basis_points integer NOT NULL CHECK (gap_basis_points BETWEEN -10000 AND 10000),
  attribution_status text NOT NULL CHECK (attribution_status IN ('COMPLETE', 'PARTIAL')),
  reconciliation_status text NOT NULL CHECK (reconciliation_status IN ('NOT_RUN', 'RECONCILING', 'RECONCILED', 'EXCEPTION', 'BLOCKED')),
  audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_to > period_from),
  CHECK (atlas_referral_income_creation_atomic + atlas_referral_income_claim_atomic = atlas_referral_income_atomic),
  CHECK (gap_basis_points = capture_rate_basis_points - target_basis_points),
  UNIQUE (period_from, period_to, as_of_block_number, token_id)
);

CREATE TABLE admin_finance.partner_economics_buckets (
  partner_economics_bucket_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_economics_snapshot_id uuid NOT NULL REFERENCES admin_finance.partner_economics_snapshots(partner_economics_snapshot_id),
  bucket_start timestamptz NOT NULL,
  bucket_end timestamptz NOT NULL,
  gross_partner_rewards_paid_atomic admin_finance.atomic_amount NOT NULL CHECK (gross_partner_rewards_paid_atomic >= 0),
  atlas_referral_income_atomic admin_finance.atomic_amount NOT NULL CHECK (atlas_referral_income_atomic >= 0),
  capture_rate_basis_points integer NOT NULL CHECK (capture_rate_basis_points BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (bucket_end > bucket_start),
  UNIQUE (partner_economics_snapshot_id, bucket_start, bucket_end)
);

CREATE TRIGGER partner_economics_snapshots_append_only
BEFORE UPDATE OR DELETE ON admin_finance.partner_economics_snapshots
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TRIGGER partner_economics_buckets_append_only
BEFORE UPDATE OR DELETE ON admin_finance.partner_economics_buckets
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TABLE admin_finance.company_economics_snapshots (
  company_economics_snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES admin_finance.tokens(token_id),
  period_from timestamptz NOT NULL,
  period_to timestamptz NOT NULL,
  as_of_block_number bigint NOT NULL CHECK (as_of_block_number > 0),
  incoming_flow_atomic admin_finance.atomic_amount NOT NULL CHECK (incoming_flow_atomic >= 0),
  platform_fee_delta_atomic admin_finance.atomic_amount NOT NULL CHECK (platform_fee_delta_atomic >= 0),
  platform_fee_partner_atomic admin_finance.atomic_amount NOT NULL CHECK (platform_fee_partner_atomic >= 0),
  platform_fee_total_atomic admin_finance.atomic_amount NOT NULL CHECK (platform_fee_total_atomic >= 0),
  head_account_creation_atomic admin_finance.atomic_amount NOT NULL CHECK (head_account_creation_atomic >= 0),
  head_account_streamed_atomic admin_finance.atomic_amount NOT NULL CHECK (head_account_streamed_atomic >= 0),
  head_account_income_atomic admin_finance.atomic_amount NOT NULL CHECK (head_account_income_atomic >= 0),
  company_revenue_atomic admin_finance.atomic_amount NOT NULL CHECK (company_revenue_atomic >= 0),
  company_revenue_rate_basis_points integer NOT NULL CHECK (company_revenue_rate_basis_points BETWEEN 0 AND 10000),
  target_basis_points integer NOT NULL CHECK (target_basis_points BETWEEN 0 AND 10000),
  gap_basis_points integer NOT NULL CHECK (gap_basis_points BETWEEN -10000 AND 10000),
  target_revenue_atomic admin_finance.atomic_amount NOT NULL CHECK (target_revenue_atomic >= 0),
  surplus_atomic admin_finance.atomic_amount NOT NULL CHECK (surplus_atomic >= 0),
  shortfall_atomic admin_finance.atomic_amount NOT NULL CHECK (shortfall_atomic >= 0),
  attribution_status text NOT NULL CHECK (attribution_status IN ('COMPLETE', 'PARTIAL')),
  reconciliation_status text NOT NULL CHECK (reconciliation_status IN ('NOT_RUN', 'RECONCILING', 'RECONCILED', 'EXCEPTION', 'BLOCKED')),
  audit_event_id uuid NOT NULL REFERENCES admin_finance.audit_events(audit_event_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_to > period_from),
  CHECK (platform_fee_delta_atomic + platform_fee_partner_atomic = platform_fee_total_atomic),
  CHECK (head_account_creation_atomic + head_account_streamed_atomic = head_account_income_atomic),
  CHECK (platform_fee_total_atomic + head_account_income_atomic = company_revenue_atomic),
  CHECK (gap_basis_points = company_revenue_rate_basis_points - target_basis_points),
  CHECK ((surplus_atomic = 0) OR (shortfall_atomic = 0)),
  UNIQUE (period_from, period_to, as_of_block_number, token_id)
);

CREATE TABLE admin_finance.company_economics_buckets (
  company_economics_bucket_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_economics_snapshot_id uuid NOT NULL REFERENCES admin_finance.company_economics_snapshots(company_economics_snapshot_id),
  bucket_start timestamptz NOT NULL,
  bucket_end timestamptz NOT NULL,
  incoming_flow_atomic admin_finance.atomic_amount NOT NULL CHECK (incoming_flow_atomic >= 0),
  platform_fee_delta_atomic admin_finance.atomic_amount NOT NULL CHECK (platform_fee_delta_atomic >= 0),
  platform_fee_partner_atomic admin_finance.atomic_amount NOT NULL CHECK (platform_fee_partner_atomic >= 0),
  platform_fee_total_atomic admin_finance.atomic_amount NOT NULL CHECK (platform_fee_total_atomic >= 0),
  head_account_creation_atomic admin_finance.atomic_amount NOT NULL CHECK (head_account_creation_atomic >= 0),
  head_account_streamed_atomic admin_finance.atomic_amount NOT NULL CHECK (head_account_streamed_atomic >= 0),
  head_account_income_atomic admin_finance.atomic_amount NOT NULL CHECK (head_account_income_atomic >= 0),
  company_revenue_atomic admin_finance.atomic_amount NOT NULL CHECK (company_revenue_atomic >= 0),
  company_revenue_rate_basis_points integer NOT NULL CHECK (company_revenue_rate_basis_points BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (bucket_end > bucket_start),
  CHECK (platform_fee_delta_atomic + platform_fee_partner_atomic = platform_fee_total_atomic),
  CHECK (head_account_creation_atomic + head_account_streamed_atomic = head_account_income_atomic),
  CHECK (platform_fee_total_atomic + head_account_income_atomic = company_revenue_atomic),
  UNIQUE (company_economics_snapshot_id, bucket_start, bucket_end)
);

CREATE TRIGGER company_economics_snapshots_append_only
BEFORE UPDATE OR DELETE ON admin_finance.company_economics_snapshots
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE TRIGGER company_economics_buckets_append_only
BEFORE UPDATE OR DELETE ON admin_finance.company_economics_buckets
FOR EACH ROW EXECUTE FUNCTION admin_finance.reject_mutation();

CREATE INDEX raw_chain_events_block_idx
  ON admin_finance.raw_chain_events (chain_id, block_number, log_index);
CREATE INDEX chain_event_statuses_latest_idx
  ON admin_finance.chain_event_statuses (raw_event_id, observed_at DESC);
CREATE INDEX token_transfers_addresses_idx
  ON admin_finance.token_transfers (from_address, to_address);
CREATE INDEX cycles_participant_opened_idx
  ON admin_finance.cycles (participant_id, opened_at DESC);
CREATE INDEX cycles_status_close_idx
  ON admin_finance.cycles (status, expected_close_at);
CREATE INDEX claims_due_status_idx
  ON admin_finance.claims (status, due_at);
CREATE INDEX claims_participant_paid_idx
  ON admin_finance.claims (participant_id, paid_at DESC);
CREATE INDEX obligations_due_idx
  ON admin_finance.payout_obligations (status, due_at, obligation_type);
CREATE INDEX ledger_postings_account_idx
  ON admin_finance.ledger_postings (ledger_account_id, created_at);
CREATE INDEX reconciliation_exceptions_open_idx
  ON admin_finance.reconciliation_exceptions (severity, opened_at DESC)
  WHERE status IN ('OPEN', 'INVESTIGATING');
CREATE INDEX forecast_buckets_time_idx
  ON admin_finance.forecast_buckets (bucket_start, bucket_end);
CREATE INDEX participant_wallet_hash_idx
  ON admin_finance.participant_wallet_refs (chain_id, wallet_hash);
CREATE INDEX audit_events_resource_idx
  ON admin_finance.audit_events (resource_type, resource_id, occurred_at DESC);

REVOKE ALL ON ALL TABLES IN SCHEMA admin_finance FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA admin_finance FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA admin_finance FROM PUBLIC;

COMMIT;
