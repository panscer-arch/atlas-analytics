import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const DISK_GATE_GIB = 10;
const MEMORY_GATE_MIB = 2048;

const cases = [
  {
    diskFreeGiB: 4.4,
    memoryAvailableMiB: 1700,
    port5678Free: true,
    upgradeJobsIdle: true,
    existingContainersHealthy: true,
    expected: false,
  },
  {
    diskFreeGiB: 12,
    memoryAvailableMiB: 1900,
    port5678Free: true,
    upgradeJobsIdle: true,
    existingContainersHealthy: true,
    expected: false,
  },
  {
    diskFreeGiB: 12,
    memoryAvailableMiB: 2500,
    port5678Free: true,
    upgradeJobsIdle: true,
    existingContainersHealthy: true,
    expected: true,
  },
];

export function evaluatePreflight(reading) {
  const reasons = [];

  if (reading.diskFreeGiB < DISK_GATE_GIB) {
    reasons.push(`Free disk is below ${DISK_GATE_GIB} GiB`);
  }
  if (reading.memoryAvailableMiB < MEMORY_GATE_MIB) {
    reasons.push(`Available memory is below ${MEMORY_GATE_MIB} MiB`);
  }
  if (!reading.port5678Free) {
    reasons.push("TCP port 5678 is already in use");
  }
  if (!reading.upgradeJobsIdle) {
    reasons.push("systemd has active jobs");
  }
  if (!reading.existingContainersHealthy) {
    reasons.push("One or more existing containers are stopped or unhealthy");
  }

  return {
    ...reading,
    passed: reasons.length === 0,
    reasons,
  };
}

function parseArguments(argv) {
  const args = { selfTest: false, remote: "", identity: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--self-test") {
      args.selfTest = true;
    } else if (argument === "--remote") {
      args.remote = argv[index + 1] ?? "";
      index += 1;
    } else if (argument === "--identity") {
      args.identity = argv[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return args;
}

function parseRemoteOutput(output) {
  const values = new Map();
  const containers = [];

  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (key === "CONTAINER") containers.push(value);
    else values.set(key, value);
  }

  const memoryAvailableKiB = Number(values.get("MEM_AVAILABLE_KB"));
  const diskFreeKiB = Number(values.get("DISK_AVAILABLE_KB"));
  const activeJobs = Number(values.get("ACTIVE_JOBS"));
  const portState = values.get("PORT_5678");

  if (
    !Number.isFinite(memoryAvailableKiB) ||
    !Number.isFinite(diskFreeKiB) ||
    !Number.isFinite(activeJobs) ||
    !["free", "busy"].includes(portState)
  ) {
    throw new Error("Remote preflight returned incomplete system readings");
  }

  const containerStates = containers.map((entry) => {
    const [name, state, status] = entry.split("|");
    const declaredHealth =
      status?.match(/\((healthy|unhealthy|health: starting)\)/)?.[1] ?? null;
    return {
      name,
      running: state === "running",
      health: declaredHealth,
    };
  });

  const existingContainersHealthy =
    containerStates.length > 0 &&
    containerStates.every(
      (container) =>
        container.running && (container.health === null || container.health === "healthy"),
    );

  return {
    diskFreeGiB: Number((diskFreeKiB / 1024 / 1024).toFixed(2)),
    memoryAvailableMiB: Math.floor(memoryAvailableKiB / 1024),
    port5678Free: portState === "free",
    upgradeJobsIdle: activeJobs === 0,
    existingContainersHealthy,
    containers: containerStates,
  };
}

function collectRemote(remote, identity) {
  if (!remote) throw new Error("--remote is required");

  const remoteScript = String.raw`
set -eu
printf 'MEM_AVAILABLE_KB='
awk '/MemAvailable/ {print $2}' /proc/meminfo
printf 'DISK_AVAILABLE_KB='
df -Pk / | awk 'NR == 2 {print $4}'
if ss -ltnH | awk '{print $4}' | grep -qE '(^|:)5678$'; then
  echo 'PORT_5678=busy'
else
  echo 'PORT_5678=free'
fi
printf 'ACTIVE_JOBS='
systemctl list-jobs --no-legend --no-pager | sed '/^[[:space:]]*$/d' | wc -l
docker ps -a --format 'CONTAINER={{.Names}}|{{.State}}|{{.Status}}'
`;

  const sshArgs = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];
  if (identity) sshArgs.push("-i", identity);
  sshArgs.push(remote, remoteScript);

  const output = execFileSync("ssh", sshArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
  });

  return parseRemoteOutput(output);
}

function runSelfTest() {
  for (const fixture of cases) {
    const { expected, ...reading } = fixture;
    assert.equal(evaluatePreflight(reading).passed, expected);
  }

  const passingReading = {
    diskFreeGiB: 12,
    memoryAvailableMiB: 2500,
    port5678Free: true,
    upgradeJobsIdle: true,
    existingContainersHealthy: true,
  };
  assert.equal(evaluatePreflight({ ...passingReading, port5678Free: false }).passed, false);
  assert.equal(evaluatePreflight({ ...passingReading, upgradeJobsIdle: false }).passed, false);
  assert.equal(
    evaluatePreflight({ ...passingReading, existingContainersHealthy: false }).passed,
    false,
  );

  console.log(JSON.stringify({ selfTest: true, passed: true, cases: 6 }, null, 2));
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
    return;
  }

  const result = evaluatePreflight(collectRemote(args.remote, args.identity));
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 2;
}

main();
