# Atlas Admin Finance: golden fixtures

`golden-fixtures.v1.json` is the executable acceptance set for the canonical
financial model. It is intentionally independent of demo values rendered by the
React screens.

`forecast-input.v1.valid.json` is the positive provider fixture for the R1.1
committed cash forecast contract. Its schema lives in
`../contracts/forecast-input.v1.schema.json`; the executable invariant checks
run through `npm run test:admin-finance-forecast-input`.
The fixture payout contract address is synthetic and exists only for contract,
RPC-verifier and PostgreSQL runtime tests; it is not an approved live address.

## Rules

- Every field whose name ends in `Atomic` is a base-10 integer **string**.
- `decimals` belongs to the token definition and never changes the stored amount.
- Platform Fee is inside Gross Delta and must not be added to cash outflow twice.
- Partner Reward is a separate expense above Delta.
- Raw evidence is append-only; corrections and reorgs create new status or
  compensating records.
- `0`, empty dataset, stale value and unavailable value are different states.

The current rates and rank behavior in these examples are explicit fixture
inputs. They do not become production rules until the corresponding effective-
dated ruleset and Gate 0 evidence are approved.

## Required execution layers

1. Unit tests for money parsing and payout arithmetic.
2. Projection tests that feed events in ordered, duplicate and out-of-order form.
3. PostgreSQL integration tests for uniqueness, append-only and balanced-ledger
   constraints.
4. API authorization tests for wallet reveal, exports and adjustments.
5. Restore drill that compares ledger, audit heads and reconciliation result.

Run the repository-level structural verifier with:

```bash
npm run test:admin-finance-contracts
```

That verifier is a preflight check only. Passing it is not production acceptance;
the same cases must run against the deployed staging database, ingest pipeline and
Admin API.
