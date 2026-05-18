const ANALYTICS_ROOT = "https://analytics.pupanel.cc";
const LEGACY_TAB_PAGE_MAP = {
  dashboard: "dashboard",
  overview: "overview",
  traffic: "traffic",
  products: "products",
  reinvest: "reinvest",
  base: "base",
  leaders: "leaders",
  geography: "geography",
  partner: "partners",
  wallets: "wallets",
  launch: "tasks",
};
const LEGACY_BOARD_SECTION_MAP = {
  launch: "launch",
  knowledgeBase: "knowledge-base",
  ideas: "ideas",
  materials: "materials",
  agentTasks: "parameters",
  agentFaq: "faq",
};

export const analyticsRouteRegistry = {
  pages: {
    dashboard: {
      page: "dashboard",
      path: "/dashboard",
      query: "?page=dashboard",
      label: "Дашборд",
      description: "Главный экран контроля: входящий поток, выплаты, пул, live-операции и рабочие блоки команды.",
    },
    overview: {
      page: "overview",
      path: "/overview",
      query: "?page=overview",
      label: "Обзор",
      description: "Ключевые сигналы дня, smart-contract контур, 72 часа, сценарии, финансовая структура и контроль риска.",
    },
    traffic: {
      page: "traffic",
      path: "/traffic",
      query: "?page=traffic",
      label: "Трафик / Онлайн",
      description: "Регистрации, подключения кошельков, активации циклов, конверсии и live-динамика аудитории.",
    },
    products: {
      page: "products",
      path: "/products",
      query: "?page=products",
      label: "Продукты / Циклы",
      description: "Тарифы, cycle mix, доля активных циклов, payout pressure и продуктовая структура базы.",
    },
    reinvest: {
      page: "reinvest",
      path: "/reinvest",
      query: "?page=reinvest",
      label: "Реинвест",
      description: "Повторные деньги, reinvest rate, возврат капитала в систему и качество базы.",
    },
    base: {
      page: "base",
      path: "/base",
      query: "?page=base",
      label: "Состав базы",
      description: "Роли, активность, lifecycle, новые и повторные участники, средний чек и структура пользовательской базы.",
    },
    leaders: {
      page: "leaders",
      path: "/leaders",
      query: "?page=leaders",
      label: "Лидеры",
      description: "Топ-партнёры, вкладчики, активные ветки и распределение влияния по структуре.",
    },
    geography: {
      page: "geography",
      path: "/geography",
      query: "?page=geography",
      label: "География",
      description: "Страны, приток, качество трафика, risk profile и доля нагрузки по регионам.",
    },
    partners: {
      page: "partners",
      path: "/partners",
      query: "?page=partners",
      label: "Партнёрская структура",
      description: "Ветки, matching, compression, structural pressure, tier jump risk и качество партнёрской сети.",
    },
    wallets: {
      page: "wallets",
      path: "/wallets",
      query: "?page=wallets",
      label: "Кошельки",
      description: "Концентрация денег, obligations, claim pressure, risk profile и net contribution кошельков.",
    },
    tasks: {
      page: "tasks",
      path: "/tasks",
      query: "?page=tasks",
      label: "Задачи",
      description: "Командные чек-листы, база знаний, идеи, материалы, параметры и FAQ.",
      sections: {
        launch: {
          section: "launch",
          path: "/tasks/launch",
          query: "?page=tasks&section=launch",
          label: "Задачи запуска",
          description: "Основной чек-лист запуска: задачи, статусы, сроки, приоритеты и ответственные.",
        },
        "knowledge-base": {
          section: "knowledge-base",
          path: "/tasks/knowledge-base",
          query: "?page=tasks&section=knowledge-base",
          label: "База знаний",
          description: "Презентация, FAQ, ролики, White Paper, MLM-материалы, вебинары и инструкции для команды.",
        },
        ideas: {
          section: "ideas",
          path: "/tasks/ideas",
          query: "?page=tasks&section=ideas",
          label: "Идеи",
          description: "Контентные, продуктовые и маркетинговые идеи, которые ещё не превращены в формальные задачи.",
        },
        materials: {
          section: "materials",
          path: "/tasks/materials",
          query: "?page=tasks&section=materials",
          label: "Материалы",
          description: "Ссылки на документы, таблицы, Google Docs, презентации и рабочие артефакты команды.",
        },
        parameters: {
          section: "parameters",
          path: "/tasks/parameters",
          query: "?page=tasks&section=parameters",
          label: "Параметры",
          description: "Факты, параметры и контекст проекта для AI-агента: Web3, циклы, DAO, риски, партнёрка и документы.",
        },
        faq: {
          section: "faq",
          path: "/tasks/faq",
          query: "?page=tasks&section=faq",
          label: "FAQ",
          description: "База вопросов участников по ключевым темам проекта с ответами, ссылками и комментариями.",
          topics: {
            start: {
              topic: "start",
              path: "/tasks/faq/start",
              query: "?page=tasks&section=faq&topic=start",
              label: "FAQ: Старт / регистрация",
              description: "Первый вход, подключение MetaMask, регистрация, реферальная ссылка и базовые проблемы на старте.",
            },
            wallet: {
              topic: "wallet",
              path: "/tasks/faq/wallet",
              query: "?page=tasks&section=faq&topic=wallet",
              label: "FAQ: Кошелёк / MetaMask",
              description: "Сеть BSC, BNB на газ, seed-фраза, адрес кошелька, отображение баланса и ошибки MetaMask.",
            },
            deposit: {
              topic: "deposit",
              path: "/tasks/faq/deposit",
              query: "?page=tasks&section=faq&topic=deposit",
              label: "FAQ: Депозит / создание цикла",
              description: "Первый депозит, активация цикла, pending/failed транзакции, новые деньги и повторные входы.",
            },
            tariffs: {
              topic: "tariffs",
              path: "/tasks/faq/tariffs",
              query: "?page=tasks&section=faq&topic=tariffs",
              label: "FAQ: Тарифы / Smart Cycle",
              description: "Типы циклов, логика тарифов, расчётная модель, длительность и терминология продукта.",
            },
            claim: {
              topic: "claim",
              path: "/tasks/faq/claim",
              query: "?page=tasks&section=faq&topic=claim",
              label: "FAQ: Claim / вывод",
              description: "Когда доступен Claim, как проходит вывод, что приходит на кошелёк и как разбирать ошибки выплаты.",
            },
            partner: {
              topic: "partner",
              path: "/tasks/faq/partner",
              query: "?page=tasks&section=faq&topic=partner",
              label: "FAQ: Партнёрская программа",
              description: "Реферальная ссылка, бонусы, matching, compression, структура и причины расхождения начислений.",
            },
            statuses: {
              topic: "statuses",
              path: "/tasks/faq/statuses",
              query: "?page=tasks&section=faq&topic=statuses",
              label: "FAQ: Статусы / квалификации",
              description: "Builder, Master, Executive, квалификации, рост статуса и условия по структуре.",
            },
            dao: {
              topic: "dao",
              path: "/tasks/faq/dao",
              query: "?page=tasks&section=faq&topic=dao",
              label: "FAQ: DAO / голосование",
              description: "Право голоса, участие сообщества, эпохи циклов и статус механики DAO.",
            },
            security: {
              topic: "security",
              path: "/tasks/faq/security",
              query: "?page=tasks&section=faq&topic=security",
              label: "FAQ: Безопасность / риски",
              description: "Фишинг, приватные ключи, аудит, open source, риски Web3 и запрет на обещания гарантированной доходности.",
            },
            support: {
              topic: "support",
              path: "/tasks/faq/support",
              query: "?page=tasks&section=faq&topic=support",
              label: "FAQ: Поддержка / ошибки",
              description: "Куда писать, что прикладывать, как проверить tx hash и как действовать при сетевых ошибках.",
            },
            materials: {
              topic: "materials",
              path: "/tasks/faq/materials",
              query: "?page=tasks&section=faq&topic=materials",
              label: "FAQ: Материалы / обучение",
              description: "Где искать презентацию, White Paper, инструкции, ролики и другие обучающие материалы.",
            },
            analytics: {
              topic: "analytics",
              path: "/tasks/faq/analytics",
              query: "?page=tasks&section=faq&topic=analytics",
              label: "FAQ: Аналитика / метрики",
              description: "Что считается регистрацией, депозитом, активностью, обязательствами и как читать метрики проекта.",
            },
          },
        },
      },
    },
  },
};

export function getAnalyticsCanonicalHref(route) {
  return `${ANALYTICS_ROOT}${route.path}`;
}

export function getAnalyticsQueryHref(route) {
  return `${ANALYTICS_ROOT}/${route.query}`;
}

export function getAnalyticsPageRoute(page) {
  return analyticsRouteRegistry.pages[page] || null;
}

export function getAnalyticsSectionRoute(section) {
  return analyticsRouteRegistry.pages.tasks.sections[section] || null;
}

export function getAnalyticsFaqRoute(topic) {
  return analyticsRouteRegistry.pages.tasks.sections.faq.topics[topic] || null;
}

export function buildAnalyticsUrl({ page = "dashboard", section = null, topic = null, mode = "query", root = ANALYTICS_ROOT } = {}) {
  const pageRoute = getAnalyticsPageRoute(page) || getAnalyticsPageRoute("dashboard");
  const sectionRoute = page === "tasks" && section ? getAnalyticsSectionRoute(section) : null;
  const topicRoute = page === "tasks" && section === "faq" && topic ? getAnalyticsFaqRoute(topic) : null;

  if (mode === "path") {
    const path = topicRoute?.path || sectionRoute?.path || pageRoute.path;
    return `${root}${path}`;
  }

  const url = new URL(root);
  url.searchParams.set("page", pageRoute.page);

  if (pageRoute.page === "tasks" && sectionRoute) {
    url.searchParams.set("section", sectionRoute.section);
  }

  if (pageRoute.page === "tasks" && sectionRoute?.section === "faq" && topicRoute) {
    url.searchParams.set("topic", topicRoute.topic);
  }

  return url.toString();
}

export function parseAnalyticsRouteFromUrl(input) {
  const url = input instanceof URL ? input : new URL(input, ANALYTICS_ROOT);
  const search = url.searchParams;

  const rawPage = search.get("page");
  const rawSection = search.get("section");
  const rawTopic = search.get("topic");

  const legacyTab = search.get("tab");
  const legacyBoard = search.get("board");
  const legacyFaq = search.get("faq");

  const page = getAnalyticsPageRoute(rawPage)
    ? rawPage
    : LEGACY_TAB_PAGE_MAP[legacyTab] || (legacyBoard || legacyFaq ? "tasks" : "dashboard");

  const sectionCandidate =
    rawSection || LEGACY_BOARD_SECTION_MAP[legacyBoard] || (legacyFaq ? "faq" : null);
  const section = page === "tasks" && getAnalyticsSectionRoute(sectionCandidate) ? sectionCandidate : null;

  const topicCandidate = rawTopic || legacyFaq || null;
  const topic = page === "tasks" && section === "faq" && getAnalyticsFaqRoute(topicCandidate) ? topicCandidate : null;

  const route =
    page === "tasks" && section === "faq" && topic
      ? getAnalyticsFaqRoute(topic)
      : page === "tasks" && section
        ? getAnalyticsSectionRoute(section)
        : getAnalyticsPageRoute(page);

  return {
    page,
    section,
    topic,
    route,
    canonicalPath: route?.path || getAnalyticsPageRoute("dashboard").path,
    canonicalQueryUrl: buildAnalyticsUrl({ page, section, topic, mode: "query", root: `${url.origin}${url.pathname}` }),
    canonicalPathUrl: buildAnalyticsUrl({ page, section, topic, mode: "path", root: url.origin }),
    usedLegacyParams: Boolean(legacyTab || legacyBoard || legacyFaq),
  };
}

export default analyticsRouteRegistry;
