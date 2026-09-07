import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const composePath = path.join(root, "ops/n8n/compose.yaml");
const envPath = path.join(root, "ops/n8n/.env.example");
const workflowPath = path.join(
  root,
  "ops/n8n/workflows/supersus-draft-approval-pilot.json",
);

const failures = [];

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${path.relative(root, filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const compose = readRequired(composePath);
const envExample = readRequired(envPath);

const requiredCompose = [
  "127.0.0.1:5678:5678",
  "N8N_ENCRYPTION_KEY",
  "DB_TYPE=postgresdb",
  "internal: true",
  "no-new-privileges:true",
  'max-size: "10m"',
  'max-file: "3"',
];

const forbiddenCompose = [
  "latest",
  "/var/run/docker.sock",
  "network_mode: host",
  "0.0.0.0:5678",
  "/opt/atlas-analytics",
  "supersus-twenty",
];

for (const value of requiredCompose) {
  if (compose && !compose.includes(value)) {
    failures.push(`Compose is missing required safety setting: ${value}`);
  }
}

for (const value of forbiddenCompose) {
  if (compose.includes(value)) {
    failures.push(`Compose contains forbidden setting: ${value}`);
  }
}

const requiredEnvironment = [
  "N8N_IMAGE=n8nio/n8n:2.37.11",
  "POSTGRES_IMAGE=postgres:16",
  "POSTGRES_DB=n8n",
  "POSTGRES_USER=n8n",
  "POSTGRES_PASSWORD=",
  "N8N_ENCRYPTION_KEY=",
  "TZ=Europe/Moscow",
];

for (const value of requiredEnvironment) {
  if (envExample && !envExample.includes(value)) {
    failures.push(`Environment template is missing: ${value}`);
  }
}

const secretAssignments = envExample
  .split(/\r?\n/)
  .filter((line) => /^(POSTGRES_PASSWORD|N8N_ENCRYPTION_KEY)=.+/.test(line));

if (secretAssignments.length > 0) {
  failures.push("Environment template contains a secret value");
}

let workflowChecked = false;
if (fs.existsSync(workflowPath)) {
  workflowChecked = true;
  let workflow;
  try {
    workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  } catch (error) {
    failures.push(`Workflow export is not valid JSON: ${error.message}`);
  }

  if (workflow) {
    if (workflow.active !== false) {
      failures.push("Workflow export must be inactive");
    }
    if (JSON.stringify(workflow).includes('"credentials"')) {
      failures.push("Workflow export contains credential metadata");
    }

    const forbiddenNodeFragments = [
      "scheduleTrigger",
      "cron",
      "webhook",
      "httpRequest",
      "executeCommand",
      "telegram",
      "gmail",
      "emailSend",
      "facebook",
      "linkedin",
      "twitter",
    ];
    const nodeTypes = (workflow.nodes ?? []).map((node) => String(node.type));
    for (const fragment of forbiddenNodeFragments) {
      if (nodeTypes.some((type) => type.toLowerCase().includes(fragment.toLowerCase()))) {
        failures.push(`Workflow contains forbidden node type: ${fragment}`);
      }
    }
  }
}

const summary = {
  composeSafe: failures.length === 0,
  workflowChecked,
  failures,
};

console.log(JSON.stringify(summary, null, 2));
process.exitCode = failures.length === 0 ? 0 : 1;
