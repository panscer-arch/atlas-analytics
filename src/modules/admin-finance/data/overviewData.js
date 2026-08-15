import { PARTNER_CAPTURE_THRESHOLDS } from "./partnerCaptureControl";

export const overviewPeriods = [
  { id: "7d", label: "7 дней" },
  { id: "1m", label: "Месяц" },
  { id: "3m", label: "3 месяца" },
  { id: "6m", label: "Полгода" },
  { id: "1y", label: "Год" },
  { id: "all", label: "Все время" },
];

export const cashFlowData = [
  { date: "29 июл", inflow: 2860, outflow: 1540, net: 1320 },
  { date: "30 июл", inflow: 3210, outflow: 1720, net: 1490 },
  { date: "31 июл", inflow: 3010, outflow: 1630, net: 1380 },
  { date: "1 авг", inflow: 3590, outflow: 1840, net: 1750 },
  { date: "2 авг", inflow: 3720, outflow: 2070, net: 1650 },
  { date: "3 авг", inflow: 3340, outflow: 1940, net: 1400 },
  { date: "4 авг", inflow: 3410, outflow: 1880, net: 1530 },
];

export const forecastData = [
  { date: "5 авг", principal: 2400, delta: 930, partner: 530, pending: 0, total: 3860 },
  { date: "6 авг", principal: 1710, delta: 810, partner: 430, pending: 0, total: 2950 },
  { date: "7 авг", principal: 2750, delta: 1040, partner: 570, pending: 360, total: 4720 },
  { date: "8 авг", principal: 1320, delta: 510, partner: 300, pending: 0, total: 2130 },
  { date: "9 авг", principal: 2020, delta: 740, partner: 525, pending: 0, total: 3285 },
  { date: "10 авг", principal: 1600, delta: 620, partner: 370, pending: 0, total: 2590 },
  { date: "11 авг", principal: 7100, delta: 3150, partner: 1600, pending: 419, total: 12269 },
];

export const cycleRows = [
  { name: "Daily 200 · $100", opened: 108, inflow: 10800, share: "58.6%", payouts: 12420, risk: "Средний", tone: "warn" },
  { name: "Lockup 30 · $100", opened: 42, inflow: 4200, share: "22.8%", payouts: 8760, risk: "Норма", tone: "good" },
  { name: "Daily 200 · $10,000", opened: 3, inflow: 3000, share: "16.3%", payouts: 9804, risk: "Концентрация", tone: "warn" },
  { name: "Launch", opened: 420, inflow: 420, share: "2.3%", payouts: 820, risk: "Норма", tone: "good" },
];

export const revenueData = [
  { name: "Fee с Delta", value: 486, color: "#ff8716" },
  { name: "Fee с партнерки", value: 139, color: "#f6b92f" },
  { name: "Head Account", value: 204, color: "#4e76d0" },
];

export const flowSeries = [
  { date: "25 июл", incoming: 2720, outgoing: 810, net: 1910 },
  { date: "26 июл", incoming: 3010, outgoing: 930, net: 2080 },
  { date: "27 июл", incoming: 2510, outgoing: 670, net: 1840 },
  { date: "28 июл", incoming: 3260, outgoing: 1040, net: 2220 },
  { date: "29 июл", incoming: 3410, outgoing: 1160, net: 2250 },
  { date: "30 июл", incoming: 2920, outgoing: 870, net: 2050 },
  { date: "31 июл", incoming: 3190, outgoing: 980, net: 2210 },
  { date: "1 авг", incoming: 3650, outgoing: 1280, net: 2370 },
  { date: "2 авг", incoming: 3070, outgoing: 910, net: 2160 },
  { date: "3 авг", incoming: 3320, outgoing: 1090, net: 2230 },
  { date: "4 авг", incoming: 2860, outgoing: 850, net: 2010 },
];

export const moneyPerimeters = [
  {
    id: "payout",
    name: "Payout Contract",
    net: 10348,
    description: "Все входящие и исходящие переводы контракта, включая переводы в treasury.",
    values: [["In", 18420], ["Out", 8072], ["Net", 10348]],
  },
  {
    id: "consolidated",
    name: "Atlas Consolidated",
    net: 12808,
    description: "Только внешние потоки группы Atlas. Внутренние переводы исключены.",
    values: [["In", 18420], ["Out", 5612], ["Net", 12808]],
  },
  {
    id: "treasury",
    name: "Company Treasury",
    net: 829,
    description: "Фактически полученный доход компании до OPEX и налогов.",
    values: [["Fee", 625], ["Head", 204], ["Total", 829]],
  },
];

export const outgoingWaterfall = [
  { name: "Principal Returned", value: 3120, color: "#503021" },
  { name: "Net Delta", value: 1208, color: "#ff8716" },
  { name: "Partner at Creation", value: 684, color: "#4e76d0" },
  { name: "Partner streamed", value: 600, color: "#7a5bb8" },
];

export const cycleEventSeries = [
  { date: "26 июл", created: 15, completed: 9, activePrincipal: 31000 },
  { date: "27 июл", created: 18, completed: 11, activePrincipal: 31800 },
  { date: "28 июл", created: 13, completed: 8, activePrincipal: 30600 },
  { date: "29 июл", created: 21, completed: 12, activePrincipal: 33200 },
  { date: "30 июл", created: 23, completed: 14, activePrincipal: 34100 },
  { date: "31 июл", created: 16, completed: 10, activePrincipal: 33600 },
  { date: "1 авг", created: 20, completed: 12, activePrincipal: 35300 },
  { date: "2 авг", created: 25, completed: 15, activePrincipal: 37100 },
  { date: "3 авг", created: 17, completed: 11, activePrincipal: 35900 },
  { date: "4 авг", created: 21, completed: 13, activePrincipal: 37800 },
];

export const activeCycleMix = [
  { name: "Daily 200 · $100", value: 108, share: "18.8%", color: "#ff8716" },
  { name: "Lockup 30 · $100", value: 42, share: "7.3%", color: "#f6b92f" },
  { name: "Daily 200 · $10,000", value: 3, share: "0.5%", color: "#4e76d0" },
  { name: "Launch", value: 420, share: "73.4%", color: "#7a5bb8" },
];

export const cycleTypeMetrics = [
  { name: "Daily 200 · $100", term: "Срок 200 дней", active: 108, principal: 10800, closed: 320, delta: 8960, maturity: 12420, version: "v3.2", tone: "blue" },
  { name: "Lockup 30 · $100", term: "Срок 30 дней", active: 42, principal: 4200, closed: 83, delta: 3118, maturity: 8760, version: "v2.4", tone: "blue" },
  { name: "Daily 200 · $10,000", term: "Расчет пропорционально Principal", active: 3, principal: 31380, closed: 7, delta: 6410, maturity: 9804, version: "v1.1", tone: "orange" },
  { name: "Launch", term: "Короткий цикл", active: 420, principal: 420, closed: 14, delta: 84, maturity: 820, version: "v1.0", tone: "green" },
];

export const maturityBuckets = [
  { label: "24 часа", principal: 2380, delta: 970, partner: 510, total: 3860, load: 79 },
  { label: "7 дней", principal: 18460, delta: 8240, partner: 5104, total: 31804, load: 94 },
  { label: "30 дней", principal: 53890, delta: 22680, partner: 10350, total: 86920, load: 94 },
  { label: "90 дней", principal: 155260, delta: 41700, partner: 24520, total: 231480, load: 95 },
];

export const forecastTimeline = [
  { date: "4 авг", principal: 38000, delta: 5100, partner: 2100, balance: 165500 },
  { date: "11 авг", principal: 41500, delta: 6200, partner: 2300, balance: 152000 },
  { date: "18 авг", principal: 34500, delta: 4900, partner: 1900, balance: 143500 },
  { date: "25 авг", principal: 47000, delta: 6700, partner: 2600, balance: 127000 },
  { date: "1 сен", principal: 40500, delta: 5900, partner: 2200, balance: 116000 },
  { date: "8 сен", principal: 51000, delta: 7500, partner: 3000, balance: 96000 },
  { date: "14 сен", principal: 45500, delta: 6800, partner: 2700, balance: 85500 },
  { date: "21 сен", principal: 48500, delta: 7100, partner: 2800, balance: 59000 },
  { date: "28 сен", principal: 43000, delta: 6400, partner: 2500, balance: 47000 },
  { date: "5 окт", principal: 52000, delta: 7800, partner: 3100, balance: 20359 },
  { date: "13 окт", principal: 40500, delta: 6000, partner: 2300, balance: 32000 },
  { date: "20 окт", principal: 38000, delta: 5600, partner: 2100, balance: 35000 },
  { date: "27 окт", principal: 36500, delta: 5300, partner: 2000, balance: 36500 },
];

export { augustLoad } from "./forecastLoad";

export const forecastComposition = [
  { name: "Возврат Principal", value: 166666, share: 72, color: "#503021" },
  { name: "Gross Delta", value: 41666, share: 18, color: "#ff8716" },
  { name: "Partner Reward streamed", value: 23148, share: 10, color: "#4e76d0" },
  { name: "Pending at Creation", value: 0, share: 0, color: "#bda99d" },
];

export const criticalForecastDates = [
  { date: "11.08.2026", gross: 12269, balance: 137420, action: "Без действий", tone: "green" },
  { date: "18.08.2026", gross: 17830, balance: 119590, action: "Контроль", tone: "green" },
  { date: "14.09.2026", gross: 26430, balance: 20359, action: "Добавить $4,641", tone: "red" },
  { date: "30.09.2026", gross: 20150, balance: 31780, action: "Без действий", tone: "green" },
];

export const claimRows = [
  { id: "CLM-240804-0186", wallet: "0x7C18...4A90", status: "eligible", cycle: "Daily 200 · $100", age: 14, sla: "48 ч", principal: 100, delta: 24, partner: 9.6, gross: 133.6, expected: null, tx: "block 54,721,008" },
  { id: "CLM-240804-0185", wallet: "0x1A42...7C11", status: "requested", cycle: "Lockup 30 · $100", age: 3, sla: "24 ч", principal: 100, delta: 20, partner: 8, gross: 128, expected: 128, tx: "0x01BC...8F42" },
  { id: "CLM-240803-0171", wallet: "0x5E98...90B4", status: "pending", cycle: "Daily 200 · $10,000", age: 39, sla: "24 ч", principal: 10000, delta: 2400, partner: 960, gross: 13360, expected: 13360, tx: "0x7D54...2A19" },
  { id: "CLM-240802-0154", wallet: "0x92A1...11D0", status: "failed", cycle: "Daily 200 · $100", age: 52, sla: "24 ч", principal: 100, delta: 18, partner: 7.2, gross: 125.2, expected: 125.2, tx: "0xBAD0...F014" },
  { id: "CLM-240804-0182", wallet: "0x440A...E218", status: "paid", cycle: "Launch", age: 2, sla: "24 ч", principal: 1, delta: 0.2, partner: 0.08, gross: 1.28, expected: 0, tx: "0x92A7...B10E" },
  { id: "CLM-240801-0122", wallet: "0x83F0...BB71", status: "reversed", cycle: "Lockup 30 · $100", age: 71, sla: "closed", principal: 0, delta: 0, partner: 0, gross: 0, expected: 0, tx: "0xREV1...20A2" },
  { id: "CLM-240804-0179", wallet: "0x31CD...A270", status: "pending", cycle: "Daily 200 · $100", age: 11, sla: "24 ч", principal: 100, delta: 24, partner: 9.6, gross: 133.6, expected: 133.6, tx: "0x881C...3A91" },
];

export const participantGrowth = [
  { period: "24–30 июн", firstLine: 9200, deeper: 2800, cumulative: 7200 },
  { period: "1–7 июл", firstLine: 8400, deeper: 5200, cumulative: 9000 },
  { period: "8–14 июл", firstLine: 10800, deeper: 4200, cumulative: 11100 },
  { period: "15–21 июл", firstLine: 11900, deeper: 4900, cumulative: 13800 },
  { period: "22–28 июл", firstLine: 12600, deeper: 5100, cumulative: 17600 },
  { period: "29 июл–4 авг", firstLine: 10500, deeper: 3900, cumulative: 18800 },
];

export const firstLineParticipants = [
  { wallet: "0x8F21...A104", depth: 32, status: "Master 1", tone: "green", principal: 6400, cycles: 8, partner: 1280, delta: 640, activity: "Сегодня" },
  { wallet: "0x2C09...71D8", depth: 27, status: "Start", tone: "green", principal: 4200, cycles: 6, partner: 690, delta: 420, activity: "Вчера" },
  { wallet: "0xA730...4B29", depth: 18, status: "Риск", tone: "orange", principal: 3800, cycles: 4, partner: 320, delta: 190, activity: "9 дней назад" },
  { wallet: "0x44E1...0F62", depth: 11, status: "Start", tone: "green", principal: 2900, cycles: 3, partner: 180, delta: 145, activity: "2 дня назад" },
];

export const companyRevenueSeries = [
  { date: "29 июл", feeDelta: 76, feePartner: 21, headAccount: 29, timingRatio: 4.1 },
  { date: "30 июл", feeDelta: 69, feePartner: 19, headAccount: 30, timingRatio: 4.3 },
  { date: "31 июл", feeDelta: 61, feePartner: 17, headAccount: 28, timingRatio: 4.0 },
  { date: "1 авг", feeDelta: 86, feePartner: 24, headAccount: 31, timingRatio: 5.1 },
  { date: "2 авг", feeDelta: 75, feePartner: 22, headAccount: 29, timingRatio: 4.8 },
  { date: "3 авг", feeDelta: 55, feePartner: 16, headAccount: 26, timingRatio: 4.2 },
  { date: "4 авг", feeDelta: 64, feePartner: 20, headAccount: 31, timingRatio: 4.5 },
];

export const companyRevenueComposition = [
  { name: "Platform Fee с Gross Delta", value: 486, color: "#ff8716" },
  { name: "Platform Fee с Partner Reward", value: 139, color: "#f6b92f" },
  { name: "Head Account при создании", value: 128, color: "#4e76d0" },
  { name: "Head Account streamed", value: 76, color: "#7a5bb8" },
];

export const companyRevenueCohorts = [
  { label: "30 дней", rate: "4.62%", note: "+$0.18 п.п. к предыдущей", total: 3482, fee: 67, head: 21, claim: 12 },
  { label: "60 дней", rate: "4.41%", note: "+$0.09 п.п. к предыдущей", total: 6714, fee: 69, head: 20, claim: 11 },
  { label: "90 дней", rate: "4.36%", note: "Стабильно · коридор 4.1–4.8%", total: 9846, fee: 70, head: 19, claim: 11 },
];

export const companyRevenueEvents = [
  { id: "REV-248", type: "Fee с Delta", moment: "Claim · 04.08 14:32", hash: "0x92A7...B10E", wallet: "0x7C18...4A90", cycle: "Daily 200 · $100", block: "54,721,008", amount: 18.4 },
  { id: "REV-247", type: "Head Account", moment: "Creation · 04.08 14:18", hash: "0x01BC...8F42", wallet: "0x1A42...7C11", cycle: "Lockup 30 · $100", block: "54,720,946", amount: 9 },
  { id: "REV-246", type: "Fee с Partner", moment: "Claim · 04.08 13:54", hash: "0x7D54...2A19", wallet: "0x5E98...90B4", cycle: "Daily 200 · $10,000", block: "54,720,812", amount: 6.72 },
  { id: "REV-245", type: "Fee с Delta", moment: "Claim · 04.08 13:41", hash: "0x81D2...6A12", wallet: "0x440A...E218", cycle: "Launch", block: "54,720,701", amount: 4.28 },
  { id: "REV-244", type: "Head Account", moment: "Claim · 04.08 13:20", hash: "0x42AA...C097", wallet: "0x31CD...A270", cycle: "Daily 200 · $100", block: "54,720,610", amount: 3.6 },
  { id: "REV-243", type: "Fee с Partner", moment: "Creation · 04.08 12:58", hash: "0x770C...ED04", wallet: "0x83F0...BB71", cycle: "Lockup 30 · $100", block: "54,720,522", amount: 2.4 },
];

export const partnerCaptureSeries = [
  { date: "29 июл", networkPaid: 70, atlasReceived: 24.5, captureRate: 35 },
  { date: "30 июл", networkPaid: 80, atlasReceived: 28, captureRate: 35 },
  { date: "31 июл", networkPaid: 75, atlasReceived: 26.25, captureRate: 35 },
  { date: "1 авг", networkPaid: 90, atlasReceived: 31.5, captureRate: 35 },
  { date: "2 авг", networkPaid: 85, atlasReceived: 29.75, captureRate: 35 },
  { date: "3 авг", networkPaid: 80, atlasReceived: 28, captureRate: 35 },
  { date: "4 авг", networkPaid: 102.857142, atlasReceived: 36, captureRate: 35 },
];

export const companyGrowthPlan = [
  { month: "Август 2026", shortMonth: "Авг 26", flow: 1500000, dailyReference: 50000, companyRevenue: 60000 },
  { month: "Сентябрь 2026", shortMonth: "Сен 26", flow: 2100000, dailyReference: 70000, companyRevenue: 84000 },
  { month: "Октябрь 2026", shortMonth: "Окт 26", flow: 3000000, dailyReference: 100000, companyRevenue: 120000 },
  { month: "Ноябрь 2026", shortMonth: "Ноя 26", flow: 4200000, dailyReference: 140000, companyRevenue: 168000 },
  { month: "Декабрь 2026", shortMonth: "Дек 26", flow: 5800000, dailyReference: 190000, companyRevenue: 232000 },
  { month: "Январь 2027", shortMonth: "Янв 27", flow: 8200000, dailyReference: 270000, companyRevenue: 328000 },
  { month: "Февраль 2027", shortMonth: "Фев 27", flow: 11300000, dailyReference: 380000, companyRevenue: 452000 },
  { month: "Март 2027", shortMonth: "Мар 27", flow: 16000000, dailyReference: 530000, companyRevenue: 640000 },
  { month: "Апрель 2027", shortMonth: "Апр 27", flow: 22200000, dailyReference: 740000, companyRevenue: 888000 },
  { month: "Май 2027", shortMonth: "Май 27", flow: 31000000, dailyReference: 1030000, companyRevenue: 1240000 },
  { month: "Июнь 2027", shortMonth: "Июн 27", flow: 44000000, dailyReference: 1470000, companyRevenue: 1760000 },
  { month: "Июль 2027", shortMonth: "Июл 27", flow: 61000000, dailyReference: 2030000, companyRevenue: 2440000 },
];

export const companyGrowthPlanAssumptions = {
  monthlyGrowthPercent: 40,
  planningDays: 30,
  plannedCompanyRevenuePercent: 4,
  partnerCaptureTargetPercent: PARTNER_CAPTURE_THRESHOLDS.targetPercent,
};

export const headAccountBranches = [
  { name: "Branch A", amount: 1124, share: "32.3%", progress: 100, color: "#ff8716", moment: "При создании" },
  { name: "Branch B", amount: 876, share: "25.2%", progress: 78, color: "#4e76d0", moment: "При claim" },
  { name: "Branch C", amount: 684, share: "19.6%", progress: 61, color: "#ff8716", moment: "При создании" },
  { name: "Branch D", amount: 482, share: "13.8%", progress: 43, color: "#4e76d0", moment: "При claim" },
  { name: "Остальные", amount: 316, share: "9.1%", progress: 28, color: "#7a5bb8", moment: "Смешанный" },
];

export const headAccountDirectBranches = [
  { ordinal: 333, atlasId: "A-8733", wallet: "0x93C2...18A0", rank: "Executive", branchRate: 60, headRate: 60, gap: 0, income30d: 412, state: "matched", stateLabel: "Догнала", changed: "04.08 · 12:44", tone: "red" },
  { ordinal: 74, atlasId: "A-3174", wallet: "0x6D21...94B8", rank: "Уровень 55%", branchRate: 55, headRate: 60, gap: 5, income30d: 684, state: "near", stateLabel: "Близко", changed: "Разрыв 5 п.п.", tone: "orange" },
  { ordinal: 18, atlasId: "A-2118", wallet: "0x1A42...7C11", rank: "Start", branchRate: 15, headRate: 60, gap: 45, income30d: 1124, state: "earning", stateLabel: "Получаем", changed: "Без изменения", tone: "green" },
  { ordinal: 2, atlasId: "A-1002", wallet: "0x8F21...A104", rank: "Master 2", branchRate: 40, headRate: 60, gap: 20, income30d: 876, state: "earning", stateLabel: "Получаем", changed: "Без изменения", tone: "green" },
  { ordinal: 1, atlasId: "A-1001", wallet: "0x90C1...4AA0", rank: "Уровень 44%", branchRate: 44, headRate: 60, gap: 16, income30d: 386, state: "earning", stateLabel: "Получаем", changed: "+4 п.п. за 30D", tone: "green" },
];

export const headAccountCompanyWallets = [
  { wallet: "0x44A1...9C02", line: "Treasury Line 01", purpose: "Поддержка Branch A", principal: 24000, cycles: 6, maturity: "09.08.2026", delta: 1284 },
  { wallet: "0x7BD2...A318", line: "Treasury Line 02", purpose: "Поддержка Branch B", principal: 18500, cycles: 4, maturity: "18.08.2026", delta: 892 },
  { wallet: "0xE909...21F4", line: "Treasury Line 03", purpose: "Операционный резерв линии", principal: 8000, cycles: 2, maturity: "22.08.2026", delta: 276 },
  { wallet: "0x91D4...8C11", line: "Treasury Line 04", purpose: "Поддержка Branch C", principal: 12500, cycles: 3, maturity: "01.09.2026", delta: 514 },
  { wallet: "0x2A77...E610", line: "Treasury Line 05", purpose: "Резерв квалификации", principal: 10000, cycles: 2, maturity: "14.09.2026", delta: 430 },
];

export const headAccountStatusHistory = [
  { date: "04.08.2026", status: "Executive", rate: "60%", source: "ruleset status-v1.4", result: "Активен" },
  { date: "12.07.2026", status: "Master 2", rate: "40%", source: "ruleset status-v1.3", result: "Повышение" },
  { date: "18.06.2026", status: "Master 1", rate: "30%", source: "ruleset status-v1.3", result: "Повышение" },
  { date: "09.05.2026", status: "Start", rate: "15%", source: "ruleset status-v1.2", result: "Открыт" },
];

export const navigationItems = [
  { id: "overview", label: "Обзор", path: "/admin/overview" },
  { id: "flows", label: "Потоки", path: "/admin/flows" },
  { id: "cycles", label: "Циклы", path: "/admin/cycles" },
  { id: "forecast", label: "Прогноз выплат", path: "/admin/forecast" },
  { id: "claims", label: "Claims и выплаты", path: "/admin/claims" },
  { id: "participants", label: "Участники", path: "/admin/participants" },
  { id: "revenue", label: "Доход компании", path: "/admin/company-revenue" },
  { id: "head-account", label: "Головной аккаунт", path: "/admin/head-account" },
  { id: "liquidity", label: "Ликвидность", path: "/admin/liquidity" },
  { id: "traffic", label: "Кошельки и трафик", path: "/admin/traffic" },
  { id: "campaigns", label: "Кампании", path: "/admin/campaigns" },
  { id: "reconciliation", label: "Сверка данных", path: "/admin/reconciliation" },
  { id: "risks", label: "Контроль рисков", path: "/admin/risks" },
  { id: "methodology", label: "Методика и доступ", path: "/admin/methodology" },
];

export function formatMoney(value, { signed = false } = {}) {
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US")}`;
}
