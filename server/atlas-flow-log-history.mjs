const HEX_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i;
const HEX_HASH_PATTERN = /^0x[a-f0-9]{64}$/i;
const HEX_QUANTITY_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;

function toSafeBlockNumber(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`${label}_invalid`);
  }
  return number;
}

function toBlockHex(value) {
  return `0x${toSafeBlockNumber(value, "block").toString(16)}`;
}

export function buildAtlasLogBlockRanges(fromBlock, toBlock, chunkSize) {
  const start = toSafeBlockNumber(fromBlock, "from_block");
  const end = toSafeBlockNumber(toBlock, "to_block");
  const size = toSafeBlockNumber(chunkSize, "chunk_size");
  if (size < 1) throw new Error("chunk_size_invalid");
  if (end < start) return [];

  const ranges = [];
  for (let cursor = start; cursor <= end; cursor += size) {
    ranges.push({
      fromBlock: cursor,
      toBlock: Math.min(end, cursor + size - 1),
    });
  }
  return ranges;
}

export function normalizeAtlasEventLog(log, { address, topics: expectedTopics }) {
  const expectedAddress = String(address || "").toLowerCase();
  const allowedTopics = new Set((expectedTopics || []).map((topic) => String(topic || "").toLowerCase()));
  if (!log || typeof log !== "object") throw new Error("log_invalid");
  if (log.removed === true) throw new Error("removed_log_in_finalized_range");

  const logAddress = String(log.address || "").toLowerCase();
  const transactionHash = String(log.transactionHash || "").toLowerCase();
  const blockHash = String(log.blockHash || "").toLowerCase();
  const blockNumber = String(log.blockNumber || "").toLowerCase();
  const transactionIndex = String(log.transactionIndex || "0x0").toLowerCase();
  const logIndex = String(log.logIndex || "").toLowerCase();
  const logTopics = Array.isArray(log.topics) ? log.topics.map((topic) => String(topic).toLowerCase()) : [];

  if (!HEX_ADDRESS_PATTERN.test(logAddress) || logAddress !== expectedAddress) throw new Error("log_address_mismatch");
  if (!HEX_HASH_PATTERN.test(transactionHash)) throw new Error("log_transaction_hash_invalid");
  if (!HEX_HASH_PATTERN.test(blockHash)) throw new Error("log_block_hash_invalid");
  if (!HEX_QUANTITY_PATTERN.test(blockNumber)) throw new Error("log_block_number_invalid");
  if (!HEX_QUANTITY_PATTERN.test(transactionIndex)) throw new Error("log_transaction_index_invalid");
  if (!HEX_QUANTITY_PATTERN.test(logIndex)) throw new Error("log_index_invalid");
  if (!logTopics.length || !allowedTopics.has(logTopics[0])) throw new Error("log_topic_mismatch");

  return {
    ...log,
    address: logAddress,
    transactionHash,
    blockHash,
    blockNumber,
    transactionIndex,
    logIndex,
    topics: logTopics,
  };
}

export function mergeAtlasEventLogs(logGroups, { address, topics }) {
  const uniqueLogs = new Map();
  for (const log of (logGroups || []).flat()) {
    const normalized = normalizeAtlasEventLog(log, { address, topics });
    const key = `${normalized.blockHash}:${normalized.transactionHash}:${normalized.logIndex}`;
    uniqueLogs.set(key, normalized);
  }
  return [...uniqueLogs.values()].sort((left, right) => (
    Number.parseInt(left.blockNumber, 16) - Number.parseInt(right.blockNumber, 16)
    || Number.parseInt(left.transactionIndex, 16) - Number.parseInt(right.transactionIndex, 16)
    || Number.parseInt(left.logIndex, 16) - Number.parseInt(right.logIndex, 16)
  ));
}

export function prepareAtlasEventHistoryCheckpoint({
  checkpoint,
  address,
  topics,
  deploymentBlock,
  toBlock,
}) {
  const normalizedAddress = String(address || "").toLowerCase();
  const normalizedTopics = [...new Set((topics || []).map((topic) => String(topic || "").toLowerCase()))].sort();
  const deployment = toSafeBlockNumber(deploymentBlock, "deployment_block");
  const target = toSafeBlockNumber(toBlock, "to_block");
  if (!checkpoint) return { logs: [], fromBlock: deployment };
  if (String(checkpoint.address || "").toLowerCase() !== normalizedAddress) {
    throw new Error("event_history_address_mismatch");
  }
  const checkpointTopics = [...new Set((checkpoint.topics || []).map((topic) => String(topic || "").toLowerCase()))].sort();
  if (checkpointTopics.length !== normalizedTopics.length
    || checkpointTopics.some((topic, index) => topic !== normalizedTopics[index])) {
    throw new Error("event_history_topics_mismatch");
  }
  if (toSafeBlockNumber(checkpoint.deploymentBlock, "checkpoint_deployment_block") !== deployment) {
    throw new Error("event_history_deployment_block_mismatch");
  }
  const checkpointBlock = toSafeBlockNumber(checkpoint.toBlock, "checkpoint_block");
  if (checkpointBlock < deployment - 1) throw new Error("event_history_checkpoint_invalid");
  if (checkpointBlock > target) throw new Error("event_history_checkpoint_ahead");
  return {
    logs: mergeAtlasEventLogs([checkpoint.logs || []], { address: normalizedAddress, topics }),
    fromBlock: checkpointBlock + 1,
  };
}

export function buildAtlasEventHistoryCheckpoint({ address, topics, deploymentBlock, toBlock, logs }) {
  const normalizedTopics = [...new Set((topics || []).map((topic) => String(topic || "").toLowerCase()))].sort();
  return {
    address: String(address || "").toLowerCase(),
    topics: normalizedTopics,
    deploymentBlock: toSafeBlockNumber(deploymentBlock, "deployment_block"),
    toBlock: toSafeBlockNumber(toBlock, "to_block"),
    logs: mergeAtlasEventLogs([logs || []], { address, topics }),
  };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function collectAtlasContractEventLogs({
  rpc,
  address,
  topics,
  fromBlock,
  toBlock,
  chunkSize = 2000,
  concurrency = 2,
}) {
  if (typeof rpc !== "function") throw new Error("log_rpc_required");
  const normalizedAddress = String(address || "").toLowerCase();
  if (!HEX_ADDRESS_PATTERN.test(normalizedAddress)) throw new Error("contract_address_invalid");

  const normalizedTopics = [...new Set((topics || []).map((topic) => String(topic || "").toLowerCase()))];
  if (!normalizedTopics.length || normalizedTopics.some((topic) => !HEX_HASH_PATTERN.test(topic))) {
    throw new Error("event_topics_invalid");
  }

  const ranges = buildAtlasLogBlockRanges(fromBlock, toBlock, chunkSize);
  const safeConcurrency = Math.max(1, Math.min(6, toSafeBlockNumber(concurrency, "concurrency")));
  const batches = await mapWithConcurrency(ranges, safeConcurrency, async (range) => {
    const result = await rpc("eth_getLogs", [{
      address: normalizedAddress,
      fromBlock: toBlockHex(range.fromBlock),
      toBlock: toBlockHex(range.toBlock),
      topics: [normalizedTopics],
    }]);
    if (!Array.isArray(result)) throw new Error("log_rpc_result_invalid");
    return result.map((log) => normalizeAtlasEventLog(log, {
      address: normalizedAddress,
      topics: normalizedTopics,
    }));
  });

  const logs = mergeAtlasEventLogs(batches, { address: normalizedAddress, topics: normalizedTopics });

  return {
    fromBlock: toSafeBlockNumber(fromBlock, "from_block"),
    toBlock: toSafeBlockNumber(toBlock, "to_block"),
    queryCount: ranges.length,
    logs,
    transactionHashes: [...new Set(logs.map((log) => log.transactionHash))],
  };
}
