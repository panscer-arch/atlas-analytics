import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildMemoryPrompt, materializeCatalog, redactSensitiveText, splitSource, syncOfficialMemory } from "../server/official-memory-sync.mjs";

const source = {
  id: "page-atlas-smart-cycle",
  title: "Smart Cycle 1",
  url: "https://atlas-system.io/smartcycle-1/",
  tier: "B",
  type: "web_page",
  language: "ru",
  productStatus: "active",
  version: "2026-08-03",
  fetchedAt: "2026-08-03T00:00:00.000Z",
  contentHash: "abc123",
  content: "Smart Cycle 1 активен. Возврат и Delta не гарантированы.\n\npassword=do-not-store",
};
const catalog = { generatedAt: source.fetchedAt, stats: { pages: 1 }, knownConflicts: [{ id: "v1-v2", handling: "V2 current; V1 legacy." }], sources: [source], reviewQueue: [] };

assert.equal(redactSensitiveText("password=secret"), "password=[REDACTED]");
assert.equal(splitSource({ ...source, content: "a".repeat(9000) }, 4000).length, 3);
const prompt = buildMemoryPrompt(splitSource(source), catalog);
assert.match(prompt, /A > B > C/);
assert.match(prompt, /V2 current; V1 legacy/);
assert.doesNotMatch(prompt, /do-not-store/);

const root = await mkdtemp(path.join(tmpdir(), "atlas-official-memory-"));
const files = await materializeCatalog(catalog, path.join(root, "files"));
assert.equal(files.sources, 1);
assert.match(await readFile(path.join(root, "files/sources/page-atlas-smart-cycle.md"), "utf8"), /password=\[REDACTED\]/);

const dryRun = await syncOfficialMemory({ catalog, cursorFile: path.join(root, "cursor.json"), dryRun: true });
assert.equal(dryRun.catalogSources, 1);
assert.equal(dryRun.syncedBatches, 1);
assert.equal(dryRun.pendingChunks, 1);

const checkedInCatalog = JSON.parse(await readFile(path.resolve("content/hermes/atlas-official-memory.v1.json"), "utf8"));
assert.equal(checkedInCatalog.stats.canonicalFacts, 1);
const canonical = checkedInCatalog.sources.find((item) => item.id === "canonical-atlas-hermes-facts");
assert.ok(canonical);
assert.match(canonical.content, /0x8e61483d45a822cCB59482c47e1b6D28465605EC/);
assert.match(canonical.content, /0x8F418e29a32AAB69Abf3DA742c43E7aDfBFbA3c3/);
assert.match(canonical.content, /Linear, Binary and Smart Matrix 1 are planned/);

console.log("Official Hermes memory sync checks passed");
