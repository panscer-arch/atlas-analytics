import assert from "node:assert/strict";
import {
  buildDemoReserveFundingPlan,
  buildReserveDeliveryJournal,
  buildReserveFundingEpisodes,
} from "../src/modules/admin-finance/data/reserveFundingPlan.js";

const [demo] = buildDemoReserveFundingPlan("2026-08-04");
assert.equal(demo.firstBreachDate, "2026-09-14");
assert.equal(demo.minimumTopUp, 4_641);
assert.equal(demo.policyBuffer, null);
const journal = buildReserveDeliveryJournal(demo);
assert.equal(journal.length, 4);
assert.equal(journal[0].idempotencyRef, "reserve:funding-2026-09-14:d-7");
assert.equal(journal[0].inApp, "scheduled");
assert.equal(journal[0].telegram, "not_connected");
assert.equal(journal[0].attemptCount, 0);
assert.deepEqual(demo.checkpoints.map(({ label, date, status }) => ({ label, date, status })), [
  { label: "D−7", date: "2026-09-07", status: "planned" },
  { label: "D−3", date: "2026-09-11", status: "planned" },
  { label: "D−1", date: "2026-09-13", status: "planned" },
]);

const [due] = buildDemoReserveFundingPlan("2026-09-11");
assert.equal(due.status, "due");
assert.equal(due.checkpoints[0].status, "missed");
assert.equal(due.checkpoints[1].status, "due");

const grouped = buildReserveFundingEpisodes([
  { date: "2026-08-10", periodEnd: "2026-08-11", fundingGap: 100, reserveTarget: 25_000 },
  { date: "2026-08-11", periodEnd: "2026-08-12", fundingGap: 350, reserveTarget: 25_000 },
  { date: "2026-08-12", periodEnd: "2026-08-13", fundingGap: 0, reserveTarget: 25_000 },
  { date: "2026-08-14", periodEnd: "2026-08-15", fundingGap: 50, reserveTarget: 25_000 },
], { asOf: "2026-08-01", sourceStatus: "api" });
assert.equal(grouped.length, 2);
assert.equal(grouped[0].bucketCount, 2);
assert.equal(grouped[0].peakGap, 350);
assert.equal(grouped[0].peakDate, "2026-08-11");
assert.equal(grouped[1].minimumTopUp, 50);

assert.deepEqual(buildReserveFundingEpisodes([
  { date: "2026-08-10", fundingGap: 0 },
], { asOf: "2026-08-01" }), []);

console.log("Admin Finance reserve funding plan: OK");
