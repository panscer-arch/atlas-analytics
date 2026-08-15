import { augustLoad } from "./forecastLoad.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_OPENING_LIQUIDITY = 200_000;
const DEMO_RESERVE_TARGET = 25_000;

const productMix = Object.freeze([
  { id: "daily-100", label: "Daily 200 · $100", flow: "daily", weight: 46 },
  { id: "lockup-100", label: "Lockup 30 · $100", flow: "lockup", weight: 28 },
  { id: "daily-10000", label: "Daily 200 · $10,000", flow: "daily", weight: 20 },
  { id: "launch", label: "Launch", flow: "lockup", weight: 6 },
]);

function allocateInteger(total, weights) {
  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - allocated;
    const value = Math.floor(total * weight / 100);
    allocated += value;
    return value;
  });
}

function moneyFromCents(value) {
  return value / 100;
}

function dateId(day) {
  return new Date(Date.UTC(2026, 7, day)).toISOString().slice(0, 10);
}

export function buildDemoDailyObligations(load = augustLoad) {
  let openingLiquidity = DEMO_OPENING_LIQUIDITY;
  return load.map((loadThousands, index) => {
    const day = index + 1;
    const totalCents = Math.round(loadThousands * 1000 * 100);
    const productTotals = allocateInteger(totalCents, productMix.map((item) => item.weight));
    const totalCycles = Math.max(1, Math.round(totalCents / 100 / 350));
    const cycleCounts = allocateInteger(totalCycles, productMix.map((item) => item.weight));
    const rows = productMix.map((product, productIndex) => {
      const [principal, delta, partner] = allocateInteger(productTotals[productIndex], [72, 18, 10]);
      const [partnerCreation, partnerStreamed] = product.flow === "daily"
        ? allocateInteger(partner, [20, 80])
        : [partner, 0];
      return {
        id: product.id,
        label: product.label,
        flow: product.flow,
        cycles: cycleCounts[productIndex],
        principal: moneyFromCents(principal),
        delta: moneyFromCents(delta),
        partnerCreation: moneyFromCents(partnerCreation),
        partnerStreamed: moneyFromCents(partnerStreamed),
        total: moneyFromCents(productTotals[productIndex]),
      };
    });
    const components = rows.reduce((result, row) => ({
      principal: result.principal + row.principal,
      delta: result.delta + row.delta,
      partnerCreation: result.partnerCreation + row.partnerCreation,
      partnerStreamed: result.partnerStreamed + row.partnerStreamed,
    }), { principal: 0, delta: 0, partnerCreation: 0, partnerStreamed: 0 });
    const total = moneyFromCents(totalCents);
    const closingLiquidity = openingLiquidity - total;
    const fundingGap = Math.max(0, DEMO_RESERVE_TARGET - closingLiquidity);
    const result = {
      id: dateId(day),
      date: dateId(day),
      periodEnd: dateId(day + 1),
      durationDays: 1,
      isDaily: true,
      sourceStatus: "demo",
      cycles: rows.reduce((sum, row) => sum + row.cycles, 0),
      openingLiquidity,
      confirmedInflow: 0,
      closingLiquidity,
      reserveTarget: DEMO_RESERVE_TARGET,
      fundingGap,
      total,
      components,
      rows,
    };
    openingLiquidity = closingLiquidity;
    return result;
  });
}

export function buildApiObligations(buckets, moneyValue) {
  return buckets.map((bucket) => {
    const durationDays = Math.round((Date.parse(bucket.bucketEnd) - Date.parse(bucket.bucketStart)) / DAY_MS);
    const components = {
      principal: moneyValue(bucket.principalDue),
      delta: moneyValue(bucket.grossDeltaDue),
      partnerCreation: moneyValue(bucket.pendingPartnerCreationDue),
      partnerStreamed: moneyValue(bucket.partnerRewardDue),
    };
    return {
      id: bucket.id,
      date: bucket.bucketStart.slice(0, 10),
      periodEnd: bucket.bucketEnd.slice(0, 10),
      durationDays,
      isDaily: durationDays === 1,
      sourceStatus: "api",
      cycles: bucket.cycleCount,
      openingLiquidity: moneyValue(bucket.openingLiquidity),
      confirmedInflow: moneyValue(bucket.expectedInflow),
      closingLiquidity: moneyValue(bucket.closingLiquidity),
      reserveTarget: moneyValue(bucket.reserveTarget),
      fundingGap: moneyValue(bucket.fundingGap),
      total: moneyValue(bucket.totalOutflowDue),
      components,
      rows: null,
    };
  });
}

export function obligationArithmeticBalances(item) {
  const componentTotal = Object.values(item.components).reduce((sum, value) => sum + value, 0);
  const cashBalance = item.openingLiquidity + item.confirmedInflow - item.total;
  return Math.abs(componentTotal - item.total) < 0.01
    && Math.abs(cashBalance - item.closingLiquidity) < 0.01;
}

export const demoDailyObligations = Object.freeze(buildDemoDailyObligations());
