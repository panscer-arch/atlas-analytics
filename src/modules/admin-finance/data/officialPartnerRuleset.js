export const OFFICIAL_PARTNER_RULESET = Object.freeze({
  id: "atlas-level-2026-08-12",
  label: "Level · 12.08.2026",
  sourceUrl: "https://atlas-system.tech/level/",
  sourceModifiedAt: "2026-08-12T20:43:42Z",
  rateSnapshotMoment: "cycle_creation",
  rewardTiming: Object.freeze({
    lockup: Object.freeze({ creationPercent: 100, streamedPercent: 0, streamDays: 0 }),
    daily: Object.freeze({ creationPercent: 20, streamedPercent: 80, streamDays: 200 }),
  }),
  qualifyingVolume: Object.freeze({
    lockupMultiplier: 1,
    dailyMultiplier: 0.5,
    depthBands: Object.freeze([
      Object.freeze({ fromLine: 1, toLine: 5, multiplier: 1 }),
      Object.freeze({ fromLine: 6, toLine: 10, multiplier: 0.5 }),
      Object.freeze({ fromLine: 11, toLine: null, multiplier: 0.1 }),
    ]),
  }),
  statuses: Object.freeze([
    ["Start", 10, 0, 0, 15, 0],
    ["Builder 1", 50, 100, 0, 18, 0],
    ["Builder 2", 100, 300, 1000, 21, 0],
    ["Builder 3", 200, 700, 2000, 24, 0],
    ["Builder 4", 300, 1200, 4000, 27, 0],
    ["Builder 5", 500, 2000, 7000, 30, 0],
    ["Builder 6", 700, 3000, 12000, 33, 0],
    ["Builder 7", 1000, 4500, 18000, 36, 0],
    ["Master 1", 1500, 7000, 28000, 38, 5],
    ["Master 2", 2000, 10000, 40000, 40, 7],
    ["Master 3", 3000, 17000, 70000, 42, 9],
    ["Master 4", 4000, 25000, 120000, 44, 11],
    ["Master 5", 5000, 35000, 200000, 46, 13],
    ["Master 6", 6000, 45000, 300000, 48, 15],
    ["Master 7", 7000, 60000, 450000, 50, 17],
    ["Strategist", 8000, 80000, 600000, 52.5, 19],
    ["Ambassador", 10000, 100000, 800000, 55, 21],
    ["Director", 12000, 120000, 1100000, 57.5, 23],
    ["Executive", 15000, 150000, 1500000, 60, 25],
  ].map(([name, personalVolume, firstLineVolume, structureVolume, ratePercent, matchingPercent]) => Object.freeze({
    name,
    personalVolume,
    firstLineVolume,
    structureVolume,
    ratePercent,
    matchingPercent,
  }))),
});

export function calculatePartnerRewardTiming({ flow, grossPartnerReward }) {
  const amount = Math.max(0, Number(grossPartnerReward) || 0);
  const timing = OFFICIAL_PARTNER_RULESET.rewardTiming[flow];
  if (!timing) throw new Error(`Unsupported partner reward flow: ${flow}`);
  return {
    atCreation: amount * timing.creationPercent / 100,
    streamed: amount * timing.streamedPercent / 100,
    streamDays: timing.streamDays,
  };
}

export function calculateWeightedStructureVolume(lines) {
  return (lines || []).reduce((total, line) => {
    const depth = Math.max(1, Number(line.depth) || 1);
    const amount = Math.max(0, Number(line.volume) || 0);
    const band = OFFICIAL_PARTNER_RULESET.qualifyingVolume.depthBands.find((item) => (
      depth >= item.fromLine && (item.toLine === null || depth <= item.toLine)
    ));
    return total + amount * (band?.multiplier || 0);
  }, 0);
}
