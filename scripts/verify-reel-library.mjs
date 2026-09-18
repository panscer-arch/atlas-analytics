import assert from "node:assert/strict";
import { MAIN_NAV_TABS, MAIN_TAB_BOARD_IDS } from "../src/modules/analytics/data/navigationShell.js";
import {
  mergeReelLibraryItems,
  reelLibrarySeeds,
  reviewedReelItems,
} from "../src/modules/analytics/data/reelLibraryData.js";

assert.equal(reviewedReelItems.length, 25);
assert.equal(reelLibrarySeeds.length, 37);
assert.equal(new Set(reelLibrarySeeds.map((item) => item.id)).size, reelLibrarySeeds.length);
assert.equal(new Set(reelLibrarySeeds.map((item) => new URL(item.sourceUrl).pathname)).size, reelLibrarySeeds.length);
assert.ok(reelLibrarySeeds.every((item) => item.title && item.summary && item.atlasUse && item.sourceUrl));
assert.ok(reelLibrarySeeds.every((item) => !item.category.includes("OSINT")));
assert.equal(MAIN_TAB_BOARD_IDS.reels, "reels");
assert.ok(MAIN_NAV_TABS.some((tab) => tab.id === "reels" && tab.label === "Ролики"));

const edited = { ...reelLibrarySeeds[0], summary: "Edited by the user" };
const custom = { id: "custom", title: "Custom", sourceUrl: "https://example.com/reel/custom" };
const merged = mergeReelLibraryItems([edited, custom]);
assert.equal(merged.length, reelLibrarySeeds.length + 1);
assert.equal(merged[0].summary, "Edited by the user");
assert.equal(merged[1].id, "custom");

console.log(`Reel library verified: ${reviewedReelItems.length} new, ${reelLibrarySeeds.length} total, saved edits preserved.`);
