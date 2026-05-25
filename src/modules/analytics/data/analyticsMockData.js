export const analyticsDateRanges = [
  { value: "7d", label: "Последние 7 дней", days: 7 },
  { value: "30d", label: "Последние 30 дней", days: 30 },
  { value: "90d", label: "Последние 90 дней", days: 90 },
];

export const analyticsSegments = ["Все сегменты", "Розница", "Крупные игроки", "Партнёры"];
export const analyticsSources = ["Все продукты", "Lockup", "Daily Flow"];

const ZERO_MOCK_ANALYTICS = true;

export const analyticsTariffs = [
  {
    id: "contract_test",
    name: "Contract Test",
    source: "Lockup",
    sourceSlug: "unity_lockup",
    cycleCode: "contract_test_10m",
    durationLabel: "10 минут",
    shortLabel: "Тест смарт-контракта",
    durationDays: 1,
    minDeposit: 10,
    maxDepositLabel: "=10$",
    returnMode: "Возврат тела без дохода",
    returnPrincipal: true,
    deltaPercent: 0,
    dailyPercent: 0,
    payoutLoad: 1,
    avgDeposit: 10,
    baseInvestors: 8,
    planMultiplier: 1.01,
    referralRate: 0.03,
    feeRate: 0.015,
    claimableRate: 1,
    accruedRate: 0,
    failedRate: 0.006,
    avgTxValue: 10,
    networks: { BNB: 34, Ethereum: 8, Polygon: 6 },
  },
  {
    id: "launch",
    name: "Launch",
    source: "Lockup",
    sourceSlug: "unity_lockup",
    cycleCode: "launch_1d_0_3",
    durationLabel: "1 день",
    shortLabel: "1 день • тело + 0.3%",
    durationDays: 1,
    minDeposit: 10,
    maxDepositLabel: "От 10$ и неограничен",
    returnMode: "Тело + 0.3% через 1 день",
    returnPrincipal: true,
    deltaPercent: 0.3,
    dailyPercent: 0.3,
    payoutLoad: 1.003,
    avgDeposit: 140,
    baseInvestors: 16,
    planMultiplier: 1.03,
    referralRate: 0.055,
    feeRate: 0.02,
    claimableRate: 0.62,
    accruedRate: 0.38,
    failedRate: 0.012,
    avgTxValue: 125,
    networks: { BNB: 40, Ethereum: 10, Polygon: 10 },
  },
  {
    id: "momentum",
    name: "Momentum",
    source: "Lockup",
    sourceSlug: "unity_lockup",
    cycleCode: "momentum_5d_2",
    durationLabel: "5 дней",
    shortLabel: "5 дней • тело + 2%",
    durationDays: 5,
    minDeposit: 10,
    maxDepositLabel: "От 10$ и неограничен",
    returnMode: "Тело + 2% через 5 дней",
    returnPrincipal: true,
    deltaPercent: 2,
    dailyPercent: 0.4,
    payoutLoad: 1.02,
    avgDeposit: 380,
    baseInvestors: 13,
    planMultiplier: 1.05,
    referralRate: 0.07,
    feeRate: 0.025,
    claimableRate: 0.34,
    accruedRate: 0.66,
    failedRate: 0.014,
    avgTxValue: 300,
    networks: { BNB: 42, Ethereum: 12, Polygon: 8 },
  },
  {
    id: "premiere",
    name: "Premiere",
    source: "Lockup",
    sourceSlug: "unity_lockup",
    cycleCode: "premiere_10d_5",
    durationLabel: "10 дней",
    shortLabel: "10 дней • тело + 5%",
    durationDays: 10,
    minDeposit: 10,
    maxDepositLabel: "От 10$ и неограничен",
    returnMode: "Тело + 5% через 10 дней",
    returnPrincipal: true,
    deltaPercent: 5,
    dailyPercent: 0.5,
    payoutLoad: 1.05,
    avgDeposit: 720,
    baseInvestors: 11,
    planMultiplier: 1.08,
    referralRate: 0.08,
    feeRate: 0.03,
    claimableRate: 0.28,
    accruedRate: 0.72,
    failedRate: 0.016,
    avgTxValue: 610,
    networks: { BNB: 39, Ethereum: 14, Polygon: 7 },
  },
  {
    id: "president",
    name: "President",
    source: "Lockup",
    sourceSlug: "unity_lockup",
    cycleCode: "president_20d_12",
    durationLabel: "20 дней",
    shortLabel: "20 дней • тело + 12%",
    durationDays: 20,
    minDeposit: 10,
    maxDepositLabel: "От 10$ и неограничен",
    returnMode: "Тело + 12% через 20 дней",
    returnPrincipal: true,
    deltaPercent: 12,
    dailyPercent: 0.6,
    payoutLoad: 1.12,
    avgDeposit: 1160,
    baseInvestors: 9,
    planMultiplier: 1.1,
    referralRate: 0.09,
    feeRate: 0.032,
    claimableRate: 0.21,
    accruedRate: 0.79,
    failedRate: 0.018,
    avgTxValue: 990,
    networks: { BNB: 35, Ethereum: 17, Polygon: 8 },
  },
  {
    id: "imperium",
    name: "Imperium",
    source: "Lockup",
    sourceSlug: "unity_lockup",
    cycleCode: "imperium_30d_22_5",
    durationLabel: "30 дней",
    shortLabel: "30 дней • тело + 22.5%",
    durationDays: 30,
    minDeposit: 10,
    maxDepositLabel: "От 10$ и неограничен",
    returnMode: "Тело + 22.5% через 30 дней",
    returnPrincipal: true,
    deltaPercent: 22.5,
    dailyPercent: 0.75,
    payoutLoad: 1.225,
    avgDeposit: 1820,
    baseInvestors: 7,
    planMultiplier: 1.12,
    referralRate: 0.1,
    feeRate: 0.035,
    claimableRate: 0.18,
    accruedRate: 0.82,
    failedRate: 0.02,
    avgTxValue: 1510,
    networks: { BNB: 33, Ethereum: 19, Polygon: 10 },
  },
  {
    id: "core",
    name: "Core",
    source: "Daily Flow",
    sourceSlug: "unity_daily",
    cycleCode: "core_200d_1_1",
    durationLabel: "200 дней",
    shortLabel: "До 2,000$ • daily без возврата тела",
    durationDays: 200,
    minDeposit: 10,
    maxDepositLabel: "От 10$ до 2,000$",
    returnMode: "1.1% в день, тело не возвращается",
    returnPrincipal: false,
    deltaPercent: 120,
    dailyPercent: 1.1,
    payoutLoad: 0.11,
    avgDeposit: 940,
    baseInvestors: 21,
    planMultiplier: 1.15,
    referralRate: 0.11,
    feeRate: 0.04,
    claimableRate: 0.33,
    accruedRate: 0.67,
    failedRate: 0.024,
    avgTxValue: 860,
    networks: { BNB: 44, Ethereum: 12, Polygon: 14 },
  },
  {
    id: "elite",
    name: "Elite",
    source: "Daily Flow",
    sourceSlug: "unity_daily",
    cycleCode: "elite_220d_1_2",
    durationLabel: "220 дней",
    shortLabel: "Свыше 2,000$ • daily без возврата тела",
    durationDays: 220,
    minDeposit: 2000,
    maxDepositLabel: "Свыше 2,000$",
    returnMode: "1.2% в день, тело не возвращается",
    returnPrincipal: false,
    deltaPercent: 160,
    dailyPercent: 1.2,
    payoutLoad: 0.12,
    avgDeposit: 3240,
    baseInvestors: 6,
    planMultiplier: 1.17,
    referralRate: 0.12,
    feeRate: 0.042,
    claimableRate: 0.36,
    accruedRate: 0.64,
    failedRate: 0.026,
    avgTxValue: 2190,
    networks: { BNB: 31, Ethereum: 22, Polygon: 9 },
  },
];

const segmentProfiles = {
  "Розница": {
    investors: 1.12,
    incoming: 1,
    payout: 0.94,
    risk: 0.96,
  },
  "Крупные игроки": {
    investors: 0.36,
    incoming: 3.35,
    payout: 2.7,
    risk: 1.18,
  },
  "Партнёры": {
    investors: 0.55,
    incoming: 1.72,
    payout: 1.38,
    risk: 1.07,
  },
};

const historyDayModifiers = [0.88, 0.94, 0.98, 1.03, 1.08, 1.12, 1.16, 1.14, 1.05, 0.97];
const futureDayModifiers = [1.02, 1.05, 1.08, 1.1, 1.13, 1.18, 1.14, 1.09, 1.06, 1.04];

function isoDate(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function roundMoney(value) {
  return Math.round(value);
}

const dailyRecords = [];
const futureObligations = [];

for (let daysAgo = 89; daysAgo >= 0; daysAgo -= 1) {
  const date = isoDate(-daysAgo);
  const dayFactor = historyDayModifiers[daysAgo % historyDayModifiers.length];

  analyticsTariffs.forEach((tariff, tariffIndex) => {
    Object.entries(segmentProfiles).forEach(([segment, segmentProfile], segmentIndex) => {
      const projectedInvestors = Math.max(
        2,
        Math.round(tariff.baseInvestors * segmentProfile.investors * dayFactor + tariffIndex * 0.6 + segmentIndex),
      );
      const investors = ZERO_MOCK_ANALYTICS ? 0 : projectedInvestors;
      const walletsConnected = ZERO_MOCK_ANALYTICS ? 0 : investors + 2 + (tariff.source === "Daily Flow" ? 2 : 0);
      const activeWallets = ZERO_MOCK_ANALYTICS ? 0 : Math.max(walletsConnected, Math.round(walletsConnected * (1.04 + (tariff.source === "Daily Flow" ? 0.06 : 0.02))));
      const incomingAmount = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(investors * tariff.avgDeposit * segmentProfile.incoming * dayFactor);
      const planAmount = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(incomingAmount * tariff.planMultiplier * (0.98 + segmentIndex * 0.04));
      const cyclePayouts = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(incomingAmount * tariff.payoutLoad * segmentProfile.payout * (0.84 + tariffIndex * 0.014));
      const referralPayouts = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(incomingAmount * tariff.referralRate * (0.9 + segmentIndex * 0.05));
      const platformFee = ZERO_MOCK_ANALYTICS ? 0 : roundMoney((cyclePayouts + referralPayouts) * tariff.feeRate);
      const operatorNet = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(incomingAmount - cyclePayouts - referralPayouts - platformFee);
      const gap = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(planAmount - incomingAmount);
      const claimableNow = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(cyclePayouts * tariff.claimableRate);
      const accruedLater = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(cyclePayouts * tariff.accruedRate);
      const transactions = ZERO_MOCK_ANALYTICS ? 0 : Math.max(1, Math.round(walletsConnected * (1.35 + tariffIndex * 0.08)));
      const failedTransactions = ZERO_MOCK_ANALYTICS ? 0 : Math.max(0, Math.round(transactions * tariff.failedRate));
      const transactionVolume = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(transactions * tariff.avgTxValue * segmentProfile.incoming);
      const averageTransactionValue = transactions ? transactionVolume / transactions : 0;

      dailyRecords.push({
        date,
        source: tariff.source,
        sourceSlug: tariff.sourceSlug,
        tariffId: tariff.id,
        tariffName: tariff.name,
        cycleCode: tariff.cycleCode,
        durationLabel: tariff.durationLabel,
        segment,
        investors,
        walletsConnected,
        activeWallets,
        transactions,
        failedTransactions,
        incomingAmount,
        planAmount,
        cyclePayouts,
        referralPayouts,
        platformFee,
        operatorNet,
        gap,
        claimableNow,
        accruedLater,
        transactionVolume,
        averageTransactionValue,
        networks: Object.fromEntries(
          Object.entries(tariff.networks).map(([network, value]) => [network, ZERO_MOCK_ANALYTICS ? 0 : Math.round(value * segmentProfile.incoming * dayFactor)]),
        ),
      });
    });
  });
}

for (let daysAhead = 1; daysAhead <= 30; daysAhead += 1) {
  const date = isoDate(daysAhead);
  const dayFactor = futureDayModifiers[daysAhead % futureDayModifiers.length];

  analyticsTariffs.forEach((tariff, tariffIndex) => {
    Object.entries(segmentProfiles).forEach(([segment, segmentProfile], segmentIndex) => {
      const expectedIncoming = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(
        tariff.baseInvestors * tariff.avgDeposit * segmentProfile.incoming * dayFactor * (1.08 + tariffIndex * 0.015),
      );
      const cyclePayouts = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(expectedIncoming * tariff.payoutLoad * segmentProfile.payout * (1 + daysAhead / 180));
      const referralPayouts = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(expectedIncoming * tariff.referralRate * (0.95 + segmentIndex * 0.06));
      const platformFee = ZERO_MOCK_ANALYTICS ? 0 : roundMoney((cyclePayouts + referralPayouts) * tariff.feeRate);
      const requiredNewMoney = ZERO_MOCK_ANALYTICS ? 0 : roundMoney((cyclePayouts + referralPayouts + platformFee) * (1.02 + segmentIndex * 0.03));
      const projectedGap = ZERO_MOCK_ANALYTICS ? 0 : roundMoney(requiredNewMoney - expectedIncoming);
      const riskScore = ZERO_MOCK_ANALYTICS ? 0 : Number((segmentProfile.risk * (1 + daysAhead / 180) + tariffIndex * 0.05).toFixed(2));

      futureObligations.push({
        date,
        source: tariff.source,
        sourceSlug: tariff.sourceSlug,
        tariffId: tariff.id,
        tariffName: tariff.name,
        cycleCode: tariff.cycleCode,
        durationLabel: tariff.durationLabel,
        segment,
        expectedIncoming,
        cyclePayouts,
        referralPayouts,
        platformFee,
        requiredNewMoney,
        projectedGap,
        riskScore,
      });
    });
  });
}

export const analyticsMockData = {
  generatedAt: new Date().toISOString(),
  dateRanges: analyticsDateRanges,
  segments: analyticsSegments,
  sources: analyticsSources,
  tariffs: analyticsTariffs,
  dailyRecords,
  futureObligations,
  conversionFunnelTemplate: [
    { stage: "Входящий поток", key: "incomingAmount" },
    { stage: "Выплаты циклов", key: "cyclePayouts" },
    { stage: "Рефералка", key: "referralPayouts" },
    { stage: "Комиссия платформы", key: "platformFee" },
    { stage: "Ваш остаток", key: "operatorNet" },
  ],
  coverageCurveTemplate: [
    { point: "Сегодня", days: 1 },
    { point: "7 дней", days: 7 },
    { point: "30 дней", days: 30 },
  ],
};
