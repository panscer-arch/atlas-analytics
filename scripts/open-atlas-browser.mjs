import { spawn } from "node:child_process";

const url = process.argv[2] || "http://127.0.0.1:3036/";
const appName = "ChatGPT Atlas";

const child = spawn("open", ["-a", appName, url], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
