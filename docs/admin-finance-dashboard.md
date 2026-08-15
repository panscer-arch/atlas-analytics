# Atlas Admin Finance Dashboard

## Current implementation status

- All 14 routes exist as interactive visual prototypes: `/admin/overview`, `/admin/flows`, `/admin/cycles`, `/admin/forecast`, `/admin/claims`, `/admin/participants`, `/admin/company-revenue`, `/admin/head-account`, `/admin/liquidity`, `/admin/traffic`, `/admin/campaigns`, `/admin/reconciliation`, `/admin/risks` and `/admin/methodology`.
- Six routes have demo API slices: Overview, Flows, Cycles, Forecast, Claims and Participants. Methodology only loads part of Gate 0; the remaining screens are static-only prototypes.
- No route is product-approved or Figma-approved yet. The current shell and mobile layouts require reconciliation with the real Atlas cabinet before handoff.
- Interactive period selector, as-of date, methodology dialog, risk jump and CSV export.
- Cash flow, stress exposure, cycle demand and company revenue visualizations.
- Explicit `DEMO` source state until production data contracts and reconciliation rules pass Gate 0.

## Data boundary

The finance frontend must remain read-only. It must not calculate canonical financial values in the browser and must not connect directly to contracts, provider databases or private signing infrastructure. Production values must arrive from the canonical Admin API with source, block, freshness, finality and reconciliation metadata.

## Money flows

`/admin/flows` separates Payout Contract, Atlas Consolidated and Company Treasury. Internal transfers are visible in the contract perimeter but excluded from consolidated external flow. The page includes incoming/outgoing/net time series, cycle mix, partner rate and outgoing waterfall.

## Claims and payouts

`/admin/claims` is API-backed in demo mode and separates eligible, requested, pending, failed, paid, reversed and expired states. Failed claims remain in open exposure until terminal evidence exists. The detail view reconciles principal, gross delta and partner rewards with Platform Fee inside gross; missing transfer lineage and claim-delay history are shown as partial source coverage rather than reconstructed in the browser.

## Participants and leaders

`/admin/participants` is API-backed in demo mode for exact participant search, a masked aggregate profile and a partial first-line resource. Partial wallet prefixes return no participant data; the client rejects an unmasked EVM address. Rank history, growth series, KPI plans, company funding, notes and wallet reveal remain unavailable until their protected endpoints, RBAC/MFA and immutable audit log exist. The static design mode still contains local interaction mockups, but they are never mixed into API mode.

## Company revenue

`/admin/company-revenue` separates cash-recognized Platform Fee from Head Account rewards. Platform Fee remains inside gross and is never added to payout obligations twice. Same-period cash timing is labeled separately from cohort take rate; net profit remains unavailable until OPEX, taxes and reserves have canonical sources. API mode uses the strict read-only `/finance/company-economics` aggregate and bucket contract; incomplete transfer attribution remains `PARTIAL` and unavailable data remains `N/A` without static-demo fallback. The API screen renders each contiguous UTC bucket as a four-component revenue stack, compares its Company Revenue Rate with the versioned target and exposes the exact incoming-flow, revenue and rate gap in a compact drill-down table.

The transaction register joins strict read-only Platform Fee allocations with Company Treasury receipts by `sourceEventId`. It exposes receipt/allocation transaction hashes, Gross, fee rate, cycle, block/log, finality and reconciliation status without returning participant wallet addresses. A receipt is not treated as reconciled merely because both hashes are present.

## Head account

`/admin/head-account` monitors the independently calculated partner status, personal-cycle expiry, first-line and structural qualification, branch-level Head Account receipts, scenario income at risk and protected company-owned wallets. Demo status/rate values must not be treated as contract facts until the Partner API and versioned ruleset agree at the same as-of block.

Direct head-account branches use a stable scoped ordinal (`Branch #N`). The
screen shows branch/head rates, compression gap, verified receipts and
near/matched/recovered transitions. The ordinal is not a database row number,
never grants additional access and is never reused after retirement.

## Liquidity

`/admin/liquidity` keeps payout-contract cash, consolidated flows, company treasury and LP valuation in distinct perimeters. Available Contract Balance equals on-chain cash minus restricted funds; Spendable Above Reserve subtracts Required Reserve once. The cash ladder starts from Available Contract Balance, is sequential, excludes unconfirmed future inflow and compares each closing balance with the reserve threshold once; LP value never closes a cash deficit automatically.

## Wallets and traffic

`/admin/traffic` separates GA4 sessions, browser wallet events, server-confirmed wallets and finalized on-chain cycle creation. The funnel exposes every transition instead of treating a UI event as registration. Wallet segmentation includes new, returning, zero-balance, no-cycle, active-cycle and cohort-conversion views. The source tab reports freshness, SLA, checkpoint and linkage coverage; direct wallet addresses and transaction hashes must never be sent to GA4.

## Campaigns and cohorts

`/admin/campaigns` joins actual campaign spend to pseudonymous wallet cohorts and finalized first-cycle facts. Unattributed cycles remain a separate mandatory bucket. Same-period totals are kept distinct from 30/60/90-day cohort economics, and observed attribution ROI is not presented as causal incrementality. Campaigns with disputed arithmetic or missing ruleset versions remain visible but are excluded from company-receipt totals until review is resolved.

## Data reconciliation

`/admin/reconciliation` records an immutable reconciliation run at one block hash and UTC cut. Every economic component can be traced through contract event, successful receipt, token transfer and ledger classification. Exceptions retain amount, severity, owner, deadline, evidence and audit trail. Unknown rulesets, orphan transfers, reorg candidates and balance residuals block `reconciled`. Source events are immutable; manual adjustments create separate ledger entries and require independent four-eyes approval.

## Risk control

`/admin/risks` consolidates source-owned signals from the payout forecast, liquidity, reconciliation, head account, revenue rules and data-freshness monitors. The Risk Center does not recalculate canonical finance values: every alert carries its source route, severity, observed value or exposure, owner, deadline and calculation metadata. Acknowledgement means that an operator has seen the signal; it neither resolves the source condition nor changes financial data. Closure requires source normalization or a separately authorized and audited risk acceptance.

Thresholds are versioned backend policy, not frontend constants. A production rule change requires `risk_rule.write`, MFA step-up and a tamper-evident audit event. The values currently visible in the React screen are explicitly marked as UI-only demonstration data until Gate 0 approves the reserve policy, alert taxonomy, delivery matrix and escalation owners.

## Methodology and access

`/admin/methodology` is the canonical UI registry for financial perimeters, source precedence and health, formula and ruleset versions, RBAC, step-up access, audit events, export jobs, Gate 0 decisions and mandatory UI states. It does not expose secrets or perform authorization in the browser. Controlled-address reveal and financial export are modelled as server-authorized operations requiring purpose, permission, MFA, a short-lived result and an append-only audit event.

The methodology registry is versioned and effective-dated. Published versions are immutable; corrections create a new version with author, approver and effective interval. Every production financial response must contain snapshot identity, calculation identity, freshness/partial state, reconciliation status and traceability metadata. Missing metadata blocks the value from being presented as a production financial fact.

## Next phase

First approve shell and screens one by one, then package them into a separate programmer specification: Admin API contracts, database and ledger models, event/ruleset registries, source adapters, reconciliation and forecast jobs, RBAC/MFA policy, audit and export services, non-functional requirements, migration order and acceptance criteria. Production integration remains blocked until all 14 Gate 0 decisions are signed and testable.

## Verification

- `npm run build`
- Browser QA: desktop and 390x844 mobile viewports
- No horizontal document overflow
- No browser console errors
- Period switch, methodology dialog, mobile drawer and CSV download verified
- Claims lifecycle filtering, failed detail, payout-component balance and partial-source state verified
- Participant exact/hint search, wallet masking, payout reconciliation and protected-resource fail-closed states verified
- Risk severity filtering, acknowledgement status, source drawer and threshold dialog verified
- Methodology tabs, source filtering, hash navigation, step-up reveal/export, RBAC matrix and Gate 0 detail verified

Visual evidence is stored in:

`/Users/digitex/Desktop/Проект2/outputs/atlas-admin-finance-dashboard-2026-08-04/react-screens/`
