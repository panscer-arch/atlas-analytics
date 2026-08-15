export const GROWTH_PLAN_DRAFT_KEY = "atlas.admin-finance.growth-draft.v1";
export const DEFAULT_GROWTH_PLAN_DRAFT = Object.freeze({
  schemaVersion: 1,
  baseline: 100,
  actual: 3.3,
  elapsedDays: 13,
  updatedAt: null,
});

function finiteNumber(value, min, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function parseGrowthPlanDraft(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || value.schemaVersion !== 1) return { ...DEFAULT_GROWTH_PLAN_DRAFT };
    const baseline = finiteNumber(value.baseline, 0);
    const actual = finiteNumber(value.actual, 0);
    const elapsedDays = finiteNumber(value.elapsedDays, 1, 31);
    if (baseline === null || actual === null || elapsedDays === null || !Number.isInteger(elapsedDays)) {
      return { ...DEFAULT_GROWTH_PLAN_DRAFT };
    }
    return {
      schemaVersion: 1,
      baseline,
      actual,
      elapsedDays,
      updatedAt: typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null,
    };
  } catch {
    return { ...DEFAULT_GROWTH_PLAN_DRAFT };
  }
}

export function createGrowthPlanDraft(value, updatedAt = new Date().toISOString()) {
  return parseGrowthPlanDraft(JSON.stringify({ ...value, schemaVersion: 1, updatedAt }));
}
