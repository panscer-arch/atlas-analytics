import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  atlasCheckpointBoundaryMatches,
  buildAtlasLogBlockRanges,
  buildAtlasEventHistoryCheckpoint,
  collectAtlasContractEventLogs,
  mergeAtlasEventLogs,
  normalizeAtlasEventLog,
  normalizeAtlasLogRpcResult,
  parseAtlasRpcBlockNumber,
  prepareAtlasEventHistoryCheckpoint,
  shouldResetAtlasEventHistoryCheckpoint,
} from "../server/atlas-flow-log-history.mjs";
import { parseHttpsRpcUrls } from "../server/rpc-url-policy.mjs";
import {
  HISTORY_RPC_PROBES,
  normalizeHistoryLogRangeBlocks,
  preflightHistoryRpcUrl,
  requestHistoryRpc,
} from "./history-rpc-preflight.mjs";

const ADDRESS = "0x8F6daC6F25A5038112E1A01f1cBBD682e4D64889";
const LOCKED_TOPIC = "0xfc19754b7c43ed8f5cf6ce6617a1fff336b6cc4bb8e5ea4bfa6a031d019c49ff";
const CLAIMED_TOPIC = "0x46f6410c5ade89c93d7353c04c3b9b15e6419e35ad8a0d0a806476b30f2d1344";
const BOUNDARY_HASH = `0x${"c".repeat(64)}`;
const ORDER_TOPIC = `0x${"0".repeat(63)}1`;
const USER_TOPIC = `0x${"0".repeat(24)}${"1".repeat(40)}`;
const DATA_WORDS = {
  [LOCKED_TOPIC]: 6,
  [CLAIMED_TOPIC]: 5,
};

assert.deepEqual(buildAtlasLogBlockRanges(100, 110, 4), [
  { fromBlock: 100, toBlock: 103 },
  { fromBlock: 104, toBlock: 107 },
  { fromBlock: 108, toBlock: 110 },
]);
assert.deepEqual(buildAtlasLogBlockRanges(10, 9, 4), []);

function makeLog({ blockNumber, transactionIndex, logIndex, topic, hashSeed }) {
  const dataWords = DATA_WORDS[topic];
  return {
    address: ADDRESS,
    blockHash: `0x${String(hashSeed).padStart(64, "a")}`,
    blockNumber: `0x${blockNumber.toString(16)}`,
    transactionHash: `0x${String(hashSeed).padStart(64, "b")}`,
    transactionIndex: `0x${transactionIndex.toString(16)}`,
    logIndex: `0x${logIndex.toString(16)}`,
    data: `0x${"0".repeat(64 * dataWords)}`,
    topics: [topic, ORDER_TOPIC, USER_TOPIC],
    removed: false,
  };
}

const first = makeLog({ blockNumber: 103, transactionIndex: 1, logIndex: 2, topic: CLAIMED_TOPIC, hashSeed: 1 });
const second = makeLog({ blockNumber: 101, transactionIndex: 0, logIndex: 1, topic: LOCKED_TOPIC, hashSeed: 2 });
const filters = [];
const history = await collectAtlasContractEventLogs({
  rpc: async (method, [filter]) => {
    assert.equal(method, "eth_getLogs");
    filters.push(filter);
    return filter.fromBlock === "0x64" ? [first, second, first] : [];
  },
  address: ADDRESS,
  topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
  fromBlock: 100,
  toBlock: 105,
  chunkSize: 4,
  concurrency: 2,
  dataWordsByTopic: DATA_WORDS,
  expectedTopicCount: 3,
});

assert.equal(filters.length, 2);
assert.deepEqual(filters[0].topics, [[LOCKED_TOPIC, CLAIMED_TOPIC]]);
assert.equal(history.queryCount, 2);
assert.equal(history.logs.length, 2, "duplicate log must be removed");
assert.equal(history.logs[0].blockNumber, "0x65", "logs must be ordered by chain position");
assert.equal(history.transactionHashes.length, 2);

const restoredHistory = mergeAtlasEventLogs([[first], [second, first]], {
  address: ADDRESS,
  topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
  dataWordsByTopic: DATA_WORDS,
  expectedTopicCount: 3,
});
assert.equal(restoredHistory.length, 2, "persisted history must be validated and deduplicated");
assert.equal(restoredHistory[0].blockNumber, "0x65");

const checkpoint = buildAtlasEventHistoryCheckpoint({
  address: ADDRESS,
  topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
  deploymentBlock: 90,
  toBlock: 103,
  toBlockHash: BOUNDARY_HASH,
  logs: [first, second, first],
  dataWordsByTopic: DATA_WORDS,
  expectedTopicCount: 3,
});
const resumed = prepareAtlasEventHistoryCheckpoint({
  checkpoint,
  address: ADDRESS,
  topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
  deploymentBlock: 90,
  toBlock: 110,
  dataWordsByTopic: DATA_WORDS,
  expectedTopicCount: 3,
});
assert.equal(resumed.fromBlock, 104);
assert.equal(resumed.logs.length, 2);
assert.equal(resumed.toBlockHash, BOUNDARY_HASH);
assert.deepEqual(prepareAtlasEventHistoryCheckpoint({
  checkpoint: null,
  address: ADDRESS,
  topics: [LOCKED_TOPIC],
  deploymentBlock: 90,
  toBlock: 110,
  dataWordsByTopic: DATA_WORDS,
  expectedTopicCount: 3,
}), { logs: [], fromBlock: 90 });

assert.throws(
  () => prepareAtlasEventHistoryCheckpoint({
    checkpoint: { ...checkpoint, toBlock: 111 },
    address: ADDRESS,
    topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
    deploymentBlock: 90,
    toBlock: 110,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /event_history_checkpoint_ahead/,
);

assert.throws(
  () => prepareAtlasEventHistoryCheckpoint({
    checkpoint,
    address: "0x0000000000000000000000000000000000000000",
    topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
    deploymentBlock: 90,
    toBlock: 110,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /event_history_address_mismatch/,
);

assert.throws(
  () => prepareAtlasEventHistoryCheckpoint({
    checkpoint,
    address: ADDRESS,
    topics: [LOCKED_TOPIC],
    deploymentBlock: 90,
    toBlock: 110,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /event_history_topics_mismatch/,
);

assert.throws(
  () => prepareAtlasEventHistoryCheckpoint({
    checkpoint,
    address: ADDRESS,
    topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
    deploymentBlock: 91,
    toBlock: 110,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /event_history_deployment_block_mismatch/,
);

await assert.rejects(
  collectAtlasContractEventLogs({
    rpc: async () => [{ ...first, removed: true }],
    address: ADDRESS,
    topics: [LOCKED_TOPIC],
    fromBlock: 100,
    toBlock: 100,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /removed_log_in_finalized_range/,
);

await assert.rejects(
  collectAtlasContractEventLogs({
    rpc: async () => [{ ...first, address: "0x0000000000000000000000000000000000000000" }],
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    fromBlock: 100,
    toBlock: 100,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_address_mismatch/,
);

await assert.rejects(
  collectAtlasContractEventLogs({
    rpc: async () => [{ ...first, blockNumber: "0x63" }],
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    fromBlock: 100,
    toBlock: 100,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_block_out_of_range/,
);

assert.throws(() => normalizeAtlasLogRpcResult(null), /log_rpc_result_invalid/);
assert.throws(() => normalizeAtlasLogRpcResult({}), /log_rpc_result_invalid/);
assert.equal(parseAtlasRpcBlockNumber("0x6f11847"), 116463687);
assert.throws(() => parseAtlasRpcBlockNumber("latest"), /bsc_history_head_invalid/);
assert.throws(() => parseAtlasRpcBlockNumber("0xzz"), /bsc_history_head_invalid/);
assert.equal(shouldResetAtlasEventHistoryCheckpoint(new Error("event_history_checkpoint_ahead")), false);
assert.equal(shouldResetAtlasEventHistoryCheckpoint(new Error("event_history_topics_mismatch")), true);
assert.equal(shouldResetAtlasEventHistoryCheckpoint(new Error("to_block_invalid")), false);

assert.throws(
  () => normalizeAtlasEventLog({ ...first, data: "0x1234" }, {
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_data_invalid/,
);

assert.throws(
  () => normalizeAtlasEventLog({ ...first, data: `0x${"0".repeat(64 * 3)}` }, {
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_data_words_mismatch/,
);

assert.throws(
  () => normalizeAtlasEventLog({ ...first, data: `0x${"0".repeat(64 * 6)}` }, {
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_data_words_mismatch/,
);

assert.throws(
  () => normalizeAtlasEventLog({ ...first, topics: [...first.topics, ORDER_TOPIC] }, {
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_topic_mismatch/,
);

assert.throws(
  () => normalizeAtlasEventLog({ ...first, transactionIndex: undefined }, {
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_transaction_index_invalid/,
);

assert.throws(
  () => prepareAtlasEventHistoryCheckpoint({
    checkpoint: { ...checkpoint, logs: [{ ...first, blockNumber: "0x68" }] },
    address: ADDRESS,
    topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
    deploymentBlock: 90,
    toBlock: 110,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /event_history_log_out_of_range/,
);

assert.equal(atlasCheckpointBoundaryMatches(checkpoint, BOUNDARY_HASH), true);
assert.equal(atlasCheckpointBoundaryMatches(checkpoint, `0x${"d".repeat(64)}`), false);
assert.throws(
  () => atlasCheckpointBoundaryMatches({ ...checkpoint, toBlockHash: "0x1234" }, BOUNDARY_HASH),
  /checkpoint_block_hash_invalid/,
);

await assert.rejects(
  collectAtlasContractEventLogs({
    rpc: async () => [],
    address: ADDRESS,
    topics: [LOCKED_TOPIC],
    fromBlock: 100,
    toBlock: 110,
    chunkSize: 2,
    maxRanges: 2,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
  }),
  /log_range_limit_exceeded/,
);

await assert.rejects(
  collectAtlasContractEventLogs({
    rpc: async () => [first, first],
    address: ADDRESS,
    topics: [CLAIMED_TOPIC],
    fromBlock: 100,
    toBlock: 100,
    dataWordsByTopic: DATA_WORDS,
    expectedTopicCount: 3,
    maxLogsPerRange: 1,
  }),
  /log_result_limit_exceeded/,
);

assert.deepEqual(parseHttpsRpcUrls("https://one.example/key, https://two.example/rpc", "test_rpc"), [
  "https://one.example/key",
  "https://two.example/rpc",
]);
assert.throws(() => parseHttpsRpcUrls("https://one.example,http://127.0.0.1:8545", "test_rpc"), /test_rpc_invalid/);
assert.throws(() => parseHttpsRpcUrls("https://user:pass@example.com", "test_rpc"), /test_rpc_invalid/);

const preflightCalls = [];
const preflightResult = await preflightHistoryRpcUrl("https://history.example/key", {
  lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
  requestRpc: async (method, params) => {
    preflightCalls.push({ method, params });
    if (method === "eth_chainId") return "0x38";
    if (method === "eth_getBlockByNumber") {
      const probe = HISTORY_RPC_PROBES.find((item) => `0x${item.deploymentBlock.toString(16)}` === params[0]);
      return { number: params[0], hash: probe?.deploymentBlockHash };
    }
    if (method === "eth_getLogs") {
      const fromBlock = Number.parseInt(params[0].fromBlock, 16);
      const toBlock = Number.parseInt(params[0].toBlock, 16);
      const probe = HISTORY_RPC_PROBES.find((item) => (
        item.deploymentBlock >= fromBlock
        && item.deploymentBlock <= toBlock
        && item.logProbe.address.toLowerCase() === String(params[0].address).toLowerCase()
      ));
      return [{
        blockNumber: `0x${probe?.deploymentBlock.toString(16)}`,
        blockHash: probe?.deploymentBlockHash,
        transactionHash: probe?.logProbe.transactionHash,
        logIndex: probe?.logProbe.logIndex,
        address: probe?.logProbe.address,
        topics: [probe?.logProbe.topic0],
      }];
    }
    throw new Error("unexpected_method");
  },
});
assert.equal(preflightResult.chainId, "0x38");
assert.equal(preflightResult.probes, 3);
assert.equal(preflightResult.logRangeBlocks, 1000);
assert.equal(normalizeHistoryLogRangeBlocks(1500), 1500);
assert.equal(normalizeHistoryLogRangeBlocks(50), 1000);
assert.throws(() => normalizeHistoryLogRangeBlocks(50001), /rpc_history_range_blocks_invalid/);
assert.equal(preflightCalls.filter((item) => item.method === "eth_getLogs").length, 5);
const preflightRangeCalls = preflightCalls
  .filter((item) => item.method === "eth_getLogs")
  .filter((item) => item.params[0].fromBlock !== item.params[0].toBlock);
assert.equal(preflightRangeCalls.length, 2);
for (const call of preflightRangeCalls) {
  assert.equal(
    Number.parseInt(call.params[0].toBlock, 16)
      - Number.parseInt(call.params[0].fromBlock, 16)
      + 1,
    1000,
  );
}
assert.equal(preflightRangeCalls[0].params[0].fromBlock, "0x6615620");
assert.equal(preflightRangeCalls[1].params[0].toBlock, "0x661573b");

await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
    requestRpc: async (method, params) => {
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_getBlockByNumber") {
        const probe = HISTORY_RPC_PROBES.find((item) => `0x${item.deploymentBlock.toString(16)}` === params[0]);
        return { number: params[0], hash: probe?.deploymentBlockHash };
      }
      if (method === "eth_getLogs") {
        const fromBlock = Number.parseInt(params[0].fromBlock, 16);
        const toBlock = Number.parseInt(params[0].toBlock, 16);
        const visibleToBlock = Math.min(toBlock, fromBlock + 9);
        const probe = HISTORY_RPC_PROBES.find((item) => (
          item.deploymentBlock >= fromBlock
          && item.deploymentBlock <= visibleToBlock
          && item.logProbe.address.toLowerCase() === String(params[0].address).toLowerCase()
        ));
        return probe ? [{
          blockNumber: `0x${probe.deploymentBlock.toString(16)}`,
          blockHash: probe.deploymentBlockHash,
          transactionHash: probe.logProbe.transactionHash,
          logIndex: probe.logProbe.logIndex,
          address: probe.logProbe.address,
          topics: [probe.logProbe.topic0],
        }] : [];
      }
      throw new Error("unexpected_method");
    },
  }),
  /rpc_history_range_unsupported/,
);

await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
    requestRpc: async (method, params) => {
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_getBlockByNumber") {
        const probe = HISTORY_RPC_PROBES.find((item) => `0x${item.deploymentBlock.toString(16)}` === params[0]);
        return { number: params[0], hash: probe?.deploymentBlockHash };
      }
      if (method === "eth_getLogs") {
        const fromBlock = Number.parseInt(params[0].fromBlock, 16);
        const toBlock = Number.parseInt(params[0].toBlock, 16);
        const visibleFromBlock = Math.max(fromBlock, toBlock - 299);
        const probe = HISTORY_RPC_PROBES.find((item) => (
          item.deploymentBlock >= visibleFromBlock
          && item.deploymentBlock <= toBlock
          && item.logProbe.address.toLowerCase() === String(params[0].address).toLowerCase()
        ));
        return probe ? [{
          blockNumber: `0x${probe.deploymentBlock.toString(16)}`,
          blockHash: probe.deploymentBlockHash,
          transactionHash: probe.logProbe.transactionHash,
          logIndex: probe.logProbe.logIndex,
          address: probe.logProbe.address,
          topics: [probe.logProbe.topic0],
        }] : [];
      }
      throw new Error("unexpected_method");
    },
  }),
  /rpc_history_range_unsupported/,
);

await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
    requestRpc: async (method, params) => {
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_getBlockByNumber") {
        const probe = HISTORY_RPC_PROBES.find((item) => `0x${item.deploymentBlock.toString(16)}` === params[0]);
        return { number: params[0], hash: probe?.deploymentBlockHash };
      }
      if (method === "eth_getLogs") {
        const fromBlock = Number.parseInt(params[0].fromBlock, 16);
        const toBlock = Number.parseInt(params[0].toBlock, 16);
        if (toBlock - fromBlock + 1 > 10) throw new Error("rpc_error_-32600");
        const probe = HISTORY_RPC_PROBES.find((item) => item.deploymentBlock === fromBlock);
        return [{
          blockNumber: params[0].fromBlock,
          blockHash: probe?.deploymentBlockHash,
          transactionHash: probe?.logProbe.transactionHash,
          logIndex: probe?.logProbe.logIndex,
          address: probe?.logProbe.address,
          topics: [probe?.logProbe.topic0],
        }];
      }
      throw new Error("unexpected_method");
    },
  }),
  /rpc_history_range_unsupported/,
);

await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
    requestRpc: async (method, params) => {
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_getBlockByNumber") {
        const probe = HISTORY_RPC_PROBES.find((item) => `0x${item.deploymentBlock.toString(16)}` === params[0]);
        return { number: params[0], hash: probe?.deploymentBlockHash };
      }
      return [];
    },
  }),
  /rpc_history_log_mismatch/,
);

await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
    requestRpc: async (method, params) => {
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_getBlockByNumber") return { number: params[0], hash: `0x${"0".repeat(64)}` };
      return [];
    },
  }),
  /rpc_history_block_mismatch/,
);
await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
    requestRpc: async (method) => (method === "eth_chainId" ? "0x1" : null),
  }),
  /rpc_chain_id_mismatch/,
);
await assert.rejects(
  () => preflightHistoryRpcUrl("https://history.example/key", {
    lookupImpl: async () => [{ address: "127.0.0.1", family: 4 }],
    requestRpc: async () => { throw new Error("must_not_request"); },
  }),
  /rpc_hostname_invalid/,
);
let redirectPolicy;
await requestHistoryRpc("https://history.example/secret", "eth_chainId", [], {
  fetchImpl: async (_url, init) => {
    redirectPolicy = init.redirect;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x38" }), { status: 200 });
  },
});
assert.equal(redirectPolicy, "error");
await assert.rejects(
  () => requestHistoryRpc("https://history.example/secret", "eth_chainId", [], {
    fetchImpl: async () => new Response("x".repeat((2 * 1024 * 1024) + 1), { status: 200 }),
  }),
  /rpc_response_invalid/,
);

const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
const contentApiSource = await readFile(new URL("../server/content-api.mjs", import.meta.url), "utf8");
const secretGateIndex = workflow.indexOf("- name: Validate history RPC secret");
const configureSshIndex = workflow.indexOf("- name: Configure SSH");
const deployVpsIndex = workflow.indexOf("- name: Deploy on VPS");
assert(secretGateIndex > 0, "history RPC secret gate is missing");
assert(secretGateIndex < configureSshIndex, "history RPC secret must be validated before SSH setup");
assert(secretGateIndex < deployVpsIndex, "history RPC secret must be validated before VPS deploy");
assert(workflow.includes("node scripts/validate-history-rpc-secret.mjs"), "deploy must use the shared strict RPC URL parser");
assert(workflow.includes("ATLAS_CONTRACTS_LOG_CHUNK: 1000"), "preflight and runtime log chunk must stay aligned");
assert(workflow.indexOf("node scripts/validate-history-rpc-secret.mjs") < configureSshIndex, "functional history RPC preflight must run before SSH setup");
assert(workflow.includes("server/rpc-url-policy.mjs /tmp/atlas-rpc-url-policy.mjs"), "deploy must upload the shared RPC URL parser");
assert(workflow.includes("/tmp/atlas-rpc-url-policy.mjs /opt/atlas-content-api/rpc-url-policy.mjs"), "deploy must install the shared RPC URL parser");
assert(!contentApiSource.includes("result.payload?.result || []"), "null history RPC results must not become an empty log set");
assert(contentApiSource.includes('import { parseHttpsRpcUrls } from "./rpc-url-policy.mjs";'), "runtime must use the shared strict RPC URL parser");

const invalidSecret = spawnSync(process.execPath, [new URL("./validate-history-rpc-secret.mjs", import.meta.url).pathname], {
  env: { ...process.env, BSC_LOG_RPC_URLS: "https://valid.example,http://127.0.0.1:8545" },
  encoding: "utf8",
});
assert.notEqual(invalidSecret.status, 0, "malformed comma-separated deploy secret must fail closed");
assert(!`${invalidSecret.stdout}${invalidSecret.stderr}`.includes("127.0.0.1"), "invalid secret value must not be echoed");

console.log(JSON.stringify({ ok: true, ranges: filters.length, uniqueLogs: history.logs.length }, null, 2));
