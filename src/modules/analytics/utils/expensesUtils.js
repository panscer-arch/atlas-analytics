import { EXPENSE_CATEGORIES, EXPENSE_PERIODS, EXPENSE_PRIORITIES, EXPENSE_STATUSES, defaultExpenses, defaultFunds } from "../data/expensesData";

export function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createExpense(overrides = {}) {
  return {
    id: `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    category: "Маркетинг",
    amount: 0,
    currency: "USDT",
    date: getTodayInputDate(),
    status: "План",
    priority: "Средний",
    owner: "",
    period: "Разово",
    vendor: "",
    comment: "",
    ...overrides,
  };
}

export function normalizeExpense(item = {}) {
  return {
    id: item.id || `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: item.title || "",
    category: EXPENSE_CATEGORIES.includes(item.category) ? item.category : "Прочее",
    amount: Number(item.amount || 0),
    currency: item.currency || "USDT",
    date: item.date || getTodayInputDate(),
    status: EXPENSE_STATUSES.includes(item.status) ? item.status : "План",
    priority: EXPENSE_PRIORITIES.includes(item.priority) ? item.priority : "Средний",
    owner: item.owner || "",
    period: EXPENSE_PERIODS.includes(item.period) ? item.period : "Разово",
    vendor: item.vendor || "",
    comment: item.comment || "",
  };
}

export function normalizeExpenses(items) {
  return Array.isArray(items) ? items.map(normalizeExpense) : defaultExpenses.map(normalizeExpense);
}

export function createFund(overrides = {}) {
  return {
    id: `fund-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    amount: 0,
    currency: "USDT",
    date: getTodayInputDate(),
    source: "",
    comment: "",
    ...overrides,
  };
}

export function normalizeFund(item = {}) {
  return {
    id: item.id || `fund-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: item.title || "",
    amount: Number(item.amount || 0),
    currency: item.currency || "USDT",
    date: item.date || getTodayInputDate(),
    source: item.source || "",
    comment: item.comment || "",
  };
}

export function normalizeFunds(items) {
  return Array.isArray(items) ? items.map(normalizeFund) : defaultFunds.map(normalizeFund);
}

export function mergeMissingDefaultObligations(items) {
  const normalized = normalizeExpenses(items);
  const existingIds = new Set(normalized.map((item) => item.id));
  const missingObligations = defaultExpenses
    .filter((item) => ["expense-domain-001", "expense-content-api-001"].includes(item.id))
    .filter((item) => !existingIds.has(item.id))
    .map(normalizeExpense);

  return [...normalized, ...missingObligations];
}

export function getMonthKey(value) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Без даты";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getStatusTone(status) {
  if (status === "Оплачено") return "paid";
  if (status === "Просрочено") return "overdue";
  if (status === "К оплате") return "due";
  if (status === "Счёт") return "invoice";
  return "plan";
}

export function getPriorityTone(priority) {
  if (priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

export function formatDate(value) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getDaysUntil(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

export function getExpenseSummary(expenses) {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = expenses.filter((item) => item.status === "Оплачено").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const due = expenses.filter((item) => ["К оплате", "Просрочено", "Счёт"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recurring = expenses.filter((item) => item.period !== "Разово").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const debts = expenses.filter((item) => item.category === "Долги").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const urgent = expenses.filter((item) => item.priority === "Высокий" && item.status !== "Оплачено").length;

  return { total, paid, due, recurring, debts, urgent };
}
