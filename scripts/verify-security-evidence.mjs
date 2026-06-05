import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "public/security/security-evidence-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const errors = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

assert(manifest.status === "Security Review in progress", "Manifest status must remain 'Security Review in progress'.");
assert(Array.isArray(manifest.gates) && manifest.gates.length > 0, "Manifest gates must be a non-empty array.");
assert(manifest.notStatus.includes("Audited"), "Manifest must explicitly forbid 'Audited'.");

const requiredOpenGates = new Map([
  ["tariff-consistency", "open-decision-required"],
  ["testnet-deployment", "prepared-not-executed"],
  ["testnet-smoke", "prepared-not-executed"],
  ["testnet-battle", "prepared-not-executed"],
  ["external-audit", "not-started"],
]);

for (const [id, expectedStatus] of requiredOpenGates.entries()) {
  const gate = manifest.gates.find((item) => item.id === id);
  assert(Boolean(gate), `Missing required gate: ${id}`);
  if (gate) {
    assert(gate.status === expectedStatus, `Gate ${id} must be '${expectedStatus}', got '${gate.status}'.`);
  }
}

for (const gate of manifest.gates) {
  warn(Boolean(gate.next), `Gate ${gate.id} should describe next action.`);
  for (const evidence of gate.evidence || []) {
    assert(evidence.startsWith("/security/"), `Evidence path must start with /security/: ${evidence}`);
    const localPath = path.join(root, "public", evidence);
    assert(fs.existsSync(localPath), `Missing evidence file for gate ${gate.id}: ${evidence}`);
  }
}

const tariffOutputPath = path.join(root, "public/security/tariff-consistency-check-output.json");
const tariffOutput = JSON.parse(fs.readFileSync(tariffOutputPath, "utf8"));
assert(
  tariffOutput.conclusion === "Product/contract tariff mismatch found. Team decision required before deployment.",
  "Tariff output must keep mismatch conclusion until the team resolves the gate.",
);
assert(
  tariffOutput.lockup.every((item) => item.status === "MISMATCH" && item.multiplier === 10),
  "Lockup tariff output must show current x10 mismatch.",
);
assert(
  tariffOutput.daily.every((item) => item.status === "MISMATCH"),
  "Daily tariff output must show current mismatch.",
);

const preflightOutputPath = path.join(root, "public/security/testnet-preflight-output.json");
const preflightOutput = JSON.parse(fs.readFileSync(preflightOutputPath, "utf8"));
assert(preflightOutput.status === "not-ready", "Testnet preflight output must remain not-ready until required deployment inputs are provided.");
assert(
  preflightOutput.errors.includes("Tariff gate is still open. Choose Option A or Option B before deployment."),
  "Testnet preflight must block deployment while tariff gate is open.",
);

if (errors.length > 0) {
  console.error("Security evidence verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Security evidence verification warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log("Security evidence verification passed.");
console.log(`Gates checked: ${manifest.gates.length}`);
console.log(`Evidence files checked: ${manifest.gates.reduce((sum, gate) => sum + (gate.evidence || []).length, 0)}`);
