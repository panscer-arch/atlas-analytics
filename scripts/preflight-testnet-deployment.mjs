import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envFile = process.argv[2] || ".env.testnet";
const envPath = path.resolve(root, envFile);

const required = [
  "BNB_TESTNET_RPC_URL",
  "DEPLOYER_PRIVATE_KEY",
  "MAIN_TOKEN_ADDRESS",
  "PANCAKE_V3_TOKEN_ID",
  "TESTNET_TREASURY_ADDRESS",
  "PLATFORM_FEE",
];

const errors = [];
const warnings = [];

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isPrivateKey(value) {
  return /^(0x)?[a-fA-F0-9]{64}$/.test(value);
}

function isUint(value) {
  return /^\d+$/.test(value);
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

assert(fs.existsSync(envPath), `Missing env file: ${envFile}`);

let env = {};
if (fs.existsSync(envPath)) {
  env = parseEnv(fs.readFileSync(envPath, "utf8"));
}

for (const key of required) {
  assert(Boolean(env[key]), `Missing required env value: ${key}`);
}

if (env.BNB_TESTNET_RPC_URL) {
  assert(/^https?:\/\//.test(env.BNB_TESTNET_RPC_URL), "BNB_TESTNET_RPC_URL must be an http(s) URL.");
  warn(!/mainnet/i.test(env.BNB_TESTNET_RPC_URL), "BNB_TESTNET_RPC_URL contains 'mainnet'; confirm it is really BNB Testnet.");
}

if (env.DEPLOYER_PRIVATE_KEY) {
  assert(isPrivateKey(env.DEPLOYER_PRIVATE_KEY), "DEPLOYER_PRIVATE_KEY must be 64 hex chars, optionally prefixed with 0x.");
}

if (env.MAIN_TOKEN_ADDRESS) {
  assert(isAddress(env.MAIN_TOKEN_ADDRESS), "MAIN_TOKEN_ADDRESS must be a 0x Ethereum-style address.");
}

if (env.TESTNET_TREASURY_ADDRESS) {
  assert(isAddress(env.TESTNET_TREASURY_ADDRESS), "TESTNET_TREASURY_ADDRESS must be a 0x Ethereum-style address.");
}

if (env.PANCAKE_V3_TOKEN_ID) {
  assert(isUint(env.PANCAKE_V3_TOKEN_ID), "PANCAKE_V3_TOKEN_ID must be an unsigned integer.");
  assert(env.PANCAKE_V3_TOKEN_ID !== "0", "PANCAKE_V3_TOKEN_ID must not be 0.");
}

if (env.PLATFORM_FEE) {
  assert(isUint(env.PLATFORM_FEE), "PLATFORM_FEE must be an unsigned integer in contract PRECISION units.");
}

const manifestPath = path.join(root, "public/security/security-evidence-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const tariffGate = manifest.gates.find((gate) => gate.id === "tariff-consistency");
  assert(tariffGate?.status !== "open-decision-required", "Tariff gate is still open. Choose Option A or Option B before deployment.");
} else {
  warnings.push("security-evidence-manifest.json not found; tariff gate status was not checked.");
}

const result = {
  envFile,
  status: errors.length === 0 ? "ready" : "not-ready",
  requiredValuesChecked: required,
  errors,
  warnings,
  next:
    errors.length === 0
      ? "Run deploy-testnet-battle.sh, then registry verification and smoke tests."
      : "Fix preflight errors before running deploy-testnet-battle.sh.",
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) process.exit(1);
