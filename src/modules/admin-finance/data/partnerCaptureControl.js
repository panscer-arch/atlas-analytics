export const PARTNER_CAPTURE_THRESHOLDS = Object.freeze({
  targetPercent: 35,
  warningFloorPercent: 33,
});

export const PARTNER_CAPTURE_DEMO = Object.freeze({
  grossPartnerRewardsPaid: 582.857142,
  atlasReferralIncome: 204,
  atlasReferralIncomeAtCreation: 128,
  atlasReferralIncomeStreamed: 76,
});

export function calculatePartnerCaptureControl({
  grossPartnerRewardsPaid,
  atlasReferralIncome,
  targetPercent = PARTNER_CAPTURE_THRESHOLDS.targetPercent,
  warningFloorPercent = PARTNER_CAPTURE_THRESHOLDS.warningFloorPercent,
}) {
  const grossPaid = Math.max(0, Number(grossPartnerRewardsPaid) || 0);
  const atlasIncome = Math.max(0, Number(atlasReferralIncome) || 0);
  const ratePercent = grossPaid ? atlasIncome / grossPaid * 100 : 0;
  const targetIncome = grossPaid * targetPercent / 100;
  const shortfall = Math.max(0, targetIncome - atlasIncome);
  const gapPercentagePoints = ratePercent - targetPercent;
  const status = !grossPaid ? "unavailable" : ratePercent >= targetPercent ? "healthy" : ratePercent >= warningFloorPercent ? "warning" : "critical";

  return {
    atlasIncome,
    denominatorAvailable: grossPaid > 0,
    gapPercentagePoints,
    grossPaid,
    ratePercent,
    shortfall,
    status,
    targetIncome,
    targetPercent,
    warningFloorPercent,
  };
}

export const partnerCaptureDemoControl = Object.freeze(
  calculatePartnerCaptureControl(PARTNER_CAPTURE_DEMO),
);
