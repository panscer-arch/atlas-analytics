const VALID_DATA_SOURCES = new Set(["disabled", "static-demo", "api"]);
const VALID_RELEASE_SCOPES = new Set(["mvp", "full"]);

export const adminFinanceMvpSections = Object.freeze([
  "reconciliation",
  "flows",
  "liquidity",
  "cycles",
  "claims",
]);

export const adminFinanceMvpUtilitySections = Object.freeze(["methodology"]);

export function resolveAdminFinanceDataSource(value) {
  const defaultSource = import.meta.env?.DEV ? "static-demo" : "disabled";
  const normalized = String(value || defaultSource).trim().toLowerCase();
  if (!VALID_DATA_SOURCES.has(normalized)) {
    throw new Error(`Unsupported VITE_ADMIN_FINANCE_DATA_SOURCE: ${normalized}`);
  }
  return normalized;
}

export const adminFinanceDataSource = resolveAdminFinanceDataSource(
  import.meta.env?.VITE_ADMIN_FINANCE_DATA_SOURCE,
);

export const adminFinanceApiEnabled = adminFinanceDataSource === "api";
export const adminFinanceDisabled = adminFinanceDataSource === "disabled";

export function resolveAdminFinanceDefaultAsOfDate({
  apiEnabled,
  demoDate,
  now = new Date(),
}) {
  if (!apiEnabled) return demoDate;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Admin Finance as-of date requires a valid Date.");
  }
  return now.toISOString().slice(0, 10);
}

export function resolveAdminFinanceMvpRedirect(section, mvpMode) {
  return mvpMode && section === "overview" ? "/admin/flows" : null;
}

export function resolveAdminFinanceReleaseScope(value) {
  const defaultScope = import.meta.env?.DEV ? "full" : "mvp";
  const normalized = String(value || defaultScope).trim().toLowerCase();
  if (!VALID_RELEASE_SCOPES.has(normalized)) {
    throw new Error(`Unsupported VITE_ADMIN_FINANCE_RELEASE_SCOPE: ${normalized}`);
  }
  return normalized;
}

export const adminFinanceReleaseScope = resolveAdminFinanceReleaseScope(
  import.meta.env?.VITE_ADMIN_FINANCE_RELEASE_SCOPE,
);
