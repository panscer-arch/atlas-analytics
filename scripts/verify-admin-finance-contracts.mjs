import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const openApiPath = resolve(root, "docs/admin-finance/openapi/atlas-admin-finance-api.v1.yaml");
const ddlPath = resolve(root, "docs/admin-finance/data-model/001_admin_finance_schema.sql");
const fixturesPath = resolve(root, "docs/admin-finance/fixtures/golden-fixtures.v1.json");
const methodologyPath = resolve(root, "src/modules/admin-finance/AdminFinanceMethodology.jsx");
const gateRegisterPath = resolve(root, "docs/admin-finance/spec/06-GATE-0-REGISTER.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseYamlWithRuby(path) {
  const source = [
    "require 'yaml'",
    "require 'json'",
    "value = YAML.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false)",
    "puts JSON.generate(value)",
  ].join("; ");
  return JSON.parse(execFileSync("ruby", ["-e", source, path], { encoding: "utf8" }));
}

function walk(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visitor, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => walk(entry, visitor, `${path}.${key}`));
  }
}

function resolveJsonPointer(document, pointer) {
  assert(pointer.startsWith("#/"), `Only local refs are allowed: ${pointer}`);
  return pointer
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], document);
}

function referencedParameterNames(openApi, operation) {
  return (operation.parameters ?? []).map((parameter) => {
    if (parameter.$ref) return resolveJsonPointer(openApi, parameter.$ref)?.name;
    return parameter.name;
  });
}

function verifyOpenApi() {
  const document = parseYamlWithRuby(openApiPath);
  assert(document.openapi === "3.1.0", "OpenAPI must use version 3.1.0");
  assert(document.servers?.[0]?.url === "/api/admin/v1", "Canonical API must be same-origin /api/admin/v1");
  assert(
    document.components?.securitySchemes?.sessionCookie?.name === "__Host-atlas_admin_session",
    "Admin session must use the __Host- cookie",
  );

  const requiredPaths = [
    "/meta",
    "/finance/overview",
    "/finance/cash-movements",
    "/finance/cycles",
    "/finance/platform-fees",
    "/finance/company-receipts",
    "/finance/partner-economics",
    "/finance/company-economics",
    "/finance/liquidity/roll-forward",
    "/finance/balances",
    "/claims",
    "/claims/{claimId}",
    "/forecast/snapshots/latest",
    "/forecast/snapshots/{snapshotId}",
    "/forecast/buckets",
    "/forecast/items",
    "/forecast/backtesting",
    "/alerts/{alertId}/deliveries",
    "/participants/search",
    "/participants/{participantId}",
    "/participants/{participantId}/{resource}",
    "/participants/{participantId}/wallet-reveal",
    "/head-account/summary",
    "/analytics/traffic",
    "/analytics/campaigns",
    "/management/growth-plan",
    "/reconciliation/runs",
    "/reconciliation/exceptions",
    "/reconciliation/exceptions/{exceptionId}",
    "/adjustments/proposals",
    "/adjustments/{adjustmentId}/approve",
    "/alerts",
    "/alerts/{alertId}/acknowledge",
    "/methodology/perimeters",
    "/methodology/rulesets",
    "/methodology/sources",
    "/methodology/gate0",
    "/audit",
    "/exports",
    "/exports/{jobId}",
  ];
  requiredPaths.forEach((path) => assert(document.paths?.[path], `Missing required OpenAPI path: ${path}`));

  const operations = [];
  const writeOperations = [];
  const methodNames = new Set(["get", "post", "put", "patch", "delete"]);
  Object.entries(document.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (!methodNames.has(method)) return;
      assert(operation.operationId, `Missing operationId for ${method.toUpperCase()} ${path}`);
      operations.push(operation.operationId);
      if (method !== "get") writeOperations.push({ path, method, operation });
    });
  });
  assert(new Set(operations).size === operations.length, "OpenAPI operationId values must be unique");

  const sensitiveWritePaths = new Set([
    "/participants/{participantId}/wallet-reveal",
    "/adjustments/proposals",
    "/adjustments/{adjustmentId}/approve",
    "/exports",
  ]);
  writeOperations.forEach(({ path, method, operation }) => {
    const names = referencedParameterNames(document, operation);
    assert(names.includes("X-CSRF-Token"), `${method.toUpperCase()} ${path} must require X-CSRF-Token`);
    assert(names.includes("Idempotency-Key"), `${method.toUpperCase()} ${path} must require Idempotency-Key`);
    if (sensitiveWritePaths.has(path)) {
      assert(names.includes("X-Atlas-Reason"), `${method.toUpperCase()} ${path} must require X-Atlas-Reason`);
      assert(names.includes("X-Atlas-Step-Up"), `${method.toUpperCase()} ${path} must require X-Atlas-Step-Up`);
    }
  });

  const refs = [];
  walk(document, (value) => {
    if (value && typeof value === "object" && typeof value.$ref === "string") refs.push(value.$ref);
  });
  [...new Set(refs)].forEach((ref) => assert(resolveJsonPointer(document, ref), `Unresolved OpenAPI ref: ${ref}`));

  const money = document.components.schemas.Money;
  assert(money?.properties?.amountRaw?.type === "string", "Money.amountRaw must be a string");
  assert(money?.properties?.decimals?.type === "integer", "Money.decimals must be an integer");
  assert(money?.additionalProperties === false, "Money must reject unknown fields");

  const overviewResponseRef = document.paths["/finance/overview"].get.responses["200"].content["application/json"].schema.$ref;
  assert(overviewResponseRef === "#/components/schemas/FinanceOverviewResponse", "Finance overview must use its strict response schema");
  const overviewData = document.components.schemas.FinanceOverviewData;
  assert(overviewData?.additionalProperties === false, "FinanceOverviewData must reject unknown fields");
  assert(overviewData.properties.liquidity.properties.perimeter.const === "payout_contract", "Overview liquidity perimeter must be explicit");
  assert(overviewData.properties.cycles.properties.perimeter.const === "participant_economics", "Overview cycle perimeter must be explicit");
  assert(overviewData.properties.companyRevenue.properties.perimeter.const === "company_treasury", "Overview company revenue perimeter must be explicit");

  const growthPlanResponseRef = document.paths["/management/growth-plan"].get.responses["200"].content["application/json"].schema.$ref;
  assert(growthPlanResponseRef === "#/components/schemas/ManagementGrowthPlanResponse", "Growth plan must use its strict response schema");
  const growthPlan = document.components.schemas.ManagementGrowthPlan;
  assert(growthPlan?.additionalProperties === false, "ManagementGrowthPlan must reject unknown fields");
  assert(growthPlan.properties.status.enum.includes("proposed"), "Growth plan must expose proposal state");
  const growthPlanMonth = document.components.schemas.ManagementGrowthPlanMonth;
  assert(growthPlanMonth?.additionalProperties === false, "ManagementGrowthPlanMonth must reject unknown fields");
  for (const field of ["newWalletsTarget", "dailyWalletReference", "cyclesTarget", "dailyCycleReference"]) {
    assert(growthPlanMonth.required.includes(field), `Growth plan month must require ${field}`);
    assert(growthPlanMonth.properties[field].type === "integer", `${field} must be an integer target`);
  }
  const partnerEconomicsRef = document.paths["/finance/partner-economics"].get.responses["200"].content["application/json"].schema.$ref;
  assert(partnerEconomicsRef === "#/components/schemas/PartnerEconomicsResponse", "Partner economics must use its strict response schema");
  assert(document.components.schemas.PartnerEconomics?.additionalProperties === false, "PartnerEconomics must reject unknown fields");
  const companyEconomicsRef = document.paths["/finance/company-economics"].get.responses["200"].content["application/json"].schema.$ref;
  assert(companyEconomicsRef === "#/components/schemas/CompanyEconomicsResponse", "Company economics must use its strict response schema");
  assert(document.components.schemas.CompanyEconomics?.additionalProperties === false, "CompanyEconomics must reject unknown fields");
  assert(document.components.schemas.CompanyEconomicsBucket?.additionalProperties === false, "CompanyEconomicsBucket must reject unknown fields");
  const platformFeesRef = document.paths["/finance/platform-fees"].get.responses["200"].content["application/json"].schema.$ref;
  assert(platformFeesRef === "#/components/schemas/PlatformFeesResponse", "Platform Fees must use its strict response schema");
  assert(document.components.schemas.PlatformFeeRecord?.additionalProperties === false, "PlatformFeeRecord must reject unknown fields");
  const companyReceiptsRef = document.paths["/finance/company-receipts"].get.responses["200"].content["application/json"].schema.$ref;
  assert(companyReceiptsRef === "#/components/schemas/CompanyReceiptsResponse", "Company Receipts must use its strict response schema");
  assert(document.components.schemas.CompanyReceiptRecord?.additionalProperties === false, "CompanyReceiptRecord must reject unknown fields");

  const gateResponse = document.components.schemas.GateZeroResponse;
  assert(gateResponse.properties.data.minItems === 14, "GateZeroResponse must require 14 decisions");
  assert(gateResponse.properties.data.maxItems === 14, "GateZeroResponse must contain exactly 14 decisions");
  assert(gateResponse.properties.total.const === 14, "GateZeroResponse total must equal 14");

  return { paths: Object.keys(document.paths).length, operations: operations.length, refs: new Set(refs).size };
}

function verifyDdl() {
  const ddl = readFileSync(ddlPath, "utf8");
  const tableMatches = [...ddl.matchAll(/CREATE TABLE admin_finance\.([a-z0-9_]+)/g)].map((match) => match[1]);
  assert(tableMatches.length >= 25, `Expected at least 25 canonical tables, found ${tableMatches.length}`);
  assert(new Set(tableMatches).size === tableMatches.length, "DDL contains duplicate table declarations");
  assert(/CREATE DOMAIN admin_finance\.atomic_amount AS numeric\(78, 0\)/.test(ddl), "DDL must define numeric(78,0) atomic money");
  assert(!/\bdouble\s+precision\b/i.test(ddl), "DDL must not use double precision for finance");
  assert(!/\breal\b/i.test(ddl), "DDL must not use real for finance");
  assert(/UNIQUE \(chain_id, tx_hash, log_index\)/.test(ddl), "Raw chain event identity must be unique");
  assert(/gross_delta_atomic\s*=\s*\n?\s*participant_net_delta_atomic \+ platform_fee_atomic \+ other_deductions_atomic/.test(ddl), "Claim gross invariant is missing");
  assert(/total_contract_outflow_atomic\s*=\s*\n?\s*principal_atomic \+ gross_delta_atomic \+ partner_reward_atomic/.test(ddl), "Claim outflow invariant is missing");
  assert(/DEFERRABLE INITIALLY DEFERRED/.test(ddl), "Ledger balance must be checked at transaction boundary");
  assert(/CREATE TABLE admin_finance\.forecast_source_watermarks/.test(ddl), "Forecast source watermark table is missing");
  assert(/CREATE TABLE admin_finance\.forecast_source_snapshot_ids/.test(ddl), "Forecast source snapshot identity table is missing");
  assert(/pg_advisory_xact_lock\(hashtextextended\(p_source_key, 0\)\)/.test(ddl), "Forecast source guard must serialize replicas per source");
  assert(/source_checkpoint_rollback/.test(ddl) && /source_checkpoint_equivocation/.test(ddl) && /source_snapshot_equivocation/.test(ddl), "Forecast source guard invariants are missing");
  assert((ddl.match(/reject_mutation\(\)/g) ?? []).length >= 5, "Append-only tables must have mutation guards");
  assert(/CREATE TABLE admin_finance\.management_growth_plan_versions/.test(ddl), "Growth plan version table is missing");
  assert(/CREATE TABLE admin_finance\.management_growth_plan_months/.test(ddl), "Growth plan month table is missing");
  assert(/CREATE TABLE admin_finance\.partner_economics_snapshots/.test(ddl), "Partner economics snapshot table is missing");
  assert(/CREATE TABLE admin_finance\.partner_economics_buckets/.test(ddl), "Partner economics bucket table is missing");
  assert(/CREATE TABLE admin_finance\.company_economics_snapshots/.test(ddl), "Company economics snapshot table is missing");
  assert(/CREATE TABLE admin_finance\.company_economics_buckets/.test(ddl), "Company economics bucket table is missing");
  assert(/CREATE TABLE admin_finance\.reserve_funding_alerts/.test(ddl), "Reserve funding alert table is missing");
  assert(/CREATE TABLE admin_finance\.notification_outbox/.test(ddl), "Notification outbox table is missing");
  assert(/CREATE TABLE admin_finance\.notification_delivery_attempts/.test(ddl), "Notification delivery attempt table is missing");
  assert(/UNIQUE \(notification_id, attempt_number\)/.test(ddl), "Notification attempts must be append-only ordered records");
  assert(/idempotency_key text NOT NULL UNIQUE/.test(ddl), "Notification idempotency key must be unique");
  assert(/notification_idempotency_equivocation/.test(ddl), "Outbox must reject an idempotency key reused with another payload");
  assert(/CREATE OR REPLACE FUNCTION admin_finance\.lease_due_notifications/.test(ddl), "Notification lease function is missing");
  assert(/FOR UPDATE SKIP LOCKED/.test(ddl), "Notification leasing must use SKIP LOCKED");
  assert(/CREATE OR REPLACE FUNCTION admin_finance\.complete_notification_attempt/.test(ddl), "Notification completion function is missing");
  assert(/notification_lease_lost/.test(ddl), "Notification completion must reject a lost lease");
  assert(/platform_fee_delta_atomic \+ platform_fee_partner_atomic\s*=\s*platform_fee_total_atomic/.test(ddl), "Company economics fee arithmetic is missing");
  assert(/platform_fee_total_atomic \+ head_account_income_atomic\s*=\s*company_revenue_atomic/.test(ddl), "Company economics revenue arithmetic is missing");
  assert(/REVOKE ALL ON ALL TABLES IN SCHEMA admin_finance FROM PUBLIC/.test(ddl), "Public table access must be revoked");
  return { tables: tableMatches.length };
}

function verifyFixtures() {
  const fixtureSet = JSON.parse(readFileSync(fixturesPath, "utf8"));
  assert(fixtureSet.cases.length >= 16, `Expected at least 16 golden cases, found ${fixtureSet.cases.length}`);
  const ids = fixtureSet.cases.map((fixture) => fixture.id);
  assert(new Set(ids).size === ids.length, "Golden fixture IDs must be unique");

  const numericAtomicFields = [];
  walk(fixtureSet, (value, path) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    Object.entries(value).forEach(([key, entry]) => {
      if (!key.endsWith("Atomic")) return;
      if (typeof entry === "number") numericAtomicFields.push(`${path}.${key}`);
      if (entry !== null && typeof entry === "string") {
        assert(/^-?[0-9]+$/.test(entry), `Atomic value must be an integer string at ${path}.${key}`);
      }
    });
  });
  assert(
    numericAtomicFields.length === 1 && numericAtomicFields[0].includes("cases[12].given.payload.amountAtomic"),
    `Only the negative wire-format fixture may contain numeric Atomic money: ${numericAtomicFields.join(", ")}`,
  );

  const byId = Object.fromEntries(fixtureSet.cases.map((fixture) => [fixture.id, fixture]));
  const payout = byId["GF-002"];
  const gross = BigInt(payout.given.grossDeltaAtomic);
  const net = BigInt(payout.given.participantNetDeltaAtomic);
  const fee = BigInt(payout.given.platformFeeAtomic);
  const deductions = BigInt(payout.given.otherDeductionsAtomic);
  const principal = BigInt(payout.given.principalAtomic);
  const partner = BigInt(payout.given.partnerRewardAtomic);
  assert(gross === net + fee + deductions, "GF-002 gross waterfall does not balance");
  assert(BigInt(payout.expect.claimTotalOutflowAtomic) === principal + gross + partner, "GF-002 total outflow double-counts or omits a component");

  const forecast = byId["GF-014"];
  const forecastOutflow = BigInt(forecast.given.principalDueAtomic)
    + BigInt(forecast.given.deltaGrossDueAtomic)
    + BigInt(forecast.given.partnerRewardDueAtomic)
    + BigInt(forecast.given.pendingPartnerCreationDueAtomic);
  assert(forecastOutflow === BigInt(forecast.expect.totalOutflowDueAtomic), "GF-014 forecast outflow is inconsistent");
  const forecastClosing = BigInt(forecast.given.openingLiquidityAtomic)
    + BigInt(forecast.given.expectedInflowAtomic)
    - forecastOutflow;
  assert(forecastClosing === BigInt(forecast.expect.closingLiquidityAtomic), "GF-014 closing liquidity is inconsistent");

  const reconciliation = byId["GF-015"];
  const expectedClosing = BigInt(reconciliation.given.openingBalanceAtomic)
    + BigInt(reconciliation.given.externalInAtomic)
    - BigInt(reconciliation.given.externalOutAtomic);
  assert(expectedClosing === BigInt(reconciliation.expect.expectedClosingAtomic), "GF-015 expected closing balance is inconsistent");
  assert(BigInt(reconciliation.given.observedClosingAtomic) - expectedClosing === BigInt(reconciliation.expect.residualAtomic), "GF-015 residual is inconsistent");

  const requiredCategories = new Set([
    "payout_waterfall",
    "lifecycle",
    "idempotency",
    "ordering",
    "reorg",
    "correction",
    "ruleset",
    "perimeter",
    "data_state",
    "availability",
    "authorization",
    "wire_format",
    "forecast",
    "reconciliation",
    "restore",
  ]);
  fixtureSet.cases.forEach((fixture) => requiredCategories.delete(fixture.category));
  assert(requiredCategories.size === 0, `Missing golden fixture categories: ${[...requiredCategories].join(", ")}`);

  return { cases: fixtureSet.cases.length };
}

function verifyGateRegistry() {
  const methodology = readFileSync(methodologyPath, "utf8");
  const uiGateIds = [...methodology.matchAll(/^\s+\["(0[1-9]|1[0-4])",/gm)].map((match) => match[1]);
  assert(uiGateIds.length === 14, `Methodology UI must define exactly 14 Gate 0 rows, found ${uiGateIds.length}`);
  assert(new Set(uiGateIds).size === 14, "Methodology UI Gate 0 IDs must be unique");

  const register = readFileSync(gateRegisterPath, "utf8");
  const documentedGateIds = [...register.matchAll(/^\| (G0-(?:0[1-9]|1[0-4])) \|/gm)].map((match) => match[1]);
  assert(documentedGateIds.length === 14, `Gate 0 document must define exactly 14 rows, found ${documentedGateIds.length}`);
  assert(new Set(documentedGateIds).size === 14, "Documented Gate 0 IDs must be unique");
  return { gateDecisions: uiGateIds.length };
}

try {
  const openApi = verifyOpenApi();
  const ddl = verifyDdl();
  const fixtures = verifyFixtures();
  const gate = verifyGateRegistry();
  console.log("Atlas Admin Finance contracts: OK");
  console.log(`  OpenAPI: ${openApi.paths} paths, ${openApi.operations} operations, ${openApi.refs} local refs`);
  console.log(`  PostgreSQL: ${ddl.tables} canonical tables`);
  console.log(`  Golden fixtures: ${fixtures.cases} cases`);
  console.log(`  Gate 0: ${gate.gateDecisions} synchronized decisions`);
} catch (error) {
  console.error(`Atlas Admin Finance contracts: FAILED\n${error.stack ?? error.message}`);
  process.exitCode = 1;
}
