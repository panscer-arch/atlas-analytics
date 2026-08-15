import assert from "node:assert/strict";
import { createForecastEvidenceVerifier } from "../server/admin-finance/forecast-evidence-verifier.mjs";

const blockNumber = 114353100;
const blockHash = `0x${"cd".repeat(32)}`;
const tokenAddress = "0x55d398326f99059ff775485246999027b3197955";
const payoutContractAddress = "0x1111111111111111111111111111111111111111";
const openingLiquidityRaw = "100000000000000000000000";
const rpcUrl = "https://bsc-rpc.example/atlas-read-only-key";
const evidence = {
  chainId: 56,
  blockNumber,
  blockHash,
  confirmations: 20,
  tokenAddress,
  payoutContractAddress,
  openingLiquidityRaw,
};

function jsonRpc(id, result, init = {}) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function createRpcFetch(overrides = {}) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    const request = JSON.parse(options.body);
    requests.push({ url, options, request });
    if (request.method === "eth_blockNumber") return jsonRpc(request.id, `0x${(blockNumber + 20).toString(16)}`);
    if (request.method === "eth_getBlockByNumber") return jsonRpc(request.id, {
      number: `0x${blockNumber.toString(16)}`,
      hash: overrides.blockHash || blockHash,
    });
    if (request.method === "eth_call") {
      const value = overrides.balanceRaw || openingLiquidityRaw;
      return jsonRpc(request.id, `0x${BigInt(value).toString(16).padStart(64, "0")}`);
    }
    throw new Error("Unexpected RPC method");
  };
  return { fetchImpl, requests };
}

function verifier(fetchImpl, options = {}) {
  return createForecastEvidenceVerifier({
    rpcUrl,
    allowedHosts: ["bsc-rpc.example"],
    fetchImpl,
    minConfirmations: 12,
    ...options,
  });
}

const healthyRpc = createRpcFetch();
const verified = await verifier(healthyRpc.fetchImpl).verify(evidence);
assert.equal(verified.blockHash, blockHash);
assert.equal(verified.confirmations, 20);
assert.equal(verified.openingLiquidityRaw, openingLiquidityRaw);
assert.equal(healthyRpc.requests.length, 3);
for (const request of healthyRpc.requests) {
  assert.equal(request.url, rpcUrl);
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.credentials, "omit");
}
const balanceRequest = healthyRpc.requests.find(({ request }) => request.method === "eth_call").request;
assert.equal(balanceRequest.params[0].to, tokenAddress);
assert(balanceRequest.params[0].data.endsWith(payoutContractAddress.slice(2).padStart(64, "0")));
assert.equal(balanceRequest.params[1], `0x${blockNumber.toString(16)}`);

assert.throws(
  () => createForecastEvidenceVerifier({ rpcUrl: rpcUrl.replace("https:", "http:"), allowedHosts: ["bsc-rpc.example"] }),
  (error) => error.code === "insecure_rpc_url",
);
assert.throws(
  () => createForecastEvidenceVerifier({ rpcUrl, allowedHosts: ["attacker.example"] }),
  (error) => error.code === "rpc_host_not_allowed",
);

await assert.rejects(
  verifier(createRpcFetch({ blockHash: `0x${"ab".repeat(32)}` }).fetchImpl).verify(evidence),
  (error) => error.code === "rpc_block_hash_mismatch" && error.retryable === false,
);
await assert.rejects(
  verifier(createRpcFetch({ balanceRaw: "999" }).fetchImpl).verify(evidence),
  (error) => error.code === "rpc_balance_mismatch" && error.retryable === false,
);
await assert.rejects(
  verifier(createRpcFetch().fetchImpl).verify({ ...evidence, confirmations: 21 }),
  (error) => error.code === "rpc_confirmation_mismatch",
);
await assert.rejects(
  verifier(createRpcFetch().fetchImpl, { minConfirmations: 21 }).verify(evidence),
  (error) => error.code === "rpc_finality_insufficient",
);

console.log("Admin Finance independent forecast evidence checks passed.");
