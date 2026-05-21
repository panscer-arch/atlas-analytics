import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const AGENT_KNOWLEDGE_STORAGE_KEY = "atlas.analytics.agentKnowledgeTemplate.v1";

const defaultKnowledgeSections = [
  {
    id: "general",
    title: "ОБЩАЯ ИНФОРМАЦИЯ",
    rows: [
      ["Название проекта", "Atlas System", "Основное публичное название проекта."],
      ["Слоган", "Просто. Прозрачно. Прибыльно", "Использовать осторожно: без обещаний гарантированного дохода."],
      ["Тип проекта", "Web3-экосистема", "Проект работает через кошелек и смарт-контракт."],
      ["Основной продукт", "Smart Cycle 1", "Базовый продукт с циклами участия."],
      ["Тип системы", "Смарт-контрактная модель взаимного финансирования", "Не описывать как банк, вклад или инвестиционный фонд."],
      ["Регистрация", "Первое подключение MetaMask", "Email/пароль не используются."],
      ["DAO", "Да", "Управление и голосования планируются через DAO-механику."],
      ["Партнерская программа", "Да", "Линейная модель со статусами, компрессией и lifetime-структурой."],
    ],
  },
  {
    id: "blockchain",
    title: "БЛОКЧЕЙН / WEB3",
    rows: [
      ["Основной блокчейн", "BSC", "Основная сеть для текущей механики."],
      ["Поддерживаемые сети", "BSC / Ethereum / Polygon", "Уточнять актуальность перед публикацией."],
      ["Стандарт USDT", "BEP20", "Для BSC-сети."],
      ["Газ для транзакций", "BNB", "У участника должен быть небольшой баланс BNB для комиссии сети."],
      ["Проверка транзакций", "BscScan", "Участник может проверить хэш транзакции в обозревателе."],
      ["Смарт-контракт", "Да", "Средства и правила цикла исполняются смарт-контрактом."],
      ["Подключение кошелька", "MetaMask / WalletConnect", "Основной вход через MetaMask, WalletConnect как возможная поддержка."],
    ],
  },
  {
    id: "payments",
    title: "ВАЛЮТЫ И ПЛАТЕЖИ",
    rows: [
      ["Основная валюта", "USDT", "Расчеты в долларах через USDT."],
      ["Сеть USDT", "BEP20", "Участник должен выбирать правильную сеть при переводах."],
      ["Минимальный депозит", "10$", "Минимальная сумма для запуска цикла."],
      ["Комиссия платформы", "10%", "Удерживается автоматически по правилам смарт-контракта."],
      ["С чего удерживается комиссия", "С дельты и бонусов", "Тело депозита не является базой комиссии платформы."],
      ["Новые деньги", "Любой новый депозит после участия", "Даже если участник вывел средства и сразу завел их обратно."],
    ],
  },
  {
    id: "smart-cycle",
    title: "СМАРТ-ЦИКЛЫ",
    rows: [
      ["Типы циклов", "Lockup Flow / Daily Flow", "Две логики участия: фиксированный срок и ежедневный поток."],
      ["Минимальный срок", "10 минут", "Тестовый цикл Contract Test."],
      ["Максимальный срок", "200 дней", "Daily Flow."],
      ["Минимальная сумма", "10$", "Стартовая сумма участия."],
      ["Активация цикла", "Создание любого депозита", "Покупка тарифа означает запуск цикла."],
      ["Завершение цикла", "По истечении срока тарифа", "После завершения появляется возможность Claim."],
      ["Выплаты зависят", "От ликвидности смарт-контракта", "Нельзя обещать гарантированную выплату в конкретный момент."],
    ],
  },
  {
    id: "lockup-flow",
    title: "ФИКСИРОВАННЫЕ ЦИКЛЫ",
    rows: [
      ["Contract Test", "10 минут / 0%", "Тестовый цикл для проверки механики."],
      ["Launch", "1 день / +0.3%", "Короткий стартовый цикл."],
      ["Momentum", "5 дней / +2%", "Цикл средней длительности."],
      ["Premiere", "10 дней / +5%", "Цикл на 10 дней."],
      ["President", "20 дней / +12%", "Длинный lockup-цикл."],
      ["Imperium", "30 дней / +22.5%", "Максимальный lockup-цикл из текущей линейки."],
    ],
  },
  {
    id: "daily-flow",
    title: "ЕЖЕДНЕВНЫЙ ПОТОК",
    rows: [
      ["Срок", "200 дней", "Длительная модель с ежедневным начислением."],
      ["Ежедневная ставка", "0.6-0.8%", "Формулировать как расчетную модель, не как гарантию."],
      ["Максимальная дельта", "120-160%", "Диапазон зависит от выбранного сценария."],
      ["Периодичность выплат", "Ежедневно", "При наличии условий для выплаты."],
      ["Тело включено", "Да", "Возврат тела учитывается в общей модели цикла."],
      ["Порог Elite", "2000$", "Минимальный объем для Elite-логики."],
    ],
  },
  {
    id: "user-journey",
    title: "ПУТЬ УЧАСТНИКА",
    rows: [
      ["Открытие сайта", "Участник заходит в личный кабинет", "Первый шаг до подключения кошелька."],
      ["Регистрация", "Нажатие «Подключить кошелек»", "Первое подключение MetaMask считается регистрацией."],
      ["Баланс", "Подтягивается из MetaMask", "Кабинет показывает доступные средства кошелька."],
      ["Выбор тарифа", "Вкладка «Циклы»", "Участник выбирает тариф и сумму."],
      ["Создание депозита", "Средства списываются в смарт-контракт", "После подтверждения транзакции цикл активен."],
      ["Кнопка Claim", "Появляется после завершения цикла", "Claim возвращает доступную сумму по правилам контракта."],
      ["Повторное участие", "Новый депозит после предыдущего цикла", "Считается новым входом средств в систему."],
    ],
  },
  {
    id: "claim-withdrawals",
    title: "CLAIM / ВЫВОД",
    rows: [
      ["Что такое Claim", "Запрос выплаты из смарт-контракта", "Кнопка появляется после завершения цикла."],
      ["Что получает участник", "Тело плюс доступная дельта", "С учетом правил тарифа, ликвидности и комиссии."],
      ["Куда приходит выплата", "На подключенный кошелек", "Не на внутренний банковский счет."],
      ["Комиссия сети", "Оплачивается в BNB", "Это комиссия блокчейна, не комиссия платформы."],
      ["Ошибки транзакции", "Проверяются по хэшу в BscScan", "Нужен блок FAQ по статусам failed/pending/success."],
    ],
  },
  {
    id: "mlm",
    title: "ПАРТНЕРСКАЯ ПРОГРАММА",
    rows: [
      ["Тип партнерки", "Линейная модель", "Иерархические статусы и компрессия."],
      ["Компрессия", "Да", "Система учитывает разницу уровней по структуре."],
      ["Глубина структуры", "Неограниченная", "Unlimited depth в русской формулировке."],
      ["Минимальный статус", "Start", "Базовый статус."],
      ["Максимальный статус", "Executive", "Верхний статус текущей таблицы."],
      ["Максимальный процент", "60%", "Бонус от полученной дельты структуры."],
      ["Матчинг-бонус", "До 25%", "С дохода по партнерской программе лично приглашенного участника, начиная с Master."],
      ["База начисления", "От дельты", "Не от тела депозита."],
      ["Момент начисления", "В момент активации цикла приглашенным", "Сразу рассчитывается ожидаемая дельта по тарифу."],
      ["Активация партнерки", "Минимальный депозит 10$", "После этого появляется возможность работать по реферальной ссылке."],
      ["Пожизненная структура", "Да", "Структура закрепляется долгосрочно."],
    ],
  },
  {
    id: "statuses",
    title: "СТАТУСЫ",
    rows: [
      ["Статусы Builder", "1-7", "Группа строительских статусов."],
      ["Статусы Master", "1-7", "Группа мастер-статусов."],
      ["Высшие статусы", "Strategist / Ambassador / Architect / Executive", "Финальные уровни карьерной лестницы."],
      ["Личный активный объем", "От 10$ до 18 000$", "По таблице статусов."],
      ["Объем первой линии", "От 300$ до 180 000$", "Нужен для квалификации ряда статусов."],
      ["Глубинный активный объем", "От 2 000$ до 2 000 000$", "Требуется не для всех статусов."],
      ["Цвета", "Оранжевый / белый", "Визуальная дифференциация статусов."],
      ["Иконки", "Шлемы", "Визуальная метафора статусов."],
    ],
  },
  {
    id: "revshare",
    title: "РЕВШЕР",
    rows: [
      ["Минимальная ставка", "30%", "Для арбитражной/трафик-модели."],
      ["Максимальная ставка", "45%", "Уточнять условия квалификации."],
      ["Пожизненная привязка", "Да", "Привязка результата на долгий срок."],
      ["Traffic Storm", "Да", "Отдельная промо-механика."],
      ["Топ бонус", "5000$", "Нужно уточнить условия получения."],
      ["Модель выплат", "30/70", "Требует отдельного описания для участников."],
    ],
  },
  {
    id: "dao",
    title: "DAO",
    rows: [
      ["10$ =", "1 голос", "Принцип веса голоса."],
      ["Управление", "Да", "DAO-механика."],
      ["Голосование", "На базе DAO", "Нужен отдельный FAQ по тому, за что голосуют участники."],
      ["Перезапуски циклов", "Возможны через DAO", "Идея серий циклов/эпох с управляемым перезапуском."],
    ],
  },
  {
    id: "cryptowallet",
    title: "КРИПТОКОШЕЛЕК",
    rows: [
      ["Тип кошелька", "Некастодиальный", "Пользователь сам хранит доступ."],
      ["Seed-фраза", "Да", "Нельзя передавать никому, включая поддержку."],
      ["WalletConnect", "Да", "Дополнительный способ подключения кошелька."],
      ["MetaMask", "Основной способ входа", "Регистрация через email не используется."],
      ["Восстановление доступа", "Через seed-фразу пользователя", "Проект не может восстановить кошелек участника."],
    ],
  },
  {
    id: "p2p",
    title: "P2P-ОБМЕН",
    rows: [
      ["Эскроу", "Да", "Механика безопасной сделки требует отдельного описания."],
      ["P2P", "Да", "Покупка/продажа между участниками."],
    ],
  },
  {
    id: "swap-dao",
    title: "DAO-ОБМЕН",
    rows: [
      ["Тип DEX", "AMM", "Автоматический маркет-мейкер."],
      ["Аналоги", "PancakeSwap / Uniswap", "Использовать как понятные сравнения, не как обещание идентичности."],
    ],
  },
  {
    id: "security",
    title: "БЕЗОПАСНОСТЬ",
    rows: [
      ["Открытый код", "Планируется", "Важно для доверия к смарт-контракту."],
      ["Аудит", "Планируется", "Нужно указать статус и ссылку после готовности."],
      ["Приватные ключи", "Не запрашиваются", "Критичный пункт для FAQ и поддержки."],
      ["Проверка контракта", "Через BscScan", "После публикации добавить ссылку на контракт."],
      ["Фишинг", "Предупреждать участников", "Не переходить по непроверенным ссылкам и не вводить seed-фразу."],
    ],
  },
  {
    id: "legal",
    title: "ЮРИДИЧЕСКИЙ БЛОК",
    rows: [
      ["Не является инвестицией", "Да", "Запрещено позиционировать как инвестиционный продукт."],
      ["Дисклеймер о рисках", "Да", "Нужно показывать перед участием и в базе знаний."],
      ["Гарантии дохода", "Нет", "Слово «гарантия» запрещено в обещаниях дохода."],
      ["Запрос помощи", "Не гарантирует ее получение", "Важная формулировка для кассы взаимопомощи."],
      ["Ответственность участника", "Самостоятельное решение", "Пользователь сам оценивает риски Web3."],
    ],
  },
  {
    id: "risks",
    title: "РИСКИ",
    rows: [
      ["Риск ликвидности", "Есть", "Выплаты зависят от доступной ликвидности смарт-контракта."],
      ["Риск смарт-контракта", "Есть", "Даже после аудита технический риск нельзя исключить полностью."],
      ["Риск сети", "Есть", "Перегрузка сети, рост газа или ошибка RPC могут влиять на транзакции."],
      ["Риск неверной сети", "Есть", "Участник должен использовать правильную сеть и стандарт токена."],
      ["Регуляторный риск", "Есть", "Правила в разных юрисдикциях могут отличаться."],
      ["Прошлые результаты", "Не гарантируют будущие", "Безопасная формулировка для AI-агента и промо."],
    ],
  },
  {
    id: "safe-wording",
    title: "БЕЗОПАСНЫЕ ФОРМУЛИРОВКИ",
    rows: [
      ["Разрешенная формулировка", "Расчетная модель", "Вместо «гарантированный доход»."],
      ["Разрешенная формулировка", "Потенциальная дельта", "Вместо «фиксированная прибыль»."],
      ["Разрешенная формулировка", "Участие через смарт-контракт", "Вместо «вклад» или «инвестиция»."],
      ["Запрещать в промо", "Без риска / гарантия / пассивный доход / стабильный заработок / окупаемость", "AI-агент должен переформулировать такие запросы безопасно."],
      ["Дисклеймер", "Не финансовая рекомендация", "Добавлять в ответы про деньги, циклы и дельту."],
      ["Решение участника", "Участник самостоятельно принимает решение", "Нужная базовая юридическая рамка."],
    ],
  },
  {
    id: "analytics",
    title: "АНАЛИТИКА",
    rows: [
      ["Средний депозит", "1000$", "Рабочая гипотеза для модели аналитики."],
      ["Средний срок активности", "5 месяцев", "Рабочая гипотеза удержания."],
      ["Регистрация", "Первое подключение MetaMask", "Ключевая метрика воронки Web3."],
      ["Первый депозит", "Первый созданный цикл", "Отделять от подключения кошелька."],
      ["Повторный депозит", "Любой депозит после предыдущего участия", "Считать новыми деньгами в смарт-контракте."],
      ["Обязательства", "Тело депозитов плюс начисленная дельта", "То, что сейчас лежит в депозитах и должно быть выплачено по правилам."],
      ["Web3-воронка", "Подключение кошелька -> первый депозит -> повтор", "Показывает, где участники застревают."],
    ],
  },
  {
    id: "crm",
    title: "CRM / СОСТОЯНИЯ УЧАСТНИКА",
    rows: [
      ["Зарегистрирован", "Да", "Кошелек подключен впервые."],
      ["Сделал первый депозит", "Да", "Создал первый цикл."],
      ["Активный", "Да", "Есть активный цикл или недавняя активность."],
      ["Неактивный", "Да", "Нет активного цикла или давно не было действий."],
      ["Builder", "Да", "Партнерский статус."],
      ["Крупный участник", "Да", "Whale-сегмент для аналитики."],
      ["Подключил кошелек, но не внес депозит", "Да", "Отдельный этап воронки."],
      ["Сделал первый депозит, но не реинвестировал", "Да", "Отдельный этап удержания."],
    ],
  },
  {
    id: "brand",
    title: "КОНТЕНТ И БРЕНД",
    rows: [
      ["Тон коммуникации", "Спокойный / технологичный", "Объяснять просто, без давления."],
      ["Основные акценты", "Прозрачность / DAO / lifetime", "Использовать как смысловые опоры."],
      ["Запрещенные слова", "Гарантия / инвестиция", "Не использовать в обещаниях результата."],
      ["Позиционирование", "Касса взаимопомощи / money sharing / взаимное финансирование / алгоритмическая модель", "Под каждый вариант можно делать отдельный лендинг."],
      ["Elite+", "Клуб для удержания Elite более 2 месяцев", "Нужен отдельный блок в партнерке и базе знаний."],
    ],
  },
  {
    id: "materials-education",
    title: "МАТЕРИАЛЫ / ОБУЧЕНИЕ",
    rows: [
      ["База знаний", "Презентация, FAQ, ролики, white paper, инструкции", "Связать с разделом «Материалы»."],
      ["Видеоинструкции", "Регистрация, создание цикла, Claim, партнерка", "Нужны для снижения нагрузки на поддержку."],
      ["Статья без кабинета", "Как взаимодействовать со смарт-контрактом напрямую", "Отдельный материал для продвинутых пользователей."],
      ["Адреса контрактов", "Добавить после публикации", "Официальные адреса нужны в безопасности и FAQ."],
      ["Официальные каналы", "Добавить ссылки", "Сайт, Telegram/Discord, поддержка, соцсети."],
      ["Комплект бренда", "Баннеры, лендинги, презентации", "Для партнеров и арбитражников."],
    ],
  },
  {
    id: "support-incidents",
    title: "ПОДДЕРЖКА / ИНЦИДЕНТЫ",
    rows: [
      ["Куда писать", "Официальная поддержка проекта", "Добавить ссылку после утверждения канала."],
      ["Что приложить", "Адрес кошелька, хэш транзакции, сеть, скриншот ошибки", "Этого достаточно для диагностики."],
      ["Что нельзя отправлять", "Seed-фразу и приватный ключ", "Поддержка никогда не запрашивает доступ к кошельку."],
      ["Статус pending", "Проверить BscScan и сеть", "Инструкция для зависших транзакций."],
      ["Статус failed", "Проверить газ, сеть, баланс и ошибку контракта", "Нужен шаблон ответа поддержки."],
      ["Фишинг", "Проверять домен и официальные ссылки", "Снизить риск перехода на поддельный сайт."],
    ],
  },
  {
    id: "faq",
    title: "ЧАСТЫЕ ВОПРОСЫ УЧАСТНИКОВ",
    rows: [
      ["Как зарегистрироваться", "Подключить MetaMask", "Первое подключение кошелька считается регистрацией."],
      ["Почему нужен BNB", "Для оплаты газа сети", "Без BNB транзакция в BSC не пройдет."],
      ["Когда можно вывести", "После завершения цикла через Claim", "Не обещать моментальную выплату без условий."],
      ["Почему выплата может не пройти", "Недостаточно газа, ошибка сети, ликвидность, неверная сеть", "Нужен FAQ по ошибкам транзакций."],
      ["Можно ли участвовать без кабинета", "Через смарт-контракт при наличии инструкции", "Нужна отдельная статья."],
      ["Где посмотреть транзакцию", "BscScan", "Участник проверяет хэш транзакции."],
      ["Можно ли потерять доступ", "Да, если потерять seed-фразу", "Проект не хранит seed-фразы."],
    ],
  },
].map((section) => ({
  ...section,
  rows: section.rows.map(([parameter, value, source], index) => ({
    id: `${section.id}-${index}`,
    parameter,
    value,
    source: source || "",
  })),
}));

const defaultNotes = [
  {
    id: "notes-1",
    title: "Свободные заметки",
    text: "Добавляй сюда спорные формулировки, новые параметры, уточнения для AI-агента и варианты ответов, которые нужно потом перенести в таблицы.",
  },
];

const defaultTemplate = { sections: defaultKnowledgeSections, notes: defaultNotes };

function hydrateRows(defaultRows, savedRows = []) {
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      parameter: savedRow.parameter || defaultRow.parameter,
      value: savedRow.value || defaultRow.value,
      source: savedRow.source || savedRow.comment || defaultRow.source,
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id))
    .map((row) => ({
      ...row,
      source: row.source || row.comment || "",
    }));

  return [...hydratedDefaultRows, ...customRows];
}

function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultKnowledgeSections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      title: defaultSection.title,
      rows: hydrateRows(defaultSection.rows, savedSection.rows),
    };
  });
  const customSections = template.sections
    .filter((section) => !defaultKnowledgeSections.some((defaultSection) => defaultSection.id === section.id))
    .map((section) => ({
      ...section,
      rows: (section.rows || []).map((row) => ({ ...row, source: row.source || row.comment || "" })),
    }));

  return {
    sections: [...sections, ...customSections],
    notes: Array.isArray(template.notes) && template.notes.length ? template.notes : defaultNotes,
  };
}

function readStoredTemplate() {
  if (typeof window === "undefined") {
    return defaultTemplate;
  }

  try {
    const saved = window.localStorage.getItem(AGENT_KNOWLEDGE_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultTemplate;
  } catch {
    return defaultTemplate;
  }
}

function persistTemplate(template) {
  try {
    window.localStorage.setItem(AGENT_KNOWLEDGE_STORAGE_KEY, JSON.stringify(template));
    saveServerContent(AGENT_KNOWLEDGE_STORAGE_KEY, template);
  } catch {
    // Документ продолжит работать до перезагрузки страницы, даже если localStorage недоступен.
  }
}

function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    parameter: "",
    value: "",
    source: "",
  };
}

function createNote() {
  return {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Новый блок",
    text: "",
  };
}

function AgentKnowledgeTemplate() {
  const [template, setTemplate] = useState(readStoredTemplate);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_KNOWLEDGE_STORAGE_KEY).then((savedTemplate) => {
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
      persistTemplate(next);
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

  function updateNote(noteId, field, value) {
    updateTemplate((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === noteId ? { ...note, [field]: value } : note)),
    }));
  }

  function addNote() {
    updateTemplate((current) => ({ ...current, notes: [...current.notes, createNote()] }));
  }

  function removeNote(noteId) {
    updateTemplate((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== noteId) }));
  }

  function resetTemplate() {
    updateTemplate(() => defaultTemplate);
  }

  return (
    <section className="analytics-surface analytics-agent-template mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Параметры AI-агента</span>
          <h2 className="analytics-agent-template-title">Параметры Atlas System</h2>
          <p className="analytics-page-subtitle mb-0">
            Русскоязычная база параметров для обучения AI-агента Atlas System. В третьем столбике можно хранить ссылку на документ, источник или короткое описание.
          </p>
        </div>
        <AnalyticsActionButton variant="secondary" size="sm" onClick={resetTemplate}>
          Сбросить шаблон
        </AnalyticsActionButton>
      </div>

      <div className="analytics-agent-template-grid">
        {template.sections.map((section) => (
          <div key={section.id} className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <h3>{section.title}</h3>
              <AnalyticsActionButton variant="primary" size="sm" onClick={() => addRow(section.id)}>
                + строка
              </AnalyticsActionButton>
            </div>
            <div className="table-responsive">
              <table className="table analytics-table analytics-agent-template-table mb-0">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Значение</th>
                    <th>Ссылка / описание</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.parameter}
                          onChange={(event) => updateRow(section.id, row.id, "parameter", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.value}
                          onChange={(event) => updateRow(section.id, row.id, "value", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.source || ""}
                          onChange={(event) => updateRow(section.id, row.id, "source", event.target.value)}
                          placeholder="Ссылка на документ или пояснение по значению"
                          rows="2"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(section.id, row.id)} title="Удалить строку">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-agent-notes">
        <div className="analytics-agent-template-card-head">
          <h3>ДОПОЛНИТЕЛЬНЫЕ ИДЕИ / ЗАМЕТКИ</h3>
          <AnalyticsActionButton variant="primary" size="sm" onClick={addNote}>
            + блок
          </AnalyticsActionButton>
        </div>
        <div className="analytics-agent-notes-grid">
          {template.notes.map((note) => (
            <div key={note.id} className="analytics-agent-note-card">
              <input
                className="analytics-agent-template-input analytics-agent-note-title"
                value={note.title}
                onChange={(event) => updateNote(note.id, "title", event.target.value)}
                placeholder="Название блока"
              />
              <textarea
                className="analytics-agent-template-input"
                value={note.text}
                onChange={(event) => updateNote(note.id, "text", event.target.value)}
                placeholder="Свободные идеи, заметки, спорные формулировки"
                rows="6"
              />
              <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeNote(note.id)}>
                Удалить блок
              </AnalyticsActionButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AgentKnowledgeTemplate;
