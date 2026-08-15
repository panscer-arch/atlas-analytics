import { calculatePartnerCaptureControl } from "./partnerCaptureControl.js";

export const PARTNER_CAPTURE_JOURNAL_KEY = "atlas.admin.finance.partner-capture-journal.v1";
export const PARTNER_CAPTURE_JOURNAL_SCHEMA = 1;

export function createPartnerCaptureJournal() {
  return {
    schemaVersion: PARTNER_CAPTURE_JOURNAL_SCHEMA,
    lifecycle: "healthy",
    activeSeverity: null,
    acknowledgedAt: null,
    consecutiveBelow: 0,
    consecutiveHealthy: 0,
    cuts: [],
    history: [],
    updatedAt: null,
  };
}

export function parsePartnerCaptureJournal(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || parsed.schemaVersion !== PARTNER_CAPTURE_JOURNAL_SCHEMA) return createPartnerCaptureJournal();
    return {
      ...createPartnerCaptureJournal(),
      ...parsed,
      cuts: Array.isArray(parsed.cuts) ? parsed.cuts.slice(0, 12) : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : [],
    };
  } catch {
    return createPartnerCaptureJournal();
  }
}

function transitionEvent(type, severity, at) {
  return { id: `${at}-${type}`, type, severity, at };
}

export function recordPartnerCaptureCut(journal, { ratePercent, grossPartnerRewardsPaid, at = new Date().toISOString() }) {
  const current = parsePartnerCaptureJournal(journal);
  const grossPaid = Math.max(0, Number(grossPartnerRewardsPaid) || 0);
  const rate = Math.max(0, Number(ratePercent) || 0);
  const control = calculatePartnerCaptureControl({
    grossPartnerRewardsPaid: grossPaid,
    atlasReferralIncome: grossPaid * rate / 100,
  });
  const cut = { id: `${at}-${current.cuts.length + 1}`, at, finality: "finalized", ratePercent: rate, status: control.status };
  const cuts = [cut, ...current.cuts].slice(0, 12);
  let activeSeverity = current.activeSeverity;
  let acknowledgedAt = current.acknowledgedAt;
  let consecutiveBelow = current.consecutiveBelow;
  let consecutiveHealthy = current.consecutiveHealthy;
  let lifecycle = current.lifecycle;
  let history = current.history;

  if (control.status === "unavailable") {
    lifecycle = activeSeverity || "unavailable";
    consecutiveBelow = 0;
    consecutiveHealthy = 0;
  } else if (control.status === "healthy") {
    consecutiveHealthy += 1;
    consecutiveBelow = 0;
    if (activeSeverity && consecutiveHealthy < 2) lifecycle = "recovering";
    else if (activeSeverity && consecutiveHealthy >= 2) {
      history = [transitionEvent("recovered", activeSeverity, at), ...history].slice(0, 20);
      activeSeverity = null;
      acknowledgedAt = null;
      lifecycle = "healthy";
    } else lifecycle = "healthy";
  } else {
    consecutiveBelow += 1;
    consecutiveHealthy = 0;
    if (consecutiveBelow >= 2) {
      const recent = cuts.slice(0, 2);
      const nextSeverity = recent.every((item) => item.status === "critical") ? "critical" : "warning";
      if (activeSeverity !== nextSeverity) {
        const type = !activeSeverity ? "opened" : nextSeverity === "critical" ? "escalated" : "downgraded";
        history = [transitionEvent(type, nextSeverity, at), ...history].slice(0, 20);
        acknowledgedAt = null;
      }
      activeSeverity = nextSeverity;
      lifecycle = nextSeverity;
    } else lifecycle = activeSeverity || "pending";
  }

  return {
    ...current,
    activeSeverity,
    acknowledgedAt,
    consecutiveBelow,
    consecutiveHealthy,
    cuts,
    history,
    lifecycle,
    updatedAt: at,
  };
}

export function acknowledgePartnerCaptureAlert(journal, at = new Date().toISOString()) {
  const current = parsePartnerCaptureJournal(journal);
  if (!current.activeSeverity || current.acknowledgedAt) return current;
  return {
    ...current,
    acknowledgedAt: at,
    history: [transitionEvent("acknowledged", current.activeSeverity, at), ...current.history].slice(0, 20),
    updatedAt: at,
  };
}
