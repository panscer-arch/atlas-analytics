import {
  ATLAS_FUNNEL_PILOT_OUTBOX_KEY,
  ATLAS_FUNNEL_PILOT_SESSION_KEY,
  atlasFunnelPilotEvents,
  atlasFunnelPilotQuestions,
} from "../data/atlasFunnelPilotData.js";

const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export function determineAtlasFunnelSegment(answers = {}) {
  if (answers.interest === "regional") return "regional-leader";
  if (answers.interest === "partner") return "mlm-leader";
  if (answers.interest === "technical" || answers.experience === "advanced") return "crypto-user";
  return "web3-new";
}

export function isAtlasFunnelQuizComplete(answers = {}) {
  return atlasFunnelPilotQuestions.every((question) => Boolean(answers[question.id]));
}

export function buildAtlasFunnelAttribution(search = "") {
  const params = new URLSearchParams(search);
  return Object.fromEntries(
    UTM_FIELDS
      .map((field) => [field, String(params.get(field) || "").trim().slice(0, 160)])
      .filter(([, value]) => value),
  );
}

export function createAtlasFunnelSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readAtlasFunnelSession() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(ATLAS_FUNNEL_PILOT_SESSION_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAtlasFunnelSession(session) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ATLAS_FUNNEL_PILOT_SESSION_KEY, JSON.stringify(session));
  } catch {
    // The pilot remains usable when browser storage is unavailable.
  }
}

export function readAtlasFunnelOutbox() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(ATLAS_FUNNEL_PILOT_OUTBOX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-64) : [];
  } catch {
    return [];
  }
}

export function saveAtlasFunnelOutbox(events = []) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ATLAS_FUNNEL_PILOT_OUTBOX_KEY, JSON.stringify(events.slice(-64)));
  } catch {
    // Event delivery continues in memory when browser storage is unavailable.
  }
}

export function createAtlasFunnelEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeAtlasFunnelEvent(payload = {}) {
  const event = atlasFunnelPilotEvents.includes(payload.event) ? payload.event : "";
  const sessionId = String(payload.sessionId || "").trim().slice(0, 80);
  if (!event || !sessionId) return null;

  return {
    sessionId,
    event,
    segmentId: String(payload.segmentId || "").trim().slice(0, 40),
    questionId: String(payload.questionId || "").trim().slice(0, 40),
    answerId: String(payload.answerId || "").trim().slice(0, 40),
    stepId: String(payload.stepId || "").trim().slice(0, 40),
    source: String(payload.source || "").trim().slice(0, 40),
    attribution: Object.fromEntries(
      Object.entries(payload.attribution || {})
        .filter(([key]) => UTM_FIELDS.includes(key))
        .map(([key, value]) => [key, String(value || "").trim().slice(0, 160)])
        .filter(([, value]) => value),
    ),
  };
}

export function calculateAtlasFunnelProgress(currentStep, totalSteps) {
  const total = Math.max(1, Number(totalSteps) || 1);
  const current = Math.min(Math.max(0, Number(currentStep) || 0), total - 1);
  return Math.round(((current + 1) / total) * 100);
}
