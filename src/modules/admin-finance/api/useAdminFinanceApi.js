import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
const AdminFinanceSnapshotContext = createContext(null);

function snapshotPinFromSnapshot(snapshot) {
  if (!Number.isSafeInteger(snapshot?.asOfBlockNumber) || !/^0x[0-9a-f]{64}$/i.test(snapshot?.asOfBlockHash || "")) {
    throw new AdminFinanceApiError("Admin API did not provide a valid snapshot pin.", {
      code: "invalid_snapshot_pin",
    });
  }
  return {
    asOfBlock: snapshot.asOfBlockNumber,
    asOfBlockHash: snapshot.asOfBlockHash,
  };
}

function snapshotPinFromMeta(alphaMeta) {
  return snapshotPinFromSnapshot(alphaMeta?.snapshot);
}

export function AdminFinanceSnapshotProvider({ alphaMeta, children }) {
  const value = useMemo(() => alphaMeta || null, [
    alphaMeta?.snapshot?.asOfBlockNumber,
    alphaMeta?.snapshot?.asOfBlockHash,
  ]);
  return createElement(AdminFinanceSnapshotContext.Provider, { value }, children);
}

function useAdminFinanceSharedMeta() {
  return useContext(AdminFinanceSnapshotContext);
}

function optionalSnapshotPin(alphaMeta) {
  return alphaMeta ? snapshotPinFromMeta(alphaMeta) : {};
}

function assertPinnedResponses(pin, responses) {
  const mismatch = responses.find((response) => response?.meta?.asOfBlockNumber !== pin.asOfBlock
    || response?.meta?.asOfBlockHash?.toLowerCase() !== pin.asOfBlockHash.toLowerCase());
  if (mismatch) {
    throw new AdminFinanceApiError("Admin API returned mixed financial snapshots.", {
      code: "snapshot_mismatch",
      requestId: mismatch?.meta?.requestId,
      retryable: true,
    });
  }
}

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
  const sharedMeta = useAdminFinanceSharedMeta();
  const sharedPin = optionalSnapshotPin(sharedMeta);
  const loader = useCallback((options) => adminFinanceApi.getFinanceOverview({ from, to, perimeter, asOfBlock, ...sharedPin }, options), [asOfBlock, from, perimeter, sharedPin.asOfBlock, sharedPin.asOfBlockHash, to]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceFlows(query) {
  const { from, to, granularity = "day" } = query;
  const sharedMeta = useAdminFinanceSharedMeta();
  const loader = useCallback(async (options) => {
    const alphaMeta = sharedMeta || await adminFinanceApi.getMeta(options);
    const pin = snapshotPinFromMeta(alphaMeta);
    const common = { from, to, granularity, limit: 500, ...pin };
    const [consolidated, payoutContract, companyTreasury, overview] = await Promise.all([
      adminFinanceApi.getCashMovements({ ...common, perimeter: "atlas_consolidated" }, options),
      adminFinanceApi.getCashMovements({ ...common, perimeter: "payout_contract" }, options),
      adminFinanceApi.getCashMovements({ ...common, perimeter: "company_treasury" }, options),
      adminFinanceApi.getFinanceOverview({ from, to, perimeter: "atlas_consolidated", ...pin }, options),
    ]);
    assertPinnedResponses(pin, [consolidated, payoutContract, companyTreasury, overview]);
    return { consolidated, payoutContract, companyTreasury, overview, alphaMeta };
  }, [from, granularity, sharedMeta, to]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceCycles(query) {
  const { from, to, asOfBlock } = query;
  const sharedMeta = useAdminFinanceSharedMeta();
  const sharedPin = optionalSnapshotPin(sharedMeta);
  const loader = useCallback(
    (options) => adminFinanceApi.getCycles({ from, to, asOfBlock, limit: 100, ...sharedPin }, options),
    [asOfBlock, from, sharedPin.asOfBlock, sharedPin.asOfBlockHash, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceClaims(query) {
  const { from, to } = query;
  const sharedMeta = useAdminFinanceSharedMeta();
  const sharedPin = optionalSnapshotPin(sharedMeta);
  const loader = useCallback(
    (options) => adminFinanceApi.getClaims({ from, to, limit: 100, ...sharedPin }, options),
    [from, sharedPin.asOfBlock, sharedPin.asOfBlockHash, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceLiquidity(query) {
  const { from, to, perimeter = "payout_contract", granularity = "day" } = query;
  const sharedMeta = useAdminFinanceSharedMeta();
  const sharedPin = optionalSnapshotPin(sharedMeta);
  const loader = useCallback(
    (options) => adminFinanceApi.getLiquidityRollForward({ from, to, perimeter, granularity, ...sharedPin }, options),
    [from, granularity, perimeter, sharedPin.asOfBlock, sharedPin.asOfBlockHash, to],
  );
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceReconciliation() {
  const sharedMeta = useAdminFinanceSharedMeta();
  const loader = useCallback(async (options) => {
    const alphaMeta = sharedMeta || await adminFinanceApi.getMeta(options);
    const pin = snapshotPinFromMeta(alphaMeta);
    const [runs, exceptions] = await Promise.all([
      adminFinanceApi.getReconciliationRuns({ limit: 100, ...pin }, options),
      adminFinanceApi.getReconciliationExceptions({ status: "open", limit: 100, ...pin }, options),
    ]);
    assertPinnedResponses(pin, [runs, exceptions]);
    return { runs, exceptions, alphaMeta };
  }, [sharedMeta]);
  return useAdminFinanceRequest(loader);
}

export function useAdminFinanceClaimDetail(claimId) {
  const sharedMeta = useAdminFinanceSharedMeta();
  const sharedPin = optionalSnapshotPin(sharedMeta);
  const loader = useCallback(
    (options) => claimId ? adminFinanceApi.getClaim(claimId, sharedPin, options) : Promise.resolve(null),
    [claimId, sharedPin.asOfBlock, sharedPin.asOfBlockHash],
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
