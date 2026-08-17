import { parseHttpsRpcUrls } from "../server/rpc-url-policy.mjs";
import { normalizeHistoryLogRangeBlocks, preflightHistoryRpcUrl } from "./history-rpc-preflight.mjs";

try {
  const urls = parseHttpsRpcUrls(process.env.BSC_LOG_RPC_URLS, "bsc_log_rpc_urls");
  const logRangeBlocks = normalizeHistoryLogRangeBlocks(process.env.ATLAS_CONTRACTS_LOG_CHUNK);
  await Promise.all(urls.map(async (url, index) => {
    try {
      await preflightHistoryRpcUrl(url, { logRangeBlocks });
    } catch {
      throw new Error(`endpoint_${index + 1}_preflight_failed`);
    }
  }));
  console.log(`BSC_LOG_RPC_URLS validation passed for ${urls.length} endpoint(s).`);
} catch (error) {
  const suffix = /^endpoint_\d+_preflight_failed$/.test(error?.message || "")
    ? ` ${error.message.replaceAll("_", " ")}.`
    : "";
  console.error(`BSC_LOG_RPC_URLS must contain one to four valid HTTPS history-capable BNB Chain endpoints.${suffix}`);
  process.exitCode = 1;
}
