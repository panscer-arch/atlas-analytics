export const COMPANY_REVENUE_TARGET_PERCENT = 4;

export function calculateCompanyRevenueControl({
  incomingFlow,
  platformFee,
  headAccountIncome,
  targetPercent = COMPANY_REVENUE_TARGET_PERCENT,
}) {
  const inflow = Math.max(0, Number(incomingFlow) || 0);
  const fee = Math.max(0, Number(platformFee) || 0);
  const headIncome = Math.max(0, Number(headAccountIncome) || 0);
  const target = Math.max(0, Number(targetPercent) || 0);
  const companyRevenue = fee + headIncome;
  const denominatorAvailable = inflow > 0;
  const ratePercent = denominatorAvailable ? companyRevenue / inflow * 100 : 0;
  const targetRevenue = inflow * target / 100;
  const gapPercentagePoints = denominatorAvailable ? ratePercent - target : 0;
  const variance = companyRevenue - targetRevenue;

  return {
    companyRevenue,
    denominatorAvailable,
    fee,
    feeSharePercent: companyRevenue ? fee / companyRevenue * 100 : 0,
    gapPercentagePoints,
    headIncome,
    headSharePercent: companyRevenue ? headIncome / companyRevenue * 100 : 0,
    inflow,
    ratePercent,
    shortfall: Math.max(0, -variance),
    status: !denominatorAvailable ? "unavailable" : variance < 0 ? "behind" : gapPercentagePoints > 0 ? "above_target" : "on_target",
    surplus: Math.max(0, variance),
    targetPercent: target,
    targetRevenue,
  };
}
