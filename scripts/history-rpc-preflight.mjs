import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const BNB_CHAIN_ID = "0x38";
const MAX_RPC_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_PREFLIGHT_TIMEOUT_MS = 60000;
const REQUIRED_LOG_RANGE_BLOCKS = 1000;
const MAX_LOG_RANGE_BLOCKS = 50000;

export const HISTORY_RPC_PROBES = [
  {
    id: "daily-v1",
    address: "0x8F418e29a32AAB69Abf3DA742c43E7aDfBFbA3c3",
    deploymentBlock: 107042336,
    deploymentBlockHash: "0x6c56cd9842e055652a9ae3325e4b4c0212ba803d54839914282c1af6e0acfd46",
    logProbe: {
      address: "0x60b97709d633dd4e0f0f44f6102fd50341c0afa6",
      topic0: "0xb648d3644f584ed1c2232d53c46d87e693586486ad0d1175f8656013110b714e",
      transactionHash: "0xbb7db220338e75409da88f86bff7e085fe155707892cbd82515de03c995e731e",
      logIndex: "0x0",
    },
  },
  {
    id: "lockup",
    address: "0x8F6daC6F25A5038112E1A01f1cBBD682e4D64889",
    deploymentBlock: 107042619,
    deploymentBlockHash: "0xfe163724c01d557780c432886fc1e7e822acb557ef8861019acaaf58f74aa3d6",
    logProbe: {
      address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000916f992df86795f24de6c268cfb9031fbb1155da",
        "0x00000000000000000000000084eece394a096cd80f6e3386012ed5708440f844",
      ],
      transactionHash: "0xb836ffaba84743c83d84928104f0864543010daa14de7aca307680c335f7c572",
      logIndex: "0x0",
    },
  },
  {
    id: "daily-v2",
    address: "0x8e61483d45a822cCB59482c47e1b6D28465605EC",
    deploymentBlock: 111451024,
    deploymentBlockHash: "0x3f7514c18f91fca2f3340f3db9d21e4fc0942a0cf10be6cdb4a10d123364ff97",
    logProbe: {
      address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      transactionHash: "0x93ad566f30ae2fa0aa5c17f9d6ad53b65bd25ead0600685c5c815970be378a46",
      logIndex: "0x0",
    },
  },
];

function normalizeChainId(value) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("rpc_chain_id_invalid");
  return `0x${BigInt(value).toString(16)}`;
}

function sanitizeRpcErrorCode(value) {
  const code = Number(value);
  return Number.isSafeInteger(code) ? String(code) : "unknown";
}

export function normalizeHistoryLogRangeBlocks(value) {
  const parsed = value === undefined || value === null || value === ""
    ? REQUIRED_LOG_RANGE_BLOCKS
    : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 50 || parsed > MAX_LOG_RANGE_BLOCKS) {
    throw new Error("rpc_history_range_blocks_invalid");
  }
  return Math.max(REQUIRED_LOG_RANGE_BLOCKS, parsed);
}

function matchesHistoryLogProbe(log, probe) {
  const blockHex = `0x${probe.deploymentBlock.toString(16)}`;
  return String(log?.blockNumber || "").toLowerCase() === blockHex
    && String(log?.blockHash || "").toLowerCase() === probe.deploymentBlockHash
    && String(log?.transactionHash || "").toLowerCase() === probe.logProbe.transactionHash
    && String(log?.logIndex || "").toLowerCase() === probe.logProbe.logIndex
    && String(log?.address || "").toLowerCase() === probe.logProbe.address
    && String(log?.topics?.[0] || "").toLowerCase() === probe.logProbe.topic0;
}

function isPublicAddress(address) {
  const normalized = String(address || "").toLowerCase();
  const family = isIP(normalized);
  if (family === 4) {
    const parts = normalized.split(".").map(Number);
    const [a, b] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && parts[2] === 100)))
      || (a === 203 && b === 0 && parts[2] === 113));
  }
  if (family === 6) {
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("2001:db8:")) return false;
    const first = Number.parseInt(normalized.split(":")[0], 16);
    return Number.isFinite(first) && first >= 0x2000 && first <= 0x3fff;
  }
  return false;
}

async function assertPublicRpcHostname(url, options = {}) {
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || isIP(hostname)) {
    throw new Error("rpc_hostname_invalid");
  }
  let addresses;
  try {
    addresses = await (options.lookupImpl || dnsLookup)(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("rpc_hostname_unavailable");
  }
  if (!Array.isArray(addresses) || !addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("rpc_hostname_invalid");
  }
}

async function readBoundedRpcBody(response) {
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RPC_RESPONSE_BYTES) {
    await response.body?.cancel?.();
    throw new Error("rpc_response_invalid");
  }

  if (!response.body?.getReader) {
    const body = await response.text();
    if (!body || Buffer.byteLength(body) > MAX_RPC_RESPONSE_BYTES) throw new Error("rpc_response_invalid");
    return body;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RPC_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("rpc_response_invalid");
    }
    chunks.push(Buffer.from(value));
  }
  if (totalBytes === 0) throw new Error("rpc_response_invalid");
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

export async function requestHistoryRpc(url, method, params = [], options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 10000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal,
      redirect: "error",
    });
    if (!response.ok) throw new Error("rpc_http_error");
    const body = await readBoundedRpcBody(response);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error("rpc_response_invalid");
    }
    if (payload?.error) throw new Error(`rpc_error_${sanitizeRpcErrorCode(payload.error.code)}`);
    if (!Object.hasOwn(payload || {}, "result") || payload.result === null) throw new Error("rpc_result_missing");
    return payload.result;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("rpc_timeout");
    if (error instanceof Error && /^rpc_/.test(error.message)) throw error;
    throw new Error("rpc_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function requestWithRetry(requestRpc, method, params) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestRpc(method, params);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

export async function preflightHistoryRpcUrl(url, options = {}) {
  await assertPublicRpcHostname(url, options);
  const requiredLogRangeBlocks = normalizeHistoryLogRangeBlocks(options.logRangeBlocks);
  const preflightController = new AbortController();
  const preflightTimeout = setTimeout(
    () => preflightController.abort(),
    options.preflightTimeoutMs || DEFAULT_PREFLIGHT_TIMEOUT_MS,
  );
  const requestRpc = options.requestRpc
    || ((method, params) => requestHistoryRpc(url, method, params, { ...options, signal: preflightController.signal }));
  try {
    const chainId = normalizeChainId(await requestWithRetry(requestRpc, "eth_chainId", []));
    if (chainId !== BNB_CHAIN_ID) throw new Error("rpc_chain_id_mismatch");

    for (const probe of HISTORY_RPC_PROBES) {
      const blockHex = `0x${probe.deploymentBlock.toString(16)}`;
      const block = await requestWithRetry(requestRpc, "eth_getBlockByNumber", [blockHex, false]);
      if (String(block?.number || "").toLowerCase() !== blockHex
        || String(block?.hash || "").toLowerCase() !== probe.deploymentBlockHash) {
        throw new Error(`rpc_history_block_mismatch_${probe.id}`);
      }

      const logs = await requestWithRetry(requestRpc, "eth_getLogs", [{
        address: probe.logProbe.address,
        fromBlock: blockHex,
        toBlock: blockHex,
        topics: probe.logProbe.topics || [probe.logProbe.topic0],
      }]);
      if (!Array.isArray(logs) || !logs.some((log) => matchesHistoryLogProbe(log, probe))) {
        throw new Error(`rpc_history_log_mismatch_${probe.id}`);
      }
    }

    const rangeProbes = [
      {
        probe: HISTORY_RPC_PROBES[0],
        fromBlock: HISTORY_RPC_PROBES[0].deploymentBlock,
        toBlock: HISTORY_RPC_PROBES[0].deploymentBlock + requiredLogRangeBlocks - 1,
      },
      {
        probe: HISTORY_RPC_PROBES[1],
        fromBlock: HISTORY_RPC_PROBES[1].deploymentBlock - requiredLogRangeBlocks + 1,
        toBlock: HISTORY_RPC_PROBES[1].deploymentBlock,
      },
    ];
    for (const { probe: rangeProbe, fromBlock, toBlock } of rangeProbes) {
      let rangeLogs;
      try {
        rangeLogs = await requestWithRetry(requestRpc, "eth_getLogs", [{
          address: rangeProbe.logProbe.address,
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: rangeProbe.logProbe.topics || [rangeProbe.logProbe.topic0],
        }]);
      } catch {
        throw new Error("rpc_history_range_unsupported");
      }
      if (!Array.isArray(rangeLogs) || !rangeLogs.some((log) => matchesHistoryLogProbe(log, rangeProbe))) {
        throw new Error("rpc_history_range_unsupported");
      }
    }
    return { chainId, probes: HISTORY_RPC_PROBES.length, logRangeBlocks: requiredLogRangeBlocks };
  } finally {
    clearTimeout(preflightTimeout);
  }
}
