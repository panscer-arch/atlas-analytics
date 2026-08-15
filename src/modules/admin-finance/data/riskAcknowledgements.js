export const RISK_ACKNOWLEDGEMENTS_KEY = "atlas.admin.finance.risk-acknowledgements.v1";

export function parseRiskAcknowledgements(value, allowedIds = []) {
  const allowed = new Set(allowedIds);
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id) => typeof id === "string" && allowed.has(id)))];
  } catch {
    return [];
  }
}

export function addRiskAcknowledgements(current, ids, allowedIds = []) {
  return parseRiskAcknowledgements([...(Array.isArray(current) ? current : []), ...ids], allowedIds);
}
