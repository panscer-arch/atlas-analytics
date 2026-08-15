import { buildForecastProjection, ForecastInputError } from "./forecast-input-contract.mjs";

const EXPECTED_TOKEN = "0x55d398326f99059ff775485246999027b3197955";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;
const DEFAULT_CACHE_MS = 30_000;
const DEFAULT_MIN_CONFIRMATIONS = 12;
const MAX_CLOCK_SKEW_MS = 60 * 1000;

export class ForecastSourceError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "ForecastSourceError";
    this.code = code;
    this.retryable = options.retryable !== false;
    this.causeCode = options.causeCode || null;
    this.causePath = options.causePath || null;
  }
}

export function createInMemoryForecastCheckpointGuard() {
  let acceptedCheckpoint = null;
  const acceptedSourceSnapshots = new Map();

  return Object.freeze({
    async accept(candidate) {
      if (acceptedCheckpoint) {
        assert(candidate.blockNumber >= acceptedCheckpoint.blockNumber, "source_checkpoint_rollback", "Forecast source checkpoint moved backwards.", { retryable: false });
        assert(candidate.generatedAt >= acceptedCheckpoint.generatedAt, "source_time_rollback", "Forecast source generation time moved backwards.", { retryable: false });
        if (candidate.blockNumber === acceptedCheckpoint.blockNumber) {
          assert(candidate.blockHash === acceptedCheckpoint.blockHash, "source_checkpoint_equivocation", "Forecast source changed the hash of an accepted block.", { retryable: false });
        }
      }

      const acceptedProjectionId = acceptedSourceSnapshots.get(candidate.sourceSnapshotId);
      if (acceptedProjectionId) {
        assert(acceptedProjectionId === candidate.projectionId, "source_snapshot_equivocation", "Forecast source reused a snapshot ID with different content.", { retryable: false });
      }

      acceptedCheckpoint = {
        blockNumber: candidate.blockNumber,
        blockHash: candidate.blockHash,
        generatedAt: candidate.generatedAt,
      };
      acceptedSourceSnapshots.set(candidate.sourceSnapshotId, candidate.projectionId);
    },
  });
}

function assert(condition, code, message, options) {
  if (!condition) throw new ForecastSourceError(code, message, options);
}

function positiveBoundedInteger(value, fallback, { min = 1, max }) {
  const normalized = value === undefined ? fallback : Number(value);
  assert(Number.isSafeInteger(normalized) && normalized >= min && normalized <= max, "invalid_adapter_option", "Forecast source adapter option is invalid.", { retryable: false });
  return normalized;
}

function validateSourceUrl(value, allowedHosts, expectedPath) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new ForecastSourceError("invalid_source_url", "Forecast source URL is invalid.", { retryable: false });
  }
  assert(url.protocol === "https:", "insecure_source_url", "Forecast source must use HTTPS.", { retryable: false });
  assert(!url.username && !url.password, "source_url_credentials", "Forecast source URL must not contain credentials.", { retryable: false });
  assert(!url.search && !url.hash, "source_url_parameters", "Forecast source URL must not contain query or fragment data.", { retryable: false });
  assert(!url.port || url.port === "443", "source_url_port", "Forecast source must use the standard HTTPS port.", { retryable: false });
  assert(allowedHosts.has(url.hostname.toLowerCase()), "source_host_not_allowed", "Forecast source host is not allowlisted.", { retryable: false });
  assert(url.pathname === expectedPath, "source_path_not_allowed", "Forecast source path is not allowlisted.", { retryable: false });
  return url.toString();
}

function validateAuthorization(value) {
  const authorization = String(value || "");
  assert(authorization.length >= 16 && authorization.length <= 2048, "source_authorization_missing", "Forecast source authorization is required.", { retryable: false });
  assert(!/[\r\n]/.test(authorization), "source_authorization_invalid", "Forecast source authorization is invalid.", { retryable: false });
  assert(/^(Basic|Bearer) [A-Za-z0-9._~+/=-]+$/.test(authorization), "source_authorization_invalid", "Forecast source authorization scheme is invalid.", { retryable: false });
  return authorization;
}

async function readLimitedJson(response, maxBytes) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  assert(contentType.includes("application/json"), "source_content_type", "Forecast source response is not JSON.");
  const rawLength = response.headers.get("content-length");
  if (rawLength) {
    assert(/^[0-9]+$/.test(rawLength), "source_content_length", "Forecast source content length is invalid.");
    assert(Number(rawLength) <= maxBytes, "source_response_too_large", "Forecast source response exceeds the size limit.");
  }
  const reader = response.body?.getReader();
  assert(reader, "source_response_body", "Forecast source response body is unavailable.");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ForecastSourceError("source_response_too_large", "Forecast source response exceeds the size limit.");
    }
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new ForecastSourceError("source_invalid_json", "Forecast source returned invalid JSON.", { retryable: false });
  }
}

async function fetchPayload(fetchImpl, url, authorization, timeoutMs, maxBytes) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "Cache-Control": "no-cache",
        "X-Atlas-Contract-Version": "atlas.forecast-input.v1",
      },
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new ForecastSourceError("source_auth_failed", "Forecast source rejected server credentials.", { retryable: false });
    }
    if (response.status === 429) throw new ForecastSourceError("source_rate_limited", "Forecast source rate limit was reached.");
    assert(response.ok, "source_http_error", `Forecast source returned HTTP ${response.status}.`);
    return await readLimitedJson(response, maxBytes);
  } catch (error) {
    if (error instanceof ForecastSourceError) throw error;
    if (controller.signal.aborted) throw new ForecastSourceError("source_timeout", "Forecast source request timed out.");
    throw new ForecastSourceError("source_request_failed", "Forecast source request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export function createForecastSourceAdapter(options = {}) {
  const allowedHosts = new Set((options.allowedHosts || []).map((host) => String(host).toLowerCase()));
  assert(allowedHosts.size > 0, "source_allowlist_empty", "Forecast source host allowlist is required.", { retryable: false });
  const expectedPath = String(options.expectedPath || "/api/v1/admin-finance/forecast-input");
  assert(expectedPath.startsWith("/") && !expectedPath.includes("?") && !expectedPath.includes("#"), "invalid_source_path", "Forecast source path is invalid.", { retryable: false });
  const sourceUrl = validateSourceUrl(options.url, allowedHosts, expectedPath);
  const parsedSourceUrl = new URL(sourceUrl);
  const authorization = validateAuthorization(options.authorization);
  const expectedToken = String(options.expectedToken || EXPECTED_TOKEN).toLowerCase();
  assert(/^0x[0-9a-f]{40}$/.test(expectedToken), "invalid_expected_token", "Expected forecast token is invalid.", { retryable: false });
  const expectedPayoutContract = String(options.expectedPayoutContract || "").toLowerCase();
  assert(/^0x[0-9a-f]{40}$/.test(expectedPayoutContract), "invalid_expected_payout_contract", "Expected payout contract is required.", { retryable: false });
  const timeoutMs = positiveBoundedInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, { min: 10, max: 60_000 });
  const maxBytes = positiveBoundedInteger(options.maxBytes, DEFAULT_MAX_BYTES, { min: 1024, max: 5 * 1024 * 1024 });
  const maxAgeMs = positiveBoundedInteger(options.maxAgeMs, DEFAULT_MAX_AGE_MS, { min: 1000, max: 24 * 60 * 60 * 1000 });
  const cacheMs = positiveBoundedInteger(options.cacheMs, DEFAULT_CACHE_MS, { min: 0, max: 5 * 60 * 1000 });
  const minConfirmations = positiveBoundedInteger(options.minConfirmations, DEFAULT_MIN_CONFIRMATIONS, { min: 1, max: 10_000 });
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || Date.now;
  const checkpointGuard = options.checkpointGuard || createInMemoryForecastCheckpointGuard();
  const evidenceVerifier = options.evidenceVerifier;
  assert(typeof fetchImpl === "function" && typeof now === "function", "invalid_adapter_option", "Forecast source adapter requires callable dependencies.", { retryable: false });
  assert(checkpointGuard && typeof checkpointGuard.accept === "function", "invalid_adapter_option", "Forecast source adapter requires a checkpoint guard.", { retryable: false });
  assert(evidenceVerifier && typeof evidenceVerifier.verify === "function", "invalid_adapter_option", "Forecast source adapter requires an independent evidence verifier.", { retryable: false });

  let cached = null;
  let cachedAt = 0;
  let inFlight = null;

  async function load() {
    const payload = await fetchPayload(fetchImpl, sourceUrl, authorization, timeoutMs, maxBytes);
    let projection;
    try {
      projection = buildForecastProjection(payload);
    } catch (error) {
      if (error instanceof ForecastInputError) {
        throw new ForecastSourceError("source_payload_rejected", "Forecast source payload failed quarantine validation.", {
          retryable: false,
          causeCode: error.code,
          causePath: error.path,
        });
      }
      throw error;
    }

    const generatedAt = Date.parse(projection.snapshot.generatedAt);
    const age = now() - generatedAt;
    assert(age >= -MAX_CLOCK_SKEW_MS, "source_clock_skew", "Forecast source snapshot is dated in the future.");
    assert(age <= maxAgeMs, "source_stale", "Forecast source snapshot is stale.");
    assert(projection.snapshot.chainId === 56, "source_chain_mismatch", "Forecast source chain is invalid.", { retryable: false });
    assert(projection.snapshot.openingLiquidity.tokenAddress.toLowerCase() === expectedToken, "source_token_mismatch", "Forecast source token is not allowlisted.", { retryable: false });
    assert(projection.snapshot.payoutContractAddress === expectedPayoutContract, "source_payout_contract_mismatch", "Forecast source payout contract is not allowlisted.", { retryable: false });
    assert(projection.snapshot.asOfBlockNumber >= 1 && payload.checkpoint.confirmations >= minConfirmations, "source_finality_insufficient", "Forecast source checkpoint does not meet confirmation policy.");

    try {
      await evidenceVerifier.verify({
        chainId: projection.snapshot.chainId,
        blockNumber: projection.snapshot.asOfBlockNumber,
        blockHash: projection.snapshot.asOfBlockHash,
        confirmations: payload.checkpoint.confirmations,
        tokenAddress: projection.snapshot.openingLiquidity.tokenAddress,
        payoutContractAddress: projection.snapshot.payoutContractAddress,
        openingLiquidityRaw: projection.snapshot.openingLiquidity.amountRaw,
      });
    } catch (error) {
      if (error instanceof ForecastSourceError) throw error;
      throw new ForecastSourceError("source_evidence_verification_failed", "Independent forecast evidence verification failed.");
    }

    try {
      await checkpointGuard.accept({
        sourceKey: `atlas.forecast-input.v1:${parsedSourceUrl.host}${parsedSourceUrl.pathname}`,
        chainId: projection.snapshot.chainId,
        blockNumber: projection.snapshot.asOfBlockNumber,
        blockHash: projection.snapshot.asOfBlockHash,
        generatedAt,
        sourceSnapshotId: projection.snapshot.sourceSnapshotId,
        projectionId: projection.snapshot.id,
      });
    } catch (error) {
      if (error instanceof ForecastSourceError) throw error;
      throw new ForecastSourceError("source_checkpoint_store_failed", "Forecast source checkpoint guard failed.");
    }
    return Object.freeze({
      ...projection,
      source: Object.freeze({
        status: "quarantine_validated",
        receivedAt: new Date(now()).toISOString(),
        endpointHost: parsedSourceUrl.hostname,
      }),
    });
  }

  return Object.freeze({
    async getProjection({ force = false } = {}) {
      if (!force && cached && now() - cachedAt <= cacheMs) return cached;
      if (!inFlight) {
        inFlight = load().then((projection) => {
          cached = projection;
          cachedAt = now();
          return projection;
        }).finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  });
}
