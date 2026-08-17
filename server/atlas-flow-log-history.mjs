const HEX_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i;
const HEX_HASH_PATTERN = /^0x[a-f0-9]{64}$/i;
const HEX_QUANTITY_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const HEX_DATA_PATTERN = /^0x(?:[a-f0-9]{64})+$/i;

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

function assertLogsWithinBlockRange(logs, fromBlock, toBlock, errorCode) {
  const start = toSafeBlockNumber(fromBlock, "log_range_from_block");
  const end = toSafeBlockNumber(toBlock, "log_range_to_block");
  for (const log of logs) {
    const blockNumber = Number.parseInt(log.blockNumber, 16);
    if (blockNumber < start || blockNumber > end) throw new Error(errorCode);
  }
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

function normalizeDataWordsByTopic(value = {}) {
  const entries = Object.entries(value || {}).map(([topic, words]) => {
    const normalizedTopic = String(topic || "").toLowerCase();
    const exactWords = toSafeBlockNumber(words, "data_words");
    if (!HEX_HASH_PATTERN.test(normalizedTopic) || exactWords < 1) {
      throw new Error("data_words_invalid");
    }
    return [normalizedTopic, exactWords];
  });
  return new Map(entries);
}

export function normalizeAtlasLogRpcResult(result) {
  if (!Array.isArray(result)) throw new Error("log_rpc_result_invalid");
  return result;
}

export function parseAtlasRpcBlockNumber(value) {
  const quantity = String(value || "").toLowerCase();
  if (!HEX_QUANTITY_PATTERN.test(quantity)) throw new Error("bsc_history_head_invalid");
  const blockNumber = Number.parseInt(quantity, 16);
  if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) throw new Error("bsc_history_head_invalid");
  return blockNumber;
}

export function shouldResetAtlasEventHistoryCheckpoint(error) {
  const code = String(error?.message || "");
  if (code === "event_history_checkpoint_ahead") return false;
  return code.startsWith("event_history_")
    || code.startsWith("checkpoint_")
    || code.startsWith("log_")
    || code === "removed_log_in_finalized_range";
}

export function normalizeAtlasEventLog(log, {
  address,
  topics: expectedTopics,
  dataWordsByTopic = {},
  expectedTopicCount = 3,
}) {
  const expectedAddress = String(address || "").toLowerCase();
  const allowedTopics = new Set((expectedTopics || []).map((topic) => String(topic || "").toLowerCase()));
  const exactWords = normalizeDataWordsByTopic(dataWordsByTopic);
  const topicCount = toSafeBlockNumber(expectedTopicCount, "expected_topic_count");
  if (!log || typeof log !== "object") throw new Error("log_invalid");
  if (log.removed === true) throw new Error("removed_log_in_finalized_range");

  const logAddress = String(log.address || "").toLowerCase();
  const transactionHash = String(log.transactionHash || "").toLowerCase();
  const blockHash = String(log.blockHash || "").toLowerCase();
  const blockNumber = String(log.blockNumber || "").toLowerCase();
  const transactionIndex = String(log.transactionIndex || "").toLowerCase();
  const logIndex = String(log.logIndex || "").toLowerCase();
  const data = String(log.data || "").toLowerCase();
  const logTopics = Array.isArray(log.topics) ? log.topics.map((topic) => String(topic).toLowerCase()) : [];

  if (!HEX_ADDRESS_PATTERN.test(logAddress) || logAddress !== expectedAddress) throw new Error("log_address_mismatch");
  if (!HEX_HASH_PATTERN.test(transactionHash)) throw new Error("log_transaction_hash_invalid");
  if (!HEX_HASH_PATTERN.test(blockHash)) throw new Error("log_block_hash_invalid");
  if (!HEX_QUANTITY_PATTERN.test(blockNumber)) throw new Error("log_block_number_invalid");
  if (!HEX_QUANTITY_PATTERN.test(transactionIndex)) throw new Error("log_transaction_index_invalid");
  if (!HEX_QUANTITY_PATTERN.test(logIndex)) throw new Error("log_index_invalid");
  if (logTopics.length !== topicCount || !allowedTopics.has(logTopics[0])) throw new Error("log_topic_mismatch");
  if (logTopics.some((topic) => !HEX_HASH_PATTERN.test(topic))) throw new Error("log_topics_invalid");
  if (!HEX_DATA_PATTERN.test(data)) throw new Error("log_data_invalid");
  const expectedDataWords = exactWords.get(logTopics[0]);
  if (!expectedDataWords || (data.length - 2) / 64 !== expectedDataWords) {
    throw new Error("log_data_words_mismatch");
  }

  return {
    ...log,
    address: logAddress,
    transactionHash,
    blockHash,
    blockNumber,
    transactionIndex,
    logIndex,
    data,
    topics: logTopics,
  };
}

export function mergeAtlasEventLogs(logGroups, {
  address,
  topics,
  dataWordsByTopic = {},
  expectedTopicCount = 3,
}) {
  const uniqueLogs = new Map();
  for (const log of (logGroups || []).flat()) {
    const normalized = normalizeAtlasEventLog(log, { address, topics, dataWordsByTopic, expectedTopicCount });
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
  dataWordsByTopic = {},
  expectedTopicCount = 3,
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
  const logs = mergeAtlasEventLogs([checkpoint.logs || []], {
    address: normalizedAddress,
    topics,
    dataWordsByTopic,
    expectedTopicCount,
  });
  if (checkpointBlock < deployment && logs.length) throw new Error("event_history_log_out_of_range");
  if (logs.length) {
    assertLogsWithinBlockRange(logs, deployment, checkpointBlock, "event_history_log_out_of_range");
  }
  return {
    logs,
    fromBlock: checkpointBlock + 1,
    toBlock: checkpointBlock,
    toBlockHash: String(checkpoint.toBlockHash || "").toLowerCase(),
  };
}

export function buildAtlasEventHistoryCheckpoint({
  address,
  topics,
  deploymentBlock,
  toBlock,
  toBlockHash,
  logs,
  dataWordsByTopic = {},
  expectedTopicCount = 3,
}) {
  const normalizedTopics = [...new Set((topics || []).map((topic) => String(topic || "").toLowerCase()))].sort();
  const normalizedBlockHash = String(toBlockHash || "").toLowerCase();
  if (!HEX_HASH_PATTERN.test(normalizedBlockHash)) throw new Error("checkpoint_block_hash_invalid");
  const deployment = toSafeBlockNumber(deploymentBlock, "deployment_block");
  const checkpointBlock = toSafeBlockNumber(toBlock, "to_block");
  if (checkpointBlock < deployment) throw new Error("checkpoint_block_before_deployment");
  const normalizedLogs = mergeAtlasEventLogs([logs || []], {
    address,
    topics,
    dataWordsByTopic,
    expectedTopicCount,
  });
  assertLogsWithinBlockRange(normalizedLogs, deployment, checkpointBlock, "checkpoint_log_out_of_range");
  return {
    address: String(address || "").toLowerCase(),
    topics: normalizedTopics,
    deploymentBlock: deployment,
    toBlock: checkpointBlock,
    toBlockHash: normalizedBlockHash,
    logs: normalizedLogs,
  };
}

export function atlasCheckpointBoundaryMatches(checkpoint, canonicalBlockHash) {
  if (!checkpoint) return true;
  const checkpointHash = String(checkpoint.toBlockHash || "").toLowerCase();
  const canonicalHash = String(canonicalBlockHash || "").toLowerCase();
  if (!HEX_HASH_PATTERN.test(checkpointHash)) throw new Error("checkpoint_block_hash_invalid");
  if (!HEX_HASH_PATTERN.test(canonicalHash)) throw new Error("canonical_block_hash_invalid");
  return checkpointHash === canonicalHash;
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
  maxRanges = 250,
  dataWordsByTopic = {},
  expectedTopicCount = 3,
  maxLogsPerRange = 50000,
}) {
  if (typeof rpc !== "function") throw new Error("log_rpc_required");
  const normalizedAddress = String(address || "").toLowerCase();
  if (!HEX_ADDRESS_PATTERN.test(normalizedAddress)) throw new Error("contract_address_invalid");

  const normalizedTopics = [...new Set((topics || []).map((topic) => String(topic || "").toLowerCase()))];
  if (!normalizedTopics.length || normalizedTopics.some((topic) => !HEX_HASH_PATTERN.test(topic))) {
    throw new Error("event_topics_invalid");
  }

  const ranges = buildAtlasLogBlockRanges(fromBlock, toBlock, chunkSize);
  const safeMaxRanges = Math.max(1, Math.min(1000, toSafeBlockNumber(maxRanges, "max_ranges")));
  if (ranges.length > safeMaxRanges) throw new Error("log_range_limit_exceeded");
  const safeMaxLogsPerRange = Math.max(1, Math.min(50000, toSafeBlockNumber(maxLogsPerRange, "max_logs_per_range")));
  const safeConcurrency = Math.max(1, Math.min(6, toSafeBlockNumber(concurrency, "concurrency")));
  const batches = await mapWithConcurrency(ranges, safeConcurrency, async (range) => {
    const result = await rpc("eth_getLogs", [{
      address: normalizedAddress,
      fromBlock: toBlockHex(range.fromBlock),
      toBlock: toBlockHex(range.toBlock),
      topics: [normalizedTopics],
    }]);
    const rpcLogs = normalizeAtlasLogRpcResult(result);
    if (rpcLogs.length > safeMaxLogsPerRange) throw new Error("log_result_limit_exceeded");
    return rpcLogs.map((log) => {
      const normalized = normalizeAtlasEventLog(log, {
        address: normalizedAddress,
        topics: normalizedTopics,
        dataWordsByTopic,
        expectedTopicCount,
      });
      const logBlockNumber = Number.parseInt(normalized.blockNumber, 16);
      if (logBlockNumber < range.fromBlock || logBlockNumber > range.toBlock) {
        throw new Error("log_block_out_of_range");
      }
      return normalized;
    });
  });

  const logs = mergeAtlasEventLogs(batches, {
    address: normalizedAddress,
    topics: normalizedTopics,
    dataWordsByTopic,
    expectedTopicCount,
  });

  return {
    fromBlock: toSafeBlockNumber(fromBlock, "from_block"),
    toBlock: toSafeBlockNumber(toBlock, "to_block"),
    queryCount: ranges.length,
    logs,
    transactionHashes: [...new Set(logs.map((log) => log.transactionHash))],
  };
}
