import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("docs/admin-finance/project-memory");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const expectedMvpRoutes = new Set([
  "/admin/reconciliation",
  "/admin/flows",
  "/admin/liquidity",
  "/admin/cycles",
  "/admin/claims",
]);

if (manifest.version !== 1 || manifest.status !== "mvp_foundation_in_progress") {
  throw new Error("Admin Finance project memory status is invalid.");
}
if (manifest.mvpRoutes.length !== expectedMvpRoutes.size
  || manifest.mvpRoutes.some((route) => !expectedMvpRoutes.has(route))) {
  throw new Error("Admin Finance MVP route set drifted from the approved launch scope.");
}
if (manifest.fullProductRoutes.length !== 14 || new Set(manifest.fullProductRoutes).size !== 14) {
  throw new Error("Admin Finance full product must retain exactly 14 unique routes.");
}
if (!manifest.fixedRules.partnerRewardSeparateFromDelta
  || !manifest.fixedRules.platformFeeInsideGross
  || manifest.fixedRules.demoAllowedInProduction) {
  throw new Error("Admin Finance fixed financial or production rules drifted.");
}

await Promise.all(manifest.requiredReading.map(async (file) => {
  const text = await readFile(resolve(root, file), "utf8");
  if (text.trim().length < 100) throw new Error(`Project memory file is incomplete: ${file}`);
}));

const agents = await readFile(resolve("AGENTS.md"), "utf8");
if (!agents.includes("docs/admin-finance/project-memory/START-HERE.md")) {
  throw new Error("AGENTS.md must require Admin Finance project memory reading.");
}

console.log("Atlas Admin Finance project memory: OK");
console.log(`  MVP routes: ${manifest.mvpRoutes.length}`);
console.log(`  Full product routes retained: ${manifest.fullProductRoutes.length}`);
console.log(`  Target internal launch: ${manifest.targetInternalLaunch}`);
