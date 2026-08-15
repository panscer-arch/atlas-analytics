import assert from "node:assert/strict";
import { createOnchainAlphaProvider, OnchainProviderError } from "../server/admin-finance/onchain-provider.mjs";

const tokenAddress = "0x55d398326f99059ff775485246999027b3197955";
const flowAddress = "0x1111111111111111111111111111111111111111";
const treasuryAddress = "0x2222222222222222222222222222222222222222";
const blockHash = `0x${"ab".repeat(32)}`;

function fixtures() {
  const updatedAt = new Date().toISOString();
  return {
    flows: {
      ok: true,
      updatedAt,
      network: { chainId: 56 },
      token: { address: tokenAddress, symbol: "USDT", decimals: 18 },
      contracts: [{ id: "flow", name: "Flow", address: flowAddress }],
      range: { toBlock: 100, dayOffsetHours: 0, receipts: 2, lockedEvents: 1, claimedEvents: 1 },
      totals: { providedRaw: "1000000000000000000", claimedRaw: "2000000000000000000" },
      daily: [{ date: updatedAt.slice(0, 10), provided: 1, claimed: 2, fee: 0.1 }],
      cycleStats: {
        productionTotals: { total: 1 },
        byTerm: [{
          contractId: "flow",
          contractName: "Flow",
          tier: 1,
          tierName: "Daily 200",
          total: 1,
          open: 1,
          closed: 0,
          claimable: 0,
          termEnded: 0,
          totalVolume: 100,
          remainingLoad: 120,
          claimableNow: 0,
          next7DaysLoad: 20,
          next30DaysLoad: 80,
        }],
      },
      failures: [],
      diagnostics: {
        duplicateLockedEvents: [],
        duplicateLockupClaims: [],
        unmatchedClaimEvents: [],
        orderStateFailures: [],
      },
    },
    balances: {
      ok: true,
      updatedAt,
      network: { chainId: 56 },
      token: { address: tokenAddress, symbol: "USDT", decimals: 18 },
      contracts: [{
        id: "treasury",
        name: "Treasury",
        address: treasuryAddress,
        shortAddress: "0x2222…2222",
        balances: { usdtRaw: "3000000000000000000" },
      }],
    },
  };
}

function jsonResponse(value, headers = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function createFetch(source, options = {}) {
  let calls = 0;
  const fetchImpl = async (url, request = {}) => {
    calls += 1;
    if (String(url).endsWith("/api/contracts/atlas-flows")) return jsonResponse(source.flows, options.flowHeaders);
    if (String(url).endsWith("/api/contracts/atlas-balances")) return jsonResponse(source.balances);
    const body = JSON.parse(request.body);
    if (body.method === "eth_blockNumber") return jsonResponse({ jsonrpc: "2.0", id: body.id, result: `0x${(options.latestBlock ?? 120).toString(16)}` });
    if (body.method === "eth_getBlockByNumber") return jsonResponse({ jsonrpc: "2.0", id: body.id, result: { number: "0x64", hash: blockHash } });
    if (body.method === "eth_call" && options.historicalError) return jsonResponse({ jsonrpc: "2.0", id: body.id, error: { code: -32000, message: "missing trie node" } });
    if (body.method === "eth_call") return jsonResponse({ jsonrpc: "2.0", id: body.id, result: `0x${3_000_000_000_000_000_000n.toString(16).padStart(64, "0")}` });
    throw new Error(`Unexpected request: ${url}`);
  };
  fetchImpl.calls = () => calls;
  return fetchImpl;
}

function provider(source, options = {}) {
  return createOnchainAlphaProvider({
    flowUrl: options.flowUrl || "https://provider.example/api/contracts/atlas-flows",
    balanceUrl: "https://provider.example/api/contracts/atlas-balances",
    rpcUrl: "https://rpc.example/",
    allowedHosts: ["provider.example"],
    allowedRpcHosts: ["rpc.example"],
    allowedAddresses: [flowAddress, treasuryAddress],
    minConfirmations: options.minConfirmations ?? 12,
    maxAgeMs: options.maxAgeMs,
    maxBytes: options.maxBytes,
    fetchImpl: options.fetchImpl || createFetch(source, options),
  });
}

async function expectCode(factory, code) {
  await assert.rejects(factory, (error) => error instanceof OnchainProviderError && error.code === code);
}

const source = fixtures();
const fetchImpl = createFetch(source);
const alphaProvider = provider(source, { fetchImpl });
const snapshot = await alphaProvider.getSnapshot();
assert.equal(snapshot.asOfBlockNumber, 100);
assert.equal(snapshot.confirmations, 20);
assert.equal(snapshot.sourceStatus, "partial");
assert.equal(snapshot.cashMovementsByPerimeter.payout_contract[0].netFlow.amountRaw, "-1100000000000000000");
assert.equal(snapshot.liquidity.summary.canonicalClosing.amountRaw, "3000000000000000000");
assert.equal(snapshot.liquidity.summary.openingBalance.available, false);
assert.equal(snapshot.cycles[0].grossDeltaPaid.available, false);
assert.equal(snapshot.cycles[0].openCount, 1);
assert.equal(snapshot.cycles[0].claimableNow.amountRaw, "0");
assert.equal(snapshot.cycles[0].next7DaysLoad.amountRaw, "20000000000000000000");
assert.equal(snapshot.cycles[0].next30DaysLoad.amountRaw, "80000000000000000000");
assert(snapshot.partialReasons.includes("claim_lifecycle_offchain_states_unavailable"));
assert(snapshot.partialReasons.includes("cycle_load_aggregates_lack_exact_maturity_dates_and_payout_components"));
await alphaProvider.getSnapshot();
assert.equal(fetchImpl.calls(), 5, "A second read must use the local one-minute cache");

const sourceReportedSnapshot = await provider(fixtures(), { historicalError: true }).getSnapshot();
assert.equal(sourceReportedSnapshot.liquidity.summary.canonicalClosing.available, false);
assert.equal(sourceReportedSnapshot.liquidity.summary.reportedClosing.amountRaw, "3000000000000000000");
assert.equal(sourceReportedSnapshot.liquidity.checkpoint.verification, "source_reported");
assert(sourceReportedSnapshot.partialReasons.includes("historical_balance_rpc_unavailable"));

assert.throws(
  () => provider(source, { flowUrl: "http://provider.example/api/contracts/atlas-flows" }),
  (error) => error.code === "insecure_provider_url",
);
assert.throws(
  () => provider(source, { flowUrl: "https://other.example/api/contracts/atlas-flows" }),
  (error) => error.code === "provider_host_not_allowed",
);

const wrongChain = fixtures();
wrongChain.flows.network.chainId = 1;
await expectCode(() => provider(wrongChain).getSnapshot(), "provider_wrong_chain");

const unknownAddress = fixtures();
unknownAddress.flows.contracts[0].address = "0x3333333333333333333333333333333333333333";
await expectCode(() => provider(unknownAddress).getSnapshot(), "provider_unknown_contract");

const stale = fixtures();
stale.flows.updatedAt = "2026-01-01T00:00:00.000Z";
stale.balances.updatedAt = stale.flows.updatedAt;
await expectCode(() => provider(stale, { maxAgeMs: 1000 }).getSnapshot(), "provider_snapshot_stale");

const notFinal = fixtures();
await expectCode(() => provider(notFinal, { latestBlock: 105 }).getSnapshot(), "provider_block_not_finalized");

const oversized = fixtures();
await expectCode(
  () => provider(oversized, { maxBytes: 100, flowHeaders: { "Content-Length": "1000" } }).getSnapshot(),
  "provider_response_too_large",
);

console.log("Admin Finance on-chain provider checks passed.");
