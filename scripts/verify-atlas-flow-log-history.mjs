import assert from "node:assert/strict";
import {
  buildAtlasLogBlockRanges,
  buildAtlasEventHistoryCheckpoint,
  collectAtlasContractEventLogs,
  mergeAtlasEventLogs,
  prepareAtlasEventHistoryCheckpoint,
} from "../server/atlas-flow-log-history.mjs";

const ADDRESS = "0x8F6daC6F25A5038112E1A01f1cBBD682e4D64889";
const LOCKED_TOPIC = "0xfc19754b7c43ed8f5cf6ce6617a1fff336b6cc4bb8e5ea4bfa6a031d019c49ff";
const CLAIMED_TOPIC = "0x46f6410c5ade89c93d7353c04c3b9b15e6419e35ad8a0d0a806476b30f2d1344";

assert.deepEqual(buildAtlasLogBlockRanges(100, 110, 4), [
  { fromBlock: 100, toBlock: 103 },
  { fromBlock: 104, toBlock: 107 },
  { fromBlock: 108, toBlock: 110 },
]);
assert.deepEqual(buildAtlasLogBlockRanges(10, 9, 4), []);

function makeLog({ blockNumber, transactionIndex, logIndex, topic, hashSeed }) {
  return {
    address: ADDRESS,
    blockHash: `0x${String(hashSeed).padStart(64, "a")}`,
    blockNumber: `0x${blockNumber.toString(16)}`,
    transactionHash: `0x${String(hashSeed).padStart(64, "b")}`,
    transactionIndex: `0x${transactionIndex.toString(16)}`,
    logIndex: `0x${logIndex.toString(16)}`,
    data: "0x",
    topics: [topic],
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
});
assert.equal(restoredHistory.length, 2, "persisted history must be validated and deduplicated");
assert.equal(restoredHistory[0].blockNumber, "0x65");

const checkpoint = buildAtlasEventHistoryCheckpoint({
  address: ADDRESS,
  topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
  deploymentBlock: 90,
  toBlock: 103,
  logs: [first, second, first],
});
const resumed = prepareAtlasEventHistoryCheckpoint({
  checkpoint,
  address: ADDRESS,
  topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
  deploymentBlock: 90,
  toBlock: 110,
});
assert.equal(resumed.fromBlock, 104);
assert.equal(resumed.logs.length, 2);
assert.deepEqual(prepareAtlasEventHistoryCheckpoint({
  checkpoint: null,
  address: ADDRESS,
  topics: [LOCKED_TOPIC],
  deploymentBlock: 90,
  toBlock: 110,
}), { logs: [], fromBlock: 90 });

assert.throws(
  () => prepareAtlasEventHistoryCheckpoint({
    checkpoint: { ...checkpoint, toBlock: 111 },
    address: ADDRESS,
    topics: [LOCKED_TOPIC, CLAIMED_TOPIC],
    deploymentBlock: 90,
    toBlock: 110,
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
  }),
  /log_address_mismatch/,
);

console.log(JSON.stringify({ ok: true, ranges: filters.length, uniqueLogs: history.logs.length }, null, 2));
