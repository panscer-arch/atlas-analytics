import { useCallback, useEffect, useState } from "react";
import { adminFinanceApi, AdminFinanceApiError } from "./adminFinanceApi";
import { adminFinanceApiEnabled, adminFinanceDisabled } from "./adminFinanceConfig";

function initialState() {
  if (adminFinanceDisabled) return { status: "disabled", data: null, error: null };
  return adminFinanceApiEnabled
    ? { status: "loading", data: null, error: null }
    : { status: "static-demo", data: null, error: null };
}

function useAdminFinanceRequest(loader) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);

  const reload = useCallback(() => {
    if (adminFinanceApiEnabled) setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!adminFinanceApiEnabled) return undefined;
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });
    loader({ signal: controller.signal })
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        const normalized = error instanceof AdminFinanceApiError
          ? error
          : new AdminFinanceApiError("Admin API request failed.");
        setState({
          status: normalized.status === 401 ? "auth-required" : "error",
          data: null,
          error: normalized,
        });
      });
    return () => controller.abort();
  }, [loader, revision]);

  return { ...state, reload, apiEnabled: adminFinanceApiEnabled, disabled: adminFinanceDisabled };
}

const loadMeta = (options) => adminFinanceApi.getMeta(options);
const loadGateZero = (options) => adminFinanceApi.getGateZero(options);

export function useAdminFinanceMeta() {
  return useAdminFinanceRequest(loadMeta);
}

export function useAdminFinanceGateZero() {
  return useAdminFinanceRequest(loadGateZero);
}

export function useAdminFinanceGrowthPlan() {
  const loader = useCallback((options) => adminFinanceApi.getManagementGrowthPlan(options), []);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinancePartnerEconomics(query) {
  const { from, to, asOfBlock } = query;
  const loader = useCallback(
    (options) => adminFinanceApi.getPartnerEconomics({ from, to, asOfBlock }, options),
    [asOfBlock, from, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceCompanyEconomics(query) {
  const { from, to, asOfBlock } = query;
  const loader = useCallback(
    (options) => adminFinanceApi.getCompanyEconomics({ from, to, asOfBlock }, options),
    [asOfBlock, from, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceCompanyRevenueEvents(query) {
  const { from, to, asOfBlock } = query;
  const loader = useCallback(async (options) => {
    const common = { from, to, asOfBlock, limit: 100 };
    const [platformFees, companyReceipts] = await Promise.all([
      adminFinanceApi.getPlatformFees(common, options),
      adminFinanceApi.getCompanyReceipts(common, options),
    ]);
    return { platformFees, companyReceipts };
  }, [asOfBlock, from, to]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceOverview(query) {
  const { from, to, perimeter = "atlas_consolidated", asOfBlock } = query;
  const loader = useCallback((options) => adminFinanceApi.getFinanceOverview({ from, to, perimeter, asOfBlock }, options), [asOfBlock, from, perimeter, to]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceFlows(query) {
  const { from, to, granularity = "day" } = query;
  const loader = useCallback(async (options) => {
    const common = { from, to, granularity, limit: 500 };
    const [consolidated, payoutContract, companyTreasury, overview] = await Promise.all([
      adminFinanceApi.getCashMovements({ ...common, perimeter: "atlas_consolidated" }, options),
      adminFinanceApi.getCashMovements({ ...common, perimeter: "payout_contract" }, options),
      adminFinanceApi.getCashMovements({ ...common, perimeter: "company_treasury" }, options),
      adminFinanceApi.getFinanceOverview({ from, to, perimeter: "atlas_consolidated" }, options),
    ]);
    return { consolidated, payoutContract, companyTreasury, overview };
  }, [from, granularity, to]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceCycles(query) {
  const { from, to, asOfBlock } = query;
  const loader = useCallback(
    (options) => adminFinanceApi.getCycles({ from, to, asOfBlock, limit: 100 }, options),
    [asOfBlock, from, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceClaims(query) {
  const { from, to } = query;
  const loader = useCallback(
    (options) => adminFinanceApi.getClaims({ from, to, limit: 100 }, options),
    [from, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceLiquidity(query) {
  const { from, to, perimeter = "payout_contract", granularity = "day" } = query;
  const loader = useCallback(
    (options) => adminFinanceApi.getLiquidityRollForward({ from, to, perimeter, granularity }, options),
    [from, granularity, perimeter, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceReconciliation() {
  const loader = useCallback(async (options) => {
    const [runs, exceptions, alphaMeta] = await Promise.all([
      adminFinanceApi.getReconciliationRuns({ limit: 100 }, options),
      adminFinanceApi.getReconciliationExceptions({ status: "open", limit: 100 }, options),
      adminFinanceApi.getMeta(options),
    ]);
    return { runs, exceptions, alphaMeta };
  }, []);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceClaimDetail(claimId) {
  const loader = useCallback(
    (options) => claimId ? adminFinanceApi.getClaim(claimId, options) : Promise.resolve(null),
    [claimId],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceParticipantProfile(query) {
  const normalizedQuery = query.trim();
  const loader = useCallback(async (options) => {
    if (!normalizedQuery) return { search: null, profile: null, firstLine: null };
    const search = await adminFinanceApi.searchParticipants({ q: normalizedQuery, limit: 10 }, options);
    const exactMatch = search.data.find((row) => row.exact);
    if (!exactMatch) return { search, profile: null, firstLine: null };
    const [profile, firstLine] = await Promise.all([
      adminFinanceApi.getParticipant(exactMatch.participantId, options),
      adminFinanceApi.getParticipantFirstLine(exactMatch.participantId, { limit: 100 }, options),
    ]);
    return { search, profile, firstLine };
  }, [normalizedQuery]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceForecast(query) {
  const { scenario = "stress", horizon = "90d" } = query;
  const loader = useCallback(async (options) => {
    const snapshotResponse = await adminFinanceApi.getLatestForecastSnapshot({ scenario, perimeter: "payout_contract" }, options);
    const snapshot = snapshotResponse.data;
    const horizonCut = snapshot.horizons.find((item) => item.id === horizon)?.to || snapshot.horizonEnd;
    const bucketsResponse = await adminFinanceApi.getForecastBuckets({
      snapshotId: snapshot.id,
      from: snapshot.asOf,
      to: horizonCut,
    }, options);
    return { snapshot: snapshotResponse, buckets: bucketsResponse };
  }, [horizon, scenario]);
  return useAdminFinanceRequest(loader);
}
