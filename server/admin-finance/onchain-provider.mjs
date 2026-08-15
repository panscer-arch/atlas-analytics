import { createHash } from "node:crypto";

const EXPECTED_CHAIN_ID = 56;
const EXPECTED_TOKEN = "0x55d398326f99059ff775485246999027b3197955";
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;
const DEFAULT_MIN_CONFIRMATIONS = 12;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const EVM_ADDRESS = /^0x[0-9a-f]{40}$/i;
const INTEGER_STRING = /^[0-9]+$/;
const SIGNED_INTEGER_STRING = /^-?[0-9]+$/;

export class OnchainProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "OnchainProviderError";
    this.code = code;
    this.retryable = options.retryable !== false;
  }
}

function assert(condition, code, message, options) {
  if (!condition) throw new OnchainProviderError(code, message, options);
}

function normalizeAddress(value) {
  const address = String(value || "").toLowerCase();
  assert(EVM_ADDRESS.test(address), "invalid_address", "Provider returned an invalid EVM address.", { retryable: false });
  return address;
}

function validateHttpsUrl(value, { allowedHosts, expectedPath, label }) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new OnchainProviderError("invalid_provider_url", `${label} URL is invalid.`, { retryable: false });
  }
  assert(url.protocol === "https:", "insecure_provider_url", `${label} must use HTTPS.`, { retryable: false });
  assert(!url.username && !url.password, "provider_url_credentials", `${label} must not contain credentials.`, { retryable: false });
  assert(!url.search && !url.hash, "provider_url_parameters", `${label} must not contain query or fragment data.`, { retryable: false });
  assert(!url.port || url.port === "443", "provider_url_port", `${label} must use the standard HTTPS port.`, { retryable: false });
  assert(allowedHosts.has(url.hostname.toLowerCase()), "provider_host_not_allowed", `${label} host is not allowlisted.`, { retryable: false });
  if (expectedPath) assert(url.pathname === expectedPath, "provider_path_not_allowed", `${label} path is not allowlisted.`, { retryable: false });
  return url.toString();
}

async function readLimitedJson(response, maxBytes) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  assert(contentType.includes("application/json"), "provider_content_type", "Provider response is not JSON.");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  assert(!declaredLength || declaredLength <= maxBytes, "provider_response_too_large", "Provider response exceeds the configured size limit.");

  const reader = response.body?.getReader();
  assert(reader, "provider_response_body", "Provider response body is unavailable.");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new OnchainProviderError("provider_response_too_large", "Provider response exceeds the configured size limit.");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  try {
    return { data: JSON.parse(bytes.toString("utf8")), bytes };
  } catch {
    throw new OnchainProviderError("provider_invalid_json", "Provider returned invalid JSON.");
  }
}

async function fetchJson(fetchImpl, url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
      redirect: "error",
      signal: controller.signal,
    });
    assert(response.ok, "provider_http_error", `Provider returned HTTP ${response.status}.`);
    return await readLimitedJson(response, options.maxBytes);
  } catch (error) {
    if (error instanceof OnchainProviderError) throw error;
    if (controller.signal.aborted) throw new OnchainProviderError("provider_timeout", "Provider request timed out.");
    throw new OnchainProviderError("provider_request_failed", "Provider request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

function decimalToAtomic(value, decimals) {
  assert(Number.isInteger(decimals) && decimals >= 0 && decimals <= 36, "invalid_token_decimals", "Token decimals are invalid.", { retryable: false });
  const number = Number(value);
  assert(Number.isFinite(number) && number >= 0, "invalid_decimal_amount", "Provider returned an invalid decimal amount.");
  const precision = Math.min(decimals, 6);
  const [whole, fraction = ""] = number.toFixed(precision).split(".");
  return `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
}

function money(amountRaw, token, options = {}) {
  assert(SIGNED_INTEGER_STRING.test(String(amountRaw)), "invalid_atomic_amount", "Provider returned an invalid atomic amount.");
  return {
    amountRaw: String(amountRaw),
    decimals: token.decimals,
    tokenAddress: token.address,
    symbol: token.symbol,
    available: options.available !== false,
  };
}

function unavailableMoney(token) {
  return money("0", token, { available: false });
}

function deterministicUuid(value) {
  const bytes = createHash("sha256").update(String(value)).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function utcBucket(date, dayOffsetHours) {
  const localStart = new Date(`${date}T00:00:00.000Z`);
  localStart.setUTCHours(localStart.getUTCHours() - dayOffsetHours);
  const localEnd = new Date(localStart);
  localEnd.setUTCDate(localEnd.getUTCDate() + 1);
  return { bucketStart: localStart.toISOString(), bucketEnd: localEnd.toISOString() };
}

function validateCommon(payload, allowedAddresses, label) {
  assert(payload && payload.ok === true, "provider_not_ok", `${label} did not return ok=true.`);
  assert(payload.network?.chainId === EXPECTED_CHAIN_ID, "provider_wrong_chain", `${label} returned the wrong chain.`, { retryable: false });
  assert(normalizeAddress(payload.token?.address) === EXPECTED_TOKEN, "provider_wrong_token", `${label} returned the wrong settlement token.`, { retryable: false });
  assert(payload.token?.symbol === "USDT" && Number.isInteger(payload.token?.decimals), "provider_token_schema", `${label} token metadata is invalid.`, { retryable: false });
  assert(Array.isArray(payload.contracts), "provider_contract_schema", `${label} contracts are missing.`);
  for (const contract of payload.contracts) {
    const address = normalizeAddress(contract.address);
    assert(allowedAddresses.has(address) || address === EXPECTED_TOKEN, "provider_unknown_contract", `${label} returned a contract outside the approved registry.`, { retryable: false });
  }
}

function validateFlows(payload, allowedAddresses) {
  validateCommon(payload, allowedAddresses, "Flow source");
  assert(Array.isArray(payload.daily) && payload.daily.length > 0, "provider_daily_schema", "Flow source daily data is missing.");
  assert(payload.range && Number.isSafeInteger(payload.range.toBlock) && payload.range.toBlock > 0, "provider_block_schema", "Flow source block cut is invalid.");
  assert(payload.totals && INTEGER_STRING.test(String(payload.totals.providedRaw)) && INTEGER_STRING.test(String(payload.totals.claimedRaw)), "provider_totals_schema", "Flow source totals are invalid.");
  assert(payload.cycleStats?.productionTotals && Array.isArray(payload.cycleStats?.byTerm), "provider_cycle_schema", "Flow source cycle statistics are invalid.");
  assert(Array.isArray(payload.failures) && payload.diagnostics && typeof payload.diagnostics === "object", "provider_diagnostics_schema", "Flow source diagnostics are invalid.");
  const updatedAt = Date.parse(payload.updatedAt);
  assert(Number.isFinite(updatedAt), "provider_timestamp_schema", "Flow source timestamp is invalid.");
}

function validateBalances(payload, allowedAddresses) {
  validateCommon(payload, allowedAddresses, "Balance source");
  for (const contract of payload.contracts) {
    assert(INTEGER_STRING.test(String(contract.balances?.usdtRaw)), "provider_balance_schema", "Balance source returned an invalid USDT balance.");
  }
  const updatedAt = Date.parse(payload.updatedAt);
  assert(Number.isFinite(updatedAt), "provider_timestamp_schema", "Balance source timestamp is invalid.");
}

function buildCashMovements(flows, token) {
  const dayOffsetHours = Number(flows.range.dayOffsetHours || 0);
  const byPerimeter = {
    payout_contract: [],
    atlas_consolidated: [],
    company_treasury: [],
  };
  for (const row of flows.daily) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(String(row.date)), "provider_daily_date", "Flow source returned an invalid daily bucket.");
    const bucket = utcBucket(row.date, dayOffsetHours);
    const providedRaw = decimalToAtomic(row.provided, token.decimals);
    const claimedRaw = decimalToAtomic(row.claimed, token.decimals);
    const feeRaw = decimalToAtomic(row.fee, token.decimals);
    const payoutOut = (BigInt(claimedRaw) + BigInt(feeRaw)).toString();
    byPerimeter.payout_contract.push({
      ...bucket,
      externalIn: money(providedRaw, token),
      externalOut: money(payoutOut, token),
      netFlow: money((BigInt(providedRaw) - BigInt(payoutOut)).toString(), token),
      internalTransfersEliminated: money(feeRaw, token),
    });
    byPerimeter.atlas_consolidated.push({
      ...bucket,
      externalIn: money(providedRaw, token),
      externalOut: money(claimedRaw, token),
      netFlow: money((BigInt(providedRaw) - BigInt(claimedRaw)).toString(), token),
      internalTransfersEliminated: money(feeRaw, token),
    });
    byPerimeter.company_treasury.push({
      ...bucket,
      externalIn: money(feeRaw, token),
      externalOut: money("0", token),
      netFlow: money(feeRaw, token),
      internalTransfersEliminated: money("0", token),
    });
  }
  return byPerimeter;
}

function buildCycles(flows, token) {
  return flows.cycleStats.byTerm
    .filter((row) => row.tierName !== "Contract Test")
    .map((row) => ({
      id: deterministicUuid(`cycle:${row.contractId}:${row.tier}`),
      productKey: `${row.contractId}:${row.tier}`,
      label: `${row.tierName} · ${row.contractName}`,
      status: row.open > 0 ? "open" : "closed",
      openedCount: row.total,
      closedCount: row.closed,
      principal: money(decimalToAtomic(row.totalVolume, token.decimals), token),
      grossDeltaPaid: unavailableMoney(token),
      projectedMaturityOutflow: money(decimalToAtomic(row.remainingLoad, token.decimals), token),
      rulesetVersion: `onchain-${row.contractId}-tier-${row.tier}-unverified`,
      openCount: row.open,
      claimableCount: row.claimable,
      termEndedCount: row.termEnded,
      claimableNow: money(decimalToAtomic(row.claimableNow, token.decimals), token),
      next7DaysLoad: money(decimalToAtomic(row.next7DaysLoad, token.decimals), token),
      next30DaysLoad: money(decimalToAtomic(row.next30DaysLoad, token.decimals), token),
    }));
}

function buildLiquidity(balances, token, checkpoint) {
  const controlledContracts = balances.contracts.filter((contract) => !contract.isToken);
  const reportedRaw = controlledContracts.reduce((sum, contract) => sum + BigInt(contract.balances.usdtRaw), 0n).toString();
  return {
    summary: {
      openingBalance: unavailableMoney(token),
      externalIn: unavailableMoney(token),
      externalOut: unavailableMoney(token),
      internalTreasuryTransfers: unavailableMoney(token),
      calculatedClosing: unavailableMoney(token),
      canonicalClosing: checkpoint.canonical ? money(reportedRaw, token) : unavailableMoney(token),
      reportedClosing: money(reportedRaw, token),
      residual: unavailableMoney(token),
    },
    checkpoint,
    buckets: [],
    balances: controlledContracts.map((contract) => ({
      contractId: contract.id,
      label: contract.name,
      maskedAddress: contract.shortAddress,
      usdt: money(contract.balances.usdtRaw, token),
    })),
  };
}

async function resolveBlock(fetchImpl, rpcUrl, blockNumber, options) {
  const latestRequest = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
  const blockRequest = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber", params: [`0x${blockNumber.toString(16)}`, false] });
  const [latestResponse, blockResponse] = await Promise.all([
    fetchJson(fetchImpl, rpcUrl, { ...options, method: "POST", headers: { "Content-Type": "application/json" }, body: latestRequest }),
    fetchJson(fetchImpl, rpcUrl, { ...options, method: "POST", headers: { "Content-Type": "application/json" }, body: blockRequest }),
  ]);
  const latest = Number.parseInt(String(latestResponse.data?.result || ""), 16);
  const block = blockResponse.data?.result;
  assert(Number.isSafeInteger(latest) && latest >= blockNumber, "rpc_latest_block", "RPC returned an invalid latest block.");
  assert(block && Number.parseInt(String(block.number || ""), 16) === blockNumber && /^0x[0-9a-f]{64}$/i.test(String(block.hash || "")), "rpc_block_hash", "RPC did not confirm the provider block hash.");
  return { latestBlockNumber: latest, blockHash: block.hash, confirmations: latest - blockNumber };
}

async function resolveBalancesAtBlock(fetchImpl, rpcUrl, tokenAddress, contracts, blockNumber, options) {
  const blockTag = `0x${blockNumber.toString(16)}`;
  const balanceContracts = contracts.filter((contract) => !contract.isToken);
  const resolved = await Promise.all(balanceContracts.map(async (contract, index) => {
    const address = normalizeAddress(contract.address);
    const calldata = `0x70a08231${address.slice(2).padStart(64, "0")}`;
    const request = JSON.stringify({
      jsonrpc: "2.0",
      id: 100 + index,
      method: "eth_call",
      params: [{ to: tokenAddress, data: calldata }, blockTag],
    });
    const response = await fetchJson(fetchImpl, rpcUrl, {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: request,
    });
    const raw = String(response.data?.result || "");
    assert(/^0x[0-9a-f]{64}$/i.test(raw), "rpc_balance_result", "RPC returned an invalid token balance.");
    return {
      ...contract,
      balances: { ...contract.balances, usdtRaw: BigInt(raw).toString() },
    };
  }));
  return { contracts: resolved };
}

export function createOnchainAlphaProvider(options = {}) {
  const allowedHosts = new Set((options.allowedHosts || []).map((host) => String(host).toLowerCase()));
  assert(allowedHosts.size > 0, "provider_allowlist_empty", "At least one provider host must be allowlisted.", { retryable: false });
  const allowedAddresses = new Set((options.allowedAddresses || []).map(normalizeAddress));
  assert(allowedAddresses.size > 0, "address_registry_empty", "The controlled-address registry is required.", { retryable: false });
  const flowUrl = validateHttpsUrl(options.flowUrl, { allowedHosts, expectedPath: "/api/contracts/atlas-flows", label: "Flow source" });
  const balanceUrl = validateHttpsUrl(options.balanceUrl, { allowedHosts, expectedPath: "/api/contracts/atlas-balances", label: "Balance source" });
  const rpcUrl = validateHttpsUrl(options.rpcUrl, { allowedHosts: new Set((options.allowedRpcHosts || []).map((host) => String(host).toLowerCase())), label: "RPC" });
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BYTES);
  const maxAgeMs = Number(options.maxAgeMs || DEFAULT_MAX_AGE_MS);
  const minConfirmations = Number(options.minConfirmations ?? DEFAULT_MIN_CONFIRMATIONS);
  let inFlight = null;
  let cached = null;
  let cachedAt = 0;

  async function load() {
    const requestOptions = { timeoutMs, maxBytes };
    const [flowResponse, balanceResponse] = await Promise.all([
      fetchJson(fetchImpl, flowUrl, requestOptions),
      fetchJson(fetchImpl, balanceUrl, requestOptions),
    ]);
    const flows = flowResponse.data;
    const balances = balanceResponse.data;
    validateFlows(flows, allowedAddresses);
    validateBalances(balances, allowedAddresses);
    assert(normalizeAddress(flows.token.address) === normalizeAddress(balances.token.address) && flows.token.decimals === balances.token.decimals, "provider_snapshot_token_mismatch", "Flow and balance snapshots use different tokens.");
    const flowTime = Date.parse(flows.updatedAt);
    const balanceTime = Date.parse(balances.updatedAt);
    const flowAgeMs = Date.now() - flowTime;
    const registryAgeMs = Date.now() - balanceTime;
    assert(flowAgeMs >= -MAX_CLOCK_SKEW_MS && flowAgeMs <= maxAgeMs, "provider_snapshot_stale", "Flow snapshot is stale.");
    assert(registryAgeMs >= -MAX_CLOCK_SKEW_MS && registryAgeMs <= maxAgeMs, "provider_registry_stale", "Controlled-address registry is stale.");

    const block = await resolveBlock(fetchImpl, rpcUrl, flows.range.toBlock, requestOptions);
    assert(block.confirmations >= minConfirmations, "provider_block_not_finalized", `Provider block has ${block.confirmations} confirmations; ${minConfirmations} are required.`);

    const token = {
      address: normalizeAddress(flows.token.address),
      symbol: flows.token.symbol,
      decimals: flows.token.decimals,
    };
    let checkpointBalances = balances;
    let balanceCheckpoint = {
      canonical: false,
      observedAt: new Date(balanceTime).toISOString(),
      asOfBlockNumber: null,
      verification: "source_reported",
    };
    let historicalBalanceUnavailable = false;
    try {
      checkpointBalances = await resolveBalancesAtBlock(fetchImpl, rpcUrl, token.address, balances.contracts, flows.range.toBlock, requestOptions);
      balanceCheckpoint = {
        canonical: true,
        observedAt: new Date(flowTime).toISOString(),
        asOfBlockNumber: flows.range.toBlock,
        verification: "independent_rpc",
      };
    } catch (error) {
      if (!(error instanceof OnchainProviderError)) throw error;
      historicalBalanceUnavailable = true;
    }
    const partialReasons = [
      "daily_amounts_published_at_six_decimal_precision",
      "partner_rewards_require_referral_tree_and_status_history",
      "claim_lifecycle_offchain_states_unavailable",
      "cycle_load_aggregates_lack_exact_maturity_dates_and_payout_components",
      "independent_ledger_reconciliation_not_completed",
      "reserve_policy_not_approved",
    ];
    if (flows.failures.length) partialReasons.push("provider_reported_failures");
    if (historicalBalanceUnavailable) {
      partialReasons.push("historical_balance_rpc_unavailable");
      partialReasons.push("liquidity_balance_source_not_independently_verified");
    }
    if (flows.diagnostics.duplicateLockedEvents.length || flows.diagnostics.duplicateLockupClaims.length || flows.diagnostics.unmatchedClaimEvents.length || flows.diagnostics.orderStateFailures.length) {
      partialReasons.push("provider_diagnostics_exceptions");
    }
    const snapshotId = createHash("sha256")
      .update(`${flows.range.toBlock}:${block.blockHash}:${flows.updatedAt}:${balances.updatedAt}`)
      .digest("hex");
    return Object.freeze({
      id: snapshotId,
      generatedAt: new Date(flowTime).toISOString(),
      asOfBlockNumber: flows.range.toBlock,
      asOfBlockHash: block.blockHash,
      latestBlockNumber: block.latestBlockNumber,
      confirmations: block.confirmations,
      freshnessSeconds: Math.max(0, Math.floor(flowAgeMs / 1000)),
      finality: "finalized",
      sourceStatus: "partial",
      reconciliationStatus: "unreconciled",
      formulaVersion: "atlas-onchain-alpha-v1",
      rulesetVersion: "provider-rules-unverified",
      partial: true,
      partialReasons,
      token,
      coverage: {
        from: utcBucket(flows.daily[0].date, Number(flows.range.dayOffsetHours || 0)).bucketStart,
        to: utcBucket(flows.daily.at(-1).date, Number(flows.range.dayOffsetHours || 0)).bucketEnd,
      },
      cashMovementsByPerimeter: buildCashMovements(flows, token),
      cycles: buildCycles(flows, token),
      claims: [],
      liquidity: buildLiquidity(checkpointBalances, token, balanceCheckpoint),
      reconciliation: {
        diagnostics: flows.diagnostics,
        failures: flows.failures,
        providerReceipts: flows.range.receipts,
        providerLockedEvents: flows.range.lockedEvents,
        providerClaimedEvents: flows.range.claimedEvents,
      },
      sourceHashes: {
        flows: createHash("sha256").update(flowResponse.bytes).digest("hex"),
        balances: createHash("sha256").update(balanceResponse.bytes).digest("hex"),
      },
    });
  }

  return {
    async getSnapshot({ force = false } = {}) {
      if (!force && cached && Date.now() - cachedAt < Math.min(maxAgeMs, 60000)) return cached;
      if (!inFlight) {
        inFlight = load().then((snapshot) => {
          cached = snapshot;
          cachedAt = Date.now();
          return snapshot;
        }).finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}
