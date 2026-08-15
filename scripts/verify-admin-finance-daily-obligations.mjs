import assert from "node:assert/strict";
import {
  buildApiObligations,
  demoDailyObligations,
  obligationArithmeticBalances,
} from "../src/modules/admin-finance/data/dailyObligations.js";

assert.equal(demoDailyObligations.length, 31);
assert.equal(demoDailyObligations[0].date, "2026-08-01");
assert.equal(demoDailyObligations[30].periodEnd, "2026-09-01");
assert(demoDailyObligations.every(obligationArithmeticBalances));
assert(demoDailyObligations.every((day) => Math.abs(day.rows.reduce((sum, row) => sum + row.total, 0) - day.total) < 0.01));
assert(demoDailyObligations.flatMap((day) => day.rows).filter((row) => row.flow === "lockup").every((row) => row.partnerStreamed === 0));
assert(demoDailyObligations.flatMap((day) => day.rows).filter((row) => row.flow === "daily").every((row) => Math.abs(row.partnerCreation * 4 - row.partnerStreamed) < 0.02));

const peak = demoDailyObligations.reduce((current, day) => day.total > current.total ? day : current);
assert.equal(peak.date, "2026-08-18");
assert.equal(peak.total, 17800);

const money = (amount) => ({ amountRaw: String(amount * 1_000_000), decimals: 6 });
const apiRows = buildApiObligations([{
  id: "81000000-0000-4000-8000-000000000001",
  bucketStart: "2026-08-12T00:00:00Z",
  bucketEnd: "2026-08-19T00:00:00Z",
  cycleCount: 34,
  principalDue: money(100),
  grossDeltaDue: money(20),
  partnerRewardDue: money(8),
  pendingPartnerCreationDue: money(2),
  totalOutflowDue: money(130),
  expectedInflow: money(0),
  openingLiquidity: money(1000),
  closingLiquidity: money(870),
  reserveTarget: money(250),
  fundingGap: money(0),
}], (value) => Number(value.amountRaw) / 1_000_000);

assert.equal(apiRows[0].durationDays, 7);
assert.equal(apiRows[0].isDaily, false);
assert.equal(apiRows[0].rows, null);
assert(obligationArithmeticBalances(apiRows[0]));

console.log("Admin Finance daily obligations checks passed.");
