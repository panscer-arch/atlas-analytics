import assert from "node:assert/strict";

const endpoint = process.env.ATLAS_CONTRACT_FLOW_URL || "http://127.0.0.1:8787/api/contracts/atlas-flows";
const response = await fetch(endpoint, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(180000),
});
const snapshot = await response.json();

assert.equal(response.ok, true, snapshot?.error || `HTTP ${response.status}`);
assert.equal(snapshot.ok, true, snapshot?.error || "atlas flow snapshot failed");

const contracts = snapshot.contracts || [];
const byId = new Map(contracts.map((contract) => [contract.id, contract]));
for (const id of ["lockup-flow", "daily-flow", "daily-flow-legacy"]) {
  assert.ok(byId.has(id), `missing contract ${id}`);
}

assert.equal(byId.get("daily-flow").status, "pending-activation");
assert.equal(byId.get("daily-flow-legacy").status, "legacy");
assert.ok(byId.get("daily-flow-legacy").stateOrders > 0, "legacy Daily Flow history is missing");

for (const contract of contracts) {
  assert.equal(
    contract.stateOrders,
    contract.expectedStateOrders,
    `${contract.id}: not every getOrder entry was read`,
  );
  const expectedRemaining = Number(contract.provided) - Number(contract.claimed) - Number(contract.fee);
  assert.ok(
    Math.abs(Number(contract.remaining) - expectedRemaining) < 0.00001,
    `${contract.id}: remaining total does not reconcile`,
  );
}

assert.equal(snapshot.failures?.length || 0, 0, "receipt or order-state failures detected");
assert.equal(snapshot.diagnostics?.orderStateFailures?.length || 0, 0, "getOrder failures detected");
assert.equal(snapshot.diagnostics?.duplicateLockedEvents?.length || 0, 0, "duplicate Locked events detected");
assert.equal(snapshot.diagnostics?.duplicateLockupClaims?.length || 0, 0, "duplicate Lockup Claim events detected");
assert.equal(snapshot.diagnostics?.unmatchedClaimEvents?.length || 0, 0, "Claim without matching order detected");

const stateOrders = contracts.reduce((sum, contract) => sum + Number(contract.stateOrders || 0), 0);
assert.equal(snapshot.cycleStats?.totals?.total, stateOrders, "cycle total must come from contract state");

const provided = contracts.reduce((sum, contract) => sum + Number(contract.provided || 0), 0);
const claimed = contracts.reduce((sum, contract) => sum + Number(contract.claimed || 0), 0);
const fee = contracts.reduce((sum, contract) => sum + Number(contract.fee || 0), 0);
assert.ok(Math.abs(Number(snapshot.totals?.provided) - provided) < 0.00001, "provided total mismatch");
assert.ok(Math.abs(Number(snapshot.totals?.claimed) - claimed) < 0.00001, "claimed total mismatch");
assert.ok(Math.abs(Number(snapshot.totals?.fee) - fee) < 0.00001, "fee total mismatch");

const partnerTotals = snapshot.partnerProgram?.totals || {};
assert.ok(
  Math.abs(Number(partnerTotals.totalDelta) - Number(partnerTotals.lockupDelta) - Number(partnerTotals.dailyDelta)) < 0.00001,
  "partner Delta total mismatch",
);
assert.ok(
  Number(snapshot.partnerProgram?.platformCommission?.estimatedTotalFee || 0)
    >= Number(snapshot.partnerProgram?.platformCommission?.collectedFee || 0),
  "estimated total fee cannot be below collected fee",
);

console.log(JSON.stringify({
  ok: true,
  endpoint,
  stateOrders,
  recoveredLockedEvents: snapshot.diagnostics?.recoveredLockedEvents || 0,
  totals: snapshot.totals,
}, null, 2));
