export const EXPENSE_CENTER_STORAGE_KEY = "atlas.analytics.expenseCenter.v2";
export const EXPENSES_STORAGE_KEY = "atlas.analytics.expenses.v1";
export const EXPENSE_FUNDS_STORAGE_KEY = "atlas.analytics.expenseFunds.v1";

export const EXPENSE_CATEGORY_GROUPS = [
  {
    category: "Маркетинг и привлечение",
    subcategories: [
      "Блогеры и инфлюенсеры",
      "Telegram-реклама",
      "PR и статьи",
      "Performance-реклама",
      "Листинги и каталоги",
      "Партнёрская / RevShare",
      "SEO и репутация",
      "Вебинары и мероприятия",
      "Креативы и продакшн",
      "Email и outreach",
    ],
  },
  {
    category: "Продукт и разработка",
    subcategories: [
      "Frontend",
      "Backend",
      "Смарт-контракты",
      "QA и тестирование",
      "Интеграции и автоматизация",
      "Локализация",
      "Дизайн продукта",
    ],
  },
  {
    category: "Инфраструктура и IT",
    subcategories: [
      "Серверы и облако",
      "Базы данных и хранение",
      "Домены, SSL и CDN",
      "API и внешние сервисы",
      "Безопасность и мониторинг",
      "Почта и коммуникации",
      "Резервное копирование",
    ],
  },
  {
    category: "Команда и подрядчики",
    subcategories: [
      "Зарплаты",
      "Бонусы",
      "Фриланс и подряд",
      "Рекрутинг",
      "Обучение",
      "Региональные представители",
    ],
  },
  {
    category: "Legal, compliance и аудит",
    subcategories: [
      "Регистрация компаний",
      "Юридические консультации",
      "Аудит смарт-контрактов",
      "Бухгалтерия и налоги",
      "KYC / AML",
      "Лицензии и документы",
    ],
  },
  {
    category: "Операционные расходы",
    subcategories: [
      "Комиссии и платежи",
      "Оборудование",
      "Связь",
      "Офис и коворкинг",
      "Поездки и встречи",
      "Административные",
      "Прочее",
    ],
  },
  {
    category: "Долги и обязательства",
    subcategories: ["Долги", "Займы", "Отложенные платежи", "Возвраты"],
  },
  {
    category: "Резерв",
    subcategories: ["Непредвиденные расходы", "Страховой резерв", "Резерв запуска"],
  },
];

export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_GROUPS.map((group) => group.category);
export const EXPENSE_SUBCATEGORIES = Object.fromEntries(
  EXPENSE_CATEGORY_GROUPS.map((group) => [group.category, group.subcategories]),
);
export const EXPENSE_STATUSES = [
  "Запланировано",
  "На согласовании",
  "Счёт получен",
  "К оплате",
  "Оплачено",
  "Просрочено",
  "Отменено",
];
export const EXPENSE_PRIORITIES = ["Критический", "Высокий", "Средний", "Низкий"];
export const EXPENSE_PERIODS = ["Разово", "Еженедельно", "Ежемесячно", "Ежеквартально", "Ежегодно"];
export const EXPENSE_OWNERS = ["", "Digitex", "Bruno", "Gem", "Rotenberg", "Команда"];
export const EXPENSE_CURRENCIES = ["USDT", "USD", "EUR", "RUB"];
export const PAYMENT_METHODS = ["", "USDT BEP-20", "Карта", "Банковский перевод", "Наличные", "Другое"];
export const EXPENSE_PROJECTS = ["Atlas", "SuperSUS", "Общее", "Другое"];

export const EXPENSE_QUICK_TEMPLATES = [
  ["Статья на крипторесурсе", "Маркетинг и привлечение", "PR и статьи"],
  ["Оплата блогеру", "Маркетинг и привлечение", "Блогеры и инфлюенсеры"],
  ["Telegram-размещение", "Маркетинг и привлечение", "Telegram-реклама"],
  ["Рекламный бюджет", "Маркетинг и привлечение", "Performance-реклама"],
  ["Зарплата", "Команда и подрядчики", "Зарплаты"],
  ["Оплата подрядчику", "Команда и подрядчики", "Фриланс и подряд"],
  ["Сервер / VPS", "Инфраструктура и IT", "Серверы и облако"],
  ["Подписка на сервис", "Инфраструктура и IT", "API и внешние сервисы"],
  ["Продление домена", "Инфраструктура и IT", "Домены, SSL и CDN"],
  ["Аудит смарт-контракта", "Legal, compliance и аудит", "Аудит смарт-контрактов"],
  ["Юридическая консультация", "Legal, compliance и аудит", "Юридические консультации"],
  ["Комиссия за перевод", "Операционные расходы", "Комиссии и платежи"],
];

export const defaultExpenses = [];
export const defaultFunds = [];
export const defaultBudgets = [];

export const defaultExpenseCenter = {
  version: 2,
  revision: 0,
  expenses: defaultExpenses,
  funds: defaultFunds,
  budgets: defaultBudgets,
  activity: [],
  settings: {
    baseCurrency: "USDT",
    defaultReminderDays: 3,
  },
};
