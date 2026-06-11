import { useEffect, useMemo, useRef, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import formatCurrency from "../utils/formatCurrency";

export const EXPENSES_STORAGE_KEY = "atlas.analytics.expenses.v1";

const EXPENSE_CATEGORIES = [
  "Маркетинг",
  "SMM / контент",
  "Разработка",
  "Серверы / инфраструктура",
  "Сервисы / подписки",
  "Зарплаты",
  "Legal / Security",
  "Дизайн",
  "Долги",
  "Операционные",
  "Прочее",
];

const EXPENSE_STATUSES = ["План", "Счёт", "К оплате", "Оплачено", "Просрочено"];
const EXPENSE_PRIORITIES = ["Высокий", "Средний", "Низкий"];
const EXPENSE_PERIODS = ["Разово", "Ежемесячно", "Еженедельно", "Ежегодно"];
const EXPENSE_OWNERS = ["", "Digitex", "Bruno", "Gem", "Rotenberg", "Команда"];

const defaultExpenses = [
  {
    id: "expense-server-001",
    title: "VPS / сервер аналитики",
    category: "Серверы / инфраструктура",
    amount: 80,
    currency: "USDT",
    date: "2026-06-15",
    status: "К оплате",
    priority: "Высокий",
    owner: "Digitex",
    period: "Ежемесячно",
    vendor: "VPS / hosting",
    comment: "Основной сервер аналитики, content API и публичная сборка.",
  },
  {
    id: "expense-smm-001",
    title: "Контент и оформление соцсетей",
    category: "SMM / контент",
    amount: 350,
    currency: "USDT",
    date: "2026-06-20",
    status: "План",
    priority: "Средний",
    owner: "Команда",
    period: "Разово",
    vendor: "SMM",
    comment: "Посты, визуалы, упаковка каналов Atlas.",
  },
  {
    id: "expense-dev-001",
    title: "Доработки кабинета и аналитики",
    category: "Разработка",
    amount: 1200,
    currency: "USDT",
    date: "2026-06-25",
    status: "Счёт",
    priority: "Высокий",
    owner: "Digitex",
    period: "Разово",
    vendor: "Frontend / backend",
    comment: "Личный кабинет, аналитика, задачи, контент-план, security review.",
  },
  {
    id: "expense-legal-001",
    title: "Web3 legal / security консультация",
    category: "Legal / Security",
    amount: 700,
    currency: "USDT",
    date: "2026-06-30",
    status: "План",
    priority: "Высокий",
    owner: "Digitex",
    period: "Разово",
    vendor: "External review",
    comment: "Вычитка White Paper, risk wording, audit/security status.",
  },
  {
    id: "expense-debt-001",
    title: "Долг по запуску",
    category: "Долги",
    amount: 500,
    currency: "USDT",
    date: "2026-07-01",
    status: "К оплате",
    priority: "Средний",
    owner: "Digitex",
    period: "Разово",
    vendor: "Internal",
    comment: "Фиксировать отдельно от операционных расходов, чтобы видеть долговую нагрузку.",
  },
];

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createExpense(overrides = {}) {
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

function normalizeExpense(item = {}) {
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

function normalizeExpenses(items) {
  return Array.isArray(items) ? items.map(normalizeExpense) : defaultExpenses.map(normalizeExpense);
}

function getMonthKey(value) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Без даты";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getStatusTone(status) {
  if (status === "Оплачено") return "paid";
  if (status === "Просрочено") return "overdue";
  if (status === "К оплате") return "due";
  if (status === "Счёт") return "invoice";
  return "plan";
}

function getPriorityTone(priority) {
  if (priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

function formatDate(value) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getExpenseSummary(expenses) {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = expenses.filter((item) => item.status === "Оплачено").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const due = expenses.filter((item) => ["К оплате", "Просрочено", "Счёт"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recurring = expenses.filter((item) => item.period !== "Разово").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const debts = expenses.filter((item) => item.category === "Долги").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const urgent = expenses.filter((item) => item.priority === "Высокий" && item.status !== "Оплачено").length;

  return { total, paid, due, recurring, debts, urgent };
}

function ExpensesBoard() {
  const [expenses, setExpenses] = useState(() => normalizeExpenses(defaultExpenses));
  const [newExpense, setNewExpense] = useState(() => createExpense());
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [monthFilter, setMonthFilter] = useState("Все");
  const [saveState, setSaveState] = useState("Сохранено");
  const [isLoaded, setIsLoaded] = useState(false);
  const saveRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(EXPENSES_STORAGE_KEY).then((savedExpenses) => {
      if (!isMounted) return;
      const nextExpenses = normalizeExpenses(Array.isArray(savedExpenses) ? savedExpenses : defaultExpenses);
      setExpenses(nextExpenses);
      try {
        window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(nextExpenses));
      } catch {
        // Серверная версия уже загружена в состояние страницы.
      }
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;

    const saveTimer = window.setTimeout(() => {
      const requestId = saveRef.current + 1;
      saveRef.current = requestId;
      const normalized = normalizeExpenses(expenses);
      setSaveState("Сохраняю...");

      try {
        window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // Локальное сохранение не должно блокировать серверное.
      }

      saveServerContent(EXPENSES_STORAGE_KEY, normalized).then((ok) => {
        if (saveRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 450);

    return () => window.clearTimeout(saveTimer);
  }, [expenses, isLoaded]);

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(expenses.map((item) => getMonthKey(item.date)))).sort();
    return ["Все", ...months];
  }, [expenses]);

  const filteredExpenses = useMemo(() => expenses.filter((item) => {
    const categoryMatch = categoryFilter === "Все" || item.category === categoryFilter;
    const statusMatch = statusFilter === "Все" || item.status === statusFilter;
    const monthMatch = monthFilter === "Все" || getMonthKey(item.date) === monthFilter;
    return categoryMatch && statusMatch && monthMatch;
  }), [categoryFilter, expenses, monthFilter, statusFilter]);

  const summary = getExpenseSummary(filteredExpenses);
  const allSummary = getExpenseSummary(expenses);
  const categoryTotals = EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: expenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    count: expenses.filter((item) => item.category === category).length,
  })).filter((item) => item.total || item.count).sort((first, second) => second.total - first.total);
  const maxCategoryTotal = Math.max(...categoryTotals.map((item) => item.total), 1);

  function updateExpense(expenseId, patch) {
    setExpenses((current) => current.map((item) => (item.id === expenseId ? normalizeExpense({ ...item, ...patch }) : item)));
  }

  function addExpense() {
    const title = newExpense.title.trim();
    if (!title) return;
    setExpenses((current) => [normalizeExpense({ ...newExpense, title }), ...current]);
    setNewExpense(createExpense({ category: newExpense.category, date: newExpense.date, owner: newExpense.owner }));
  }

  function deleteExpense(expenseId) {
    const expense = expenses.find((item) => item.id === expenseId);
    if (!expense) return;
    const confirmed = window.confirm(`Удалить расход «${expense.title}»?`);
    if (!confirmed) return;
    setExpenses((current) => current.filter((item) => item.id !== expenseId));
  }

  return (
    <section className="analytics-surface analytics-expenses">
      <div className="analytics-expenses-hero">
        <div>
          <span className="analytics-kicker">Финансы проекта</span>
          <h2>Расходы Atlas</h2>
          <p>
            Здесь фиксируем текущие расходы по запуску: маркетинг, разработку, серверы, сервисы,
            зарплаты, долги, legal/security и всё, что нужно оплатить или запланировать.
          </p>
        </div>
        <div className="analytics-expenses-save">
          <span>{saveState}</span>
          <strong>{formatCurrency(allSummary.total)}</strong>
          <small>общая сумма в списке</small>
        </div>
      </div>

      <div className="analytics-expenses-kpis">
        <article>
          <span>Всего по фильтру</span>
          <strong>{formatCurrency(summary.total)}</strong>
          <small>{filteredExpenses.length} записей</small>
        </article>
        <article>
          <span>К оплате</span>
          <strong>{formatCurrency(summary.due)}</strong>
          <small>счёт / дедлайн / просрочка</small>
        </article>
        <article>
          <span>Оплачено</span>
          <strong>{formatCurrency(summary.paid)}</strong>
          <small>закрытые расходы</small>
        </article>
        <article>
          <span>Регулярные</span>
          <strong>{formatCurrency(summary.recurring)}</strong>
          <small>месячная/годовая нагрузка</small>
        </article>
        <article>
          <span>Долги</span>
          <strong>{formatCurrency(summary.debts)}</strong>
          <small>отдельная нагрузка</small>
        </article>
        <article>
          <span>Высокий приоритет</span>
          <strong>{summary.urgent}</strong>
          <small>ещё не оплачено</small>
        </article>
      </div>

      <div className="analytics-expenses-panel">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Структура</span>
            <h3 className="analytics-section-title">По категориям</h3>
          </div>
        </div>
        <div className="analytics-expenses-category-list">
          {categoryTotals.map((item) => (
            <button key={item.category} type="button" onClick={() => setCategoryFilter(item.category)}>
              <span>
                <strong>{item.category}</strong>
                <small>{item.count} записей</small>
              </span>
              <b>{formatCurrency(item.total)}</b>
              <progress max="100" value={(item.total / maxCategoryTotal) * 100} />
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-expenses-panel">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Новый расход</span>
            <h3 className="analytics-section-title">Добавить оплату</h3>
          </div>
        </div>
        <div className="analytics-expenses-form">
          <label>
            <span>Название</span>
            <input className="analytics-launch-input" value={newExpense.title} onChange={(event) => setNewExpense((current) => ({ ...current, title: event.target.value }))} placeholder="Например: аудит смарт-контракта" />
          </label>
          <label>
            <span>Категория</span>
            <select className="analytics-launch-input" value={newExpense.category} onChange={(event) => setNewExpense((current) => ({ ...current, category: event.target.value }))}>
              {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Сумма</span>
            <input className="analytics-launch-input" type="number" min="0" step="0.01" value={newExpense.amount} onChange={(event) => setNewExpense((current) => ({ ...current, amount: event.target.value }))} />
          </label>
          <label>
            <span>Дата</span>
            <input className="analytics-launch-input" type="date" value={newExpense.date} onChange={(event) => setNewExpense((current) => ({ ...current, date: event.target.value }))} />
          </label>
          <label>
            <span>Статус</span>
            <select className="analytics-launch-input" value={newExpense.status} onChange={(event) => setNewExpense((current) => ({ ...current, status: event.target.value }))}>
              {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>Ответственный</span>
            <select className="analytics-launch-input" value={newExpense.owner} onChange={(event) => setNewExpense((current) => ({ ...current, owner: event.target.value }))}>
              {EXPENSE_OWNERS.map((owner) => <option key={owner || "empty"} value={owner}>{owner || "Не назначен"}</option>)}
            </select>
          </label>
          <label>
            <span>Регулярность</span>
            <select className="analytics-launch-input" value={newExpense.period} onChange={(event) => setNewExpense((current) => ({ ...current, period: event.target.value }))}>
              {EXPENSE_PERIODS.map((period) => <option key={period} value={period}>{period}</option>)}
            </select>
          </label>
          <label>
            <span>Поставщик</span>
            <input className="analytics-launch-input" value={newExpense.vendor} onChange={(event) => setNewExpense((current) => ({ ...current, vendor: event.target.value }))} placeholder="Сервис / человек / команда" />
          </label>
          <label className="analytics-expenses-form-wide">
            <span>Комментарий</span>
            <textarea className="analytics-launch-input" rows="2" value={newExpense.comment} onChange={(event) => setNewExpense((current) => ({ ...current, comment: event.target.value }))} placeholder="За что платим, почему важно, ссылка на счёт или договоренность" />
          </label>
          <button type="button" className="analytics-expenses-add" onClick={addExpense} disabled={!newExpense.title.trim()}>
            Добавить расход
          </button>
        </div>
      </div>

      <div className="analytics-expenses-panel">
        <div className="analytics-expenses-toolbar">
          <label>
            <span>Категория</span>
            <select className="analytics-launch-input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="Все">Все</option>
              {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select className="analytics-launch-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="Все">Все</option>
              {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>Месяц</span>
            <select className="analytics-launch-input" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
              {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => {
            setCategoryFilter("Все");
            setStatusFilter("Все");
            setMonthFilter("Все");
          }}>
            Сбросить
          </button>
        </div>

        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-expenses-table">
            <thead>
              <tr>
                <th>Расход</th>
                <th>Категория</th>
                <th>Сумма</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>Ответственный</th>
                <th>Регулярность</th>
                <th>Комментарий</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <input className="analytics-launch-table-input analytics-launch-table-input-title" value={expense.title} onChange={(event) => updateExpense(expense.id, { title: event.target.value })} />
                    <input className="analytics-launch-table-input" value={expense.vendor} onChange={(event) => updateExpense(expense.id, { vendor: event.target.value })} placeholder="Поставщик" />
                  </td>
                  <td>
                    <select className="analytics-launch-table-input" value={expense.category} onChange={(event) => updateExpense(expense.id, { category: event.target.value })}>
                      {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="analytics-launch-table-input" type="number" min="0" step="0.01" value={expense.amount} onChange={(event) => updateExpense(expense.id, { amount: event.target.value })} />
                    <small className="analytics-expenses-currency">{expense.currency}</small>
                  </td>
                  <td>
                    <input className="analytics-launch-table-input" type="date" value={expense.date} onChange={(event) => updateExpense(expense.id, { date: event.target.value })} />
                    <small className="analytics-expenses-date">{formatDate(expense.date)}</small>
                  </td>
                  <td>
                    <select className={`analytics-expenses-status analytics-expenses-status-${getStatusTone(expense.status)}`} value={expense.status} onChange={(event) => updateExpense(expense.id, { status: event.target.value })}>
                      {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className={`analytics-expenses-priority analytics-expenses-priority-${getPriorityTone(expense.priority)}`} value={expense.priority} onChange={(event) => updateExpense(expense.id, { priority: event.target.value })}>
                      {EXPENSE_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="analytics-launch-table-input" value={expense.owner} onChange={(event) => updateExpense(expense.id, { owner: event.target.value })}>
                      {EXPENSE_OWNERS.map((owner) => <option key={owner || "empty"} value={owner}>{owner || "Не назначен"}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="analytics-launch-table-input" value={expense.period} onChange={(event) => updateExpense(expense.id, { period: event.target.value })}>
                      {EXPENSE_PERIODS.map((period) => <option key={period} value={period}>{period}</option>)}
                    </select>
                  </td>
                  <td>
                    <textarea className="analytics-launch-table-input" rows="3" value={expense.comment} onChange={(event) => updateExpense(expense.id, { comment: event.target.value })} />
                  </td>
                  <td>
                    <div className="analytics-expenses-actions">
                      <button type="button" onClick={() => updateExpense(expense.id, { status: "Оплачено" })}>Оплачено</button>
                      <button type="button" onClick={() => deleteExpense(expense.id)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredExpenses.length ? (
                <tr>
                  <td colSpan="10" className="analytics-expenses-empty">По выбранным фильтрам расходов нет.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="analytics-expenses-panel analytics-expenses-rules">
        <span className="analytics-kicker">Как вести</span>
        <h3>Простая логика учета</h3>
        <p>Все будущие оплаты ставим в “План”, выставленные счета в “Счёт”, срочные оплаты в “К оплате”, закрытые суммы в “Оплачено”. Долги не смешиваем с операционкой.</p>
        <ul>
          <li>Маркетинг и SMM лучше разделять.</li>
          <li>Серверы и сервисы держать регулярными.</li>
          <li>Legal/Security фиксировать отдельно перед запуском.</li>
        </ul>
      </div>
    </section>
  );
}

export default ExpensesBoard;
