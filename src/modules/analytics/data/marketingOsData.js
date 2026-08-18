export const MARKETING_OS_STORAGE_KEY = "atlas.analytics.marketingOS.v1";

export const MARKETING_OS_TABS = [
  { id: "overview", label: "Обзор", hint: "центр" },
  { id: "opportunities", label: "Возможности", hint: "сигналы" },
  { id: "hypotheses", label: "Гипотезы", hint: "тесты" },
  { id: "campaigns", label: "Кампании", hint: "работа" },
  { id: "approvals", label: "Согласования", hint: "human gate" },
  { id: "agents", label: "AI-агенты", hint: "команда" },
  { id: "analytics", label: "Аналитика", hint: "результат" },
  { id: "activity", label: "Журнал", hint: "аудит" },
];

export const MARKETING_OS_STATUSES = {
  opportunities: ["Новая", "Проверяется", "Квалифицирована", "Отложена", "Закрыта"],
  hypotheses: ["Черновик", "На согласовании", "Одобрена", "Тестируется", "Подтверждена", "Отклонена"],
  campaigns: ["Черновик", "Готова к запуску", "В работе", "На паузе", "Завершена"],
  approvals: ["Ожидает", "Одобрено", "Отклонено", "Нужны правки"],
};

export const MARKETING_OS_AGENTS = [
  {
    id: "research",
    name: "Research Agent",
    role: "Ищет рыночные сигналы, площадки, темы и аудитории.",
    guardrail: "Только публичные источники. Никакого автоматического контакта.",
  },
  {
    id: "hypothesis",
    name: "Hypothesis Agent",
    role: "Превращает сигнал в проверяемую гипотезу с метрикой и лимитом.",
    guardrail: "Не обещает доход и не подменяет факт предположением.",
  },
  {
    id: "content",
    name: "Content Agent",
    role: "Готовит черновики сообщений, публикаций и креативных брифов.",
    guardrail: "Любой материал остается черновиком до ручного согласования.",
  },
  {
    id: "compliance",
    name: "Compliance Agent",
    role: "Проверяет формулировки, риски, раскрытие связи с Atlas и правила канала.",
    guardrail: "Может блокировать, но не может публиковать.",
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    role: "Собирает UTM, CRM и продуктовые события в единый отчет.",
    guardrail: "Не приписывает конверсию без подтвержденной атрибуции.",
  },
];

export function createDefaultMarketingOsState() {
  return {
    version: 1,
    updatedAt: "",
    opportunities: [
      {
        id: "opportunity-brazil-regional-leaders",
        title: "Региональные MLM-лидеры в Бразилии",
        source: "Country Discovery / CRM",
        audience: "Опытные локальные сетевики",
        evidence: "Проверить 30 публичных профессиональных профилей и локальных MLM-сообществ.",
        owner: "Не назначен",
        priority: "Высокий",
        status: "Проверяется",
        createdAt: "2026-08-18T09:00:00.000Z",
      },
      {
        id: "opportunity-dapp-catalogs",
        title: "DApp-каталоги и независимые обзоры",
        source: "Listings OS",
        audience: "Web3-пользователи, изучающие новые продукты",
        evidence: "Собрать требования каталогов и отделить готовые карточки от площадок без подтверждения.",
        owner: "Не назначен",
        priority: "Средний",
        status: "Новая",
        createdAt: "2026-08-18T09:05:00.000Z",
      },
    ],
    hypotheses: [
      {
        id: "hypothesis-brazil-10",
        title: "10 персональных разговоров с подтвержденными лидерами дадут минимум 3 квалифицированных Zoom",
        audience: "Бразилия / MLM-лидеры",
        channel: "Персональный outreach",
        metric: "Квалифицированные Zoom",
        target: "3 из 10",
        budget: "$0 до отдельного согласования",
        owner: "Не назначен",
        status: "Черновик",
        sourceOpportunityId: "opportunity-brazil-regional-leaders",
        createdAt: "2026-08-18T09:10:00.000Z",
      },
      {
        id: "hypothesis-trust-route",
        title: "Маршрут «простое объяснение → проверяемые факты → разговор» повысит качество лидов",
        audience: "Новые Web3-пользователи",
        channel: "Сайт / Telegram",
        metric: "Доля квалифицированных действий",
        target: "+20% к текущей базе",
        budget: "$0, сначала измерение",
        owner: "Не назначен",
        status: "Черновик",
        sourceOpportunityId: "",
        createdAt: "2026-08-18T09:15:00.000Z",
      },
    ],
    campaigns: [
      {
        id: "campaign-brazil-pilot",
        title: "Brazil Regional Leaders Pilot",
        hypothesisId: "hypothesis-brazil-10",
        channel: "Персональные сообщения + Zoom",
        audience: "10 проверенных MLM-лидеров",
        budget: "$0",
        owner: "Не назначен",
        status: "Черновик",
        approvalsRequired: true,
        results: { sent: 0, replies: 0, qualified: 0, meetings: 0 },
        createdAt: "2026-08-18T09:20:00.000Z",
      },
    ],
    approvals: [
      {
        id: "approval-brazil-scope",
        objectType: "Кампания",
        objectId: "campaign-brazil-pilot",
        title: "Аудитория, оффер и лимит Brazil pilot",
        requestedBy: "MarketingOS",
        reviewer: "Не назначен",
        note: "До одобрения разрешены только исследование и подготовка черновиков.",
        status: "Ожидает",
        createdAt: "2026-08-18T09:25:00.000Z",
        decidedAt: "",
      },
    ],
    agents: MARKETING_OS_AGENTS.map((agent) => ({
      ...agent,
      status: "Готов к задаче",
      lastTask: "",
      updatedAt: "",
    })),
    metrics: {
      opportunitiesQualified: 0,
      hypothesesTested: 0,
      campaignsActive: 0,
      approvedActions: 0,
      replies: 0,
      qualifiedLeads: 0,
      meetings: 0,
      registrations: 0,
      activations: 0,
      attributedVolume: 0,
    },
    activity: [
      {
        id: "activity-marketing-os-created",
        type: "system",
        title: "MarketingOS подготовлена к работе",
        details: "Создан approval-first контур. Внешние действия автоматически не выполняются.",
        actor: "System",
        createdAt: "2026-08-18T09:30:00.000Z",
      },
    ],
  };
}

function normalizeCollection(value, fallback) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : fallback;
}

export function hydrateMarketingOsState(value) {
  const defaults = createDefaultMarketingOsState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  return {
    ...defaults,
    ...value,
    opportunities: normalizeCollection(value.opportunities, defaults.opportunities),
    hypotheses: normalizeCollection(value.hypotheses, defaults.hypotheses),
    campaigns: normalizeCollection(value.campaigns, defaults.campaigns),
    approvals: normalizeCollection(value.approvals, defaults.approvals),
    agents: MARKETING_OS_AGENTS.map((definition) => {
      const saved = normalizeCollection(value.agents, []).find((agent) => agent.id === definition.id);
      return { ...definition, status: "Готов к задаче", lastTask: "", updatedAt: "", ...(saved || {}) };
    }),
    metrics: { ...defaults.metrics, ...(value.metrics || {}) },
    activity: normalizeCollection(value.activity, defaults.activity),
  };
}
