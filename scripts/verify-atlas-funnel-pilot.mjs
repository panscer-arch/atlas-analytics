import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  atlasFunnelPilotEvents,
  atlasFunnelPilotProfiles,
  atlasFunnelPilotQuestions,
  atlasFunnelPilotRouteSteps,
  atlasFunnelPilotSegments,
  getAtlasFunnelPilotSteps,
} from "../src/modules/analytics/data/atlasFunnelPilotData.js";
import {
  buildAtlasFunnelAttribution,
  calculateAtlasFunnelProgress,
  determineAtlasFunnelProfile,
  determineAtlasFunnelReadiness,
  determineAtlasFunnelSegment,
  isAtlasFunnelQuizComplete,
  normalizeAtlasFunnelEvent,
} from "../src/modules/analytics/utils/atlasFunnelPilotUtils.js";

assert.equal(atlasFunnelPilotQuestions.length, 6);
assert.equal(Object.keys(atlasFunnelPilotSegments).length, 4);
assert.equal(Object.keys(atlasFunnelPilotProfiles).length, 11);
assert.ok(Object.values(atlasFunnelPilotSegments).every((segment) => (
  segment.leadType && segment.leadTitle && segment.leadText && segment.cta
)));
assert.ok(Object.values(atlasFunnelPilotRouteSteps).every((steps) => steps.length === 4));
assert.ok(Object.keys(atlasFunnelPilotSegments).every((segmentId) => (
  getAtlasFunnelPilotSteps(segmentId).length === 6
  && getAtlasFunnelPilotSteps(segmentId).every((step) => step.title && step.hook && step.body && step.proof && step.cta)
)));
assert.ok(atlasFunnelPilotEvents.includes("qualified_action"));

assert.equal(determineAtlasFunnelSegment({ interest: "regional", experience: "new" }), "regional-leader");
assert.equal(determineAtlasFunnelSegment({ interest: "partner", experience: "new" }), "mlm-leader");
assert.equal(determineAtlasFunnelSegment({ interest: "technical", experience: "wallet" }), "crypto-user");
assert.equal(determineAtlasFunnelSegment({ interest: "product", experience: "advanced" }), "crypto-user");
assert.equal(determineAtlasFunnelSegment({ interest: "product", experience: "new" }), "web3-new");
assert.equal(determineAtlasFunnelProfile({ interest: "product", experience: "new", wallet: "no" }), "beginner-no-wallet");
assert.equal(determineAtlasFunnelProfile({ interest: "technical", experience: "advanced", proof: "contracts" }), "technical-evaluator");
assert.equal(determineAtlasFunnelProfile({ interest: "partner", role: "mlm" }), "active-mlm-leader");
assert.equal(determineAtlasFunnelProfile({ interest: "regional", role: "regional" }), "regional-operator");
assert.equal(determineAtlasFunnelReadiness({ interest: "partner", role: "mlm" }), "R2");
assert.equal(determineAtlasFunnelReadiness({ interest: "technical", experience: "wallet", proof: "contracts" }), "R2");
assert.equal(determineAtlasFunnelReadiness({ interest: "product", role: "individual" }), "R1");

const completeAnswers = Object.fromEntries(atlasFunnelPilotQuestions.map((question) => [question.id, question.options[0].id]));
assert.equal(isAtlasFunnelQuizComplete(completeAnswers), true);
assert.equal(isAtlasFunnelQuizComplete({ experience: "new" }), false);

assert.deepEqual(
  buildAtlasFunnelAttribution("?utm_source=telegram&utm_campaign=pilot&ref=private-path&unsafe=value"),
  { utm_source: "telegram", utm_campaign: "pilot" },
);
assert.equal(calculateAtlasFunnelProgress(0, 6), 17);
assert.equal(calculateAtlasFunnelProgress(5, 6), 100);

assert.deepEqual(
  normalizeAtlasFunnelEvent({
    sessionId: "session-1",
    event: "question_answered",
    questionId: "interest",
    answerId: "technical",
    attribution: { utm_source: "telegram", unsafe: "drop-me" },
  }),
  {
    sessionId: "session-1",
    event: "question_answered",
    segmentId: "",
    profileId: "",
    roleId: "",
    readiness: "",
    questionId: "interest",
    answerId: "technical",
    stepId: "",
    source: "",
    attribution: { utm_source: "telegram" },
  },
);
assert.equal(normalizeAtlasFunnelEvent({ sessionId: "session-1", event: "unknown" }), null);
assert.equal(normalizeAtlasFunnelEvent({ event: "funnel_visit" }), null);

const serverSource = readFileSync(new URL("../server/content-api.mjs", import.meta.url), "utf8");
assert.match(serverSource, /url\.pathname === "\/api\/funnel\/events"/);
assert.match(serverSource, /url\.pathname === "\/api\/funnel\/leads"/);
assert.match(serverSource, /url\.pathname === "\/api\/funnel\/leads\/status"/);
assert.match(serverSource, /url\.pathname === "\/api\/funnel\/summary"/);
assert.match(serverSource, /ATLAS_FUNNEL_EVENTS_KEY/);
assert.match(serverSource, /ATLAS_FUNNEL_LEADS_KEY/);
assert.match(serverSource, /hasMarketingWriteSession\(request\)/);

console.log("Atlas funnel pilot verification passed");
