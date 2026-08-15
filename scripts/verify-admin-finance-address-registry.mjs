import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const registryPath = resolve(root, "docs/admin-finance/contracts/controlled-address-registry.v1.json");
const envExamplePath = resolve(root, "deploy/admin-finance-staging/.env.example");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const envExample = readFileSync(envExamplePath, "utf8");

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const ZERO = "0x0000000000000000000000000000000000000000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertAddress(value, label, { allowZero = false } = {}) {
  assert(ADDRESS.test(String(value || "")), `${label} must be an EVM address`);
  if (!allowZero) assert(String(value).toLowerCase() !== ZERO, `${label} must not be zero`);
}

assert(registry.schema === "atlas.admin-finance.controlled-address-registry.v1", "Unexpected registry schema");
assert(registry.registryVersion === 1, "Unexpected registry version");
assert(registry.status === "evidence_ready_owner_approval_pending", "Candidate registry must remain pending until owner approval is recorded");
assert(registry.approval?.approvedForInternalAlphaStaging === false, "Unapproved registry must fail closed");
assert(registry.network?.chainId === 56, "Registry must target BNB Smart Chain mainnet");
assert(registry.settlementToken?.symbol === "USDT" && registry.settlementToken?.decimals === 18, "Settlement token metadata is invalid");
assertAddress(registry.settlementToken.address, "Settlement token");

const expectedIds = new Set(["lockup-flow", "daily-flow-v2", "daily-flow-v1-legacy", "transport", "distribute"]);
assert(Array.isArray(registry.contracts) && registry.contracts.length === expectedIds.size, "Registry must contain the five known Atlas contracts");
const addresses = new Set();
for (const contract of registry.contracts) {
  assert(expectedIds.delete(contract.id), `Unexpected or duplicate contract id: ${contract.id}`);
  assertAddress(contract.address, `${contract.id}.address`);
  assert(!addresses.has(contract.address.toLowerCase()), `Duplicate contract address: ${contract.address}`);
  addresses.add(contract.address.toLowerCase());
  assert(contract.includedInAlphaAllowlist === true, `${contract.id} must explicitly declare its Alpha allowlist intent`);
  assert(HASH.test(contract.runtimeCodeHash), `${contract.id}.runtimeCodeHash is invalid`);
  assertAddress(contract.owner, `${contract.id}.owner`);
  assertAddress(contract.pendingOwner, `${contract.id}.pendingOwner`, { allowZero: true });
  assertAddress(contract.treasury, `${contract.id}.treasury`);
  assert(/^\d+$/.test(contract.platformFeeRaw), `${contract.id}.platformFeeRaw must be atomic integer text`);
  assert(/^\d+$/.test(contract.platformFeePrecision), `${contract.id}.platformFeePrecision must be atomic integer text`);
  const expectedBps = Number(BigInt(contract.platformFeeRaw) * 10000n / BigInt(contract.platformFeePrecision));
  assert(expectedBps === contract.platformFeeBps, `${contract.id}.platformFeeBps does not match raw precision`);
}
assert(expectedIds.size === 0, `Registry is missing contracts: ${[...expectedIds].join(", ")}`);

assert(registry.contracts.filter((entry) => entry.lifecycle === "active").length === 3, "Active contract count changed unexpectedly");
assert(registry.contracts.filter((entry) => entry.lifecycle === "pending_activation").length === 1, "Daily V2 activation status must remain explicit");
assert(registry.contracts.filter((entry) => entry.lifecycle === "legacy").length === 1, "Legacy Daily V1 must remain in the historical perimeter");

assert(/^\d+$/.test(registry.sharedPosition?.tokenId), "Shared LP-NFT tokenId is invalid");
assertAddress(registry.sharedPosition?.positionManager, "Position manager");
assertAddress(registry.sharedPosition?.owner, "LP-NFT owner");
assertAddress(registry.sharedPosition?.tokenApproval, "LP-NFT token approval", { allowZero: true });
assert(registry.sharedPosition.operatorApprovalVerifiedFor.length === 4, "All four position-aware contracts must have verified operator approval");

for (const account of registry.administrativeAddresses) assertAddress(account.address, `administrativeAddresses.${account.id}`);
for (const external of registry.externalInfrastructure) {
  assertAddress(external.address, `externalInfrastructure.${external.id}`);
  assert(external.controlledByAtlas === false, `${external.id} must not enter the Atlas controlled-address allowlist`);
  assert(!addresses.has(external.address.toLowerCase()), `${external.id} leaked into the controlled contract registry`);
}

assert(/^[0-9a-f]{64}$/.test(registry.evidence?.auditArchive?.sha256), "Audit archive hash is invalid");
assert(registry.evidence.auditArchive.containsDeploymentRegistry === false, "Audit archive must not be represented as a deployment registry");
assert(/^https:\/\//.test(registry.evidence?.officialRegistryPdf?.url), "Official registry PDF URL must use HTTPS");
assert(/^[0-9a-f]{64}$/.test(registry.evidence?.officialRegistryPdf?.sha256), "Official registry PDF hash is invalid");
assert(registry.evidence?.independentRpc?.blockNumber > 0, "Independent RPC evidence block is missing");
assert(HASH.test(registry.evidence?.independentRpc?.blockHash), "Independent RPC evidence block hash is invalid");
assert(registry.knownDrift?.some((item) => item.id === "daily-flow-owner-after-pdf-publication"), "Known Daily Flow owner drift must be recorded");
assert(registry.knownDrift?.some((item) => item.id === "daily-flow-v2-activation-cutover" && item.status === "unresolved"), "Daily V1/V2 activation cutover must remain unresolved");
assert(registry.unresolved?.some((item) => item.includes("Dune")), "Missing Dune access must remain explicit");

const allowlist = registry.contracts.filter((entry) => entry.includedInAlphaAllowlist).map((entry) => entry.address).join(",");
assert(envExample.includes(`ATLAS_ADMIN_FINANCE_CONTRACT_ADDRESSES=${allowlist}`), "Staging example allowlist must match the reviewed registry order");

console.log(`Admin Finance candidate address registry verified: ${registry.contracts.length} contracts, ${registry.administrativeAddresses.length} administrative addresses.`);
