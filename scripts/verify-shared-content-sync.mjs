import assert from "node:assert/strict";
import {
  hydrateSharedContent,
  isSameContent,
  mergeRecordsById,
  resolveSharedContent,
  resolveSharedRecords,
} from "../src/modules/analytics/utils/sharedContentMigration.js";

const defaultTeam = {
  nodes: [{ id: "member-1", data: { label: "Default" } }],
  edges: [],
};
const localTeam = {
  nodes: [
    { id: "member-1", data: { label: "Default" } },
    { id: "member-2", data: { label: "Local teammate" } },
  ],
  edges: [{ id: "edge-1", source: "member-2", target: "project-1" }],
};
const serverTeam = {
  nodes: [{ id: "member-server", data: { label: "Server teammate" } }],
  edges: [],
};

assert.equal(isSameContent(defaultTeam, structuredClone(defaultTeam)), true, "equal snapshots must compare equal");
assert.equal(isSameContent(defaultTeam, localTeam), false, "custom snapshots must differ from defaults");

assert.deepEqual(
  resolveSharedContent({
    serverResult: { ok: true, exists: false, value: null },
    localValue: defaultTeam,
    defaultValue: defaultTeam,
  }),
  { value: defaultTeam, shouldMigrate: false, source: "default" },
  "an untouched browser must not seed defaults on the server",
);

let migratedTeam = null;
const migratedResult = await hydrateSharedContent({
  serverResult: { ok: true, exists: false, value: null },
  localValue: localTeam,
  defaultValue: defaultTeam,
  save: async (value) => {
    migratedTeam = value;
    return true;
  },
});
assert.deepEqual(migratedTeam, localTeam, "hydration must upload customized local team data to an empty server");
assert.deepEqual(
  migratedResult,
  { value: localTeam, source: "local", migration: "saved" },
  "successful local migration must be reported to the UI",
);

let unexpectedSave = false;
const serverResult = await hydrateSharedContent({
  serverResult: { ok: true, exists: true, value: serverTeam },
  localValue: localTeam,
  defaultValue: defaultTeam,
  save: async () => {
    unexpectedSave = true;
    return true;
  },
});
assert.equal(unexpectedSave, false, "hydration must not overwrite a customized server snapshot");
assert.deepEqual(
  serverResult,
  { value: serverTeam, source: "server", migration: "not-needed" },
  "server hydration must report the server as source of truth",
);

assert.deepEqual(
  resolveSharedContent({
    serverResult: { ok: true, exists: false, value: null },
    localValue: localTeam,
    defaultValue: defaultTeam,
  }),
  { value: localTeam, shouldMigrate: true, source: "local" },
  "a customized local snapshot must be migrated when the server is empty",
);

assert.deepEqual(
  resolveSharedContent({
    serverResult: { ok: true, exists: true, value: serverTeam },
    localValue: localTeam,
    defaultValue: defaultTeam,
  }),
  { value: serverTeam, shouldMigrate: false, source: "server" },
  "a customized server snapshot must win over stale local data",
);

assert.deepEqual(
  resolveSharedContent({
    serverResult: { ok: true, exists: true, value: defaultTeam },
    localValue: localTeam,
    defaultValue: defaultTeam,
  }),
  { value: localTeam, shouldMigrate: true, source: "local" },
  "a customized local snapshot must replace a server snapshot that is still the built-in default",
);

assert.deepEqual(
  resolveSharedContent({
    serverResult: { ok: false, exists: false, value: null },
    localValue: localTeam,
    defaultValue: defaultTeam,
  }),
  { value: localTeam, shouldMigrate: false, source: "local-offline" },
  "offline hydration must keep local data without claiming a migration",
);

assert.deepEqual(
  mergeRecordsById(
    [{ id: "server", title: "Server" }, { id: "shared", title: "Server version" }],
    [{ id: "local", title: "Local" }, { id: "shared", title: "Stale local version" }],
  ),
  [
    { id: "server", title: "Server" },
    { id: "shared", title: "Server version" },
    { id: "local", title: "Local" },
  ],
  "stable-id merge must preserve primary records and append unique local records",
);

const serverSignals = [{ id: "server-signal", title: "Server signal" }];
const localSignals = [{ id: "local-signal", title: "Local signal" }];
assert.deepEqual(
  resolveSharedRecords({
    serverResult: { ok: true, exists: true, value: serverSignals },
    localRecords: localSignals,
    migrationComplete: false,
  }),
  {
    value: [...serverSignals, ...localSignals],
    shouldMigrate: true,
    source: "merged",
  },
  "the first signal hydration must merge unique server and local ideas",
);
assert.deepEqual(
  resolveSharedRecords({
    serverResult: { ok: true, exists: true, value: serverSignals },
    localRecords: localSignals,
    migrationComplete: true,
  }),
  { value: serverSignals, shouldMigrate: false, source: "server" },
  "after migration the server must prevent stale local signals from being resurrected",
);
assert.deepEqual(
  resolveSharedRecords({
    serverResult: { ok: true, exists: false, value: null },
    localRecords: localSignals,
    migrationComplete: false,
  }),
  { value: localSignals, shouldMigrate: true, source: "local" },
  "local ideas must seed an empty signal store",
);

console.log("Shared content migration verification passed.");
