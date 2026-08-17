import assert from "node:assert/strict";
import { once } from "node:events";
import { createAdminFinanceServer } from "../server/admin-finance-api.mjs";

const sessionToken = "test-admin-session-token-000000000000000000000001";
const cursorSecret = "test-cursor-signing-secret-00000000000000000001";
const allowedOrigin = "http://127.0.0.1:4186";

assert.throws(
  () => createAdminFinanceServer({ mode: "production", sessionToken, cursorSecret, allowedOrigins: [allowedOrigin] }),
  /requires explicit demo or alpha mode/,
);
assert.throws(
  () => createAdminFinanceServer({ mode: "demo", sessionToken: "short", cursorSecret, allowedOrigins: [allowedOrigin] }),
  /at least 32 characters/,
);

function assertAtomicStrings(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertAtomicStrings(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, entry]) => {
    if (key === "amountRaw" || key.endsWith("Atomic")) {
      assert.equal(typeof entry, "string", `${path}.${key} must be a string`);
      assert.match(entry, /^-?[0-9]+$/, `${path}.${key} must contain integer atomic units`);
    }
    assertAtomicStrings(entry, `${path}.${key}`);
  });
}

const server = createAdminFinanceServer({
  mode: "demo",
  sessionToken,
  cursorSecret,
  allowedOrigins: [allowedOrigin],
  rateLimitMax: 45,
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/api/admin/v1`;
const cookie = `__Host-atlas_admin_session=${encodeURIComponent(sessionToken)}`;

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Cookie: cookie,
      Origin: allowedOrigin,
      ...(options.headers ?? {}),
    },
  });
}

try {
  const unauthorized = await fetch(`${baseUrl}/meta`);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "no-store, private");
  assert.equal(unauthorized.headers.get("x-content-type-options"), "nosniff");
  assert.equal(unauthorized.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal((await unauthorized.json()).code, "admin_session_required");

  const crossOrigin = await request("/meta", { headers: { Origin: "https://attacker.example" } });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).code, "origin_not_allowed");

  const metaResponse = await request("/meta");
  assert.equal(metaResponse.status, 200);
  const meta = await metaResponse.json();
  assert.equal(meta.apiVersion, "1.0.0-draft");
  assert.equal(meta.status, "blocked_gate0");
  assert.deepEqual(meta.gateZero, { closed: 0, total: 14 });
  assert(meta.capabilities.includes("reconciliation.read"));
  assert(meta.capabilities.includes("management.growth_plan.read"));
  assert(meta.capabilities.includes("finance.company_economics.read"));
  assert(meta.capabilities.includes("finance.platform_fees.read"));
  assert(meta.capabilities.includes("finance.company_receipts.read"));
  assert(meta.capabilities.includes("risks.read"));

  const alertsResponse = await request("/alerts?severity=high&status=open&limit=20");
  assert.equal(alertsResponse.status, 200);
  const alerts = await alertsResponse.json();
  assert.equal(alerts.data.length, 1);
  assert.equal(alerts.data[0].sourceType, "reserve_funding_forecast");
  assert.equal(alerts.meta.partial, true);

  const deliveriesResponse = await request(`/alerts/${alerts.data[0].id}/deliveries`);
  assert.equal(deliveriesResponse.status, 200);
  const deliveries = await deliveriesResponse.json();
  assert.equal(deliveries.data.length, 12);
  assert.equal(deliveries.data.filter((item) => item.status === "scheduled").length, 4);
  assert.equal(deliveries.data.filter((item) => item.status === "blocked").length, 8);
  assert(deliveries.data.every((item) => item.attemptCount === 0));
  assert.equal(new Set(deliveries.data.map((item) => item.idempotencyKey)).size, 12);

  const missingDeliveries = await request("/alerts/91000000-0000-4000-8000-000000000099/deliveries");
  assert.equal(missingDeliveries.status, 404);

  const growthPlanResponse = await request("/management/growth-plan");
  assert.equal(growthPlanResponse.status, 200);
  const growthPlan = await growthPlanResponse.json();
  assert.equal(growthPlan.meta.perimeter, "company_treasury");
  assert.equal(growthPlan.meta.partial, true);
  assert.equal(growthPlan.data.status, "proposed");
  assert.equal(growthPlan.data.months.length, 12);
  assert.equal(growthPlan.data.months[0].flowTarget.amountRaw, "1500000000000");
  assert.equal(growthPlan.data.months[0].newWalletsTarget, 900);
  assert.equal(growthPlan.data.months[0].cyclesTarget, 4500);
  assert.equal(growthPlan.data.months[11].dailyCycleReference, 12975);
  assert.equal(growthPlan.data.plannedCompanyRevenueBasisPoints, 500);
  assertAtomicStrings(growthPlan);

  const growthPlanWrite = await request("/management/growth-plan", { method: "POST" });
  assert.equal(growthPlanWrite.status, 405);
  assert.equal(growthPlanWrite.headers.get("allow"), "GET");

  const partnerEconomicsResponse = await request("/finance/partner-economics?from=2026-07-29T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z");
  assert.equal(partnerEconomicsResponse.status, 200);
  const partnerEconomics = await partnerEconomicsResponse.json();
  assert.equal(partnerEconomics.meta.perimeter, "company_treasury");
  assert.equal(partnerEconomics.data.captureRateBasisPoints, 3500);
  assert.equal(partnerEconomics.data.targetBasisPoints, 3500);
  assert.equal(partnerEconomics.data.series.length, 7);
  assert.equal(
    BigInt(partnerEconomics.data.atlasReferralIncomeAtCreation.amountRaw) + BigInt(partnerEconomics.data.atlasReferralIncomeStreamed.amountRaw),
    BigInt(partnerEconomics.data.atlasReferralIncome.amountRaw),
  );
  assertAtomicStrings(partnerEconomics);

  const partnerEconomicsWrite = await request("/finance/partner-economics", { method: "POST" });
  assert.equal(partnerEconomicsWrite.status, 405);
  assert.equal(partnerEconomicsWrite.headers.get("allow"), "GET");

  const companyEconomicsResponse = await request("/finance/company-economics?from=2026-07-29T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z");
  assert.equal(companyEconomicsResponse.status, 200);
  const companyEconomics = await companyEconomicsResponse.json();
  assert.equal(companyEconomics.meta.perimeter, "company_treasury");
  assert.equal(companyEconomics.meta.partial, true);
  assert.equal(companyEconomics.data.companyRevenueRateBasisPoints, 450);
  assert.equal(companyEconomics.data.targetBasisPoints, 400);
  assert.equal(companyEconomics.data.series.length, 7);
  assert.equal(
    BigInt(companyEconomics.data.platformFeeTotal.amountRaw) + BigInt(companyEconomics.data.headAccountIncome.amountRaw),
    BigInt(companyEconomics.data.companyRevenue.amountRaw),
  );
  assert.equal(
    BigInt(companyEconomics.data.companyRevenue.amountRaw) - BigInt(companyEconomics.data.targetRevenue.amountRaw),
    BigInt(companyEconomics.data.surplus.amountRaw),
  );
  assertAtomicStrings(companyEconomics);

  const companyEconomicsWrite = await request("/finance/company-economics", { method: "POST" });
  assert.equal(companyEconomicsWrite.status, 405);
  assert.equal(companyEconomicsWrite.headers.get("allow"), "GET");

  const platformFeesResponse = await request("/finance/platform-fees?from=2026-07-29T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&limit=100");
  assert.equal(platformFeesResponse.status, 200);
  const platformFees = await platformFeesResponse.json();
  assert.equal(platformFees.data.length, 6);
  assert.equal(platformFees.meta.perimeter, "company_treasury");
  assert.equal(platformFees.data.reduce((sum, row) => sum + BigInt(row.platformFee.amountRaw), 0n), 625000000n);
  assertAtomicStrings(platformFees);

  const companyReceiptsResponse = await request("/finance/company-receipts?from=2026-07-29T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&limit=100");
  assert.equal(companyReceiptsResponse.status, 200);
  const companyReceipts = await companyReceiptsResponse.json();
  assert.equal(companyReceipts.data.length, 10);
  assert.equal(companyReceipts.meta.perimeter, "company_treasury");
  assert.equal(companyReceipts.data.reduce((sum, row) => sum + BigInt(row.amount.amountRaw), 0n), 829000000n);
  assertAtomicStrings(companyReceipts);

  const platformFeesWrite = await request("/finance/platform-fees", { method: "POST" });
  assert.equal(platformFeesWrite.status, 405);
  const companyReceiptsWrite = await request("/finance/company-receipts", { method: "POST" });
  assert.equal(companyReceiptsWrite.status, 405);

  const overviewQuery = "from=2026-07-29T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=atlas_consolidated";
  const overviewResponse = await request(`/finance/overview?${overviewQuery}`);
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json();
  assert.equal(overview.meta.perimeter, "atlas_consolidated");
  assert.equal(overview.meta.partial, false);
  assert.equal(overview.data.liquidity.perimeter, "payout_contract");
  assert.equal(overview.data.cycles.perimeter, "participant_economics");
  assert.equal(overview.data.companyRevenue.perimeter, "company_treasury");
  assert.equal(
    BigInt(overview.data.cashFlow.inflow.amountRaw) - BigInt(overview.data.cashFlow.outflow.amountRaw),
    BigInt(overview.data.cashFlow.netFlow.amountRaw),
  );
  assert.equal(
    BigInt(overview.data.companyRevenue.platformFee.amountRaw) + BigInt(overview.data.companyRevenue.headAccount.amountRaw),
    BigInt(overview.data.companyRevenue.total.amountRaw),
  );
  assertAtomicStrings(overview);

  const partialOverviewResponse = await request("/finance/overview?from=2026-07-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=atlas_consolidated");
  assert.equal(partialOverviewResponse.status, 200);
  const partialOverview = await partialOverviewResponse.json();
  assert.equal(partialOverview.meta.partial, true);
  assert.equal(partialOverview.meta.sourceStatus, "partial");
  assert.deepEqual(partialOverview.meta.partialReasons, ["demo_overview_coverage_2026-07-29_to_2026-08-05"]);

  const invalidOverviewPerimeter = await request("/finance/overview?from=2026-07-29T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=payout_contract");
  assert.equal(invalidOverviewPerimeter.status, 400);
  assert.equal((await invalidOverviewPerimeter.json()).code, "overview_requires_consolidated_perimeter");

  const missingFilters = await request("/finance/cash-movements");
  assert.equal(missingFilters.status, 400);
  assert.equal((await missingFilters.json()).code, "missing_query_parameter");

  const query = "from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=payout_contract&limit=1";
  const firstPageResponse = await request(`/finance/cash-movements?${query}`);
  assert.equal(firstPageResponse.status, 200);
  const firstPage = await firstPageResponse.json();
  assert.equal(firstPage.data.length, 1);
  assert.equal(firstPage.page.hasMore, true);
  assert.equal(typeof firstPage.page.nextCursor, "string");
  assert.equal(firstPage.meta.perimeter, "payout_contract");
  assert.equal(firstPage.meta.sourceStatus, "ready");
  assert.equal(firstPage.meta.partial, false);
  assertAtomicStrings(firstPage);

  const consolidatedResponse = await request(`/finance/cash-movements?from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=atlas_consolidated&limit=500`);
  const payoutContractResponse = await request(`/finance/cash-movements?from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=payout_contract&limit=500`);
  const companyTreasuryResponse = await request(`/finance/cash-movements?from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=company_treasury&limit=500`);
  const [consolidated, payoutContract, companyTreasury] = await Promise.all([consolidatedResponse.json(), payoutContractResponse.json(), companyTreasuryResponse.json()]);
  const sum = (rows, key) => rows.reduce((total, row) => total + BigInt(row[key].amountRaw), 0n);
  assert(sum(payoutContract.data, "externalOut") > sum(consolidated.data, "externalOut"), "Payout Contract must retain controlled treasury transfers");
  assert.equal(sum(companyTreasury.data, "externalIn"), 829000000n, "Company Treasury demo receipts must reconcile to the overview");

  const partialCashResponse = await request(`/finance/cash-movements?from=2026-07-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=atlas_consolidated&limit=500`);
  const partialCash = await partialCashResponse.json();
  assert.equal(partialCash.meta.partial, true);
  assert.equal(partialCash.meta.sourceStatus, "partial");
  assert.equal(partialCash.data.length, 4);

  const secondPageResponse = await request(`/finance/cash-movements?${query}&cursor=${encodeURIComponent(firstPage.page.nextCursor)}`);
  assert.equal(secondPageResponse.status, 200);
  const secondPage = await secondPageResponse.json();
  assert.equal(secondPage.data.length, 1);
  assert.notEqual(secondPage.data[0].bucketStart, firstPage.data[0].bucketStart);

  const tamperedCursor = `${firstPage.page.nextCursor.slice(0, -1)}x`;
  const tamperedResponse = await request(`/finance/cash-movements?${query}&cursor=${encodeURIComponent(tamperedCursor)}`);
  assert.equal(tamperedResponse.status, 400);
  assert.equal((await tamperedResponse.json()).code, "invalid_cursor");

  const liquidityResponse = await request("/finance/liquidity/roll-forward?from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&perimeter=payout_contract&granularity=day");
  assert.equal(liquidityResponse.status, 200);
  const liquidity = await liquidityResponse.json();
  assert.equal(liquidity.data.summary.residual.amountRaw, "-5000000");
  assert.equal(liquidity.meta.reconciliationStatus, "exception");
  assertAtomicStrings(liquidity);

  const cyclesResponse = await request("/finance/cycles?from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T00%3A00%3A00Z&limit=10");
  assert.equal(cyclesResponse.status, 200);
  const cycles = await cyclesResponse.json();
  assert(cycles.data.length >= 2);
  assert.equal(cycles.meta.perimeter, "participant_economics");
  assert.equal(cycles.meta.partial, true);
  assert(cycles.meta.partialReasons.includes("demo_cycle_aggregates_without_transition_series_or_maturity_dates"));
  assert.equal(new Set(cycles.data.map((row) => row.productKey)).size, cycles.data.length);
  assertAtomicStrings(cycles);

  const claimsResponse = await request("/claims?from=2026-08-01T00%3A00%3A00Z&to=2026-08-05T23%3A59%3A59Z&status=paid&limit=10");
  assert.equal(claimsResponse.status, 200);
  const claims = await claimsResponse.json();
  assert.equal(claims.data.length, 1);
  assert.equal(claims.data[0].status, "paid");
  assert.equal(claims.meta.partial, true);
  assert(claims.meta.partialReasons.includes("demo_claim_sample_without_complete_transfer_lineage_or_delay_history"));
  assertAtomicStrings(claims);

  const allClaimsResponse = await request("/claims?from=2026-08-01T00%3A00%3A00Z&to=2026-08-06T00%3A00%3A00Z&limit=20");
  assert.equal(allClaimsResponse.status, 200);
  const allClaims = await allClaimsResponse.json();
  assert.deepEqual(new Set(allClaims.data.map((row) => row.status)), new Set(["eligible", "requested", "pending", "failed", "paid", "reversed", "expired"]));

  const claimId = claims.data[0].id;
  const claimResponse = await request(`/claims/${claimId}`);
  assert.equal(claimResponse.status, 200);
  const claim = await claimResponse.json();
  assert.equal(claim.data.id, claimId);
  assert.equal(claim.meta.partial, true);

  const participantSearchResponse = await request("/participants/search?q=atlas-a2049&limit=10");
  assert.equal(participantSearchResponse.status, 200);
  const participantSearch = await participantSearchResponse.json();
  assert.equal(participantSearch.data.length, 1);
  assert.equal(participantSearch.data[0].exact, true);
  assert.equal(participantSearch.data[0].maskedWallet, "0x71A4…9B2F");
  assert(!JSON.stringify(participantSearch).includes("0x71a4c8f200000000000000000000000000009b2f"));

  const participantOrdinalResponse = await request("/participants/search?q=333&limit=10");
  assert.equal(participantOrdinalResponse.status, 200);
  const participantOrdinal = await participantOrdinalResponse.json();
  assert.equal(participantOrdinal.data[0].matchType, "direct_referral_ordinal");
  assert.equal(participantOrdinal.data[0].headAccountBranchOrdinal, 333);

  const participantHintResponse = await request("/participants/search?q=0x71a4&limit=10");
  assert.equal(participantHintResponse.status, 200);
  const participantHint = await participantHintResponse.json();
  assert.deepEqual(participantHint.data, [], "Partial wallet prefixes must not disclose participant existence or attributes");

  const participantId = participantSearch.data[0].participantId;
  const participantResponse = await request(`/participants/${participantId}`);
  assert.equal(participantResponse.status, 200);
  const participant = await participantResponse.json();
  assert.equal(participant.data.id, participantId);
  assert.equal(participant.meta.partial, true);
  assert.equal(participant.data.walletRevealAvailable, false);
  assertAtomicStrings(participant);

  const firstLineResponse = await request(`/participants/${participantId}/first-line?limit=10`);
  assert.equal(firstLineResponse.status, 200);
  const firstLine = await firstLineResponse.json();
  assert.equal(firstLine.data.length, 4);
  assert.equal(firstLine.meta.partial, true);
  assert(firstLine.data.every((row) => !/^0x[0-9a-f]{40}$/i.test(row.maskedWallet)));

  const unavailableParticipantResource = await request(`/participants/${participantId}/payouts?limit=10`);
  assert.equal(unavailableParticipantResource.status, 422);
  assert.equal((await unavailableParticipantResource.json()).code, "participant_resource_unavailable");

  const exceptionResponse = await request("/reconciliation/exceptions?limit=2");
  assert.equal(exceptionResponse.status, 200);
  const exceptionPage = await exceptionResponse.json();
  assert.equal(exceptionPage.data.length, 2);
  assert.equal(exceptionPage.meta.reconciliationStatus, "exception");
  assertAtomicStrings(exceptionPage);

  const forecastSnapshotResponse = await request("/forecast/snapshots/latest?scenario=stress&perimeter=payout_contract");
  assert.equal(forecastSnapshotResponse.status, 200);
  const forecastSnapshot = await forecastSnapshotResponse.json();
  assert.equal(forecastSnapshot.data.scenario, "stress");
  assert.equal(forecastSnapshot.data.perimeter, "payout_contract");
  assert.equal(forecastSnapshot.meta.partial, true);
  assertAtomicStrings(forecastSnapshot);

  const forecastBucketsResponse = await request(`/forecast/buckets?snapshotId=${forecastSnapshot.data.id}&from=${encodeURIComponent(forecastSnapshot.data.asOf)}&to=${encodeURIComponent(forecastSnapshot.data.horizonEnd)}`);
  assert.equal(forecastBucketsResponse.status, 200);
  const forecastBuckets = await forecastBucketsResponse.json();
  assert(forecastBuckets.data.length >= 10);
  let previousClosing = null;
  for (const bucket of forecastBuckets.data) {
    const components = BigInt(bucket.principalDue.amountRaw)
      + BigInt(bucket.grossDeltaDue.amountRaw)
      + BigInt(bucket.partnerRewardDue.amountRaw)
      + BigInt(bucket.pendingPartnerCreationDue.amountRaw);
    assert.equal(components, BigInt(bucket.totalOutflowDue.amountRaw));
    assert.equal(BigInt(bucket.openingLiquidity.amountRaw) - components, BigInt(bucket.closingLiquidity.amountRaw));
    if (previousClosing !== null) assert.equal(BigInt(bucket.openingLiquidity.amountRaw), previousClosing);
    previousClosing = BigInt(bucket.closingLiquidity.amountRaw);
  }

  const uncalibratedBase = await request("/forecast/snapshots/latest?scenario=base&perimeter=payout_contract");
  assert.equal(uncalibratedBase.status, 422);
  assert.equal((await uncalibratedBase.json()).code, "forecast_scenario_not_calibrated");

  const uncalibratedCommitted = await request("/forecast/snapshots/latest?scenario=committed&perimeter=payout_contract");
  assert.equal(uncalibratedCommitted.status, 422);
  assert.equal((await uncalibratedCommitted.json()).code, "forecast_scenario_not_calibrated");

  const invalidRange = await request("/finance/cash-movements?from=2026-08-05T00%3A00%3A00Z&to=2026-08-01T00%3A00%3A00Z&perimeter=payout_contract");
  assert.equal(invalidRange.status, 400);
  assert.equal((await invalidRange.json()).code, "invalid_time_range");

  const unknown = await request("/not-a-resource");
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).code, "resource_not_found");

  const forbiddenMethod = await request("/claims", { method: "POST" });
  assert.equal(forbiddenMethod.status, 405);
  assert.equal(forbiddenMethod.headers.get("allow"), "GET");

  const finalAllowedRequest = await request("/meta");
  assert.equal(finalAllowedRequest.status, 200);
  const rateLimitedRequest = await request("/meta");
  assert.equal(rateLimitedRequest.status, 429);
  assert.equal((await rateLimitedRequest.json()).code, "rate_limit_exceeded");
  assert.match(rateLimitedRequest.headers.get("retry-after"), /^[0-9]+$/);

  console.log("Atlas Admin Finance demo API: OK");
  console.log("  fail-closed startup policy: OK");
  console.log("  session/origin guards: OK");
  console.log("  signed cursor and query validation: OK");
  console.log("  read-only finance resources: OK");
  console.log("  atomic money wire format: OK");
} finally {
  server.close();
  await once(server, "close");
}
