import { parseHttpsRpcUrls } from "../server/rpc-url-policy.mjs";

try {
  parseHttpsRpcUrls(process.env.BSC_LOG_RPC_URLS, "bsc_log_rpc_urls");
  console.log("BSC_LOG_RPC_URLS validation passed.");
} catch {
  console.error("BSC_LOG_RPC_URLS must contain one to four valid HTTPS history-capable BNB Chain endpoints.");
  process.exitCode = 1;
}
