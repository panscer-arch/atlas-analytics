const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_FUNDING_GAPS = Object.freeze([
  {
    id: "demo-2026-09-14",
    date: "2026-09-14",
    periodEnd: "2026-09-15",
    fundingGap: 4_641,
    reserveTarget: 25_000,
    sourceStatus: "demo",
  },
]);

function utcDay(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError(`Invalid ISO date: ${value}`);
  return date;
}

function addDays(value, days) {
  return new Date(utcDay(value).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.ceil((utcDay(to).getTime() - utcDay(from).getTime()) / DAY_MS);
}

export function reserveAlertStatus(checkpointDate, breachDate, asOf) {
  if (asOf >= breachDate) return "breach";
  if (asOf === checkpointDate) return "due";
  if (asOf > checkpointDate) return "missed";
  return "planned";
}

function finishEpisode(episode, asOf, sourceStatus) {
  const checkpoints = [7, 3, 1].map((days) => {
    const date = addDays(episode.firstBreachDate, -days);
    return {
      id: `d-${days}`,
      label: `D−${days}`,
      days,
      date,
      status: reserveAlertStatus(date, episode.firstBreachDate, asOf),
    };
  });
  const daysRemaining = daysBetween(asOf, episode.firstBreachDate);
  const hasDue = checkpoints.some((item) => item.status === "due");
  const hasMissed = checkpoints.some((item) => item.status === "missed");
  return {
    ...episode,
    sourceStatus,
    minimumTopUp: episode.peakGap,
    policyBuffer: null,
    daysRemaining,
    status: daysRemaining <= 0 ? "breach" : hasDue ? "due" : hasMissed ? "overdue" : "planned",
    checkpoints,
  };
}

export function buildReserveFundingEpisodes(schedule, { asOf, sourceStatus = "api" } = {}) {
  if (!asOf) throw new TypeError("asOf is required");
  const rows = [...schedule].sort((left, right) => left.date.localeCompare(right.date));
  const episodes = [];
  let current = null;

  for (const row of rows) {
    if (Number(row.fundingGap) <= 0) {
      if (current) episodes.push(finishEpisode(current, asOf, sourceStatus));
      current = null;
      continue;
    }
    if (!current) {
      current = {
        id: `funding-${row.date}`,
        firstBreachDate: row.date,
        lastBreachDate: row.periodEnd || row.date,
        peakDate: row.date,
        peakGap: Number(row.fundingGap),
        reserveTarget: Number(row.reserveTarget || 0),
        bucketCount: 1,
      };
      continue;
    }
    current.lastBreachDate = row.periodEnd || row.date;
    current.bucketCount += 1;
    if (Number(row.fundingGap) > current.peakGap) {
      current.peakGap = Number(row.fundingGap);
      current.peakDate = row.date;
    }
  }

  if (current) episodes.push(finishEpisode(current, asOf, sourceStatus));
  return episodes;
}

export function buildDemoReserveFundingPlan(asOf = "2026-08-04") {
  return buildReserveFundingEpisodes(DEMO_FUNDING_GAPS, { asOf, sourceStatus: "demo" });
}

export function buildReserveDeliveryJournal(episode) {
  if (!episode) return [];
  const checkpoints = [
    ...episode.checkpoints,
    { id: "breach", label: "BREACH", date: episode.firstBreachDate, status: episode.status === "breach" ? "breach" : "planned" },
  ];
  return checkpoints.map((checkpoint) => ({
    id: `${episode.id}:${checkpoint.id}`,
    checkpoint: checkpoint.label,
    scheduledFor: checkpoint.date,
    idempotencyRef: `reserve:${episode.id}:${checkpoint.id}`,
    inApp: checkpoint.status === "planned" ? "scheduled" : checkpoint.status,
    telegram: "not_connected",
    email: "not_connected",
    attemptCount: 0,
  }));
}
