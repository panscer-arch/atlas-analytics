import {
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_PERIODS,
  EXPENSE_PRIORITIES,
  EXPENSE_PROJECTS,
  EXPENSE_STATUSES,
  EXPENSE_SUBCATEGORIES,
  PAYMENT_METHODS,
  defaultBudgets,
  defaultExpenseCenter,
} from "../data/expensesData.js";

const LEGACY_CATEGORY_MAP = {
  "Маркетинг": ["Маркетинг и привлечение", "Performance-реклама"],
  "SMM / контент": ["Маркетинг и привлечение", "Креативы и продакшн"],
  "Разработка": ["Продукт и разработка", "Backend"],
  "Серверы / инфраструктура": ["Инфраструктура и IT", "Серверы и облако"],
  "Сервисы / подписки": ["Инфраструктура и IT", "API и внешние сервисы"],
  "Зарплаты": ["Команда и подрядчики", "Зарплаты"],
  "Legal / Security": ["Legal, compliance и аудит", "Юридические консультации"],
  "Дизайн": ["Продукт и разработка", "Дизайн продукта"],
  "Долги": ["Долги и обязательства", "Долги"],
  "Операционные": ["Операционные расходы", "Административные"],
  "Прочее": ["Операционные расходы", "Прочее"],
};

const LEGACY_STATUS_MAP = {
  "План": "Запланировано",
  "Счёт": "Счёт получен",
};

const LEGACY_DEMO_EXPENSES = new Map([
  ["expense-server-001", "VPS / сервер аналитики"],
  ["expense-smm-001", "Контент и оформление соцсетей"],
  ["expense-dev-001", "Доработки кабинета и аналитики"],
  ["expense-legal-001", "Web3 legal / security консультация"],
  ["expense-debt-001", "Долг по запуску"],
  ["expense-domain-001", "Домен supersussystem.com"],
  ["expense-content-api-001", "Content API / инфраструктурный сервис"],
]);
const LEGACY_DEMO_FUNDS = new Map([
  ["fund-launch-wallet-001", "Стартовый бюджет запуска"],
]);

function isUnchangedLegacyDemo(item, knownItems) {
  return knownItems.get(item?.id) === item?.title;
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

export function getEditableMoneyValue(value) {
  if (value === "" || value === null || value === undefined || Number(value) === 0) return "";
  return String(value);
}

export function readEditableMoneyValue(value) {
  return value === "" ? "" : value;
}

export function getTodayInputDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthKey(value) {
  if (!value) return "Без даты";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Без даты";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey || "")) return "Без месяца";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function shiftMonth(monthKey, delta) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthRange(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end, days: endDate.getDate(), year, month };
}

function resolveCategory(item = {}) {
  if (EXPENSE_CATEGORIES.includes(item.category)) {
    const available = EXPENSE_SUBCATEGORIES[item.category] || [];
    return [item.category, available.includes(item.subcategory) ? item.subcategory : available[0] || ""];
  }
  return LEGACY_CATEGORY_MAP[item.category] || ["Операционные расходы", "Прочее"];
}

export function createExpense(overrides = {}) {
  const category = overrides.category || "Маркетинг и привлечение";
  const expense = {
    id: uniqueId("expense"),
    title: "",
    category,
    subcategory: overrides.subcategory || EXPENSE_SUBCATEGORIES[category]?.[0] || "",
    amount: 0,
    baseAmount: 0,
    currency: "USDT",
    dueDate: getTodayInputDate(),
    paidDate: "",
    status: "Запланировано",
    priority: "Средний",
    owner: "",
    period: "Разово",
    vendor: "",
    paymentMethod: "",
    project: "Atlas",
    autoRenew: false,
    reminderDays: 3,
    documentUrl: "",
    comment: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  if (overrides.baseAmount === undefined && expense.currency === "USDT") {
    expense.baseAmount = expense.amount;
  }
  return normalizeExpense(expense);
}

export function normalizeExpense(item = {}) {
  const [category, subcategory] = resolveCategory(item);
  const currency = EXPENSE_CURRENCIES.includes(item.currency) ? item.currency : "USDT";
  const amount = finiteNonNegative(item.amount);
  const mappedStatus = LEGACY_STATUS_MAP[item.status] || item.status;
  const statusCandidate = mappedStatus === "Просрочено" ? "Запланировано" : mappedStatus;
  const dueDate = item.dueDate || item.date || getTodayInputDate();

  return {
    id: item.id || uniqueId("expense"),
    parentId: item.parentId || "",
    title: String(item.title || ""),
    category,
    subcategory,
    amount,
    baseAmount: finiteNonNegative(item.baseAmount ?? (currency === "USDT" ? amount : 0)),
    currency,
    dueDate,
    recurrenceAnchorDay: finiteNonNegative(
      item.recurrenceAnchorDay,
      new Date(`${dueDate}T00:00:00`).getDate() || 1,
    ),
    paidDate: item.paidDate || "",
    status: EXPENSE_STATUSES.includes(statusCandidate) ? statusCandidate : "Запланировано",
    priority: EXPENSE_PRIORITIES.includes(item.priority) ? item.priority : "Средний",
    owner: item.owner || "",
    period: EXPENSE_PERIODS.includes(item.period) ? item.period : "Разово",
    vendor: String(item.vendor || ""),
    paymentMethod: PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : "",
    project: EXPENSE_PROJECTS.includes(item.project) ? item.project : "Atlas",
    autoRenew: Boolean(item.autoRenew),
    reminderDays: finiteNonNegative(item.reminderDays, 3),
    documentUrl: String(item.documentUrl || ""),
    comment: String(item.comment || ""),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

export function normalizeExpenses(items) {
  return Array.isArray(items) ? items.map(normalizeExpense) : [];
}

export function createFund(overrides = {}) {
  const fund = {
    id: uniqueId("fund"),
    title: "",
    amount: 0,
    currency: "USDT",
    baseAmount: 0,
    date: getTodayInputDate(),
    source: "",
    comment: "",
    ...overrides,
  };
  if (overrides.baseAmount === undefined && fund.currency === "USDT") {
    fund.baseAmount = fund.amount;
  }
  return normalizeFund(fund);
}

export function normalizeFund(item = {}) {
  const currency = EXPENSE_CURRENCIES.includes(item.currency) ? item.currency : "USDT";
  const amount = finiteNonNegative(item.amount);
  return {
    id: item.id || uniqueId("fund"),
    title: String(item.title || ""),
    amount,
    baseAmount: finiteNonNegative(item.baseAmount ?? (currency === "USDT" ? amount : 0)),
    currency,
    date: item.date || getTodayInputDate(),
    source: String(item.source || ""),
    comment: String(item.comment || ""),
  };
}

export function normalizeFunds(items) {
  return Array.isArray(items) ? items.map(normalizeFund) : [];
}

export function normalizeBudgets(items) {
  const source = Array.isArray(items) ? items : [];
  const currentMonth = getMonthKey(getTodayInputDate());
  const normalized = [...defaultBudgets, ...source]
    .filter((item) => EXPENSE_CATEGORIES.includes(item?.category))
    .map((item) => ({
      category: item.category,
      month: /^\d{4}-\d{2}$/.test(item.month || "") ? item.month : currentMonth,
      monthlyLimit: finiteNonNegative(item.monthlyLimit),
      comment: String(item.comment || ""),
    }));
  return Array.from(
    new Map(normalized.map((item) => [`${item.category}:${item.month}`, item])).values(),
  );
}

export function normalizeExpenseCenter(value = {}) {
  return {
    version: 2,
    revision: finiteNonNegative(value.revision),
    expenses: normalizeExpenses(value.expenses),
    funds: normalizeFunds(value.funds),
    budgets: normalizeBudgets(value.budgets),
    activity: Array.isArray(value.activity) ? value.activity.slice(0, 200) : [],
    settings: {
      ...defaultExpenseCenter.settings,
      ...(value.settings || {}),
    },
  };
}

export function migrateLegacyExpenseCenter(expenses, funds) {
  const verifiedExpenses = Array.isArray(expenses)
    ? expenses.filter((item) => !isUnchangedLegacyDemo(item, LEGACY_DEMO_EXPENSES))
    : [];
  const verifiedFunds = Array.isArray(funds)
    ? funds.filter((item) => !isUnchangedLegacyDemo(item, LEGACY_DEMO_FUNDS))
    : [];
  return normalizeExpenseCenter({
    ...defaultExpenseCenter,
    expenses: normalizeExpenses(verifiedExpenses),
    funds: normalizeFunds(verifiedFunds),
  });
}

export function getEffectiveStatus(expense, today = getTodayInputDate()) {
  if (["Оплачено", "Отменено"].includes(expense.status)) return expense.status;
  if (expense.dueDate && expense.dueDate < today) return "Просрочено";
  return expense.status;
}

export function getStatusTone(status) {
  if (status === "Оплачено") return "paid";
  if (status === "Просрочено") return "overdue";
  if (status === "К оплате") return "due";
  if (status === "Счёт получен" || status === "На согласовании") return "invoice";
  if (status === "Отменено") return "cancelled";
  return "plan";
}

export function getPriorityTone(priority) {
  if (priority === "Критический" || priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

export function formatDate(value) {
  if (!value) return "Без даты";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getDaysUntil(value, now = new Date()) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function nextRecurringDate(value, period, anchorDay) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  if (period === "Еженедельно") date.setDate(date.getDate() + 7);
  if (period === "Ежемесячно" || period === "Ежеквартально") {
    const day = finiteNonNegative(anchorDay, date.getDate()) || date.getDate();
    const monthDelta = period === "Ежемесячно" ? 1 : 3;
    const targetMonth = date.getMonth() + monthDelta;
    const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastTargetDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    date.setFullYear(targetYear, normalizedMonth, Math.min(day, lastTargetDay));
  }
  if (period === "Ежегодно") {
    const month = date.getMonth();
    const day = finiteNonNegative(anchorDay, date.getDate()) || date.getDate();
    const targetYear = date.getFullYear() + 1;
    const lastTargetDay = new Date(targetYear, month + 1, 0).getDate();
    date.setFullYear(targetYear, month, Math.min(day, lastTargetDay));
  }
  return getTodayInputDate(date);
}

export function expandExpenseOccurrences(expenses, start, end) {
  const occurrences = [];
  normalizeExpenses(expenses).forEach((expense) => {
    if (expense.status === "Отменено") return;
    let dueDate = expense.dueDate;
    let guard = 0;
    while (dueDate <= end && guard < 400) {
      if (dueDate >= start) {
        occurrences.push({
          ...expense,
          occurrenceId: `${expense.id}:${dueDate}`,
          dueDate,
          virtual: dueDate !== expense.dueDate,
          status: dueDate === expense.dueDate ? expense.status : "Запланировано",
          paidDate: dueDate === expense.dueDate ? expense.paidDate : "",
        });
      }
      if (expense.period === "Разово") break;
      const nextDate = nextRecurringDate(dueDate, expense.period, expense.recurrenceAnchorDay);
      if (!nextDate || nextDate === dueDate) break;
      dueDate = nextDate;
      guard += 1;
    }
  });
  return occurrences.sort((first, second) => first.dueDate.localeCompare(second.dueDate));
}

export function getExpenseAmountBase(expense) {
  return expense.currency === "USDT" ? Number(expense.amount || 0) : Number(expense.baseAmount || 0);
}

export function getMonthExpenseSummary(expenses, monthKey, today = getTodayInputDate()) {
  const { start, end } = getMonthRange(monthKey);
  const occurrences = expandExpenseOccurrences(expenses, start, end);
  const actual = normalizeExpenses(expenses)
    .filter((item) => item.status === "Оплачено")
    .filter((item) => {
      const actualDate = item.paidDate || item.dueDate;
      return actualDate >= start && actualDate <= end;
    })
    .reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  const forecast = occurrences
    .filter((item) => !["Оплачено", "Отменено"].includes(getEffectiveStatus(item, today)))
    .reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  const overdue = occurrences
    .filter((item) => getEffectiveStatus(item, today) === "Просрочено")
    .reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  return { occurrences, actual, forecast, total: actual + forecast, overdue };
}

export function getMonthlyRecurringRunRate(expenses) {
  return normalizeExpenses(expenses)
    .filter((item) => !["Разово"].includes(item.period))
    .filter((item) => item.status !== "Отменено")
    .reduce((sum, item) => {
      const amount = getExpenseAmountBase(item);
      if (item.period === "Еженедельно") return sum + amount * 52 / 12;
      if (item.period === "Ежеквартально") return sum + amount / 3;
      if (item.period === "Ежегодно") return sum + amount / 12;
      return sum + amount;
    }, 0);
}

export function createPaidExpenseUpdate(expense, paidDate = getTodayInputDate()) {
  const normalized = normalizeExpense(expense);
  if (normalized.period === "Разово") {
    return {
      history: normalizeExpense({ ...normalized, status: "Оплачено", paidDate, updatedAt: new Date().toISOString() }),
      next: null,
    };
  }

  return {
    history: normalizeExpense({
      ...normalized,
      id: uniqueId("expense-payment"),
      parentId: normalized.id,
      period: "Разово",
      status: "Оплачено",
      paidDate,
      updatedAt: new Date().toISOString(),
    }),
    next: normalizeExpense({
      ...normalized,
      dueDate: nextRecurringDate(normalized.dueDate, normalized.period, normalized.recurrenceAnchorDay),
      paidDate: "",
      status: "Запланировано",
      updatedAt: new Date().toISOString(),
    }),
  };
}

export function createActivity(type, title, detail = "") {
  return {
    id: uniqueId("expense-activity"),
    type,
    title,
    detail,
    createdAt: new Date().toISOString(),
  };
}
