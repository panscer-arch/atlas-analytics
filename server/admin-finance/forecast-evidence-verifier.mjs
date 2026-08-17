import { ForecastSourceError } from "./forecast-source-adapter.mjs";

const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const HEX_QUANTITY_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const BALANCE_RESULT_PATTERN = /^0x[0-9a-f]{64}$/i;

function assert(condition, code, message, options) {
  if (!condition) throw new ForecastSourceError(code, message, options);
}

function normalizeAddress(value, code) {
  const address = String(value || "").toLowerCase();
  assert(ADDRESS_PATTERN.test(address), code, "Forecast RPC evidence contains an invalid address.", { retryable: false });
  return address;
}

function validateRpcUrl(value, allowedHosts) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new ForecastSourceError("invalid_rpc_url", "Forecast RPC URL is invalid.", { retryable: false });
  }
  assert(url.protocol === "https:", "insecure_rpc_url", "Forecast RPC must use HTTPS.", { retryable: false });
  assert(!url.username && !url.password && !url.search && !url.hash, "unsafe_rpc_url", "Forecast RPC URL contains forbidden data.", { retryable: false });
  assert(!url.port || url.port === "443", "unsafe_rpc_url", "Forecast RPC must use the standard HTTPS port.", { retryable: false });
  assert(allowedHosts.has(url.hostname.toLowerCase()), "rpc_host_not_allowed", "Forecast RPC host is not allowlisted.", { retryable: false });
  return url.toString();
}

async function readLimitedJson(response, maxBytes) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  assert(contentType.includes("application/json"), "rpc_content_type", "Forecast RPC response is not JSON.");
  const declared = response.headers.get("content-length");
  if (declared) {
    assert(/^[0-9]+$/.test(declared) && Number(declared) <= maxBytes, "rpc_response_too_large", "Forecast RPC response exceeds the size limit.");
  }
  const reader = response.body?.getReader();
  assert(reader, "rpc_response_body", "Forecast RPC response body is unavailable.");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ForecastSourceError("rpc_response_too_large", "Forecast RPC response exceeds the size limit.");
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ForecastSourceError("rpc_invalid_json", "Forecast RPC returned invalid JSON.");
  }
}

async function rpc(fetchImpl, url, timeoutMs, maxBytes, id, method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    assert(response.ok, "rpc_http_error", `Forecast RPC returned HTTP ${response.status}.`);
    const payload = await readLimitedJson(response, maxBytes);
    assert(payload && payload.jsonrpc === "2.0" && payload.id === id && !payload.error && Object.hasOwn(payload, "result"), "rpc_protocol_error", "Forecast RPC returned an invalid JSON-RPC response.");
    return payload.result;
  } catch (error) {
    if (error instanceof ForecastSourceError) throw error;
    if (controller.signal.aborted) throw new ForecastSourceError("rpc_timeout", "Forecast RPC request timed out.");
    throw new ForecastSourceError("rpc_request_failed", "Forecast RPC request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

function bounded(value, fallback, min, max) {
  const result = value === undefined ? fallback : Number(value);
  assert(Number.isSafeInteger(result) && result >= min && result <= max, "invalid_rpc_option", "Forecast RPC option is invalid.", { retryable: false });
  return result;
}

export function createForecastEvidenceVerifier(options = {}) {
  const allowedHosts = new Set((options.allowedHosts || []).map((host) => String(host).toLowerCase()));
  assert(allowedHosts.size > 0, "rpc_allowlist_empty", "Forecast RPC host allowlist is required.", { retryable: false });
  const rpcUrl = validateRpcUrl(options.rpcUrl, allowedHosts);
  const fetchImpl = options.fetchImpl || fetch;
  assert(typeof fetchImpl === "function", "invalid_rpc_option", "Forecast RPC fetch implementation is invalid.", { retryable: false });
  const timeoutMs = bounded(options.timeoutMs, 10_000, 10, 30_000);
  const maxBytes = bounded(options.maxBytes, 64 * 1024, 1024, 1024 * 1024);
  const minConfirmations = bounded(options.minConfirmations, 12, 1, 10_000);

  return Object.freeze({
    async verify(evidence) {
      assert(evidence?.chainId === 56, "rpc_chain_mismatch", "Forecast RPC evidence must use BNB Smart Chain.", { retryable: false });
      assert(Number.isSafeInteger(evidence.blockNumber) && evidence.blockNumber > 0, "rpc_invalid_block", "Forecast RPC evidence block is invalid.", { retryable: false });
      const blockHash = String(evidence.blockHash || "").toLowerCase();
      assert(HASH_PATTERN.test(blockHash), "rpc_invalid_block", "Forecast RPC evidence block hash is invalid.", { retryable: false });
      const tokenAddress = normalizeAddress(evidence.tokenAddress, "rpc_invalid_token");
      const payoutContractAddress = normalizeAddress(evidence.payoutContractAddress, "rpc_invalid_payout_contract");
      assert(/^(0|[1-9][0-9]*)$/.test(String(evidence.openingLiquidityRaw || "")), "rpc_invalid_balance", "Forecast opening liquidity is invalid.", { retryable: false });
      const blockTag = `0x${evidence.blockNumber.toString(16)}`;
      const calldata = `0x70a08231${payoutContractAddress.slice(2).padStart(64, "0")}`;

      const [latestRaw, block, balanceRaw] = await Promise.all([
        rpc(fetchImpl, rpcUrl, timeoutMs, maxBytes, 1, "eth_blockNumber", []),
        rpc(fetchImpl, rpcUrl, timeoutMs, maxBytes, 2, "eth_getBlockByNumber", [blockTag, false]),
        rpc(fetchImpl, rpcUrl, timeoutMs, maxBytes, 3, "eth_call", [{ to: tokenAddress, data: calldata }, blockTag]),
      ]);

      assert(HEX_QUANTITY_PATTERN.test(String(latestRaw || "")), "rpc_latest_block", "Forecast RPC returned an invalid latest block.");
      const latestBlockNumber = Number.parseInt(latestRaw, 16);
      assert(Number.isSafeInteger(latestBlockNumber) && latestBlockNumber >= evidence.blockNumber, "rpc_latest_block", "Forecast RPC latest block precedes the checkpoint.");
      assert(block && HEX_QUANTITY_PATTERN.test(String(block.number || "")) && Number.parseInt(block.number, 16) === evidence.blockNumber, "rpc_block_mismatch", "Forecast RPC returned the wrong checkpoint block.");
      assert(String(block.hash || "").toLowerCase() === blockHash, "rpc_block_hash_mismatch", "Forecast RPC block hash does not match the provider checkpoint.", { retryable: false });
      const confirmations = latestBlockNumber - evidence.blockNumber;
      assert(confirmations >= minConfirmations, "rpc_finality_insufficient", "Forecast RPC checkpoint does not meet finality policy.");
      assert(Number.isSafeInteger(evidence.confirmations) && evidence.confirmations <= confirmations, "rpc_confirmation_mismatch", "Provider confirmations exceed independent RPC evidence.", { retryable: false });
      assert(BALANCE_RESULT_PATTERN.test(String(balanceRaw || "")), "rpc_balance_result", "Forecast RPC returned an invalid token balance.");
      const openingLiquidityRaw = BigInt(balanceRaw).toString();
      assert(openingLiquidityRaw === String(evidence.openingLiquidityRaw), "rpc_balance_mismatch", "Forecast opening liquidity does not match independent RPC evidence.", { retryable: false });

      return Object.freeze({ blockNumber: evidence.blockNumber, blockHash, latestBlockNumber, confirmations, openingLiquidityRaw });
    },
  });
}
