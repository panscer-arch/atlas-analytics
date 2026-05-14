import { analyticsMockData } from "../data/analyticsMockData";
import calculateConversion from "../utils/calculateConversion";
import { groupByDate, groupBySource, groupNetworkStats } from "../utils/buildChartData";

const ANALYTICS_API_BASE_URL = "http://127.0.0.1:3100/api/admin/analytics";
const ANALYTICS_API_TIMEOUT_MS = 1500;

const COUNTRY_PROFILES = [
  { country: "Great Britain", share: 0.22, city: "Manchester" },
  { country: "Germany", share: 0.16, city: "Berlin" },
  { country: "Kazakhstan", share: 0.15, city: "Almaty" },
  { country: "UAE", share: 0.14, city: "Dubai" },
  { country: "Turkey", share: 0.13, city: "Istanbul" },
  { country: "India", share: 0.11, city: "Delhi" },
  { country: "Brazil", share: 0.09, city: "Sao Paulo" },
];

const LEADER_PROFILES = [
  { name: "Barny Broflovsky", country: "Great Britain" },
  { name: "Aisha Karim", country: "UAE" },
  { name: "Murat Demir", country: "Turkey" },
  { name: "Arman Sadykov", country: "Kazakhstan" },
  { name: "Lucas Pereira", country: "Brazil" },
];

const PARTNER_BRANCHES = [
  "North Star",
  "Golden Bridge",
  "Velocity Hub",
  "Atlas Line",
  "Daily Growth",
];

function mapSourceToProduct(source) {
  if (source === "Lockup") return "unity_lockup";
  if (source === "Daily Flow") return "unity_daily";
  return "all";
}

function buildBackendQuery(filters) {
  const query = new URLSearchParams();
  query.set("dateRange", filters.dateRange || "30d");
  query.set("segment", "all");
  query.set("product", mapSourceToProduct(filters.source));
  query.set("country", "all");
  query.set("network", "all");
  return query.toString();
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ANALYTICS_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Analytics API failed: ${response.status}`);
    }
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchAnalyticsBackendBundle(filters) {
  const query = buildBackendQuery(filters);
  const [overview, cashPosition, obligations, planFact, orders, wallets, partnerStructure, reinvest, leaders, geography, traffic, baseComposition] = await Promise.all([
    fetchJson(`${ANALYTICS_API_BASE_URL}/overview?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/cash-position?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/obligations?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/plan-fact?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/orders?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/wallets?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/partner-structure?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/reinvest?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/leaders?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/geography?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/traffic?${query}`),
    fetchJson(`${ANALYTICS_API_BASE_URL}/base-composition?${query}`),
  ]);

  return {
    overview,
    cashPosition,
    obligations,
    planFact,
    orders,
    wallets,
    partnerStructure,
    reinvest,
    leaders,
    geography,
    traffic,
    baseComposition,
  };
}

function mergeBackendKpis(localKpis, backendBundle) {
  if (!backendBundle?.overview?.summary) {
    return localKpis;
  }

  const summary = backendBundle.overview.summary;
  const cashPosition = backendBundle.overview.cashPosition || backendBundle.cashPosition?.days?.[0] || null;
  const outgoingToday = cashPosition?.outgoingFact ?? localKpis.outgoingToday ?? 0;
  const incomingToday = summary.incomingToday ?? localKpis.incomingToday ?? 0;
  return {
    ...localKpis,
    incomingToday,
    factToday: summary.factToday,
    planToday: summary.planToday,
    gapToday: summary.gapToday,
    carryForwardDeficit: summary.carryForwardDeficit,
    targetToday: summary.targetToday,
    targetTomorrow: summary.targetTomorrow,
    obligations7d: summary.obligations7d,
    obligations30d: summary.obligations30d,
    deficit7d: summary.deficit7d,
    deficit30d: summary.deficit30d,
    coverage7d: summary.coverage7d,
    coverage30d: summary.coverage30d,
    requiredNewMoney: summary.requiredNewMoney,
    referralBurden: summary.referralBurden,
    platformFee: summary.platformFee,
    operatorNet: summary.operatorNet,
    claimableNow: summary.claimableNow,
    accruedLater: summary.accruedLater,
    firstRiskDate: summary.firstRiskDate,
    firstRiskGap: summary.firstRiskGap,
    outgoingToday,
    contractNetFlowToday: incomingToday - outgoingToday,
    cashPosition,
  };
}

function formatShortMoney(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}

function mergeBackendWalletsTab(localTab, backendBundle) {
  const backendWallets = backendBundle?.wallets;
  if (!backendWallets?.rows?.length) return localTab;

  const rows = backendWallets.rows.map((item) => ({
    wallet: item.wallet,
    role: item.role,
    ownerType: item.ownerType,
    inflow: item.inflow,
    obligations: item.linkedObligations ?? item.obligations ?? 0,
    network: item.network,
    claimable: item.claimable,
    accrued: item.accrued,
    claimPressure: item.claimPressure,
    reinvestFlow: item.reinvestFlow ?? Math.round(item.inflow * 0.24),
    concentrationShare: item.concentrationShare,
    obligationLoad: item.obligationLoad,
    riskScore: item.riskScore,
    activityScore: item.activityScore,
    netContribution: item.netContribution,
  }));

  const highestRiskWallet = [...rows].sort((left, right) => right.riskScore - left.riskScore)[0];
  const largestWallet = [...rows].sort((left, right) => right.inflow - left.inflow)[0];
  const healthiestWallet = [...rows].sort((left, right) => right.netContribution - left.netContribution)[0];
  const avgClaimPressure = rows.length ? sumField(rows, "claimPressure") / rows.length : 0;
  const avgActivityScore = rows.length ? sumField(rows, "activityScore") / rows.length : 0;

  return {
    summary: {
      title: `${largestWallet?.wallet || "Кошелёк"} сейчас держит главный объём`,
      description: `Верхние кошельки формируют большую часть притока и обязательств, а ${highestRiskWallet?.wallet || "один из адресов"} уже выглядит самым рискованным по нагрузке и claim pressure.`,
      bullets: [
        `Top-5 концентрация: ${backendWallets.summary?.top5Concentration ?? 0}%`,
        `Лидер по inflow: ${largestWallet?.inflow || 0}`,
        `Средний claim pressure: ${avgClaimPressure.toFixed(1)}%`,
      ],
    },
    metrics: [
      { title: "Top-5 концентрация", value: backendWallets.summary?.top5Concentration ?? 0, variant: "percent", icon: "risk", statusLabel: "risk", description: "Доля top-кошельков в объёме." },
      { title: "Лидер по inflow", value: largestWallet?.inflow || 0, variant: "currency", icon: "inflow", statusLabel: largestWallet?.wallet || "—", description: "Самый крупный кошелёк по притоку." },
      { title: "Лидер по obligations", value: largestWallet?.obligations || 0, variant: "currency", icon: "calendar", statusLabel: largestWallet?.wallet || "—", description: "Самый крупный кошелёк по нагрузке." },
      { title: "Creator / Platform flow", value: rows.filter((item) => item.role === "creator" || item.role === "platform").reduce((sum, item) => sum + item.inflow, 0), variant: "currency", icon: "wallet", statusLabel: "flow", description: "Поток creator и platform wallets." },
      { title: "Самый рискованный кошелёк", value: highestRiskWallet?.riskScore || 0, variant: "percent", icon: "failed", statusLabel: highestRiskWallet?.wallet || "—", description: "Максимальный risk profile." },
      { title: "Средний claim pressure", value: avgClaimPressure, variant: "percent", icon: "claim", statusLabel: "wallets", description: "Средняя нагрузка по claimable." },
      { title: "Средняя активность", value: avgActivityScore, variant: "percent", icon: "active-wallet", statusLabel: "wallets", description: "Насколько кошельки живые." },
      { title: "Лучший net contribution", value: healthiestWallet?.netContribution || 0, variant: "currency", icon: "fact", statusLabel: healthiestWallet?.wallet || "—", description: "Самый полезный кошелёк для системы." },
    ],
    rows,
    qualityRows: rows.map((item) => ({
      wallet: item.wallet,
      ownerType: item.ownerType,
      activityScore: item.activityScore,
      claimable: item.claimable,
      accrued: item.accrued,
      claimPressure: item.claimPressure,
      reinvestFlow: item.reinvestFlow,
    })),
    riskRows: rows.map((item) => ({
      wallet: item.wallet,
      role: item.role,
      concentrationShare: item.concentrationShare,
      obligations: item.obligations,
      obligationLoad: item.obligationLoad,
      riskScore: item.riskScore,
      netContribution: item.netContribution,
    })),
    inflowShare: rows.map((item) => ({ source: item.wallet, incomingAmount: item.inflow })),
    obligationsShare: rows.map((item) => ({ source: item.wallet, incomingAmount: item.obligations })),
  };
}

function mergeBackendPartnerTab(localTab, backendBundle) {
  const backendPartner = backendBundle?.partnerStructure;
  if (!backendPartner?.rows?.length) return localTab;

  const rows = backendPartner.rows.map((item) => {
    const inflow = item.generatedInflow ?? item.inflow ?? 0;
    const referralAccrual = item.referralAccrual ?? 0;
    const payout = item.referralPaid ?? item.payout ?? 0;
    const obligations = item.downlineObligations ?? item.obligations ?? 0;
    const referralRate = inflow ? (referralAccrual / inflow) * 100 : 0;
    const payoutRate = referralAccrual ? (payout / referralAccrual) * 100 : 0;
    const netBranch = item.netContribution ?? Math.max(0, inflow - referralAccrual - obligations);

    return {
      leader: item.leader,
      branch: item.branch,
      inflow,
      invited: item.invited ?? item.activeInvited ?? 0,
      activeInvited: item.activeInvited ?? 0,
      depositingInvited: item.depositingInvited ?? 0,
      referralAccrual,
      payout,
      obligations,
      creatorFlow: item.creatorFlow ?? Math.round(inflow * 0.12),
      leaderDependency: item.leaderDependency ?? 0,
      depthScore: item.depthScore ?? 0,
      conversionToDeposit: item.conversionToDeposit ?? 0,
      structuralLeak: item.structuralLeak ?? 0,
      referralRate,
      payoutRate,
      obligationRate: inflow ? (obligations / inflow) * 100 : 0,
      netBranch,
    };
  });

  const topBranch = rows[0];
  const highestLeakBranch = [...rows].sort((left, right) => right.structuralLeak - left.structuralLeak)[0];
  const highestDependencyBranch = [...rows].sort((left, right) => right.leaderDependency - left.leaderDependency)[0];
  const totalActiveInvited = sumField(rows, "activeInvited");
  const totalDepositingInvited = sumField(rows, "depositingInvited");
  const avgReferralRate = rows.length ? sumField(rows, "referralRate") / rows.length : 0;
  const avgLeaderDependency = rows.length ? sumField(rows, "leaderDependency") / rows.length : 0;
  const builderZoneRows = rows.slice(0, Math.min(3, rows.length));
  const masterZoneRows = rows.slice(Math.min(3, rows.length), Math.min(5, rows.length));
  const highTierRows = rows.slice(Math.min(5, rows.length));
  const builderPressure = sumField(builderZoneRows, "referralAccrual") * 0.52;
  const matchingPressure = sumField(masterZoneRows, "payout") * 0.38 + sumField(highTierRows, "payout") * 0.55;
  const highestNetBranch = [...rows].sort((left, right) => right.netBranch - left.netBranch)[0];
  const directVsMatchingRate = sumField(rows, "referralAccrual") > 0 ? (matchingPressure / sumField(rows, "referralAccrual")) * 100 : 0;
  const tierJumpRisk7d = Math.min(
    100,
    (highestLeakBranch?.structuralLeak || 0) * 1.4 + (highestDependencyBranch?.leaderDependency || 0) * 0.6,
  );
  return {
    summary: {
      title: `${topBranch?.branch || "Ветка"} сейчас лидирует по притоку`,
      description: `${topBranch?.branch || "Ветка"} даёт максимум новых денег, но ${highestLeakBranch?.branch || "другая ветка"} уже показывает самый сильный structural leak. Средняя зависимость от лидера по веткам ${avgLeaderDependency.toFixed(1)}%.`,
      bullets: [
        `Начислено партнёрам: ${sumField(rows, "referralAccrual")}`,
        `Выплачено партнёрам: ${sumField(rows, "payout")}`,
        `Топ ветка: ${topBranch?.branch || "—"}`,
      ],
    },
    metrics: [
      { title: "Начислено партнёрам", value: sumField(rows, "referralAccrual"), variant: "currency", icon: "network", statusLabel: "30д", description: "Начислено по веткам." },
      { title: "Выплачено партнёрам", value: sumField(rows, "payout"), variant: "currency", icon: "claim", statusLabel: "30д", description: "Фактически ушло." },
      { title: "Топ ветка по притоку", value: topBranch?.branch || "—", variant: "text", icon: "inflow", statusLabel: formatShortMoney(topBranch?.inflow || 0), description: "Лидер по новым деньгам." },
      { title: "Топ ветка по нагрузке", value: topBranch?.referralAccrual || 0, variant: "currency", icon: "risk", statusLabel: topBranch?.branch || "—", description: "Лидер по referral burden." },
      { title: "Активные приглашённые", value: totalActiveInvited, icon: "users", statusLabel: `${totalDepositingInvited}`, description: "Активные и дошедшие до депозита." },
      { title: "Средний referral rate", value: avgReferralRate, variant: "percent", icon: "fee", statusLabel: "ветки", description: "Средняя цена ветки по рефералке." },
      { title: "Макс. зависимость от лидера", value: highestDependencyBranch?.leaderDependency || 0, variant: "percent", icon: "top-network", statusLabel: highestDependencyBranch?.branch || "—", description: "Риск концентрации на одном лидере." },
      { title: "Худший structural leak", value: highestLeakBranch?.structuralLeak || 0, variant: "percent", icon: "failed", statusLabel: highestLeakBranch?.branch || "—", description: "Где структура теряет эффективность." },
    ],
    rows,
    diagnostics: {
      costlyBranch: highestLeakBranch
        ? {
            branch: highestLeakBranch.branch,
            structuralLeak: highestLeakBranch.structuralLeak,
            leaderDependency: highestLeakBranch.leaderDependency,
          }
        : null,
      dominantPressure: matchingPressure >= builderPressure
        ? {
            type: "Master+ matching",
            value: matchingPressure,
            share: directVsMatchingRate,
          }
        : {
            type: "Builder delta",
            value: builderPressure,
            share: sumField(rows, "referralAccrual") > 0 ? (builderPressure / sumField(rows, "referralAccrual")) * 100 : 0,
          },
      jumpRisk: {
        score: tierJumpRisk7d,
        branch: highestDependencyBranch?.branch || highestLeakBranch?.branch || "—",
      },
      healthiestBranch: highestNetBranch
        ? {
            branch: highestNetBranch.branch,
            netBranch: highestNetBranch.netBranch,
          }
        : null,
    },
    qualityRows: rows.map((item) => ({
      branch: item.branch,
      activeInvited: item.activeInvited,
      depositingInvited: item.depositingInvited,
      conversionToDeposit: item.conversionToDeposit,
      leaderDependency: item.leaderDependency,
      depthScore: item.depthScore,
      structuralLeak: item.structuralLeak,
    })),
    financeRows: rows.map((item) => ({
      branch: item.branch,
      inflow: item.inflow,
      obligations: item.obligations,
      referralAccrual: item.referralAccrual,
      referralRate: item.referralRate,
      payout: item.payout,
      payoutRate: item.payoutRate,
      netBranch: item.netBranch,
    })),
    inflowShare: rows.map((item) => ({ source: item.branch, incomingAmount: item.inflow })),
    referralShare: rows.map((item) => ({ source: item.branch, incomingAmount: item.referralAccrual })),
  };
}

function mergeBackendReinvestTab(localTab, backendBundle) {
  const backendReinvest = backendBundle?.reinvest;
  if (!backendReinvest?.byProduct?.length) return localTab;

  const byProduct = backendReinvest.byProduct.map((item) => ({
    source: item.source,
    claimedCapital: item.claimedCapital,
    reinvestedCapital: item.reinvestedCapital,
    capitalRate: item.capitalRate,
    claimUsers: item.claimUsers,
    reinvestUsers: item.reinvestUsers,
    userRate: item.userRate,
  }));

  const byCountry = (backendReinvest.byCountry || []).map((item) => ({
    country: item.country,
    claimUsers: item.claimUsers,
    reinvestUsers: item.reinvestUsers,
    userRate: item.userRate,
    claimedCapital: item.claimedCapital,
    reinvestedCapital: item.reinvestedCapital,
    capitalRate: item.capitalRate,
  })).sort((left, right) => right.reinvestedCapital - left.reinvestedCapital);

  const summary = backendReinvest.summary || {};
  const totalReinvestUsers = byProduct.reduce((sum, item) => sum + item.reinvestUsers, 0);
  const totalReinvestCapital = byProduct.reduce((sum, item) => sum + item.reinvestedCapital, 0);

  return {
    summary: {
      title: `${totalReinvestUsers} пользователей уже реинвестируют`,
      description: `${Math.round(summary.reinvestCapitalRate || 0)}% claimable-капитала возвращается в систему, а повторный депозит делает ${Math.round(summary.repeatDepositRate || 0)}% базы.`,
      bullets: [
        `Reinvest users rate: ${(summary.reinvestUsersRate || 0).toFixed(1)}%`,
        `Reinvest capital rate: ${(summary.reinvestCapitalRate || 0).toFixed(1)}%`,
        `Среднее время до реинвеста: ${summary.averageDaysToReinvest || 0} дня`,
      ],
    },
    metrics: [
      { title: "Reinvest users rate", value: summary.reinvestUsersRate || 0, variant: "percent", icon: "users", statusLabel: `${totalReinvestUsers}`, description: "Доля пользователей с реинвестом." },
      { title: "Reinvest capital rate", value: summary.reinvestCapitalRate || 0, variant: "percent", icon: "inflow", statusLabel: formatShortMoney(totalReinvestCapital), description: "Доля капитала, вернувшегося в систему." },
      { title: "Repeat deposit rate", value: summary.repeatDepositRate || 0, variant: "percent", icon: "calendar", statusLabel: `${byProduct.reduce((sum, item) => sum + item.claimUsers, 0)}`, description: "Повторный депозит после участия." },
      { title: "Claim -> reinvest", value: summary.averageDaysToReinvest || 0, icon: "accrued", statusLabel: "дня", description: "Среднее время до нового входа." },
    ],
    byProduct,
    byCountry,
    timeline: backendReinvest.timeline || localTab.timeline,
    productShare: byProduct.map((item) => ({
      source: item.source,
      incomingAmount: item.reinvestedCapital,
    })),
  };
}

function mergeBackendLeadersTab(localTab, backendBundle) {
  const backendLeaders = backendBundle?.leaders;
  if (!backendLeaders?.participation?.length) return localTab;

  const byParticipation = backendLeaders.participation.map((item) => ({
    name: item.name,
    country: item.country,
    investment: item.investment,
    cycles: item.cycles,
    activeDays: item.activeDays,
    obligations: item.obligations,
    referralIncome: item.referralIncome,
    netContribution: item.netContribution,
    reinvestRate: item.reinvestRate,
    retentionRate: item.retentionRate,
    claimRate: item.claimRate,
  }));

  const byAttraction = backendLeaders.attraction.map((item) => ({
    name: item.name,
    country: item.country,
    invited: item.invited,
    activeInvited: item.activeInvited,
    depositingInvited: item.depositingInvited,
    inflow: item.inflow,
    referralLoad: item.referralLoad,
    leaderDependency: item.leaderDependency,
    baseRetention: item.baseRetention,
    reinvestRate: item.reinvestRate,
    claimPressure: item.claimPressure,
    netContribution: item.netContribution,
  }));

  const healthiestLeader = [...byParticipation].sort((left, right) => right.netContribution - left.netContribution)[0];
  const highestDependencyLeader = [...byAttraction].sort((left, right) => right.leaderDependency - left.leaderDependency)[0];
  const avgLeaderReinvest = byParticipation.length ? sumField(byParticipation, "reinvestRate") / byParticipation.length : 0;
  const avgLeaderRetention = byAttraction.length ? sumField(byAttraction, "baseRetention") / byAttraction.length : 0;

  return {
    summary: {
      title: `${byParticipation[0]?.name || "Лидер"} держит максимальный объём участия`,
      description: `${byAttraction[0]?.name || "Лидер"} сейчас ведёт по привлечённым деньгам и активным приглашённым, но самым здоровым по net contribution выглядит ${healthiestLeader?.name || "другой лидер"}.`,
      bullets: [
        `Топ по участию: ${byParticipation[0]?.investment || 0}`,
        `Топ по привлечению: ${byAttraction[0]?.inflow || 0}`,
        `Средний reinvest по лидерам: ${avgLeaderReinvest.toFixed(1)}%`,
      ],
    },
    metrics: [
      { title: "Топ по участию", value: byParticipation[0]?.investment || 0, variant: "currency", icon: "wallet", statusLabel: byParticipation[0]?.name || "—", description: "Максимальный объём инвестиций." },
      { title: "Топ по циклам", value: byParticipation[0]?.cycles || 0, icon: "calendar", statusLabel: byParticipation[0]?.name || "—", description: "Самое активное участие." },
      { title: "Топ по привлечению", value: byAttraction[0]?.inflow || 0, variant: "currency", icon: "inflow", statusLabel: byAttraction[0]?.name || "—", description: "Максимум привлечённых денег." },
      { title: "Топ по реферальной нагрузке", value: byAttraction[0]?.referralLoad || 0, variant: "currency", icon: "network", statusLabel: byAttraction[0]?.name || "—", description: "Максимальная нагрузка по referral." },
      { title: "Лучший net contribution", value: healthiestLeader?.netContribution || 0, variant: "currency", icon: "fact", statusLabel: healthiestLeader?.name || "—", description: "Самый полезный лидер для системы." },
      { title: "Риск зависимости", value: highestDependencyLeader?.leaderDependency || 0, variant: "percent", icon: "risk", statusLabel: highestDependencyLeader?.name || "—", description: "Максимальная зависимость от одного лидера." },
      { title: "Средний reinvest", value: avgLeaderReinvest, variant: "percent", icon: "claim", statusLabel: "leaders", description: "Средний реинвест у сильных лидеров." },
      { title: "Среднее удержание базы", value: avgLeaderRetention, variant: "percent", icon: "active-wallet", statusLabel: "leaders", description: "Среднее удержание приглашённой базы." },
    ],
    participation: byParticipation,
    attraction: byAttraction,
    participationQuality: byParticipation.map((item) => ({
      name: item.name,
      country: item.country,
      obligations: item.obligations,
      referralIncome: item.referralIncome,
      netContribution: item.netContribution,
      reinvestRate: item.reinvestRate,
      retentionRate: item.retentionRate,
      claimRate: item.claimRate,
    })),
    attractionQuality: byAttraction.map((item) => ({
      name: item.name,
      country: item.country,
      activeInvited: item.activeInvited,
      depositingInvited: item.depositingInvited,
      leaderDependency: item.leaderDependency,
      baseRetention: item.baseRetention,
      reinvestRate: item.reinvestRate,
      claimPressure: item.claimPressure,
      netContribution: item.netContribution,
    })),
    participationShare: byParticipation.map((item) => ({ source: item.name, incomingAmount: item.investment })),
    attractionShare: byAttraction.map((item) => ({ source: item.name, incomingAmount: item.inflow })),
  };
}

function mergeBackendGeographyTab(localTab, backendBundle) {
  const backendGeography = backendBundle?.geography;
  if (!backendGeography?.rows?.length) return localTab;

  const rows = backendGeography.rows.map((item) => ({
    country: item.country,
    city: item.city,
    users: item.users,
    wallets: item.wallets,
    inflow: item.inflow,
    obligations: item.obligations,
    deposits: item.deposits,
    activeUsers: item.activeUsers,
    activeRate: item.activeRate,
    newUsers: item.newUsers,
    repeatUsers: item.repeatUsers,
    repeatRate: item.repeatRate,
    reinvestUsers: item.reinvestUsers,
    reinvestRate: item.reinvestRate,
    payingUsers: item.payingUsers,
    payingRate: item.payingRate,
    claimUsers: item.claimUsers,
    claimRate: item.claimRate,
    riskScore: item.riskScore,
    growthScore: item.growthScore,
    obligationLoad: item.obligationLoad,
  })).sort((left, right) => right.inflow - left.inflow);

  const topGrowthCountry = [...rows].sort((left, right) => right.growthScore - left.growthScore)[0];
  const topRiskCountry = [...rows].sort((left, right) => right.riskScore - left.riskScore)[0];
  const avgReinvestRate = rows.length ? sumField(rows, "reinvestRate") / rows.length : 0;

  return {
    summary: {
      title: `${rows[0]?.country || "Страна"} сейчас лидирует по входящему потоку`,
      description: `${rows[0]?.country || "Страна"} даёт максимальный inflow, ${topGrowthCountry?.country || "другая страна"} показывает лучший growth profile, а ${topRiskCountry?.country || "ещё одна страна"} уже выглядит самой рискованной по нагрузке.`,
      bullets: [
        `Топ inflow: ${rows[0]?.inflow || 0}`,
        `Топ obligations: ${rows[0]?.obligations || 0}`,
        `Средний reinvest rate: ${avgReinvestRate.toFixed(1)}%`,
      ],
    },
    metrics: [
      { title: "Активные страны", value: rows.length, icon: "top-network", statusLabel: "geo", description: "Страны в текущем срезе." },
      { title: "Топ страна по притоку", value: rows[0]?.country || "—", variant: "text", icon: "inflow", statusLabel: formatShortMoney(rows[0]?.inflow || 0), description: "Лидер по входящему потоку." },
      { title: "Топ страна по users", value: rows[0]?.users || 0, icon: "users", statusLabel: rows[0]?.country || "—", description: "Лидер по числу участников." },
      { title: "Топ страна по obligations", value: rows[0]?.obligations || 0, variant: "currency", icon: "calendar", statusLabel: rows[0]?.country || "—", description: "Лидер по будущей нагрузке." },
      { title: "Топ growth profile", value: topGrowthCountry?.growthScore || 0, variant: "percent", icon: "active-wallet", statusLabel: topGrowthCountry?.country || "—", description: "Лучшая страна по качеству роста." },
      { title: "Топ risk country", value: topRiskCountry?.riskScore || 0, variant: "percent", icon: "risk", statusLabel: topRiskCountry?.country || "—", description: "Страна с самым тяжёлым risk profile." },
      { title: "Средний reinvest", value: avgReinvestRate, variant: "percent", icon: "wallet", statusLabel: "geo", description: "Средний реинвест по странам." },
      { title: "Средняя активность", value: rows.length ? sumField(rows, "activeRate") / rows.length : 0, variant: "percent", icon: "connected", statusLabel: "geo", description: "Средняя активность базы по странам." },
    ],
    rows,
    qualityRows: rows.map((item) => ({
      country: item.country,
      activeUsers: item.activeUsers,
      activeRate: item.activeRate,
      newUsers: item.newUsers,
      repeatUsers: item.repeatUsers,
      repeatRate: item.repeatRate,
      reinvestUsers: item.reinvestUsers,
      reinvestRate: item.reinvestRate,
      payingUsers: item.payingUsers,
      payingRate: item.payingRate,
    })),
    riskRows: rows.map((item) => ({
      country: item.country,
      obligations: item.obligations,
      obligationLoad: item.obligationLoad,
      claimRate: item.claimRate,
      riskScore: item.riskScore,
      growthScore: item.growthScore,
    })),
    shareChart: rows.map((item) => ({ source: item.country, incomingAmount: item.users })),
    inflowChart: rows.map((item) => ({ source: item.country, incomingAmount: item.inflow })),
  };
}

function mergeBackendTrafficTab(localTab, backendBundle) {
  const backendTraffic = backendBundle?.traffic;
  if (!backendTraffic?.summary) return localTab;

  const countries = backendTraffic.countries || [];
  const sources = backendTraffic.sources || [];
  const conversion = backendTraffic.conversion || [];
  const weakestStep = [...conversion].sort((left, right) => left.rate - right.rate)[0];
  const summary = backendTraffic.summary;
  const lifecycleRows = backendTraffic.lifecycleRows || localTab.lifecycleRows || [];
  const lifecycleTotals = backendTraffic.lifecycleTotals || localTab.lifecycleTotals || [];

  return {
    summary: {
      title: `Сейчас на сайте ${summary.siteOnline || 0}, в кабинете ${summary.cabinetOnline || 0}`,
      description: `Живой поток идёт из ${countries[0]?.country || "основной страны"}, а до старта депозита доходит ${summary.depositStarts || 0} пользователей. Самый слабый шаг сейчас: ${weakestStep?.period || "—"}.`,
      bullets: [
        `Сессии за день: ${summary.sessionsToday || 0}`,
        `Авторизованы сегодня: ${summary.authorizedToday || 0}`,
        `Топ страна онлайн: ${countries[0]?.country || "—"} (${countries[0]?.siteUsers || 0})`,
        `За период: ${lifecycleTotals[0]?.registrations || 0} регистраций / ${lifecycleTotals[0]?.walletConnects || 0} wallet connect / ${lifecycleTotals[0]?.cycleActivations || 0} активаций`,
      ],
    },
    metrics: [
      { title: "Регистрации сегодня", value: summary.registrationsToday || 0, icon: "users", statusLabel: "today", description: "Новые регистрации за день." },
      { title: "Подключили кошелёк", value: summary.walletConnects || 0, icon: "connected", statusLabel: summary.registrationsToday ? `${Math.round(((summary.walletConnects || 0) / summary.registrationsToday) * 100)}%` : "0%", description: "Из сегодняшних регистраций." },
      { title: "Активировали цикл", value: summary.cycleActivationsToday || 0, icon: "calendar", statusLabel: summary.walletConnects ? `${Math.round(((summary.cycleActivationsToday || 0) / summary.walletConnects) * 100)}%` : "0%", description: "Дошли до активации цикла." },
      { title: "На сайте сейчас", value: summary.siteOnline || 0, icon: "users", statusLabel: "live", description: "Все посетители на сайте." },
      { title: "В кабинете сейчас", value: summary.cabinetOnline || 0, icon: "connected", statusLabel: "live", description: "Пользователи в личном кабинете." },
      { title: "Сессии за день", value: summary.sessionsToday || 0, icon: "transactions", statusLabel: "today", description: "Все сессии за текущий день." },
      { title: "Авторизованы сегодня", value: summary.authorizedToday || 0, icon: "fact", statusLabel: "auth", description: "Прошли в личный кабинет." },
      { title: "Подключили кошелёк", value: summary.walletConnects || 0, icon: "claim", statusLabel: "wallet", description: "Wallet connect за день." },
      { title: "Начали депозит", value: summary.depositStarts || 0, icon: "inflow", statusLabel: summary.siteOnline ? `${Math.round(((summary.depositStarts || 0) / summary.siteOnline) * 100)}%` : "0%", description: "Дошли до старта депозита." },
      { title: "Новые визиты", value: summary.newVisitors || 0, icon: "users", statusLabel: `${Math.round(((summary.newVisitors || 0) / Math.max(summary.siteOnline || 1, 1)) * 100)}%`, description: "Новый живой поток." },
      { title: "Повторные визиты", value: summary.repeatVisitors || 0, icon: "calendar", statusLabel: `${Math.round(((summary.repeatVisitors || 0) / Math.max(summary.siteOnline || 1, 1)) * 100)}%`, description: "Возвращающиеся пользователи." },
      { title: "Вовлечённые", value: summary.engagedUsers || 0, icon: "active-wallet", statusLabel: `${Math.round(((summary.engagedUsers || 0) / Math.max(summary.siteOnline || 1, 1)) * 100)}%`, description: "Провели время и двигаются по воронке." },
      { title: "Средняя сессия", value: summary.averageSessionMinutes || 0, icon: "average", statusLabel: "мин", description: "Средняя длина живой сессии." },
    ],
    countries,
    sources,
    funnel: backendTraffic.funnel || localTab.funnel,
    conversion,
    qualityRows: countries.map((item) => ({
      country: item.country,
      newVisitors: item.newVisitors,
      repeatVisitors: item.repeatVisitors,
      engagementRate: item.engagementRate,
      depositConversion: item.depositConversion,
    })),
    lifecycleRows,
    lifecycleTotals,
    sourceQualityRows: sources.map((item) => ({
      source: item.source,
      newVisitors: item.newVisitors,
      repeatVisitors: item.repeatVisitors,
      bounceRate: item.bounceRate,
      walletConnects: item.walletConnects,
      depositStarts: item.depositStarts,
      depositConversion: item.depositConversion,
      qualityScore: item.qualityScore,
    })),
    timeline: backendTraffic.timeline || localTab.timeline,
    countryShare: countries.map((item) => ({ source: item.country, incomingAmount: item.siteUsers })),
  };
}

function mergeBackendBaseCompositionTab(localTab, backendBundle) {
  const backendBase = backendBundle?.baseComposition;
  if (!backendBase?.segments?.length) return localTab;

  const segments = backendBase.segments;
  const mixedSegment = segments.find((item) => item.segment === "Инвесторы + партнёры");
  const partnerOnly = segments.find((item) => item.segment === "Только партнёры");
  const totalUsers = sumField(segments, "users");
  const totalActiveUsers = sumField(segments, "activeUsers");
  const totalPayingUsers = sumField(segments, "payingUsers");
  const totalClaimUsers = sumField(segments, "claimUsers");
  const totalReferralIncomeUsers = sumField(segments, "referralIncomeUsers");
  const activeBaseRate = totalUsers ? (totalActiveUsers / totalUsers) * 100 : 0;
  const payingBaseRate = totalUsers ? (totalPayingUsers / totalUsers) * 100 : 0;
  const claimBaseRate = totalUsers ? (totalClaimUsers / totalUsers) * 100 : 0;
  const referralIncomeRate = totalUsers ? (totalReferralIncomeUsers / totalUsers) * 100 : 0;

  return {
    summary: {
      title: `${mixedSegment?.segment || "Смешанная роль"} даёт основной объём денег`,
      description: `${mixedSegment?.segment || "Смешанная роль"} сейчас приносит максимум inflow и лучший repeat rate, а ${partnerOnly?.segment || "партнёры"} сильнее завязаны на реферальный контур. По всей базе ${activeBaseRate.toFixed(1)}% активны и ${payingBaseRate.toFixed(1)}% реально платят.`,
      bullets: [
        `Доля смешанной роли: ${mixedSegment ? mixedSegment.share.toFixed(1) : "0"}%`,
        `Top repeat rate: ${mixedSegment ? mixedSegment.repeatRate.toFixed(1) : "0"}%`,
        `Net contribution лидера: ${mixedSegment?.netContribution || 0}`,
      ],
    },
    metrics: [
      { title: "Инвесторы", value: segments[0]?.users || 0, icon: "wallet", statusLabel: `${segments[0]?.share?.toFixed(1) || 0}%`, description: "Только инвесторы." },
      { title: "Партнёры", value: segments[1]?.users || 0, icon: "network", statusLabel: `${segments[1]?.share?.toFixed(1) || 0}%`, description: "Только партнёры." },
      { title: "Смешанная роль", value: segments[2]?.users || 0, icon: "users", statusLabel: `${segments[2]?.share?.toFixed(1) || 0}%`, description: "И инвестор, и партнёр." },
      { title: "Top net contribution", value: mixedSegment?.netContribution || 0, variant: "currency", icon: "inflow", statusLabel: mixedSegment?.segment || "—", description: "Лучший вклад в систему." },
      { title: "Активная база", value: activeBaseRate, variant: "percent", icon: "active-wallet", statusLabel: `${totalActiveUsers}`, description: "Доля активных пользователей." },
      { title: "Платящая база", value: payingBaseRate, variant: "percent", icon: "fact", statusLabel: `${totalPayingUsers}`, description: "Доля пользователей с оплатой." },
      { title: "База с claim", value: claimBaseRate, variant: "percent", icon: "claim", statusLabel: `${totalClaimUsers}`, description: "Доля пользователей с хотя бы одним claim." },
      { title: "База с рефдоходом", value: referralIncomeRate, variant: "percent", icon: "network", statusLabel: `${totalReferralIncomeUsers}`, description: "Доля базы с партнёрским доходом." },
    ],
    rows: segments,
    qualityRows: segments.map((item) => ({
      segment: item.segment,
      activeUsers: item.activeUsers,
      activeRate: item.users ? (item.activeUsers / item.users) * 100 : 0,
      sleepingUsers: item.sleepingUsers,
      newUsers: item.newUsers,
      repeatUsers: item.repeatUsers,
      repeatRate: item.users ? (item.repeatUsers / item.users) * 100 : 0,
      payingUsers: item.payingUsers,
      payingRate: item.users ? (item.payingUsers / item.users) * 100 : 0,
      nonPayingUsers: item.nonPayingUsers,
      claimUsers: item.claimUsers,
      claimRate: item.users ? (item.claimUsers / item.users) * 100 : 0,
      noClaimUsers: item.noClaimUsers,
      referralIncomeUsers: item.referralIncomeUsers,
      referralIncomeRate: item.users ? (item.referralIncomeUsers / item.users) * 100 : 0,
      noReferralIncomeUsers: item.noReferralIncomeUsers,
    })),
    valueTierRows: segments.map((item) => ({
      segment: item.segment,
      largeUsers: item.largeUsers,
      largeShare: item.users ? (item.largeUsers / item.users) * 100 : 0,
      largeInflow: item.largeInflow,
      mediumUsers: item.mediumUsers,
      mediumShare: item.users ? (item.mediumUsers / item.users) * 100 : 0,
      mediumInflow: item.mediumInflow,
      smallUsers: item.smallUsers,
      smallShare: item.users ? (item.smallUsers / item.users) * 100 : 0,
      smallInflow: item.smallInflow,
    })),
    lifecycleRows: segments.map((item) => ({
      segment: item.segment,
      newUsers: item.newUsers,
      repeatUsers: item.repeatUsers,
      repeatRate: item.users ? (item.repeatUsers / item.users) * 100 : 0,
      reinvestUsers: item.reinvestUsers,
      reinvestRate: item.reinvestRate,
      claimUsers: item.claimUsers,
      mixedRoleConversion: item.mixedRoleConversion,
    })),
    retentionRows: segments.map((item) => ({
      segment: item.segment,
      activeUsers: item.activeUsers,
      sleepingUsers: item.sleepingUsers,
      dormantUsers: item.dormantUsers,
      dormantRate: item.dormantRate,
      reactivatedUsers: item.reactivatedUsers,
      reactivatedRate: item.reactivatedRate,
      churnedUsers: item.churnedUsers,
      churnRate: item.churnRate,
    })),
    shareChart: segments.map((item) => ({ source: item.segment, incomingAmount: item.users })),
    inflowChart: segments.map((item) => ({ source: item.segment, incomingAmount: item.inflow })),
  };
}

function getStartDate(rangeValue) {
  const safeRangeValue = analyticsMockData.dateRanges.some((range) => range.value === rangeValue)
    ? rangeValue
    : analyticsMockData.dateRanges[1]?.value;
  const selectedRange = analyticsMockData.dateRanges.find((range) => range.value === safeRangeValue) || analyticsMockData.dateRanges[1];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (selectedRange.days - 1));
  return startDate.toISOString().slice(0, 10);
}

function normalizeFilters(filters) {
  const safeSegment = analyticsMockData.segments.includes(filters.segment)
    ? filters.segment
    : "Все сегменты";
  const safeSource = analyticsMockData.sources.includes(filters.source)
    ? filters.source
    : "Все продукты";
  const safeDateRange = analyticsMockData.dateRanges.some((range) => range.value === filters.dateRange)
    ? filters.dateRange
    : "30d";

  return {
    ...filters,
    segment: safeSegment,
    source: safeSource,
    dateRange: safeDateRange,
  };
}

function filterRecords(filters) {
  const safeFilters = normalizeFilters(filters);
  const startDate = getStartDate(safeFilters.dateRange);

  return analyticsMockData.dailyRecords.filter((record) => {
    const matchesDate = record.date >= startDate;
    const matchesSegment = safeFilters.segment === "Все сегменты" || record.segment === safeFilters.segment;
    const matchesSource = safeFilters.source === "Все продукты" || record.source === safeFilters.source;
    return matchesDate && matchesSegment && matchesSource;
  });
}

function filterFutureObligations(filters) {
  const safeFilters = normalizeFilters(filters);
  return analyticsMockData.futureObligations.filter((record) => {
    const matchesSegment = safeFilters.segment === "Все сегменты" || record.segment === safeFilters.segment;
    const matchesSource = safeFilters.source === "Все продукты" || record.source === safeFilters.source;
    return matchesSegment && matchesSource;
  });
}

function sumField(records, field) {
  return records.reduce((sum, record) => sum + record[field], 0);
}

function buildOverviewPartnerPressure(partnerTab) {
  const rows = partnerTab?.rows || [];
  const qualityRows = partnerTab?.qualityRows || [];

  if (!rows.length) {
    return [];
  }

  const totalReferralAccrual = sumField(rows, "referralAccrual");
  const totalPayout = sumField(rows, "payout");
  const totalNetBranch = sumField(rows, "netBranch");
  const builderRows = rows.slice(0, Math.min(3, rows.length));
  const masterRows = rows.slice(Math.min(3, rows.length), Math.min(5, rows.length));
  const highTierRows = rows.slice(Math.min(5, rows.length));
  const highestLeakBranch = [...qualityRows].sort((left, right) => right.structuralLeak - left.structuralLeak)[0];
  const highestDependencyBranch = [...qualityRows].sort((left, right) => right.leaderDependency - left.leaderDependency)[0];

  const builderPressure = sumField(builderRows, "referralAccrual") * 0.52;
  const matchingPressure = sumField(masterRows, "payout") * 0.38 + sumField(highTierRows, "payout") * 0.55;
  const highTierStructurePressure = sumField(highTierRows, "referralAccrual") * 0.61;
  const tierJumpRisk7d = Math.min(
    100,
    (highestLeakBranch?.structuralLeak || 0) * 1.4 + (highestDependencyBranch?.leaderDependency || 0) * 0.6,
  );
  const directVsMatching = totalReferralAccrual > 0 ? (matchingPressure / totalReferralAccrual) * 100 : 0;
  const structureCostRate = totalReferralAccrual > 0 ? (totalPayout / totalReferralAccrual) * 100 : 0;

  return [
    {
      title: "Builder pressure today",
      value: builderPressure,
      variant: "currency",
      icon: "network",
      tone: builderPressure > totalReferralAccrual * 0.45 ? "danger" : "accent",
      statusLabel: `${Math.round((builderPressure / Math.max(totalReferralAccrual, 1)) * 100)}%`,
      description: "Нагрузка от ранних веток и дельты структуры.",
    },
    {
      title: "Master+ matching today",
      value: matchingPressure,
      variant: "currency",
      icon: "claim",
      tone: directVsMatching >= 35 ? "danger" : "accent",
      statusLabel: `${Math.round(directVsMatching)}%`,
      description: "Доля текущей нагрузки, уже идущая из matching.",
    },
    {
      title: "Tier jump risk 7d",
      value: tierJumpRisk7d,
      variant: "percent",
      icon: "risk",
      tone: tierJumpRisk7d >= 55 ? "danger" : tierJumpRisk7d >= 35 ? "accent" : "success",
      statusLabel: highestLeakBranch?.branch || "—",
      description: "Риск волны апгрейдов по статусам на неделе.",
      pulse: tierJumpRisk7d >= 55,
    },
    {
      title: "Самая дорогая ветка",
      value: highestDependencyBranch?.branch || "—",
      variant: "text",
      icon: "top-network",
      tone: structureCostRate >= 80 || totalNetBranch < totalReferralAccrual ? "danger" : "accent",
      statusLabel: highestDependencyBranch ? `${Math.round(highestDependencyBranch.leaderDependency)}% dep.` : "—",
      description: "Где структура уже сильнее тянет treasury, чем помогает ему.",
    },
    {
      title: "Direct vs matching",
      value: directVsMatching,
      variant: "percent",
      icon: "fee",
      tone: directVsMatching >= 35 ? "danger" : directVsMatching >= 20 ? "accent" : "success",
      statusLabel: `${Math.round(highTierStructurePressure)}`,
      description: "Какая доля рефнагрузки идёт уже из matching.",
    },
  ];
}

function groupFutureByDate(records) {
  const map = new Map();

  records.forEach((record) => {
    const current = map.get(record.date) || {
      date: record.date,
      expectedIncoming: 0,
      cyclePayouts: 0,
      referralPayouts: 0,
      platformFee: 0,
      requiredNewMoney: 0,
      projectedGap: 0,
    };

    current.expectedIncoming += record.expectedIncoming;
    current.cyclePayouts += record.cyclePayouts;
    current.referralPayouts += record.referralPayouts;
    current.platformFee += record.platformFee;
    current.requiredNewMoney += record.requiredNewMoney;
    current.projectedGap += record.projectedGap;
    map.set(record.date, current);
  });

  return Array.from(map.values()).sort((left, right) => left.date.localeCompare(right.date));
}

function buildNearest72hWindow(futureRecords) {
  const groupedFuture = groupFutureByDate(futureRecords).slice(0, 3);

  return groupedFuture.map((item) => ({
    date: item.date,
    cyclePayouts: item.cyclePayouts,
    referralPayouts: item.referralPayouts,
    platformFee: item.platformFee,
    totalOutgoing: item.cyclePayouts + item.referralPayouts + item.platformFee,
    expectedIncoming: item.expectedIncoming,
    projectedGap: item.projectedGap,
  }));
}

function buildOverviewOperations(records) {
  const groupedHistory = groupByDate(records);
  const latestDay = groupedHistory.at(-1) || null;
  const previousDay = groupedHistory.at(-2) || null;
  const trailing7d = groupedHistory.slice(-7);
  const trailing30d = groupedHistory.slice(-30);

  function buildPeriodSnapshot(label, days) {
    const scopedDays = days.filter(Boolean);
    const incoming = sumField(scopedDays, "incomingAmount");
    const outgoing = scopedDays.reduce(
      (sum, item) => sum + (item.cyclePayouts || 0) + (item.referralPayouts || 0) + (item.platformFee || 0),
      0,
    );
    const cycleActivations = scopedDays.reduce(
      (sum, item) => sum + Math.round((item.walletsConnected || 0) * 0.58),
      0,
    );
    const newMoney = Math.round(incoming * 0.37);
    const existingMoney = Math.max(0, incoming - newMoney);

    return {
      period: label,
      incoming,
      newMoney,
      existingMoney,
      cycleActivations,
      outgoing,
    };
  }

  const periods = [
    buildPeriodSnapshot("Вчера", previousDay ? [previousDay] : []),
    buildPeriodSnapshot("Сегодня", latestDay ? [latestDay] : []),
    buildPeriodSnapshot("7 дней", trailing7d),
    buildPeriodSnapshot("30 дней", trailing30d),
  ];

  const cycleTypes = analyticsMockData.tariffs.map((tariff) => {
    const tariffToday = records.filter((record) => record.tariffId === tariff.id && record.date === latestDay?.date);
    const tariff7d = records.filter((record) => record.tariffId === tariff.id && trailing7d.some((day) => day.date === record.date));
    const tariff30d = records.filter((record) => record.tariffId === tariff.id && trailing30d.some((day) => day.date === record.date));

    return {
      cycleType: tariff.name,
      source: tariff.source,
      todayCreated: tariffToday.reduce((sum, record) => sum + Math.round((record.walletsConnected || 0) * 0.58), 0),
      weekCreated: tariff7d.reduce((sum, record) => sum + Math.round((record.walletsConnected || 0) * 0.58), 0),
      monthCreated: tariff30d.reduce((sum, record) => sum + Math.round((record.walletsConnected || 0) * 0.58), 0),
      todayIncoming: sumField(tariffToday, "incomingAmount"),
      todayOutgoing: tariffToday.reduce(
        (sum, record) => sum + (record.cyclePayouts || 0) + (record.referralPayouts || 0) + (record.platformFee || 0),
        0,
      ),
    };
  });

  return {
    periods,
    cycleTypes,
  };
}

function buildKpis(records, futureRecords) {
  const groupedHistory = groupByDate(records);
  const groupedFuture = groupFutureByDate(futureRecords);
  const latestDay = groupedHistory.slice(-1)[0] || {
    incomingAmount: 0,
    planAmount: 0,
    gap: 0,
    cyclePayouts: 0,
    referralPayouts: 0,
    platformFee: 0,
  };
  const carryForwardDeficit = Math.max(
    0,
    groupedHistory.slice(0, -1).reduce((sum, day) => sum + Math.max(0, day.gap), 0),
  );
  const activeWallets = sumField(records, "activeWallets");
  const transactions = sumField(records, "transactions");
  const transactionVolume = sumField(records, "transactionVolume");
  const failedTransactions = sumField(records, "failedTransactions");
  const next7d = groupedFuture.slice(0, 7);
  const next30d = groupedFuture.slice(0, 30);
  const referralBurden = sumField(next7d, "referralPayouts");
  const platformFee = sumField(next7d, "platformFee");
  const obligations7d = sumField(next7d, "cyclePayouts");
  const obligations30d = sumField(next30d, "cyclePayouts");
  const requiredNewMoney = sumField(next30d, "requiredNewMoney");
  const deficit7d = Math.max(0, sumField(next7d, "projectedGap"));
  const deficit30d = Math.max(0, sumField(next30d, "projectedGap"));
  const expectedIncoming7d = sumField(next7d, "expectedIncoming");
  const expectedIncoming30d = sumField(next30d, "expectedIncoming");
  const coverage7d = obligations7d ? (expectedIncoming7d / obligations7d) * 100 : 100;
  const coverage30d = obligations30d ? (expectedIncoming30d / obligations30d) * 100 : 100;
  const operatorNet = Math.max(0, requiredNewMoney - obligations30d - sumField(next30d, "referralPayouts") - sumField(next30d, "platformFee"));
  const totalClaimable = sumField(records, "claimableNow");
  const totalAccrued = sumField(records, "accruedLater");
  const topNetwork = groupNetworkStats(records).sort((left, right) => right.value - left.value)[0]?.network || "BNB";
  const firstRisk = groupedFuture.find((record) => record.projectedGap > 0);
  const targetToday = latestDay.planAmount + carryForwardDeficit;
  const targetTomorrow = latestDay.planAmount + carryForwardDeficit + Math.max(0, latestDay.gap);
  const outgoingToday = (latestDay.cyclePayouts || 0) + (latestDay.referralPayouts || 0) + (latestDay.platformFee || 0);

  return {
    incomingToday: latestDay.incomingAmount || 0,
    factToday: latestDay.incomingAmount || 0,
    outgoingToday,
    contractNetFlowToday: (latestDay.incomingAmount || 0) - outgoingToday,
    planToday: latestDay.planAmount || 0,
    gapToday: latestDay.gap || 0,
    targetToday,
    carryForwardDeficit,
    targetTomorrow,
    obligations7d,
    obligations30d,
    deficit7d,
    deficit30d,
    coverage7d: Number(coverage7d.toFixed(1)),
    coverage30d: Number(coverage30d.toFixed(1)),
    requiredNewMoney,
    referralBurden,
    platformFee,
    operatorNet,
    activeWallets,
    connectedWallets: sumField(records, "walletsConnected"),
    uniqueWallets: Math.round(sumField(records, "walletsConnected") * 0.84),
    transactions,
    transactionVolume,
    failedTransactions,
    averageTransactionValue: transactions ? transactionVolume / transactions : 0,
    topNetwork,
    claimableNow: totalClaimable,
    accruedLater: totalAccrued,
    firstRiskDate: firstRisk ? firstRisk.date : "без риска",
    firstRiskGap: firstRisk ? firstRisk.projectedGap : 0,
  };
}

function buildBreakdownFunnel(records, futureRecords) {
  const incomingAmount = sumField(records, "incomingAmount");
  const cyclePayouts = sumField(futureRecords.slice(0, 30), "cyclePayouts");
  const referralPayouts = sumField(futureRecords.slice(0, 30), "referralPayouts");
  const platformFee = sumField(futureRecords.slice(0, 30), "platformFee");
  const operatorNet = Math.max(0, incomingAmount - cyclePayouts - referralPayouts - platformFee);

  const totals = {
    incomingAmount,
    cyclePayouts,
    referralPayouts,
    platformFee,
    operatorNet,
  };

  return analyticsMockData.conversionFunnelTemplate.map((stage) => ({
    stage: stage.stage,
    value: totals[stage.key],
    conversion: stage.key === "incomingAmount" ? 100 : calculateConversion(totals[stage.key], totals.incomingAmount),
  }));
}

function buildCoverageCurve(futureRecords) {
  return analyticsMockData.coverageCurveTemplate.map((item) => {
    const scopedRecords = futureRecords.slice(0, item.days);
    const expectedIncoming = sumField(scopedRecords, "expectedIncoming");
    const requiredNewMoney = sumField(scopedRecords, "requiredNewMoney");
    const coverage = requiredNewMoney ? (expectedIncoming / requiredNewMoney) * 100 : 100;

    return {
      period: item.point,
      rate: Number(coverage.toFixed(1)),
    };
  });
}

function buildProductPressure(records, futureRecords) {
  const products = groupBySource(records);

  return products
    .map((item) => {
      const futureByProduct = futureRecords.filter((record) => record.source === item.source);
      const obligations = sumField(futureByProduct.slice(0, 30), "cyclePayouts");
      const required = sumField(futureByProduct.slice(0, 30), "requiredNewMoney");
      const gapPercent = required ? ((required - sumField(futureByProduct.slice(0, 30), "expectedIncoming")) / required) * 100 : 0;

      return {
        campaign: item.source,
        revenue: obligations,
        roi: Number(gapPercent.toFixed(2)),
      };
    })
    .sort((left, right) => right.revenue - left.revenue);
}

function buildProductsTable(records) {
  const sourceOrder = ["Lockup", "Daily Flow"];

  return groupBySource(records)
    .map((item) => {
      const childRows = analyticsMockData.tariffs
        .filter((tariff) => tariff.source === item.source)
        .map((tariff) => {
          const scoped = records.filter((record) => record.tariffId === tariff.id);
          return {
            id: `${item.source}-${tariff.id}`,
            source: tariff.name,
            parentSource: item.source,
            incomingAmount: sumField(scoped, "incomingAmount"),
            planAmount: sumField(scoped, "planAmount"),
            cyclePayouts: sumField(scoped, "cyclePayouts"),
            referralPayouts: sumField(scoped, "referralPayouts"),
            platformFee: sumField(scoped, "platformFee"),
            operatorNet: sumField(scoped, "operatorNet"),
            gap: sumField(scoped, "gap"),
            isChild: true,
          };
        });

      return {
        id: item.source,
        source: item.source,
        incomingAmount: item.incomingAmount,
        planAmount: item.planAmount,
        cyclePayouts: item.cyclePayouts,
        referralPayouts: item.referralPayouts,
        platformFee: item.platformFee,
        operatorNet: item.operatorNet,
        gap: item.gap,
        children: childRows,
      };
    })
    .sort((left, right) => sourceOrder.indexOf(left.source) - sourceOrder.indexOf(right.source));
}

function findTopPressureProduct(futureRecords) {
  const byProduct = analyticsMockData.sources
    .filter((source) => source !== "Все продукты")
    .map((source) => {
      const scoped = futureRecords.filter((record) => record.source === source);
      return {
        source,
        projectedGap: sumField(scoped.slice(0, 30), "projectedGap"),
        obligations: sumField(scoped.slice(0, 30), "cyclePayouts"),
      };
    })
    .sort((left, right) => right.projectedGap - left.projectedGap || right.obligations - left.obligations);

  return byProduct[0] || null;
}

function splitByProfiles(total, profiles, valueKey = "value") {
  const allocated = profiles.map((profile, index) => ({
    ...profile,
    [valueKey]: Math.round(total * profile.share + index * 7),
  }));

  return allocated;
}

function buildTrafficTab(records) {
  const history = groupByDate(records);
  const latestDay = history.slice(-1)[0] || {
    investors: 0,
    activeWallets: 0,
    walletsConnected: 0,
    incomingAmount: 0,
    transactions: 0,
  };
  const siteOnline = Math.round(latestDay.activeWallets * 1.9);
  const cabinetOnline = Math.round(latestDay.walletsConnected * 1.15);
  const sessionsToday = Math.round(latestDay.walletsConnected * 2.8);
  const authorizedToday = Math.round(cabinetOnline * 2.4);
  const walletConnects = Math.round(latestDay.walletsConnected * 0.74);
  const depositStarts = Math.round(walletConnects * 0.58);
  const newVisitors = Math.round(siteOnline * 0.57);
  const repeatVisitors = Math.max(0, siteOnline - newVisitors);
  const engagedUsers = Math.round(siteOnline * 0.48);
  const avgSessionMinutes = 6.8;
  const registrationsToday = latestDay.investors || 0;
  const walletConnectsToday = latestDay.walletsConnected || 0;
  const cycleActivationsToday = Math.round(walletConnectsToday * 0.58);
  const lifecycleRows = history.map((day) => {
    const registrations = day.investors || 0;
    const walletConnectsValue = day.walletsConnected || 0;
    const cycleActivations = Math.round(walletConnectsValue * 0.58);

    return {
      date: day.date.slice(5),
      registrations,
      walletConnects: walletConnectsValue,
      cycleActivations,
      walletConnectRate: registrations ? (walletConnectsValue / registrations) * 100 : 0,
      cycleActivationRate: walletConnectsValue ? (cycleActivations / walletConnectsValue) * 100 : 0,
    };
  });
  const totalRegistrations = lifecycleRows.reduce((sum, row) => sum + row.registrations, 0);
  const totalWalletConnects = lifecycleRows.reduce((sum, row) => sum + row.walletConnects, 0);
  const totalCycleActivations = lifecycleRows.reduce((sum, row) => sum + row.cycleActivations, 0);

  const countries = splitByProfiles(siteOnline, COUNTRY_PROFILES, "siteUsers").map((item, index) => ({
    country: item.country,
    siteUsers: item.siteUsers,
    cabinetUsers: Math.round(item.siteUsers * 0.61),
    sessions: Math.round(item.siteUsers * 2.3),
    wallets: Math.round(item.siteUsers * 0.42 + index * 2),
    newVisitors: Math.round(item.siteUsers * (0.55 - index * 0.02)),
    repeatVisitors: Math.max(0, Math.round(item.siteUsers * 0.45 + index * 3)),
    engagementRate: 54 - index * 4,
    depositConversion: 18 - index * 1.3,
  }));

  const sources = groupBySource(records).map((source, index) => ({
    source: source.source,
    siteUsers: Math.round(source.walletsConnected * 1.35),
    cabinetUsers: Math.round(source.walletsConnected * 0.92),
    walletConnects: Math.round(source.walletsConnected * 0.74),
    deposits: Math.round(source.incomingAmount),
    conversion: source.walletsConnected ? (source.walletsConnected / Math.max(Math.round(source.walletsConnected * 1.35), 1)) * 100 : 0,
    newVisitors: Math.round(source.walletsConnected * 0.71),
    repeatVisitors: Math.round(source.walletsConnected * 0.64),
    bounceRate: 31 - index * 3,
    depositStarts: Math.round(source.walletsConnected * 0.52),
    depositConversion: 39 - index * 4,
    qualityScore: 73 - index * 5,
    id: `${source.source}-${index}`,
  }));

  const timeline = history.slice(-7).map((day) => ({
    date: day.date.slice(5),
    incomingAmount: Math.round(day.activeWallets * 1.85),
    cyclePayouts: Math.round(day.walletsConnected * 1.08),
  }));

  const funnel = [
    { stage: "Сайт", value: siteOnline },
    { stage: "Кабинет", value: cabinetOnline },
    { stage: "Кошелёк", value: walletConnects },
    { stage: "Депозит", value: depositStarts },
  ];

  const conversion = [
    { period: "site->cabinet", rate: siteOnline ? Number(((cabinetOnline / siteOnline) * 100).toFixed(1)) : 0 },
    { period: "cabinet->wallet", rate: cabinetOnline ? Number(((walletConnects / cabinetOnline) * 100).toFixed(1)) : 0 },
    { period: "wallet->deposit", rate: walletConnects ? Number(((depositStarts / walletConnects) * 100).toFixed(1)) : 0 },
  ];
  const weakestStep = [...conversion].sort((left, right) => left.rate - right.rate)[0];

  return {
    summary: {
      title: `Сейчас на сайте ${siteOnline}, в кабинете ${cabinetOnline}`,
      description: `Живой поток идёт из ${countries[0]?.country || "основной страны"}, а до старта депозита доходит ${depositStarts} пользователей. Самый слабый шаг сейчас: ${weakestStep?.period || "—"}.`,
      bullets: [
        `Сессии за день: ${sessionsToday}`,
        `Авторизованы сегодня: ${authorizedToday}`,
        `Топ страна онлайн: ${countries[0]?.country || "—"} (${countries[0]?.siteUsers || 0})`,
        `За период: ${totalRegistrations} регистраций / ${totalWalletConnects} wallet connect / ${totalCycleActivations} активаций`,
      ],
    },
    metrics: [
      { title: "Регистрации сегодня", value: registrationsToday, icon: "users", statusLabel: "today", description: "Новые регистрации за день." },
      { title: "Подключили кошелёк", value: walletConnectsToday, icon: "connected", statusLabel: registrationsToday ? `${Math.round((walletConnectsToday / registrationsToday) * 100)}%` : "0%", description: "Из сегодняшних регистраций." },
      { title: "Активировали цикл", value: cycleActivationsToday, icon: "calendar", statusLabel: walletConnectsToday ? `${Math.round((cycleActivationsToday / walletConnectsToday) * 100)}%` : "0%", description: "Дошли до активации цикла." },
      { title: "На сайте сейчас", value: siteOnline, icon: "users", statusLabel: "live", description: "Все посетители на сайте." },
      { title: "В кабинете сейчас", value: cabinetOnline, icon: "connected", statusLabel: "live", description: "Пользователи в личном кабинете." },
      { title: "Сессии за день", value: sessionsToday, icon: "transactions", statusLabel: "today", description: "Все сессии за текущий день." },
      { title: "Авторизованы сегодня", value: authorizedToday, icon: "fact", statusLabel: "auth", description: "Прошли в личный кабинет." },
      { title: "Подключили кошелёк", value: walletConnects, icon: "claim", statusLabel: "wallet", description: "Wallet connect за день." },
      { title: "Начали депозит", value: depositStarts, icon: "inflow", statusLabel: siteOnline ? `${Math.round((depositStarts / siteOnline) * 100)}%` : "0%", description: "Дошли до старта депозита." },
      { title: "Новые визиты", value: newVisitors, icon: "users", statusLabel: `${Math.round((newVisitors / Math.max(siteOnline, 1)) * 100)}%`, description: "Новый живой поток." },
      { title: "Повторные визиты", value: repeatVisitors, icon: "calendar", statusLabel: `${Math.round((repeatVisitors / Math.max(siteOnline, 1)) * 100)}%`, description: "Возвращающиеся пользователи." },
      { title: "Вовлечённые", value: engagedUsers, icon: "active-wallet", statusLabel: `${Math.round((engagedUsers / Math.max(siteOnline, 1)) * 100)}%`, description: "Провели время и двигаются по воронке." },
      { title: "Средняя сессия", value: avgSessionMinutes, icon: "average", statusLabel: "мин", description: "Средняя длина живой сессии." },
    ],
    countries,
    sources,
    funnel,
    conversion,
    qualityRows: countries.map((item) => ({
      country: item.country,
      newVisitors: item.newVisitors,
      repeatVisitors: item.repeatVisitors,
      engagementRate: item.engagementRate,
      depositConversion: item.depositConversion,
    })),
    lifecycleRows,
    lifecycleTotals: [
      {
        period: "Выбранный период",
        registrations: totalRegistrations,
        walletConnects: totalWalletConnects,
        cycleActivations: totalCycleActivations,
        walletConnectRate: totalRegistrations ? (totalWalletConnects / totalRegistrations) * 100 : 0,
        cycleActivationRate: totalWalletConnects ? (totalCycleActivations / totalWalletConnects) * 100 : 0,
      },
    ],
    sourceQualityRows: sources.map((item) => ({
      source: item.source,
      newVisitors: item.newVisitors,
      repeatVisitors: item.repeatVisitors,
      bounceRate: item.bounceRate,
      walletConnects: item.walletConnects,
      depositStarts: item.depositStarts,
      depositConversion: item.depositConversion,
      qualityScore: item.qualityScore,
    })),
    timeline,
    countryShare: countries.map((item) => ({
      source: item.country,
      incomingAmount: item.siteUsers,
    })),
  };
}

function buildProductsTab(records, futureRecords) {
  const sourceRows = groupBySource(records).map((item) => {
    const futureByProduct = futureRecords.filter((record) => record.source === item.source);
    return {
      source: item.source,
      inflow: item.incomingAmount,
      orders: item.walletsConnected,
      claimable: item.claimableNow,
      accrued: item.accruedLater,
      obligations30d: sumField(futureByProduct.slice(0, 30), "cyclePayouts"),
      riskDate: futureByProduct.find((record) => record.projectedGap > 0)?.date || "без риска",
      pressure: sumField(futureByProduct.slice(0, 30), "projectedGap"),
    };
  });

  const tariffRows = analyticsMockData.tariffs.map((tariff) => {
    const tariffRecords = records.filter((record) => record.tariffId === tariff.id);
    const tariffFuture = futureRecords.filter((record) => record.tariffId === tariff.id);
    const inflow = sumField(tariffRecords, "incomingAmount");
    const claimable = sumField(tariffRecords, "claimableNow");
    const accrued = sumField(tariffRecords, "accruedLater");
    const obligations30d = sumField(tariffFuture.slice(0, 30), "cyclePayouts");
    const pressure = sumField(tariffFuture.slice(0, 30), "projectedGap");

    return {
      tariff: tariff.name,
      source: tariff.source,
      shortLabel: tariff.shortLabel,
      limit: tariff.maxDepositLabel,
      cycle: tariff.durationLabel,
      mode: tariff.returnMode,
      deltaPercent: tariff.deltaPercent,
      dailyPercent: tariff.dailyPercent,
      inflow,
      orders: sumField(tariffRecords, "walletsConnected"),
      claimable,
      accrued,
      obligations30d,
      pressure,
      riskDate: tariffFuture.find((record) => record.projectedGap > 0)?.date || "без риска",
    };
  });

  return {
    metrics: sourceRows.map((row) => ({
      title: row.source,
      value: row.obligations30d,
      variant: "currency",
      icon: "calendar",
      statusLabel: row.riskDate === "без риска" ? "спокойно" : row.riskDate,
      description: `Давление 30д, gap ${row.pressure}.`,
      tone: row.pressure > 0 ? "danger" : "success",
      pulse: row.pressure > 0,
    })),
    rows: tariffRows,
  };
}

function buildLeadersTab(records) {
  const totalInflow = sumField(records, "incomingAmount");
  const totalWallets = sumField(records, "walletsConnected");
  const totalClaimable = sumField(records, "claimableNow");

  const byParticipation = LEADER_PROFILES.map((profile, index) => {
    const investment = Math.round(totalInflow * (0.12 - index * 0.014));
    const obligations = Math.round(investment * (0.34 + index * 0.03));
    const referralIncome = Math.round(investment * (0.082 - index * 0.007));
    const netContribution = Math.max(0, investment - obligations - referralIncome);
    const reinvestRate = 52 - index * 5;
    const retentionRate = 74 - index * 4;
    const claimRate = 39 + index * 3;

    return {
      name: profile.name,
      country: profile.country,
      investment,
      cycles: 34 - index * 4,
      activeDays: 29 - index * 3,
      obligations,
      referralIncome,
      netContribution,
      reinvestRate,
      retentionRate,
      claimRate,
    };
  });

  const byAttraction = LEADER_PROFILES.map((profile, index) => {
    const inflow = Math.round(totalInflow * (0.11 - index * 0.012));
    const referralLoad = Math.round(totalInflow * (0.014 - index * 0.0013));
    const invited = Math.round(totalWallets * (0.1 - index * 0.011));
    const activeInvited = Math.round(totalWallets * (0.072 - index * 0.009));
    const depositingInvited = Math.round(activeInvited * (0.64 - index * 0.04));
    const leaderDependency = 49 - index * 6;
    const baseRetention = 68 - index * 4;
    const reinvestRate = 33 + index * 3;
    const claimPressure = 22 + index * 4;
    const netContribution = Math.max(0, inflow - referralLoad - Math.round(totalClaimable * (0.018 - index * 0.0017)));

    return {
      name: profile.name,
      country: profile.country,
      invited,
      activeInvited,
      depositingInvited,
      inflow,
      referralLoad,
      leaderDependency,
      baseRetention,
      reinvestRate,
      claimPressure,
      netContribution,
    };
  });

  const healthiestLeader = [...byParticipation].sort((left, right) => right.netContribution - left.netContribution)[0];
  const highestDependencyLeader = [...byAttraction].sort((left, right) => right.leaderDependency - left.leaderDependency)[0];
  const avgLeaderReinvest = byParticipation.length ? sumField(byParticipation, "reinvestRate") / byParticipation.length : 0;
  const avgLeaderRetention = byAttraction.length ? sumField(byAttraction, "baseRetention") / byAttraction.length : 0;

  return {
    summary: {
      title: `${byParticipation[0]?.name || "Лидер"} держит максимальный объём участия`,
      description: `${byAttraction[0]?.name || "Лидер"} сейчас ведёт по привлечённым деньгам и активным приглашённым, но самым здоровым по net contribution выглядит ${healthiestLeader?.name || "другой лидер"}.`,
      bullets: [
        `Топ по участию: ${byParticipation[0]?.investment || 0}`,
        `Топ по привлечению: ${byAttraction[0]?.inflow || 0}`,
        `Средний reinvest по лидерам: ${avgLeaderReinvest.toFixed(1)}%`,
      ],
    },
    metrics: [
      { title: "Топ по участию", value: byParticipation[0]?.investment || 0, variant: "currency", icon: "wallet", statusLabel: byParticipation[0]?.name || "—", description: "Максимальный объём инвестиций." },
      { title: "Топ по циклам", value: byParticipation[0]?.cycles || 0, icon: "calendar", statusLabel: byParticipation[0]?.name || "—", description: "Самое активное участие." },
      { title: "Топ по привлечению", value: byAttraction[0]?.inflow || 0, variant: "currency", icon: "inflow", statusLabel: byAttraction[0]?.name || "—", description: "Максимум привлечённых денег." },
      { title: "Топ по реферальной нагрузке", value: byAttraction[0]?.referralLoad || 0, variant: "currency", icon: "network", statusLabel: byAttraction[0]?.name || "—", description: "Максимальная нагрузка по referral." },
      { title: "Лучший net contribution", value: healthiestLeader?.netContribution || 0, variant: "currency", icon: "fact", statusLabel: healthiestLeader?.name || "—", description: "Самый полезный лидер для системы." },
      { title: "Риск зависимости", value: highestDependencyLeader?.leaderDependency || 0, variant: "percent", icon: "risk", statusLabel: highestDependencyLeader?.name || "—", description: "Максимальная зависимость от одного лидера." },
      { title: "Средний reinvest", value: avgLeaderReinvest, variant: "percent", icon: "claim", statusLabel: "leaders", description: "Средний реинвест у сильных лидеров." },
      { title: "Среднее удержание базы", value: avgLeaderRetention, variant: "percent", icon: "active-wallet", statusLabel: "leaders", description: "Среднее удержание приглашённой базы." },
    ],
    participation: byParticipation,
    attraction: byAttraction,
    participationQuality: byParticipation.map((item) => ({
      name: item.name,
      country: item.country,
      obligations: item.obligations,
      referralIncome: item.referralIncome,
      netContribution: item.netContribution,
      reinvestRate: item.reinvestRate,
      retentionRate: item.retentionRate,
      claimRate: item.claimRate,
    })),
    attractionQuality: byAttraction.map((item) => ({
      name: item.name,
      country: item.country,
      activeInvited: item.activeInvited,
      depositingInvited: item.depositingInvited,
      leaderDependency: item.leaderDependency,
      baseRetention: item.baseRetention,
      reinvestRate: item.reinvestRate,
      claimPressure: item.claimPressure,
      netContribution: item.netContribution,
    })),
    participationShare: byParticipation.map((item) => ({
      source: item.name,
      incomingAmount: item.investment,
    })),
    attractionShare: byAttraction.map((item) => ({
      source: item.name,
      incomingAmount: item.inflow,
    })),
  };
}

function buildGeographyTab(records, futureRecords) {
  const totalUsers = sumField(records, "investors");
  const totalWallets = sumField(records, "walletsConnected");
  const totalInflow = sumField(records, "incomingAmount");
  const totalObligations = sumField(futureRecords.slice(0, 30), "cyclePayouts");
  const totalDeposits = sumField(records, "incomingAmount");

  const rows = COUNTRY_PROFILES.map((profile, index) => ({
    country: profile.country,
    city: profile.city,
    users: Math.round(totalUsers * profile.share),
    wallets: Math.round(totalWallets * profile.share),
    inflow: Math.round(totalInflow * profile.share),
    obligations: Math.round(totalObligations * profile.share * (1 + index * 0.03)),
    deposits: Math.round(totalDeposits * profile.share),
    activeUsers: Math.round(totalUsers * profile.share * (0.69 - index * 0.03)),
    newUsers: Math.round(totalUsers * profile.share * (0.24 - index * 0.015)),
    repeatUsers: Math.round(totalUsers * profile.share * (0.37 + index * 0.018)),
    reinvestUsers: Math.round(totalUsers * profile.share * (0.18 + index * 0.018)),
    payingUsers: Math.round(totalUsers * profile.share * (0.58 - index * 0.015)),
    claimUsers: Math.round(totalUsers * profile.share * (0.33 + index * 0.013)),
    riskScore: 24 + index * 7,
    growthScore: 79 - index * 4,
  })).map((item) => {
    const activeRate = item.users ? (item.activeUsers / item.users) * 100 : 0;
    const repeatRate = item.users ? (item.repeatUsers / item.users) * 100 : 0;
    const reinvestRate = item.users ? (item.reinvestUsers / item.users) * 100 : 0;
    const payingRate = item.users ? (item.payingUsers / item.users) * 100 : 0;
    const claimRate = item.users ? (item.claimUsers / item.users) * 100 : 0;
    const obligationLoad = item.inflow ? (item.obligations / item.inflow) * 100 : 0;

    return {
      ...item,
      activeRate,
      repeatRate,
      reinvestRate,
      payingRate,
      claimRate,
      obligationLoad,
    };
  }).sort((left, right) => right.inflow - left.inflow);

  const topGrowthCountry = [...rows].sort((left, right) => right.growthScore - left.growthScore)[0];
  const topRiskCountry = [...rows].sort((left, right) => right.riskScore - left.riskScore)[0];
  const avgReinvestRate = rows.length ? sumField(rows, "reinvestRate") / rows.length : 0;

  return {
    summary: {
      title: `${rows[0]?.country || "Страна"} сейчас лидирует по входящему потоку`,
      description: `${rows[0]?.country || "Страна"} даёт максимальный inflow, ${topGrowthCountry?.country || "другая страна"} показывает лучший growth profile, а ${topRiskCountry?.country || "ещё одна страна"} уже выглядит самой рискованной по нагрузке.`,
      bullets: [
        `Топ inflow: ${rows[0]?.inflow || 0}`,
        `Топ obligations: ${rows[0]?.obligations || 0}`,
        `Средний reinvest rate: ${avgReinvestRate.toFixed(1)}%`,
      ],
    },
    metrics: [
      { title: "Активные страны", value: rows.length, icon: "top-network", statusLabel: "geo", description: "Страны в текущем срезе." },
      { title: "Топ страна по притоку", value: rows[0]?.country || "—", variant: "text", icon: "inflow", statusLabel: formatShortMoney(rows[0]?.inflow || 0), description: "Лидер по входящему потоку." },
      { title: "Топ страна по users", value: rows[0]?.users || 0, icon: "users", statusLabel: rows[0]?.country || "—", description: "Лидер по числу участников." },
      { title: "Топ страна по obligations", value: rows[0]?.obligations || 0, variant: "currency", icon: "calendar", statusLabel: rows[0]?.country || "—", description: "Лидер по будущей нагрузке." },
      { title: "Топ growth profile", value: topGrowthCountry?.growthScore || 0, variant: "percent", icon: "active-wallet", statusLabel: topGrowthCountry?.country || "—", description: "Лучшая страна по качеству роста." },
      { title: "Топ risk country", value: topRiskCountry?.riskScore || 0, variant: "percent", icon: "risk", statusLabel: topRiskCountry?.country || "—", description: "Страна с самым тяжёлым risk profile." },
      { title: "Средний reinvest", value: avgReinvestRate, variant: "percent", icon: "wallet", statusLabel: "geo", description: "Средний реинвест по странам." },
      { title: "Средняя активность", value: rows.length ? sumField(rows, "activeRate") / rows.length : 0, variant: "percent", icon: "connected", statusLabel: "geo", description: "Средняя активность базы по странам." },
    ],
    rows,
    qualityRows: rows.map((item) => ({
      country: item.country,
      activeUsers: item.activeUsers,
      activeRate: item.activeRate,
      newUsers: item.newUsers,
      repeatUsers: item.repeatUsers,
      repeatRate: item.repeatRate,
      reinvestUsers: item.reinvestUsers,
      reinvestRate: item.reinvestRate,
      payingRate: item.payingRate,
    })),
    riskRows: rows.map((item) => ({
      country: item.country,
      obligations: item.obligations,
      obligationLoad: item.obligationLoad,
      claimRate: item.claimRate,
      riskScore: item.riskScore,
      growthScore: item.growthScore,
    })),
    inflowShare: rows.map((item) => ({
      source: item.country,
      incomingAmount: item.inflow,
    })),
    obligationsShare: rows.map((item) => ({
      source: item.country,
      incomingAmount: item.obligations,
    })),
  };
}

function buildPartnerTab(records, futureRecords) {
  const totalInflow = sumField(records, "incomingAmount");
  const totalReferral = sumField(futureRecords.slice(0, 30), "referralPayouts");
  const totalObligations = sumField(futureRecords.slice(0, 30), "cyclePayouts");

  const rows = PARTNER_BRANCHES.map((branch, index) => ({
    leader: `Leader ${index + 1}`,
    branch,
    inflow: Math.round(totalInflow * (0.18 - index * 0.022)),
    invited: 160 - index * 18,
    activeInvited: 112 - index * 14,
    depositingInvited: 74 - index * 10,
    referralAccrual: Math.round(totalReferral * (0.2 - index * 0.024)),
    payout: Math.round(totalReferral * (0.16 - index * 0.02)),
    obligations: Math.round(totalObligations * (0.17 - index * 0.019)),
    creatorFlow: Math.round(totalInflow * (0.043 - index * 0.004)),
    leaderDependency: 51 - index * 6,
    depthScore: 76 - index * 7,
    conversionToDeposit: 46 - index * 4,
    structuralLeak: 13 + index * 3,
  })).map((item) => {
    const referralRate = item.inflow ? (item.referralAccrual / item.inflow) * 100 : 0;
    const payoutRate = item.referralAccrual ? (item.payout / item.referralAccrual) * 100 : 0;
    const obligationRate = item.inflow ? (item.obligations / item.inflow) * 100 : 0;
    const netBranch = Math.max(0, item.inflow - item.referralAccrual - item.obligations);

    return {
      ...item,
      referralRate,
      payoutRate,
      obligationRate,
      netBranch,
    };
  });

  const topBranch = rows[0];
  const highestLeakBranch = [...rows].sort((left, right) => right.structuralLeak - left.structuralLeak)[0];
  const highestDependencyBranch = [...rows].sort((left, right) => right.leaderDependency - left.leaderDependency)[0];
  const totalActiveInvited = sumField(rows, "activeInvited");
  const totalDepositingInvited = sumField(rows, "depositingInvited");
  const avgReferralRate = rows.length ? sumField(rows, "referralRate") / rows.length : 0;
  const avgLeaderDependency = rows.length ? sumField(rows, "leaderDependency") / rows.length : 0;

  return {
    summary: {
      title: `${topBranch?.branch || "Ветка"} сейчас лидирует по притоку`,
      description: `${topBranch?.branch || "Ветка"} даёт максимум новых денег, но ${highestLeakBranch?.branch || "другая ветка"} уже показывает самый сильный structural leak. Средняя зависимость от лидера по веткам ${avgLeaderDependency.toFixed(1)}%.`,
      bullets: [
        `Начислено партнёрам: ${sumField(rows, "referralAccrual")}`,
        `Выплачено партнёрам: ${sumField(rows, "payout")}`,
        `Топ ветка: ${topBranch?.branch || "—"}`,
      ],
    },
    metrics: [
      { title: "Начислено партнёрам", value: sumField(rows, "referralAccrual"), variant: "currency", icon: "network", statusLabel: "30д", description: "Начислено по веткам." },
      { title: "Выплачено партнёрам", value: sumField(rows, "payout"), variant: "currency", icon: "claim", statusLabel: "30д", description: "Фактически ушло." },
      { title: "Топ ветка по притоку", value: topBranch?.branch || "—", variant: "text", icon: "inflow", statusLabel: formatShortMoney(topBranch?.inflow || 0), description: "Лидер по новым деньгам." },
      { title: "Топ ветка по нагрузке", value: topBranch?.referralAccrual || 0, variant: "currency", icon: "risk", statusLabel: topBranch?.branch || "—", description: "Лидер по referral burden." },
      { title: "Активные приглашённые", value: totalActiveInvited, icon: "users", statusLabel: `${totalDepositingInvited}`, description: "Активные и дошедшие до депозита." },
      { title: "Средний referral rate", value: avgReferralRate, variant: "percent", icon: "fee", statusLabel: "ветки", description: "Средняя цена ветки по рефералке." },
      { title: "Макс. зависимость от лидера", value: highestDependencyBranch?.leaderDependency || 0, variant: "percent", icon: "top-network", statusLabel: highestDependencyBranch?.branch || "—", description: "Риск концентрации на одном лидере." },
      { title: "Худший structural leak", value: highestLeakBranch?.structuralLeak || 0, variant: "percent", icon: "failed", statusLabel: highestLeakBranch?.branch || "—", description: "Где структура теряет эффективность." },
    ],
    rows,
    qualityRows: rows.map((item) => ({
      branch: item.branch,
      activeInvited: item.activeInvited,
      depositingInvited: item.depositingInvited,
      conversionToDeposit: item.conversionToDeposit,
      leaderDependency: item.leaderDependency,
      depthScore: item.depthScore,
      structuralLeak: item.structuralLeak,
    })),
    financeRows: rows.map((item) => ({
      branch: item.branch,
      inflow: item.inflow,
      obligations: item.obligations,
      referralAccrual: item.referralAccrual,
      referralRate: item.referralRate,
      payout: item.payout,
      payoutRate: item.payoutRate,
      netBranch: item.netBranch,
    })),
    inflowShare: rows.map((item) => ({
      source: item.branch,
      incomingAmount: item.inflow,
    })),
    referralShare: rows.map((item) => ({
      source: item.branch,
      incomingAmount: item.referralAccrual,
    })),
  };
}

function buildWalletsTab(records, futureRecords) {
  const totalVolume = sumField(records, "incomingAmount");
  const totalObligations = sumField(futureRecords.slice(0, 30), "cyclePayouts");
  const totalClaimable = sumField(records, "claimableNow");
  const totalAccrued = sumField(records, "accruedLater");

  const rows = [
    { wallet: "0xA91...7D1", role: "user", inflow: Math.round(totalVolume * 0.14), obligations: Math.round(totalObligations * 0.16), network: "BNB", ownerType: "Инвестор" },
    { wallet: "0xB52...1F8", role: "creator", inflow: Math.round(totalVolume * 0.11), obligations: Math.round(totalObligations * 0.12), network: "Ethereum", ownerType: "Creator" },
    { wallet: "0xC84...9A0", role: "treasury", inflow: Math.round(totalVolume * 0.09), obligations: Math.round(totalObligations * 0.09), network: "BNB", ownerType: "Treasury" },
    { wallet: "0xD17...2E4", role: "platform", inflow: Math.round(totalVolume * 0.07), obligations: Math.round(totalObligations * 0.08), network: "Polygon", ownerType: "Platform" },
  ].map((item, index) => {
    const claimable = Math.round(totalClaimable * (0.17 - index * 0.026));
    const accrued = Math.round(totalAccrued * (0.16 - index * 0.024));
    const reinvestFlow = Math.round(item.inflow * (0.21 + index * 0.03));
    const claimPressure = item.inflow ? (claimable / item.inflow) * 100 : 0;
    const obligationLoad = item.inflow ? (item.obligations / item.inflow) * 100 : 0;
    const riskScore = 36 + index * 11;
    const activityScore = 82 - index * 8;
    const netContribution = Math.max(0, item.inflow - item.obligations - claimable * 0.12);
    const concentrationShare = 22 - index * 3;

    return {
      ...item,
      claimable,
      accrued,
      reinvestFlow,
      claimPressure,
      obligationLoad,
      riskScore,
      activityScore,
      netContribution,
      concentrationShare,
    };
  });

  const highestRiskWallet = [...rows].sort((left, right) => right.riskScore - left.riskScore)[0];
  const largestWallet = [...rows].sort((left, right) => right.inflow - left.inflow)[0];
  const healthiestWallet = [...rows].sort((left, right) => right.netContribution - left.netContribution)[0];
  const avgClaimPressure = rows.length ? sumField(rows, "claimPressure") / rows.length : 0;
  const avgActivityScore = rows.length ? sumField(rows, "activityScore") / rows.length : 0;

  return {
    summary: {
      title: `${largestWallet?.wallet || "Кошелёк"} сейчас держит главный объём`,
      description: `Верхние кошельки формируют большую часть притока и обязательств, а ${highestRiskWallet?.wallet || "один из адресов"} уже выглядит самым рискованным по нагрузке и claim pressure.`,
      bullets: [
        `Top-5 концентрация: 58%`,
        `Лидер по inflow: ${largestWallet?.inflow || 0}`,
        `Средний claim pressure: ${avgClaimPressure.toFixed(1)}%`,
      ],
    },
    metrics: [
      { title: "Top-5 концентрация", value: 58, variant: "percent", icon: "risk", statusLabel: "risk", description: "Доля top-кошельков в объёме." },
      { title: "Лидер по inflow", value: largestWallet?.inflow || 0, variant: "currency", icon: "inflow", statusLabel: largestWallet?.wallet || "—", description: "Самый крупный кошелёк по притоку." },
      { title: "Лидер по obligations", value: largestWallet?.obligations || 0, variant: "currency", icon: "calendar", statusLabel: largestWallet?.wallet || "—", description: "Самый крупный кошелёк по нагрузке." },
      { title: "Creator / Platform flow", value: Math.round(rows[1].inflow + rows[3].inflow), variant: "currency", icon: "wallet", statusLabel: "flow", description: "Поток creator и platform wallets." },
      { title: "Самый рискованный кошелёк", value: highestRiskWallet?.riskScore || 0, variant: "percent", icon: "failed", statusLabel: highestRiskWallet?.wallet || "—", description: "Максимальный risk profile." },
      { title: "Средний claim pressure", value: avgClaimPressure, variant: "percent", icon: "claim", statusLabel: "wallets", description: "Средняя нагрузка по claimable." },
      { title: "Средняя активность", value: avgActivityScore, variant: "percent", icon: "active-wallet", statusLabel: "wallets", description: "Насколько кошельки живые." },
      { title: "Лучший net contribution", value: healthiestWallet?.netContribution || 0, variant: "currency", icon: "fact", statusLabel: healthiestWallet?.wallet || "—", description: "Самый полезный кошелёк для системы." },
    ],
    rows,
    qualityRows: rows.map((item) => ({
      wallet: item.wallet,
      ownerType: item.ownerType,
      activityScore: item.activityScore,
      claimable: item.claimable,
      accrued: item.accrued,
      claimPressure: item.claimPressure,
      reinvestFlow: item.reinvestFlow,
    })),
    riskRows: rows.map((item) => ({
      wallet: item.wallet,
      role: item.role,
      concentrationShare: item.concentrationShare,
      obligations: item.obligations,
      obligationLoad: item.obligationLoad,
      riskScore: item.riskScore,
      netContribution: item.netContribution,
    })),
    inflowShare: rows.map((item) => ({
      source: item.wallet,
      incomingAmount: item.inflow,
    })),
    obligationsShare: rows.map((item) => ({
      source: item.wallet,
      incomingAmount: item.obligations,
    })),
  };
}

function buildReinvestTab(records) {
  const totalUsers = sumField(records, "investors");
  const totalClaimable = sumField(records, "claimableNow");
  const totalInflow = sumField(records, "incomingAmount");
  const reinvestUsers = Math.round(totalUsers * 0.37);
  const repeatDepositors = Math.round(totalUsers * 0.29);
  const reinvestedCapital = Math.round(totalClaimable * 0.41);
  const capitalRate = totalClaimable ? (reinvestedCapital / totalClaimable) * 100 : 0;
  const userRate = totalUsers ? (reinvestUsers / totalUsers) * 100 : 0;
  const repeatDepositRate = totalUsers ? (repeatDepositors / totalUsers) * 100 : 0;
  const averageDelay = 4.6;

  const byProduct = groupBySource(records).map((item, index) => {
    const claimedCapital = item.claimableNow;
    const productReinvest = Math.round(claimedCapital * (0.38 + index * 0.06));
    const productUsers = Math.round(item.investors * (0.33 + index * 0.05));

    return {
      source: item.source,
      claimedCapital,
      reinvestedCapital: productReinvest,
      capitalRate: claimedCapital ? (productReinvest / claimedCapital) * 100 : 0,
      claimUsers: item.investors,
      reinvestUsers: productUsers,
      userRate: item.investors ? (productUsers / item.investors) * 100 : 0,
    };
  });

  const byCountry = COUNTRY_PROFILES.map((profile, index) => {
    const claimUsers = Math.round(totalUsers * profile.share);
    const countryReinvestUsers = Math.round(claimUsers * (0.32 + index * 0.02));
    const claimedCapital = Math.round(totalClaimable * profile.share);
    const countryReinvestCapital = Math.round(claimedCapital * (0.36 + index * 0.018));

    return {
      country: profile.country,
      claimUsers,
      reinvestUsers: countryReinvestUsers,
      userRate: claimUsers ? (countryReinvestUsers / claimUsers) * 100 : 0,
      claimedCapital,
      reinvestedCapital: countryReinvestCapital,
      capitalRate: claimedCapital ? (countryReinvestCapital / claimedCapital) * 100 : 0,
    };
  }).sort((left, right) => right.reinvestedCapital - left.reinvestedCapital);

  const timeline = [
    { period: "1д", rate: 11.5 },
    { period: "3д", rate: 23.8 },
    { period: "7д", rate: 37.2 },
    { period: "14д", rate: 44.9 },
    { period: "30д", rate: 52.1 },
  ];

  return {
    summary: {
      title: `${reinvestUsers} пользователей уже реинвестируют`,
      description: `${Math.round(capitalRate)}% claimable-капитала возвращается в систему, а повторный депозит делает ${Math.round(repeatDepositRate)}% базы.`,
      bullets: [
        `Reinvest users rate: ${userRate.toFixed(1)}%`,
        `Reinvest capital rate: ${capitalRate.toFixed(1)}%`,
        `Среднее время до реинвеста: ${averageDelay} дня`,
      ],
    },
    metrics: [
      { title: "Reinvest users rate", value: userRate, variant: "percent", icon: "users", statusLabel: `${reinvestUsers}`, description: "Доля пользователей с реинвестом." },
      { title: "Reinvest capital rate", value: capitalRate, variant: "percent", icon: "inflow", statusLabel: formatShortMoney(reinvestedCapital), description: "Доля капитала, вернувшегося в систему." },
      { title: "Repeat deposit rate", value: repeatDepositRate, variant: "percent", icon: "calendar", statusLabel: `${repeatDepositors}`, description: "Повторный депозит после участия." },
      { title: "Claim -> reinvest", value: averageDelay, icon: "accrued", statusLabel: "дня", description: "Среднее время до нового входа." },
    ],
    byProduct,
    byCountry,
    timeline,
    productShare: byProduct.map((item) => ({
      source: item.source,
      incomingAmount: item.reinvestedCapital,
    })),
  };
}

function buildBaseCompositionTab(records, futureRecords) {
  const totalUsers = sumField(records, "investors");
  const totalInflow = sumField(records, "incomingAmount");
  const totalObligations = sumField(futureRecords.slice(0, 30), "cyclePayouts");
  const totalReferral = sumField(futureRecords.slice(0, 30), "referralPayouts");
  const totalPlatformFee = sumField(futureRecords.slice(0, 30), "platformFee");

  const segments = [
    {
      segment: "Только инвесторы",
      users: Math.round(totalUsers * 0.46),
      inflow: Math.round(totalInflow * 0.42),
      obligations: Math.round(totalObligations * 0.39),
      referralShare: Math.round(totalReferral * 0.08),
      repeatRate: 34.2,
      claimPressure: 31.4,
    },
    {
      segment: "Только партнёры",
      users: Math.round(totalUsers * 0.18),
      inflow: Math.round(totalInflow * 0.09),
      obligations: Math.round(totalObligations * 0.11),
      referralShare: Math.round(totalReferral * 0.47),
      repeatRate: 12.6,
      claimPressure: 18.8,
    },
    {
      segment: "Инвесторы + партнёры",
      users: Math.round(totalUsers * 0.36),
      inflow: Math.round(totalInflow * 0.49),
      obligations: Math.round(totalObligations * 0.5),
      referralShare: Math.round(totalReferral * 0.45),
      repeatRate: 58.9,
      claimPressure: 49.3,
    },
  ].map((item) => {
    const share = totalUsers ? (item.users / totalUsers) * 100 : 0;
    const avgDeposit = item.users ? item.inflow / item.users : 0;
    const platformFeeShare = totalPlatformFee ? (item.inflow / totalInflow) * totalPlatformFee : 0;
    const netContribution = Math.max(0, item.inflow - item.obligations - item.referralShare - platformFeeShare);
    const activeUsers = Math.round(item.users * (0.68 + share / 400));
    const sleepingUsers = Math.max(0, item.users - activeUsers);
    const newUsers = Math.round(item.users * (0.18 + share / 900));
    const repeatUsers = Math.round(item.users * (item.repeatRate / 100));
    const payingUsers = Math.round(item.users * (item.segment === "Только партнёры" ? 0.32 : 0.74));
    const nonPayingUsers = Math.max(0, item.users - payingUsers);
    const claimUsers = Math.round(item.users * (0.41 + share / 500));
    const noClaimUsers = Math.max(0, item.users - claimUsers);
    const referralIncomeUsers = Math.round(item.users * (item.segment === "Только инвесторы" ? 0.11 : item.segment === "Только партнёры" ? 0.79 : 0.63));
    const noReferralIncomeUsers = Math.max(0, item.users - referralIncomeUsers);
    const reinvestUsers = Math.round(repeatUsers * (item.segment === "Только партнёры" ? 0.21 : item.segment === "Только инвесторы" ? 0.38 : 0.57));
    const reactivatedUsers = Math.round(sleepingUsers * (item.segment === "Инвесторы + партнёры" ? 0.33 : item.segment === "Только инвесторы" ? 0.24 : 0.16));
    const churnedUsers = Math.round(sleepingUsers * (item.segment === "Инвесторы + партнёры" ? 0.19 : item.segment === "Только инвесторы" ? 0.27 : 0.34));
    const dormantUsers = Math.max(0, sleepingUsers - reactivatedUsers - churnedUsers);
    const largeUsers = Math.round(item.users * (item.segment === "Инвесторы + партнёры" ? 0.24 : item.segment === "Только инвесторы" ? 0.14 : 0.08));
    const mediumUsers = Math.round(item.users * (item.segment === "Инвесторы + партнёры" ? 0.41 : item.segment === "Только инвесторы" ? 0.37 : 0.29));
    const smallUsers = Math.max(0, item.users - largeUsers - mediumUsers);
    const largeInflow = Math.round(item.inflow * (item.segment === "Инвесторы + партнёры" ? 0.58 : item.segment === "Только инвесторы" ? 0.46 : 0.27));
    const mediumInflow = Math.round(item.inflow * (item.segment === "Инвесторы + партнёры" ? 0.28 : item.segment === "Только инвесторы" ? 0.34 : 0.31));
    const smallInflow = Math.max(0, item.inflow - largeInflow - mediumInflow);
    const mixedRoleConversion = item.segment === "Только инвесторы" ? 8.7 : item.segment === "Только партнёры" ? 6.1 : 100;

    return {
      ...item,
      share,
      avgDeposit,
      netContribution: Math.round(netContribution),
      activeUsers,
      sleepingUsers,
      newUsers,
      repeatUsers,
      payingUsers,
      nonPayingUsers,
      claimUsers,
      noClaimUsers,
      referralIncomeUsers,
      noReferralIncomeUsers,
      reinvestUsers,
      reinvestRate: item.users ? (reinvestUsers / item.users) * 100 : 0,
      reactivatedUsers,
      reactivatedRate: item.users ? (reactivatedUsers / item.users) * 100 : 0,
      churnedUsers,
      churnRate: item.users ? (churnedUsers / item.users) * 100 : 0,
      dormantUsers,
      dormantRate: item.users ? (dormantUsers / item.users) * 100 : 0,
      largeUsers,
      mediumUsers,
      smallUsers,
      largeInflow,
      mediumInflow,
      smallInflow,
      mixedRoleConversion,
    };
  });

  const mixedSegment = segments.find((item) => item.segment === "Инвесторы + партнёры");
  const partnerOnly = segments.find((item) => item.segment === "Только партнёры");
  const totalActiveUsers = sumField(segments, "activeUsers");
  const totalPayingUsers = sumField(segments, "payingUsers");
  const totalClaimUsers = sumField(segments, "claimUsers");
  const totalReferralIncomeUsers = sumField(segments, "referralIncomeUsers");
  const activeBaseRate = totalUsers ? (totalActiveUsers / totalUsers) * 100 : 0;
  const payingBaseRate = totalUsers ? (totalPayingUsers / totalUsers) * 100 : 0;
  const claimBaseRate = totalUsers ? (totalClaimUsers / totalUsers) * 100 : 0;
  const referralIncomeRate = totalUsers ? (totalReferralIncomeUsers / totalUsers) * 100 : 0;

  return {
    summary: {
      title: `${mixedSegment?.segment || "Смешанная роль"} даёт основной объём денег`,
      description: `${mixedSegment?.segment || "Смешанная роль"} сейчас приносит максимум inflow и лучший repeat rate, а ${partnerOnly?.segment || "партнёры"} сильнее завязаны на реферальный контур. По всей базе ${activeBaseRate.toFixed(1)}% активны и ${payingBaseRate.toFixed(1)}% реально платят.`,
      bullets: [
        `Доля смешанной роли: ${mixedSegment ? mixedSegment.share.toFixed(1) : "0"}%`,
        `Top repeat rate: ${mixedSegment ? mixedSegment.repeatRate.toFixed(1) : "0"}%`,
        `Net contribution лидера: ${mixedSegment?.netContribution || 0}`,
      ],
    },
    metrics: [
      { title: "Инвесторы", value: segments[0]?.users || 0, icon: "wallet", statusLabel: `${segments[0]?.share.toFixed(1) || 0}%`, description: "Только инвесторы." },
      { title: "Партнёры", value: segments[1]?.users || 0, icon: "network", statusLabel: `${segments[1]?.share.toFixed(1) || 0}%`, description: "Только партнёры." },
      { title: "Смешанная роль", value: segments[2]?.users || 0, icon: "users", statusLabel: `${segments[2]?.share.toFixed(1) || 0}%`, description: "И инвестор, и партнёр." },
      { title: "Top net contribution", value: mixedSegment?.netContribution || 0, variant: "currency", icon: "inflow", statusLabel: mixedSegment?.segment || "—", description: "Лучший вклад в систему." },
      { title: "Активная база", value: activeBaseRate, variant: "percent", icon: "active-wallet", statusLabel: `${totalActiveUsers}`, description: "Доля активных пользователей." },
      { title: "Платящая база", value: payingBaseRate, variant: "percent", icon: "fact", statusLabel: `${totalPayingUsers}`, description: "Доля пользователей с оплатой." },
      { title: "База с claim", value: claimBaseRate, variant: "percent", icon: "claim", statusLabel: `${totalClaimUsers}`, description: "Доля пользователей с хотя бы одним claim." },
      { title: "База с рефдоходом", value: referralIncomeRate, variant: "percent", icon: "network", statusLabel: `${totalReferralIncomeUsers}`, description: "Доля базы с партнёрским доходом." },
    ],
    rows: segments,
    qualityRows: segments.map((item) => ({
      segment: item.segment,
      activeUsers: item.activeUsers,
      activeRate: item.users ? (item.activeUsers / item.users) * 100 : 0,
      sleepingUsers: item.sleepingUsers,
      newUsers: item.newUsers,
      repeatUsers: item.repeatUsers,
      repeatRate: item.users ? (item.repeatUsers / item.users) * 100 : 0,
      payingUsers: item.payingUsers,
      payingRate: item.users ? (item.payingUsers / item.users) * 100 : 0,
      nonPayingUsers: item.nonPayingUsers,
      claimUsers: item.claimUsers,
      claimRate: item.users ? (item.claimUsers / item.users) * 100 : 0,
      noClaimUsers: item.noClaimUsers,
      referralIncomeUsers: item.referralIncomeUsers,
      referralIncomeRate: item.users ? (item.referralIncomeUsers / item.users) * 100 : 0,
      noReferralIncomeUsers: item.noReferralIncomeUsers,
    })),
    valueTierRows: segments.map((item) => ({
      segment: item.segment,
      largeUsers: item.largeUsers,
      largeShare: item.users ? (item.largeUsers / item.users) * 100 : 0,
      largeInflow: item.largeInflow,
      mediumUsers: item.mediumUsers,
      mediumShare: item.users ? (item.mediumUsers / item.users) * 100 : 0,
      mediumInflow: item.mediumInflow,
      smallUsers: item.smallUsers,
      smallShare: item.users ? (item.smallUsers / item.users) * 100 : 0,
      smallInflow: item.smallInflow,
    })),
    lifecycleRows: segments.map((item) => ({
      segment: item.segment,
      newUsers: item.newUsers,
      repeatUsers: item.repeatUsers,
      repeatRate: item.users ? (item.repeatUsers / item.users) * 100 : 0,
      reinvestUsers: item.reinvestUsers,
      reinvestRate: item.users ? (item.reinvestUsers / item.users) * 100 : 0,
      claimUsers: item.claimUsers,
      mixedRoleConversion: item.mixedRoleConversion,
    })),
    retentionRows: segments.map((item) => ({
      segment: item.segment,
      activeUsers: item.activeUsers,
      sleepingUsers: item.sleepingUsers,
      dormantUsers: item.dormantUsers,
      dormantRate: item.dormantRate,
      reactivatedUsers: item.reactivatedUsers,
      reactivatedRate: item.reactivatedRate,
      churnedUsers: item.churnedUsers,
      churnRate: item.churnRate,
    })),
    shareChart: segments.map((item) => ({
      source: item.segment,
      incomingAmount: item.users,
    })),
    inflowChart: segments.map((item) => ({
      source: item.segment,
      incomingAmount: item.inflow,
    })),
  };
}

function buildInsights(records, futureRecords, kpis, productTable) {
  const groupedFuture = groupFutureByDate(futureRecords);
  const topPressureProduct = findTopPressureProduct(futureRecords);
  const weakestCoverage = groupedFuture.reduce(
    (current, item) => (item.projectedGap > current.projectedGap ? item : current),
    groupedFuture[0] || null,
  );
  const outgoingToday = kpis.outgoingToday || 0;
  const alerts = [
    {
      title: kpis.gapToday > 0 ? `Сегодня нужно добрать ${kpis.gapToday}` : "План на сегодня перекрыт",
      description:
        kpis.gapToday > 0
          ? `Цель дня ${kpis.targetToday}. Хвост недобора ${kpis.carryForwardDeficit}.`
          : "Есть запас к плану. Его можно пустить на ближайшие выплаты.",
    },
    {
      title: `На основной контракт сегодня зашло ${kpis.incomingToday}, вышло ${outgoingToday}`,
      description: `Чистый поток дня ${kpis.contractNetFlowToday || 0}. Здесь сидят и выплаты циклов, и рефералка, поэтому адрес нужно смотреть как единую кассу дня.`,
    },
    {
      title: `Дефицит на 7 дней: ${kpis.deficit7d}`,
      description: `Покрытие окна ${kpis.coverage7d}%. Обязательства на 30 дней: ${kpis.obligations30d}.`,
    },
  ];

  if (weakestCoverage) {
    alerts.push({
      title: `Первая дата риска: ${weakestCoverage.date}`,
      description: `На эту дату прогнозируется разрыв ${weakestCoverage.projectedGap}. Завтрашняя цель: ${kpis.targetTomorrow}.`,
    });
  }

  const recommendations = [
    {
      title: "Что делать сегодня",
      description: `Добрать ${kpis.gapToday > 0 ? kpis.gapToday : 0} и не переносить хвост ${kpis.carryForwardDeficit} на завтра.`,
    },
    {
      title: "Следить за кассой главного контракта",
      description: `На этот же адрес и приходят депозиты, и уходят cycle payouts с рефералкой. Важен не только план, но и чистый поток дня ${kpis.contractNetFlowToday || 0}.`,
    },
    {
      title: "Куда уйдут ближайшие деньги",
      description: `На 7 дней с этого же контура уйдёт: ${kpis.obligations7d} в циклы, ${kpis.referralBurden} в рефералку, ${kpis.platformFee} в комиссию.`,
    },
  ];

  if (topPressureProduct) {
    recommendations.push({
      title: "Где искать причину давления",
      description: `Проверьте ${topPressureProduct.source} и связанные ветки: именно там сейчас главный риск для прогноза.`,
    });
  }

  return {
    alerts,
    recommendations,
  };
}

function buildScenarios(kpis, futureRecords, productTable) {
  const groupedFuture = groupFutureByDate(futureRecords);
  const weakestCoverage = groupedFuture.reduce(
    (current, item) => (item.projectedGap > current.projectedGap ? item : current),
    groupedFuture[0] || null,
  );

  return [
    {
      kicker: "Сегодняшний темп",
      title: "Недобор по входящему потоку",
      status: kpis.gapToday > 0 ? "Активен" : "Под контролем",
      tone: kpis.gapToday > 0 ? "danger" : "success",
      description: "Что будет, если день идёт ниже нужного плана по новым деньгам.",
      signal:
        kpis.gapToday > 0
          ? `До плана не хватает ${kpis.gapToday}.`
          : "Сегодняшний план пока перекрывается, явного недобора нет.",
      action:
        kpis.gapToday > 0
          ? `Добрать минимум ${kpis.gapToday} и не переносить дефицит на завтра.`
          : "Можно удерживать текущий темп и использовать запас для разгрузки ближайших выплат.",
      outcome:
        kpis.gapToday > 0
          ? "Если не добрать сегодня, цель на завтра вырастет, а давление на 7-дневное окно усилится."
          : "Если темп сохранится, завтра система войдёт в день без дополнительного долга по плану.",
    },
    {
      kicker: "Точка риска",
      title: "Ближайшая дата риска",
      status: weakestCoverage ? weakestCoverage.date : "Без риска",
      tone: weakestCoverage && weakestCoverage.projectedGap > 0 ? "danger" : "success",
      description: "Где прогноз впервые показывает нехватку покрытия.",
      signal: weakestCoverage
        ? `На ${weakestCoverage.date} прогнозируется разрыв ${weakestCoverage.projectedGap}.`
        : "В ближайшем окне дата риска пока не сформировалась.",
      action: weakestCoverage
        ? `Нужно заранее закрыть окно до ${weakestCoverage.date} и учесть рефералку с комиссией.`
        : "Поддерживайте текущую структуру и продолжайте следить за покрытием 7 и 30 дней.",
      outcome: weakestCoverage
        ? "Если ничего не менять, именно эта дата станет первой точкой кассового напряжения."
        : "При сохранении темпа система пока не входит в риск-дату.",
    },
  ];
}

function buildExecutiveSummary(kpis, tabsData) {
  const trafficWeakStep = [...(tabsData.traffic?.conversion || [])].sort((left, right) => left.rate - right.rate)[0];
  const topGrowthCountry = [...(tabsData.geography?.riskRows || [])].sort((left, right) => right.growthScore - left.growthScore)[0];
  const topRiskCountry = [...(tabsData.geography?.riskRows || [])].sort((left, right) => right.riskScore - left.riskScore)[0];
  const healthiestLeader = [...(tabsData.leaders?.participationQuality || [])].sort((left, right) => right.netContribution - left.netContribution)[0];
  const weakestBranch = [...(tabsData.partner?.qualityRows || [])].sort((left, right) => right.structuralLeak - left.structuralLeak)[0];
  const highestRiskWallet = [...(tabsData.wallets?.riskRows || [])].sort((left, right) => right.riskScore - left.riskScore)[0];
  const healthy = kpis.gapToday <= 0;
  return {
    kicker: healthy ? "День под контролем" : "Главный вывод дня",
    title: healthy ? "План перекрывается, можно разгружать ближайшие выплаты" : `Сегодня нужно добрать ${kpis.gapToday}`,
    description: healthy
      ? "Текущий темп удерживает день в плюсе и помогает разгружать ближайшее окно."
      : `Цель дня ${kpis.targetToday}. Если не закрыть недобор, завтра цель вырастет до ${kpis.targetTomorrow}.`,
    tone: healthy ? "success" : "danger",
    bullets: [
      `Окно 7 дней: дефицит ${kpis.deficit7d}, покрытие ${kpis.coverage7d}%`,
      `Трафик: слабый шаг ${trafficWeakStep?.period || "—"} (${trafficWeakStep?.rate?.toFixed ? trafficWeakStep.rate.toFixed(1) : trafficWeakStep?.rate || 0}%)`,
      `География: рост ${topGrowthCountry?.country || "—"}, риск ${topRiskCountry?.country || "—"}`,
      `Лидеры: лучший ${healthiestLeader?.name || "—"}, ветка риска ${weakestBranch?.branch || "—"}, кошелёк риска ${highestRiskWallet?.wallet || "—"}`,
    ],
  };
}

function buildDayState(kpis, tabsData, overviewOperations, futureRecords) {
  const todaySnapshot = overviewOperations?.periods?.find((item) => item.period === "Сегодня") || null;
  const repeatMoney = todaySnapshot?.existingMoney || 0;
  const newMoney = todaySnapshot?.newMoney || 0;
  const weakestBranch = [...(tabsData.partner?.qualityRows || [])].sort((left, right) => right.structuralLeak - left.structuralLeak)[0];
  const topPressureProduct = findTopPressureProduct(futureRecords);
  const groupedFuture = groupFutureByDate(futureRecords);
  const weakestCoverage = groupedFuture.reduce(
    (current, item) => (item.projectedGap > current.projectedGap ? item : current),
    groupedFuture[0] || null,
  );

  let supportLine = "День закрывается, но запас слабый";
  if (repeatMoney > newMoney && kpis.claimableNow > 0 && kpis.accruedLater > 0) {
    supportLine = "День держится на повторных деньгах и быстром реинвесте";
  } else if (newMoney > repeatMoney * 1.15) {
    supportLine = "День держится в основном на новом притоке";
  } else if (repeatMoney > 0 && repeatMoney >= newMoney * 0.8) {
    supportLine = "База поддерживает день, но возврат выплат слабеет";
  }

  const cyclePressure = kpis.obligations7d || 0;
  const referralPressure = kpis.referralBurden || 0;
  const platformPressure = kpis.platformFee || 0;
  let pressureLine = "Главное давление: смешанный стресс";
  if (cyclePressure >= referralPressure * 1.25 && cyclePressure >= platformPressure) {
    pressureLine = topPressureProduct?.source === "Daily Flow"
      ? "Главное давление: выплаты Daily Flow"
      : "Главное давление: схлопывания Lockup";
  } else if (referralPressure > cyclePressure && referralPressure >= platformPressure) {
    pressureLine = "Главное давление: партнёрская нагрузка";
  }

  let nextCheckLine = "Проверить окно 72h";
  if ((weakestCoverage?.projectedGap || 0) > 0) {
    nextCheckLine = "Проверить окно 72h";
  } else if (repeatMoney > 0 && repeatMoney >= newMoney * 0.8) {
    nextCheckLine = "Проверить возврат выплат в новые циклы";
  } else if (referralPressure > cyclePressure && weakestBranch) {
    nextCheckLine = `Проверить ветку ${weakestBranch.branch}`;
  } else if (topPressureProduct?.source) {
    nextCheckLine = `Проверить ${topPressureProduct.source}`;
  }

  return [
    {
      label: "Что держит день",
      value: supportLine,
      tone: supportLine.includes("слабо") ? "danger" : supportLine.includes("новом притоке") ? "accent" : "success",
    },
    {
      label: "Что давит на treasury",
      value: pressureLine,
      tone: pressureLine.includes("партнёрская") || pressureLine.includes("mixed") ? "danger" : "accent",
    },
    {
      label: "Что проверить следующим",
      value: nextCheckLine,
      tone: "default",
    },
  ];
}

function buildPriorityActions(kpis, futureRecords, tabsData) {
  const topPressureProduct = findTopPressureProduct(futureRecords);
  const weakestBranch = [...(tabsData.partner?.qualityRows || [])].sort((left, right) => right.structuralLeak - left.structuralLeak)[0];
  const highestRiskWallet = [...(tabsData.wallets?.riskRows || [])].sort((left, right) => right.riskScore - left.riskScore)[0];
  const weakestTrafficStep = [...(tabsData.traffic?.conversion || [])].sort((left, right) => left.rate - right.rate)[0];

  return [
    {
      tone: kpis.gapToday > 0 ? "danger" : "success",
      title: kpis.gapToday > 0 ? `Добрать сегодня ещё ${kpis.gapToday}` : "Удержать темп и не потерять запас",
      description: kpis.gapToday > 0
        ? `Полная цель дня ${kpis.targetToday}. Недобор нельзя переносить на завтра.`
        : "День уже выше базового плана. Запас можно пустить на ближайшие обязательства.",
    },
    {
      tone: "accent",
      title: `Закрыть 7-дневное окно с дефицитом ${kpis.deficit7d}`,
      description: `На горизонте 7 дней: ${kpis.obligations7d} на циклы, ${kpis.referralBurden} на рефералку, ${kpis.platformFee} на комиссию.`,
    },
    {
      tone: topPressureProduct?.projectedGap > 0 ? "danger" : "default",
      title: topPressureProduct ? `Проверить ${topPressureProduct.source}` : "Проверить главный источник давления",
      description: topPressureProduct
        ? `${topPressureProduct.source} сильнее всего влияет на будущий разрыв.`
        : "После накопления данных выделите продукт, который создаёт основной риск.",
    },
    {
      tone: weakestBranch ? "accent" : "default",
      title: weakestBranch ? `Подтянуть ветку ${weakestBranch.branch}` : "Проверить слабую ветку",
      description: weakestBranch
        ? `У неё structural leak ${weakestBranch.structuralLeak}% и зависимость от лидера ${weakestBranch.leaderDependency}%.`
        : "Проверьте, где ветка теряет качество и глубину.",
    },
    {
      tone: highestRiskWallet ? "danger" : "default",
      title: highestRiskWallet ? `Проверить кошелёк ${highestRiskWallet.wallet}` : "Проверить рискованный кошелёк",
      description: highestRiskWallet
        ? `Risk score ${highestRiskWallet.riskScore}%, load ${highestRiskWallet.obligationLoad.toFixed(1)}%.`
        : "Выделите кошелёк с самой тяжёлой концентрацией и нагрузкой.",
    },
    {
      tone: weakestTrafficStep ? "accent" : "default",
      title: weakestTrafficStep ? `Поднять шаг ${weakestTrafficStep.period}` : "Поднять слабый шаг воронки",
      description: weakestTrafficStep
        ? `Сейчас это самый слабый шаг live-воронки: ${weakestTrafficStep.rate.toFixed(1)}% конверсии.`
        : "Проверьте, на каком шаге трафик теряется сильнее всего.",
    },
  ];
}

export async function getAnalyticsDashboard(filters) {
  let backendBundle = null;

  try {
    backendBundle = await fetchAnalyticsBackendBundle(filters);
  } catch (error) {
    console.warn("Analytics backend bundle unavailable, using mock fallback.", error);
  }

  const safeBaseFilters = {
    dateRange: "30d",
    segment: "Все сегменты",
    source: "Все продукты",
  };
  const filteredRecords = filterRecords(filters);
  const fallbackToBase = filteredRecords.length === 0;
  const effectiveFilters = fallbackToBase ? safeBaseFilters : filters;
  const records = fallbackToBase ? filterRecords(safeBaseFilters) : filteredRecords;
  const futureRecords = filterFutureObligations(effectiveFilters);
  const timeseries = groupByDate(records);
  const localKpis = buildKpis(records, futureRecords);
  const kpis = mergeBackendKpis(localKpis, backendBundle);
  const table = buildProductsTable(records);
  const trafficTab = mergeBackendTrafficTab(buildTrafficTab(records), backendBundle);
  const productsTab = buildProductsTab(records, futureRecords);
  const overviewOperations = buildOverviewOperations(records);
  const leadersTab = mergeBackendLeadersTab(buildLeadersTab(records), backendBundle);
  const geographyTab = mergeBackendGeographyTab(buildGeographyTab(records, futureRecords), backendBundle);
  const partnerTab = mergeBackendPartnerTab(buildPartnerTab(records, futureRecords), backendBundle);
  const partnerPressureMetrics = buildOverviewPartnerPressure(partnerTab);
  const walletsTab = mergeBackendWalletsTab(buildWalletsTab(records, futureRecords), backendBundle);
  const reinvestTab = mergeBackendReinvestTab(buildReinvestTab(records), backendBundle);
  const baseCompositionTab = mergeBackendBaseCompositionTab(buildBaseCompositionTab(records, futureRecords), backendBundle);
  const enrichedPartnerTab = {
    ...partnerTab,
    metrics: [...partnerPressureMetrics, ...(partnerTab.metrics || [])],
  };
  const tabsData = {
    traffic: trafficTab,
    products: productsTab,
    leaders: leadersTab,
    geography: geographyTab,
    partner: enrichedPartnerTab,
    wallets: walletsTab,
    reinvest: reinvestTab,
    baseComposition: baseCompositionTab,
  };
  const insights = buildInsights(records, futureRecords, kpis, table);
  const scenarios = buildScenarios(kpis, futureRecords, table);
  const executiveSummary = buildExecutiveSummary(kpis, tabsData);
  const dayState = buildDayState(kpis, tabsData, overviewOperations, futureRecords);
  const priorityActions = buildPriorityActions(kpis, futureRecords, tabsData);
  const next72h = buildNearest72hWindow(futureRecords);

  return {
    filtersMeta: {
      dateRanges: analyticsMockData.dateRanges,
      segments: analyticsMockData.segments,
      sources: analyticsMockData.sources,
      generatedAt: backendBundle?.overview?.generatedAt || analyticsMockData.generatedAt,
      fallbackToBase,
    },
    kpis,
    charts: {
      usersGrowth: timeseries,
      revenue: timeseries,
      funnel: buildBreakdownFunnel(records, futureRecords),
      trafficSources: table,
      retention: buildCoverageCurve(futureRecords),
      campaigns: buildProductPressure(records, futureRecords),
    },
    executiveSummary,
    dayState,
    priorityActions,
    insights,
    scenarios,
    overviewOperations,
    next72h,
    table,
    tabsData,
    backend: {
      connected: Boolean(backendBundle),
      source: backendBundle ? "api-gateway" : "mock-fallback",
      endpoints: backendBundle
        ? ["overview", "cash-position", "obligations", "plan-fact", "orders", "wallets", "partner-structure", "reinvest", "leaders", "geography", "traffic", "base-composition"]
        : [],
    },
    recordsCount: records.length,
  };
}

export function exportAnalyticsCsv(rows) {
  const headers = ["Продукт", "ВходящийПоток", "План", "ВыплатыЦиклов", "Рефералка", "КомиссияПлатформы", "ВашОстаток", "Разрыв"];
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.source,
        row.incomingAmount,
        row.planAmount,
        row.cyclePayouts,
        row.referralPayouts,
        row.platformFee,
        row.operatorNet,
        row.gap,
      ].join(",")
    ),
  ];

  return csvRows.join("\n");
}
