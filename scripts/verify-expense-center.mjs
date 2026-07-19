import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  EXPENSE_CATEGORIES,
  defaultExpenseCenter,
} from "../src/modules/analytics/data/expensesData.js";
import {
  createExpense,
  createPaidExpenseUpdate,
  expandExpenseOccurrences,
  getEffectiveStatus,
  getExpenseAmountBase,
  getMonthExpenseSummary,
  getMonthlyRecurringRunRate,
  migrateLegacyExpenseCenter,
  nextRecurringDate,
  normalizeExpense,
  normalizeExpenseCenter,
} from "../src/modules/analytics/utils/expensesUtils.js";

assert.equal(defaultExpenseCenter.expenses.length, 0, "Expense center must not ship fake expenses");
assert.equal(defaultExpenseCenter.funds.length, 0, "Expense center must not ship fake funds");
assert.ok(EXPENSE_CATEGORIES.includes("Маркетинг и привлечение"));
assert.ok(EXPENSE_CATEGORIES.includes("Инфраструктура и IT"));
assert.ok(EXPENSE_CATEGORIES.includes("Команда и подрядчики"));

const migrated = migrateLegacyExpenseCenter(
  [
    { id: "expense-server-001", title: "VPS / сервер аналитики", amount: 80 },
    { id: "expense-smm-001", title: "Реальный новый расход", amount: 350 },
    { id: "real-expense", title: "Real invoice", amount: 240 },
  ],
  [
    { id: "fund-launch-wallet-001", title: "Стартовый бюджет запуска", amount: 50000 },
    { id: "real-fund", title: "Confirmed budget", amount: 1000 },
  ],
);
assert.deepEqual(migrated.expenses.map((item) => item.id), ["expense-smm-001", "real-expense"]);
assert.deepEqual(migrated.funds.map((item) => item.id), ["real-fund"]);
assert.equal(migrated.revision, 0);

const monthBudgets = normalizeExpenseCenter({
  budgets: [
    { category: "Маркетинг и привлечение", month: "2026-07", monthlyLimit: 1000 },
    { category: "Маркетинг и привлечение", month: "2026-08", monthlyLimit: 2000 },
  ],
}).budgets;
assert.deepEqual(
  monthBudgets.map((item) => [item.month, item.monthlyLimit]),
  [["2026-07", 1000], ["2026-08", 2000]],
);

const legacy = normalizeExpense({
  title: "Legacy server",
  category: "Серверы / инфраструктура",
  amount: 120,
  currency: "USDT",
  date: "2026-07-01",
  status: "План",
});
assert.equal(legacy.category, "Инфраструктура и IT");
assert.equal(legacy.subcategory, "Серверы и облако");
assert.equal(legacy.dueDate, "2026-07-01");
assert.equal(getEffectiveStatus(legacy, "2026-07-19"), "Просрочено");
assert.equal(
  getEffectiveStatus(normalizeExpense({ ...legacy, status: "Просрочено", dueDate: "2026-08-01" }), "2026-07-19"),
  "Запланировано",
);

const usd = createExpense({ title: "USD invoice", amount: 100, currency: "USD" });
assert.equal(getExpenseAmountBase(usd), 0, "Foreign currencies must not be treated as USDT without an explicit equivalent");
const usdt = createExpense({ title: "USDT invoice", amount: 100, currency: "USDT" });
assert.equal(getExpenseAmountBase(usdt), 100);

assert.equal(nextRecurringDate("2026-01-31", "Ежемесячно", 31), "2026-02-28");
assert.equal(nextRecurringDate("2026-02-28", "Ежемесячно", 31), "2026-03-31");
assert.equal(nextRecurringDate("2028-02-29", "Ежегодно", 29), "2029-02-28");

const monthly = createExpense({
  id: "monthly-server",
  title: "VPS",
  amount: 90,
  dueDate: "2026-01-31",
  recurrenceAnchorDay: 31,
  period: "Ежемесячно",
});
const monthlyOccurrences = expandExpenseOccurrences([monthly], "2026-01-01", "2026-04-30");
assert.deepEqual(
  monthlyOccurrences.map((item) => item.dueDate),
  ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"],
);

const weekly = createExpense({
  title: "Weekly ad budget",
  amount: 50,
  dueDate: "2026-07-01",
  period: "Еженедельно",
});
assert.equal(expandExpenseOccurrences([weekly], "2026-07-01", "2026-07-31").length, 5);
assert.equal(Math.round(getMonthlyRecurringRunRate([weekly])), 217);

const paidOnce = createExpense({
  title: "Paid article",
  amount: 700,
  dueDate: "2026-06-30",
  paidDate: "2026-07-10",
  status: "Оплачено",
});
const planned = createExpense({
  title: "Planned article",
  amount: 900,
  dueDate: "2026-07-24",
});
const summary = getMonthExpenseSummary([paidOnce, planned], "2026-07", "2026-07-19");
assert.equal(summary.actual, 700);
assert.equal(summary.forecast, 900);
assert.equal(summary.total, 1600);

const paidRecurring = createPaidExpenseUpdate(monthly, "2026-01-31");
assert.equal(paidRecurring.history.status, "Оплачено");
assert.equal(paidRecurring.history.period, "Разово");
assert.equal(paidRecurring.next.dueDate, "2026-02-28");
assert.equal(paidRecurring.next.recurrenceAnchorDay, 31);

const analyticsPage = await readFile(
  new URL("../src/modules/analytics/AnalyticsPage.jsx", import.meta.url),
  "utf8",
);
assert.match(analyticsPage, /\{ id: "session", label: "Сессия" \}/);
assert.match(analyticsPage, /\{ id: "expenses", label: "Расходы" \}/);
assert.match(analyticsPage, /expenses: "expenses"/);

const expenseBoard = await readFile(
  new URL("../src/modules/analytics/components/ExpensesBoard.jsx", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  expenseBoard,
  /EXPENSE_STATUSES\.filter\(\(status\) => status !== "Просрочено"\)/,
  "Paid status must not be selectable directly in the editor",
);
assert.match(expenseBoard, /supersus-expense-backup-v1/);
assert.match(expenseBoard, /shouldRecoverLocal/);

const contentApi = await readFile(
  new URL("../server/content-api.mjs", import.meta.url),
  "utf8",
);
assert.match(contentApi, /"atlas\.analytics\.expenseCenter\.v2"/);
assert.match(contentApi, /expense_revision_conflict/);
assert.match(contentApi, /finance_read_auth_required/);
assert.match(contentApi, /expenseCenterMutationQueue/);

console.log("Expense center verified: data model, recurrence, summaries, routing, and Session preservation.");
