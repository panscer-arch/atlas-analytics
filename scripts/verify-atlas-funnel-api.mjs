import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const port = 19000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const funnelStepIds = ["foundation", "definition", "smart-cycle", "risks", "verification", "safe-start"];
const storeDir = await mkdtemp(path.join(tmpdir(), "atlas-funnel-api-"));
const password = "atlas-funnel-api-test";
const passwordHash = createHash("sha256").update(password).digest("hex");
const signingSecret = randomBytes(32).toString("hex");
const child = spawn(process.execPath, ["server/content-api.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    ATLAS_CONTENT_API_PORT: String(port),
    ATLAS_CONTENT_STORE_DIR: storeDir,
    SUPERSUS_ACCESS_PASSWORD_HASH: passwordHash,
    ATLAS_FUNNEL_SIGNING_SECRET: signingSecret,
    ATLAS_TELEGRAM_ENV_FILE: path.join(storeDir, "missing-telegram.env"),
    ATLAS_OUTREACH_ENV_FILE: path.join(storeDir, "missing-outreach.env"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer(processHandle) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("funnel_api_start_timeout")), 10_000);
    const onData = (chunk) => {
      if (!String(chunk).includes("Atlas content API listening")) return;
      clearTimeout(timeout);
      processHandle.stdout.off("data", onData);
      resolve();
    };
    processHandle.stdout.on("data", onData);
    processHandle.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`funnel_api_exited_${code}`));
    });
  });
}

function postAt(baseUrl, pathname, body, options = {}) {
  const headers = {
    Origin: options.origin || baseUrl,
    "Content-Type": options.contentType || "application/json",
    ...(options.headers || {}),
  };
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
  });
}

function post(pathname, body, options = {}) {
  return postAt(origin, pathname, body, options);
}

try {
  await waitForServer(child);

  const missingOrigin = await fetch(`${origin}/api/funnel/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(missingOrigin.status, 403);

  const wrongContentType = await post("/api/funnel/session", {}, { contentType: "text/plain" });
  assert.equal(wrongContentType.status, 415);

  const crossOrigin = await post("/api/funnel/session", {}, { origin: "https://example.invalid" });
  assert.equal(crossOrigin.status, 403);

  const sessionResponse = await post("/api/funnel/session", {});
  assert.equal(sessionResponse.status, 201);
  const session = await sessionResponse.json();
  assert.ok(session.sessionId && session.sessionToken);

  const expiredSessionId = randomBytes(16).toString("hex");
  const expiredIssuedAt = Date.now() - 25 * 60 * 60 * 1000;
  const expiredPayload = `${expiredSessionId}.${expiredIssuedAt}`;
  const expiredSignature = createHmac("sha256", signingSecret).update(expiredPayload).digest("hex");
  const expiredToken = `${expiredPayload}.${expiredSignature}`;
  const expiredEvent = await post("/api/funnel/events", {
    sessionId: expiredSessionId,
    sessionToken: expiredToken,
    clientEventId: "event-expired-0001",
    event: "funnel_visit",
  });
  assert.equal(expiredEvent.status, 401);
  const renewedSessionResponse = await post("/api/funnel/session", {
    sessionId: expiredSessionId,
    sessionToken: expiredToken,
  });
  assert.equal(renewedSessionResponse.status, 201);
  const renewedSession = await renewedSessionResponse.json();
  assert.equal(renewedSession.sessionId, expiredSessionId);
  assert.notEqual(renewedSession.sessionToken, expiredToken);

  const malformed = await post("/api/funnel/events", null, { rawBody: "{" });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { ok: false, error: "invalid_funnel_event" });

  const nullPayload = await post("/api/funnel/events", null);
  assert.equal(nullPayload.status, 400);

  const oversized = await post("/api/funnel/events", null, { rawBody: JSON.stringify({ padding: "x".repeat(9000) }) });
  assert.equal(oversized.status, 413);

  const baseEvent = {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    clientEventId: "event-visit-0001",
    event: "funnel_visit",
    attribution: { utm_source: "telegram" },
  };

  const crossOriginEvent = await post("/api/funnel/events", baseEvent, { origin: "https://example.invalid" });
  assert.equal(crossOriginEvent.status, 403);

  const wrongEventContentType = await post("/api/funnel/events", baseEvent, { contentType: "text/plain" });
  assert.equal(wrongEventContentType.status, 415);

  const invalidSession = await post("/api/funnel/events", { ...baseEvent, sessionToken: "invalid" });
  assert.equal(invalidSession.status, 401);

  const visit = await post("/api/funnel/events", baseEvent);
  assert.equal(visit.status, 201);

  const replay = await post("/api/funnel/events", { ...baseEvent, clientEventId: "event-visit-0002" });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).deduplicated, true);

  const started = await post("/api/funnel/events", {
    ...baseEvent,
    clientEventId: "event-started-01",
    event: "funnel_started",
    attribution: {},
  });
  assert.equal(started.status, 201);

  const incompleteLead = await post("/api/funnel/leads", {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    segmentId: "crypto-user",
    leadType: "technical",
    contactMethod: "telegram",
    contact: "@atlas_test_user",
    consent: true,
  });
  assert.equal(incompleteLead.status, 409);
  assert.equal((await incompleteLead.json()).error, "funnel_route_not_completed");

  const invalidLeadContact = await post("/api/funnel/leads", {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    segmentId: "crypto-user",
    leadType: "technical",
    contactMethod: "telegram",
    contact: "bad",
    consent: true,
  });
  assert.equal(invalidLeadContact.status, 400);

  const crossOriginLead = await post("/api/funnel/leads", {}, { origin: "https://example.invalid" });
  assert.equal(crossOriginLead.status, 403);
  const wrongLeadContentType = await post("/api/funnel/leads", {}, { contentType: "text/plain" });
  assert.equal(wrongLeadContentType.status, 415);
  const oversizedLead = await post("/api/funnel/leads", null, {
    rawBody: JSON.stringify({ padding: "x".repeat(5000) }),
  });
  assert.equal(oversizedLead.status, 413);

  const invalidQuestion = await post("/api/funnel/events", {
    ...baseEvent,
    clientEventId: "event-question-invalid",
    event: "question_answered",
    questionId: "experience",
    answerId: "invented",
    attribution: {},
  });
  assert.equal(invalidQuestion.status, 400);

  const outOfSequence = await post("/api/funnel/events", {
    ...baseEvent,
    clientEventId: "event-complete-01",
    event: "route_completed",
    stepId: "safe-start",
    attribution: {},
  });
  assert.equal(outOfSequence.status, 409);

  const sessionLimitStatuses = [];
  for (let index = 0; index < 36; index += 1) {
    const response = await post("/api/funnel/events", {
      ...baseEvent,
      clientEventId: `event-proof-${String(index).padStart(3, "0")}`,
      event: "proof_opened",
      stepId: "foundation",
      attribution: {},
    });
    sessionLimitStatuses.push(response.status);
  }
  assert.ok(sessionLimitStatuses.slice(0, -1).every((status) => status === 200 || status === 201));
  assert.equal(sessionLimitStatuses.at(-1), 429);

  const completedSessionResponse = await post("/api/funnel/session", {});
  assert.equal(completedSessionResponse.status, 201);
  const completedSession = await completedSessionResponse.json();
  const completedBase = {
    sessionId: completedSession.sessionId,
    sessionToken: completedSession.sessionToken,
    attribution: { utm_source: "youtube" },
  };
  const completedEvents = [
    { event: "funnel_visit" },
    { event: "funnel_started" },
    { event: "question_answered", questionId: "experience", answerId: "wallet" },
    { event: "question_answered", questionId: "interest", answerId: "technical" },
    { event: "question_answered", questionId: "wallet", answerId: "yes" },
    { event: "question_answered", questionId: "proof", answerId: "contracts" },
    { event: "question_answered", questionId: "source", answerId: "youtube", source: "youtube" },
    { event: "segment_selected", segmentId: "crypto-user", source: "youtube" },
    ...funnelStepIds.map((stepId, index) => ({
      event: "step_opened",
      stepId,
      ...(index === 0 ? { segmentId: "crypto-user", source: "youtube" } : {}),
    })),
    { event: "route_completed", stepId: "safe-start", source: "youtube" },
    { event: "qualified_action", stepId: "lead-form", source: "youtube" },
  ];
  for (const [index, event] of completedEvents.entries()) {
    const response = await post("/api/funnel/events", {
      ...completedBase,
      ...event,
      clientEventId: `event-complete-flow-${String(index).padStart(2, "0")}`,
    });
    assert.equal(response.status, 201);
  }
  const qualifiedReplay = await post("/api/funnel/events", {
    ...completedBase,
    event: "qualified_action",
    stepId: "official-site",
    source: "youtube",
    clientEventId: "event-qualified-replay",
  });
  assert.equal(qualifiedReplay.status, 200);

  const leadResponse = await post("/api/funnel/leads", {
    ...completedSession,
    segmentId: "crypto-user",
    leadType: "technical",
    contactMethod: "telegram",
    contact: "https://t.me/atlas_test_user",
    name: "Test Lead",
    country: "Turkey",
    message: "Please send the technical materials.",
    source: "youtube",
    attribution: { utm_source: "youtube" },
    consent: true,
  });
  assert.equal(leadResponse.status, 201);
  const createdLead = await leadResponse.json();
  assert.ok(createdLead.leadId);
  assert.equal(createdLead.deduplicated, false);

  const duplicateLeadResponse = await post("/api/funnel/leads", {
    ...completedSession,
    segmentId: "crypto-user",
    leadType: "technical",
    contactMethod: "email",
    contact: "second@example.com",
    consent: true,
  });
  assert.equal(duplicateLeadResponse.status, 200);
  assert.equal((await duplicateLeadResponse.json()).deduplicated, true);

  const unauthSummary = await fetch(`${origin}/api/funnel/summary`);
  assert.equal(unauthSummary.status, 401);
  const unauthLeadStatus = await post("/api/funnel/leads/status", { leadId: createdLead.leadId, status: "contacted" });
  assert.equal(unauthLeadStatus.status, 401);

  const login = await post("/api/marketing/browser-session", { password });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
  assert.ok(cookie);

  const summaryResponse = await fetch(`${origin}/api/funnel/summary`, { headers: { Cookie: cookie } });
  assert.equal(summaryResponse.status, 200);
  const summary = await summaryResponse.json();
  assert.equal(summary.eventCounts.funnel_visit, 2);
  assert.equal(summary.eventCounts.funnel_started, 2);
  assert.equal(summary.eventCounts.route_completed, 1);
  assert.equal(summary.eventCounts.qualified_action, 1);
  assert.equal(summary.uniqueSessionCounts.question_answered, 1);
  assert.equal(summary.uniqueSessionCounts.step_opened, 1);
  assert.equal(summary.segmentCounts["crypto-user"], 1);
  assert.equal(summary.sourceCounts.youtube, 1);
  assert.equal(summary.recentSessions[0]?.sessionId, undefined);
  assert.equal(summary.leads.total, 1);
  assert.equal(summary.leads.statusCounts.new, 1);
  assert.equal(summary.leads.recent[0].contact, "@atlas_test_user");
  assert.equal(summary.leads.recent[0].sessionId, undefined);

  const updateLeadStatus = await post("/api/funnel/leads/status", {
    leadId: createdLead.leadId,
    status: "contacted",
  }, { headers: { Cookie: cookie } });
  assert.equal(updateLeadStatus.status, 200);
  const updatedSummaryResponse = await fetch(`${origin}/api/funnel/summary`, { headers: { Cookie: cookie } });
  const updatedSummary = await updatedSummaryResponse.json();
  assert.equal(updatedSummary.leads.statusCounts.new, 0);
  assert.equal(updatedSummary.leads.statusCounts.contacted, 1);
  assert.equal(updatedSummary.leads.recent[0].status, "contacted");

  const unconfiguredPort = port + 1001;
  const unconfiguredOrigin = `http://127.0.0.1:${unconfiguredPort}`;
  const unconfiguredStore = await mkdtemp(path.join(tmpdir(), "atlas-funnel-api-unconfigured-"));
  const expiredAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  await writeFile(
    path.join(unconfiguredStore, "atlas.analytics.firstFunnelEvents.v1.json"),
    JSON.stringify({
      version: 1,
      updatedAt: expiredAt,
      events: [{ sessionId: "expired-session", event: "funnel_visit", recordedAt: expiredAt }],
    }),
    "utf8",
  );
  const unconfiguredChild = spawn(process.execPath, ["server/content-api.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      ATLAS_CONTENT_API_PORT: String(unconfiguredPort),
      ATLAS_CONTENT_STORE_DIR: unconfiguredStore,
      SUPERSUS_ACCESS_PASSWORD_HASH: passwordHash,
      ATLAS_FUNNEL_SIGNING_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForServer(unconfiguredChild);
    const unavailableSession = await postAt(unconfiguredOrigin, "/api/funnel/session", {});
    assert.equal(unavailableSession.status, 503);

    const forgedSessionId = randomBytes(16).toString("hex");
    const forgedIssuedAt = Date.now();
    const forgedPayload = `${forgedSessionId}.${forgedIssuedAt}`;
    const forgedSignature = createHmac("sha256", passwordHash).update(forgedPayload).digest("hex");
    const forgedEvent = await postAt(unconfiguredOrigin, "/api/funnel/events", {
      sessionId: forgedSessionId,
      sessionToken: `${forgedPayload}.${forgedSignature}`,
      clientEventId: "event-forged-0001",
      event: "funnel_visit",
    });
    assert.equal(forgedEvent.status, 401);

    const unconfiguredLogin = await postAt(unconfiguredOrigin, "/api/marketing/browser-session", { password });
    const unconfiguredCookie = unconfiguredLogin.headers.get("set-cookie")?.split(";")[0] || "";
    const expiredSummaryResponse = await fetch(`${unconfiguredOrigin}/api/funnel/summary`, {
      headers: { Cookie: unconfiguredCookie },
    });
    const expiredSummary = await expiredSummaryResponse.json();
    assert.equal(expiredSummary.totalSessions, 0);
  } finally {
    unconfiguredChild.kill("SIGTERM");
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2000);
      unconfiguredChild.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    await rm(unconfiguredStore, { recursive: true, force: true });
  }

  console.log("Atlas funnel API verification passed");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  await rm(storeDir, { recursive: true, force: true });
}
