import assert from "node:assert/strict";

import {
  DEFAULT_UTM_FIELDS,
  buildUtmUrl,
  normalizeUtmValue,
  parseUtmUrl,
} from "../src/modules/analytics/utils/utmBuilderUtils.js";

const expectedPresetUrl =
  "https://atlas-system.io/smartcycle-1/?utm_source=bscscan&utm_medium=display&utm_campaign=smartcycle1_launch_aug2026&utm_content=header_text_v1";

assert.equal(buildUtmUrl(DEFAULT_UTM_FIELDS).url, expectedPresetUrl);
assert.equal(normalizeUtmValue(" Smart Cycle Launch "), "smart_cycle_launch");

const withExistingQuery = buildUtmUrl({
  ...DEFAULT_UTM_FIELDS,
  destinationUrl: "https://atlas-system.io/smartcycle-1/?ref=partner-42",
  campaign: "August Launch",
});
assert.equal(withExistingQuery.error, "");
assert.equal(
  withExistingQuery.url,
  "https://atlas-system.io/smartcycle-1/?ref=partner-42&utm_source=bscscan&utm_medium=display&utm_campaign=august_launch&utm_content=header_text_v1",
);

assert.equal(buildUtmUrl({ ...DEFAULT_UTM_FIELDS, source: "" }).url, "");
assert.match(buildUtmUrl({ ...DEFAULT_UTM_FIELDS, source: "" }).error, /источник/);
assert.match(buildUtmUrl({ ...DEFAULT_UTM_FIELDS, destinationUrl: "atlas-system.io" }).error, /https/);

const parsed = parseUtmUrl(
  "https://atlas-system.io/smartcycle-1/?ref=partner-42&utm_source=bscscan&utm_medium=display&utm_campaign=august_launch&utm_content=header_text_v1#details",
);
assert.deepEqual(parsed, {
  destinationUrl: "https://atlas-system.io/smartcycle-1/?ref=partner-42#details",
  source: "bscscan",
  medium: "display",
  campaign: "august_launch",
  content: "header_text_v1",
  term: "",
  campaignId: "",
});

assert.equal(parseUtmUrl("not-a-url"), null);

console.log("UTM builder verification passed.");
