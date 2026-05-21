import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const AGENT_FAQ_STORAGE_KEY = "atlas.analytics.agentFaqTemplate.v1";

const defaultFaqSections = [
  {
    id: "start",
    title: "СТАРТ / РЕГИСТРАЦИЯ",
    rows: [
      ["Как зарегистрироваться в Atlas System?", "Нужно открыть официальный сайт и подключить MetaMask. Первое подключение кошелька считается регистрацией.", "Добавить ссылку на инструкцию регистрации."],
      ["Нужна ли почта или пароль?", "Нет. Вход и регистрация происходят через Web3-кошелек, без email и пароля.", "Уточнить, если появится дополнительный способ входа."],
      ["Почему регистрация считается подключением MetaMask?", "В Atlas аккаунт привязан не к почте и паролю, а к вашему кошельку. Поэтому первое подключение кошелька считается регистрацией.", ""],
      ["Можно ли зарегистрироваться с телефона?", "Да, если у участника есть MetaMask Mobile или другой поддерживаемый кошелек через WalletConnect.", "Добавить мобильную инструкцию."],
      ["Нужна ли реферальная ссылка для регистрации?", "Если вы регистрируетесь по приглашению партнёра, лучше заходить по его ссылке, чтобы структура закрепилась корректно. Если приходите самостоятельно, обычно можно зарегистрироваться и без неё.", "Уточнить финальную механику invite/ref-link."],
      ["Что делать, если кнопка подключения кошелька не работает?", "Проверьте, установлен ли MetaMask, открыт ли нужный аккаунт, не блокирует ли браузер всплывающие окна, и обновите страницу.", ""],
      ["Что делать, если сайт не видит кошелек?", "Переподключить MetaMask, проверить выбранный аккаунт, сеть BSC и разрешения сайта в кошельке.", ""],
    ],
  },
  {
    id: "wallet",
    title: "КОШЕЛЕК / METAMASK",
    rows: [
      ["Какой кошелек нужен?", "Основной вариант - MetaMask. Также может поддерживаться WalletConnect, если он включен в кабинете.", ""],
      ["Какая сеть нужна?", "Для работы нужен кошелёк в сети BNB Smart Chain (BSC). Если вы используете USDT, проверьте, что это именно USDT в сети BEP20.", ""],
      ["Зачем нужен BNB?", "BNB нужен для оплаты комиссии сети BSC при подтверждении транзакций.", ""],
      ["Сколько BNB нужно держать на кошельке?", "Небольшой запас для газа. Точная сумма зависит от текущей комиссии сети.", "Добавить актуальную рекомендацию после тестов."],
      ["Можно ли отправить USDT из другой сети?", "Перед переводом всегда проверяйте сеть. Если отправить USDT не в ту сеть, деньги могут не отобразиться в системе или потребовать сложного восстановления.", ""],
      ["Что такое seed-фраза?", "Это главный ключ восстановления кошелька. Ее нельзя передавать никому, включая поддержку.", ""],
      ["Может ли поддержка восстановить мой кошелек?", "Нет. Atlas не хранит seed-фразы и приватные ключи пользователей.", ""],
      ["Почему баланс в кабинете отличается от MetaMask?", "Такое бывает из-за задержки обновления, неверной сети, другого выбранного аккаунта или из-за того, что токен не добавлен в MetaMask.", ""],
      ["Где посмотреть адрес своего кошелька?", "В MetaMask под названием аккаунта. Адрес можно скопировать и использовать для проверки транзакций.", ""],
    ],
  },
  {
    id: "deposit",
    title: "ДЕПОЗИТ / СОЗДАНИЕ ЦИКЛА",
    rows: [
      ["Что такое цикл?", "Цикл — это ваше участие в одном из тарифов Atlas. Вы выбираете сумму и условия, а дальше цикл работает через смарт-контракт.", ""],
      ["Как создать первый депозит?", "Подключить кошелек, перейти во вкладку циклов, выбрать тариф и сумму, затем подтвердить транзакцию в MetaMask.", ""],
      ["Какая минимальная сумма депозита?", "Минимальная сумма участия - 10 USDT.", ""],
      ["Когда цикл считается активированным?", "Цикл становится активным после того, как транзакция в кошельке успешно подтверждена в блокчейне.", ""],
      ["Почему депозит не появился сразу?", "Транзакция может быть pending, кабинет может обновляться с задержкой, либо выбрана неверная сеть.", ""],
      ["Что делать, если транзакция failed?", "Проверить BNB для газа, сеть, баланс USDT и ошибку в BscScan. Затем обратиться в поддержку с хэшем транзакции.", ""],
      ["Можно ли отменить депозит?", "После подтверждения транзакции в блокчейне отменить ее нельзя. Условия досрочного выхода должны быть описаны отдельно, если они есть.", "Уточнить наличие досрочного выхода."],
      ["Можно ли сделать несколько депозитов?", "Да, если правила продукта позволяют несколько активных или последовательных циклов.", "Уточнить лимиты по тарифам."],
      ["Что значит 'новые деньги'?", "Новые деньги — это любой новый депозит в систему, даже если до этого вы уже выводили средства и потом снова зашли в цикл.", ""],
      ["Можно ли пополнить депозит в уже активном цикле?", "Обычно создается новый цикл. Возможность докинуть средства в активный цикл нужно уточнять по правилам продукта.", "Уточнить механику top-up."],
    ],
  },
  {
    id: "tariffs",
    title: "ТАРИФЫ / SMART CYCLE",
    rows: [
      ["Какие есть тарифы?", "Есть фиксированные циклы Lockup Flow и длительные циклы Daily Flow.", ""],
      ["Что такое Contract Test?", "Тестовый цикл на 10 минут без дельты, нужен для проверки механики.", ""],
      ["Что такое Launch?", "Фиксированный цикл на 1 день с расчетной дельтой +0.3%.", ""],
      ["Что такое Momentum?", "Фиксированный цикл на 5 дней с расчетной дельтой +2%.", ""],
      ["Что такое Premiere?", "Фиксированный цикл на 10 дней с расчетной дельтой +5%.", ""],
      ["Что такое President?", "Фиксированный цикл на 20 дней с расчетной дельтой +12%.", ""],
      ["Что такое Imperium?", "Фиксированный цикл на 30 дней с расчетной дельтой +22.5%.", ""],
      ["Что такое Daily Flow?", "Длительный цикл на 200 дней с ежедневной расчетной моделью начислений.", ""],
      ["Это гарантированная доходность?", "Нет. Здесь нельзя говорить о гарантированной доходности. Корректно говорить о расчётной модели и потенциальном результате по правилам выбранного цикла.", ""],
      ["От чего зависит выплата?", "От правил тарифа, состояния смарт-контракта, доступной ликвидности и успешного выполнения транзакции.", ""],
    ],
  },
  {
    id: "claim",
    title: "CLAIM / ВЫВОД",
    rows: [
      ["Что такое Claim?", "Claim — это действие, которым вы запрашиваете выплату на свой кошелёк, когда она становится доступна по правилам цикла.", ""],
      ["Когда появляется кнопка Claim?", "После завершения срока выбранного цикла или при выполнении условий Daily Flow.", ""],
      ["Что я получаю при Claim?", "Доступную сумму по правилам цикла: тело и расчетную дельту, если условия выполнены.", ""],
      ["Куда приходят средства?", "На подключенный кошелек участника.", ""],
      ["Нужен ли BNB для Claim?", "Да, для оплаты комиссии сети при отправке транзакции Claim.", ""],
      ["Почему Claim не проходит?", "Чаще всего проблема связана с нехваткой BNB на комиссию, ошибкой сети или тем, что выплата ещё не стала доступной.", ""],
      ["Можно ли нажать Claim несколько раз?", "Повторный Claim возможен только если контракт показывает доступную сумму к выплате.", "Уточнить механику по тарифам."],
      ["Что делать, если Claim pending?", "Проверить транзакцию в BscScan и дождаться подтверждения или статуса failed.", ""],
      ["Есть ли лимиты на вывод?", "Лимиты и условия должны быть указаны в правилах продукта, если они предусмотрены.", "Уточнить лимиты."],
      ["Можно ли сразу реинвестировать после Claim?", "Да. После получения средств вы можете сразу создать новый цикл, если хотите продолжить участие.", ""],
    ],
  },
  {
    id: "partner",
    title: "ПАРТНЕРСКАЯ ПРОГРАММА",
    rows: [
      ["Как активировать партнерскую программу?", "Нужен минимальный депозит 10 USDT, после чего появляется возможность работать с реферальной ссылкой.", ""],
      ["Где взять реферальную ссылку?", "После активации партнерки ссылка появляется в личном кабинете.", ""],
      ["От чего начисляется партнерский бонус?", "Партнёрский бонус считается не от всей суммы депозита, а от расчётной части вознаграждения по правилам системы.", ""],
      ["Когда начисляется партнерский бонус?", "В момент активации цикла приглашенным участником, по правилам статуса и тарифа.", ""],
      ["Что такое компрессия?", "Компрессия — это правило распределения бонусов между уровнями структуры. Проще говоря: система учитывает статус и активность участников, чтобы бонусы распределялись по установленным правилам.", ""],
      ["Что такое личная линия?", "Это участники, которых партнер пригласил напрямую.", ""],
      ["Что такое глубина структуры?", "Это уровни участников ниже первой линии. В Atlas заявлена неограниченная глубина структуры.", ""],
      ["Как растет статус?", "Статус зависит от личного активного объема, объема первой линии и глубинного активного объема.", ""],
      ["Что такое Matching bonus?", "Matching bonus — это дополнительный бонус с партнёрского дохода лично приглашённых участников, если ваш статус позволяет его получать.", ""],
      ["Можно ли вывести партнерский бонус?", "Да, если бонус доступен к выплате по правилам смарт-контракта и кабинета.", "Уточнить отдельный Claim бонусов."],
      ["Можно ли реинвестировать партнерский бонус?", "Такой сценарий планируется/обсуждается: партнерский баланс можно направлять в смарт-контракт, если функция реализована.", "Уточнить статус реализации."],
      ["Почему бонус меньше ожидаемого?", "Такое возможно из-за статуса, правил структуры, компрессии или ограничений по квалификации. Если сумма кажется неверной, лучше проверить статус и детали начисления.", ""],
    ],
  },
  {
    id: "statuses",
    title: "СТАТУСЫ / КВАЛИФИКАЦИИ",
    rows: [
      ["Какие статусы есть?", "Есть Start, Builder 1-7, Master 1-7 и высшие статусы Strategist, Ambassador, Architect, Executive.", ""],
      ["Что дает статус?", "Статус влияет на процент партнерских начислений и доступность дополнительных бонусов.", ""],
      ["Как получить Builder?", "Нужно выполнить условия по личному активному объему и структуре согласно таблице статусов.", ""],
      ["Как получить Master?", "Нужно выполнить более высокие требования по личному, первой линии и глубинному объему.", ""],
      ["Что такое Executive?", "Максимальный статус текущей карьерной таблицы.", ""],
      ["Что такое Elite+?", "Клубная логика для участников, которые удерживают Elite более 2 месяцев. Условия нужно описать в партнерке.", "Добавить ссылку на Elite+ после подготовки."],
    ],
  },
  {
    id: "dao",
    title: "DAO / ГОЛОСОВАНИЕ",
    rows: [
      ["Что такое DAO в Atlas?", "DAO — это механизм, через который сообщество может участвовать в обсуждении и голосовании по важным вопросам проекта.", ""],
      ["Кто может голосовать?", "Участники с правом голоса. Базовая логика: 10 USDT участия = 1 голос, если правило утверждено.", ""],
      ["За что можно голосовать?", "Голосование может касаться параметров проекта, этапов развития и отдельных правил системы — если эти вопросы официально вынесены в DAO.", "Нужен список полномочий DAO."],
      ["Что такое эпохи циклов?", "Идея серий циклов с управляемым перезапуском через DAO.", ""],
      ["DAO уже работает?", "Нужно указывать актуальный статус: работает, тестируется или планируется.", "Добавить официальный статус."],
    ],
  },
  {
    id: "security",
    title: "БЕЗОПАСНОСТЬ / РИСКИ",
    rows: [
      ["Atlas хранит мои деньги?", "Средства взаимодействуют со смарт-контрактом через ваш кошелёк. Подробную схему хранения и движения средств лучше смотреть в документации проекта.", ""],
      ["Atlas хранит мои приватные ключи?", "Нет. Приватные ключи и seed-фразы остаются только у владельца кошелька.", ""],
      ["Можно ли давать seed-фразу поддержке?", "Нет. Seed-фразу нельзя передавать никому.", ""],
      ["Где проверить смарт-контракт?", "После публикации адреса контракт можно проверить в BscScan.", "Добавить адрес контракта."],
      ["Есть ли аудит?", "Если аудит еще планируется, нужно так и говорить: аудит планируется, но не завершен/не опубликован.", "Добавить ссылку после аудита."],
      ["Есть ли открытый код?", "Если open source планируется, нужно говорить, что код будет опубликован после готовности.", ""],
      ["Какие основные риски?", "Основные риски — это ошибки сети, работа смарт-контракта, человеческие ошибки, выбор неверной сети и общие ограничения Web3-инфраструктуры.", ""],
      ["Что делать при подозрении на фишинг?", "Не подключать кошелек, не подписывать транзакции, проверить официальный домен и обратиться в поддержку.", ""],
      ["Какие слова нельзя использовать?", "Нельзя обещать гарантию, безрисковость, фиксированную прибыль, стабильный заработок или окупаемость.", ""],
      ["Это инвестиция?", "Проект не стоит описывать как гарантированный инвестиционный продукт. Каждый участник самостоятельно оценивает правила участия и связанные риски.", ""],
    ],
  },
  {
    id: "support",
    title: "ПОДДЕРЖКА / ОШИБКИ",
    rows: [
      ["Куда обращаться за помощью?", "В официальный канал поддержки проекта. Ссылку нужно брать только из официальных материалов.", "Добавить ссылку."],
      ["Что приложить в поддержку?", "Чтобы поддержка быстрее помогла, сразу отправьте адрес кошелька, tx hash, сеть, скриншот ошибки и краткое описание проблемы.", ""],
      ["Что нельзя отправлять поддержке?", "Seed-фразу, приватный ключ, коды доступа и полные данные устройства.", ""],
      ["Что такое tx hash?", "Tx hash — это номер вашей транзакции в блокчейне. По нему можно проверить статус операции в обозревателе сети.", ""],
      ["Почему транзакция pending?", "Сеть еще не подтвердила транзакцию или газ был слишком низким.", ""],
      ["Почему транзакция failed?", "Может не хватать газа, быть неверная сеть, недостаточный баланс или ошибка условий контракта.", ""],
      ["Что делать, если выбрал неверную сеть?", "Переключить кошелек на правильную сеть BSC и обновить страницу. Если средства отправлены в неверной сети, обратиться в поддержку с деталями.", ""],
    ],
  },
  {
    id: "materials",
    title: "МАТЕРИАЛЫ / ОБУЧЕНИЕ",
    rows: [
      ["Где найти презентацию?", "В разделе материалов, когда ссылка прикреплена к соответствующей кнопке.", "Связать с «Материалы»."],
      ["Где найти FAQ?", "В базе знаний и во вкладке FAQ аналитики.", ""],
      ["Где найти White Paper?", "В разделе материалов или базе знаний после вычитки и публикации.", ""],
      ["Есть ли видеоинструкция по регистрации?", "Должна быть подготовлена в базе знаний: подключение MetaMask, создание цикла, Claim.", "Поставить задачу на ролик."],
      ["Есть ли статья про работу без кабинета?", "Такую статью нужно подготовить для продвинутых пользователей.", ""],
      ["Где найти правила участия?", "В юридическом блоке или базе знаний после публикации документов.", ""],
    ],
  },
  {
    id: "analytics",
    title: "АНАЛИТИКА / МЕТРИКИ",
    rows: [
      ["Что считается регистрацией?", "Первое подключение MetaMask.", ""],
      ["Что считается первым депозитом?", "Первое создание цикла участником.", ""],
      ["Что считается повторным депозитом?", "Любой новый депозит после предыдущего участия.", ""],
      ["Что такое активный участник?", "Участник с активным циклом или актуальной активностью по правилам аналитики.", ""],
      ["Что такое обязательства?", "Тело активных депозитов плюс начисленная/ожидаемая дельта, которую нужно выплатить по правилам.", ""],
      ["Что показывает Web3-воронка?", "Где участники застревают: подключили кошелек, но не сделали депозит; сделали депозит, но не повторили; не нажали Claim.", ""],
      ["Что такое новые деньги?", "Любой новый вход средств в смарт-контракт через депозит, даже если участник недавно вывел средства.", ""],
    ],
  },
].map((section) => ({
  ...section,
  rows: section.rows.map(([question, answer, source], index) => ({
    id: `${section.id}-${index}`,
    question,
    answer,
    source: source || "",
  })),
}));

const defaultFaqTemplate = { sections: defaultFaqSections };
const FAQ_SECTION_DESCRIPTIONS = {
  start: "Первый вход, регистрация, подключение MetaMask и базовые проблемы на старте.",
  wallet: "Кошелёк, сеть BSC, BNB на газ, безопасность seed-фразы и базовые ошибки MetaMask.",
  deposit: "Создание цикла, первый депозит, pending / failed транзакции и повторные входы.",
  tariffs: "Тарифы Smart Cycle, что они значат и как корректно объяснять расчётную модель.",
  claim: "Когда доступен Claim, как проходит вывод и что делать при ошибках выплаты.",
  partner: "Партнёрская программа, реферальная ссылка, бонусы, компрессия и matching bonus.",
  statuses: "Статусы, квалификации, уровни Builder / Master и логика роста по структуре.",
  dao: "DAO, голосование, право голоса и участие сообщества в развитии проекта.",
  security: "Риски, аудит, приватные ключи, фишинг и как безопасно работать с Web3.",
  support: "Куда писать, что отправлять в поддержку и как проверить tx hash и ошибки сети.",
  materials: "Где искать презентацию, White Paper, инструкции, видео и обучающие материалы.",
  analytics: "Что считается регистрацией, депозитом, обязательствами и как читать метрики проекта.",
};

function hydrateRows(defaultRows, savedRows = []) {
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      question: savedRow.question || defaultRow.question,
      answer: savedRow.answer || defaultRow.answer,
      source: savedRow.source || savedRow.comment || defaultRow.source,
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id))
    .map((row) => ({ ...row, source: row.source || row.comment || "" }));

  return [...hydratedDefaultRows, ...customRows];
}

function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultFaqTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultFaqSections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      rows: hydrateRows(defaultSection.rows, savedSection.rows),
    };
  });
  const customSections = template.sections
    .filter((section) => !defaultFaqSections.some((defaultSection) => defaultSection.id === section.id))
    .map((section) => ({
      ...section,
      rows: (section.rows || []).map((row) => ({ ...row, source: row.source || row.comment || "" })),
    }));

  return { sections: [...sections, ...customSections] };
}

function readStoredFaq() {
  if (typeof window === "undefined") return defaultFaqTemplate;

  try {
    const saved = window.localStorage.getItem(AGENT_FAQ_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultFaqTemplate;
  } catch {
    return defaultFaqTemplate;
  }
}

function persistFaq(template) {
  try {
    window.localStorage.setItem(AGENT_FAQ_STORAGE_KEY, JSON.stringify(template));
    saveServerContent(AGENT_FAQ_STORAGE_KEY, template);
  } catch {
    // FAQ останется доступен до перезагрузки даже без localStorage.
  }
}

function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question: "",
    answer: "",
    source: "",
  };
}

function AgentFaqTemplate() {
  const [template, setTemplate] = useState(readStoredFaq);
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (typeof window === "undefined") return defaultFaqTemplate.sections[0]?.id || "start";

    const url = new URL(window.location.href);
    return url.searchParams.get("faq") || defaultFaqTemplate.sections[0]?.id || "start";
  });

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_FAQ_STORAGE_KEY).then((savedTemplate) => {
      if (!isMounted || !savedTemplate) return;
      setTemplate(hydrateTemplate(savedTemplate));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateTemplate(updater) {
    setTemplate((current) => {
      const next = updater(current);
      persistFaq(next);
      return next;
    });
  }

  function updateRow(sectionId, rowId, field, value) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          rows: section.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
        };
      }),
    }));
  }

  function addRow(sectionId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: [...section.rows, createRow(sectionId)] } : section)),
    }));
  }

  function removeRow(sectionId, rowId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: section.rows.filter((row) => row.id !== rowId) } : section)),
    }));
  }

  function resetTemplate() {
    updateTemplate(() => defaultFaqTemplate);
    setActiveSectionId(defaultFaqTemplate.sections[0]?.id || "start");
  }

  const totalQuestions = template.sections.reduce((sum, section) => sum + section.rows.length, 0);
  const activeSection =
    template.sections.find((section) => section.id === activeSectionId) || template.sections[0] || null;
  const faqBaseUrl = typeof window === "undefined" ? "https://analytics.pupanel.cc/?board=agentFaq" : `${window.location.origin}${window.location.pathname}?board=agentFaq`;
  const faqLinks = template.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: FAQ_SECTION_DESCRIPTIONS[section.id] || "Раздел FAQ по отдельной категории вопросов участников.",
    href: `${faqBaseUrl}&faq=${section.id}`,
    isActive: activeSection?.id === section.id,
  }));
  const activeFaqLink = faqLinks.find((link) => link.isActive) || faqLinks[0];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isKnownSection = template.sections.some((section) => section.id === activeSectionId);
    const nextSectionId = isKnownSection ? activeSectionId : defaultFaqTemplate.sections[0]?.id || "start";

    if (nextSectionId !== activeSectionId) {
      setActiveSectionId(nextSectionId);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", "agentFaq");
    url.searchParams.set("faq", nextSectionId);
    window.history.replaceState({}, "", url.toString());
  }, [activeSectionId, template.sections]);

  return (
    <section className="analytics-surface analytics-agent-template mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">FAQ AI-агента</span>
          <h2 className="analytics-agent-template-title">FAQ Atlas System</h2>
          <p className="analytics-page-subtitle mb-0">
            Стартовая база вопросов участников по категориям. Сейчас в шаблоне {totalQuestions} вопросов; ответы, ссылки и комментарии можно редактировать прямо в таблицах.
          </p>
        </div>
        <AnalyticsActionButton variant="secondary" size="sm" onClick={resetTemplate}>
          Сбросить FAQ
        </AnalyticsActionButton>
      </div>

      <div className="analytics-agent-template-tabs" role="tablist" aria-label="Категории FAQ">
        {template.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection?.id === section.id}
            className={`analytics-agent-template-tab${activeSection?.id === section.id ? " analytics-agent-template-tab-active" : ""}`}
            onClick={() => setActiveSectionId(section.id)}
          >
            {section.title}
          </button>
        ))}
      </div>
      <div className="analytics-agent-template-links">
        <div className="analytics-agent-template-links-active">
          <span className="analytics-agent-template-links-label">Ссылка на категорию FAQ</span>
          <a className="analytics-agent-template-links-anchor" href={activeFaqLink.href}>
            {activeFaqLink.href}
          </a>
          <p className="analytics-agent-template-links-copy">{activeFaqLink.description}</p>
        </div>
        <div className="analytics-agent-template-links-grid">
          {faqLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`analytics-agent-template-link-card${link.isActive ? " analytics-agent-template-link-card-active" : ""}`}
            >
              <span className="analytics-agent-template-link-card-title">{link.title}</span>
              <span className="analytics-agent-template-link-card-url">{link.href}</span>
              <span className="analytics-agent-template-link-card-copy">{link.description}</span>
            </a>
          ))}
        </div>
      </div>

      {activeSection ? (
        <div className="analytics-agent-template-grid">
          <div className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <h3>{activeSection.title}</h3>
              <AnalyticsActionButton variant="primary" size="sm" onClick={() => addRow(activeSection.id)}>
                + вопрос
              </AnalyticsActionButton>
            </div>
            <div className="table-responsive">
              <table className="table analytics-table analytics-agent-template-table mb-0">
                <thead>
                  <tr>
                    <th>Вопрос</th>
                    <th>Вариант ответа</th>
                    <th>Ссылка / комментарий</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {activeSection.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.question}
                          onChange={(event) => updateRow(activeSection.id, row.id, "question", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.answer}
                          onChange={(event) => updateRow(activeSection.id, row.id, "answer", event.target.value)}
                          rows="3"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.source || ""}
                          onChange={(event) => updateRow(activeSection.id, row.id, "source", event.target.value)}
                          placeholder="Ссылка на документ, комментарий или что уточнить"
                          rows="2"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(activeSection.id, row.id)} title="Удалить вопрос">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AgentFaqTemplate;
