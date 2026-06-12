import { useEffect, useMemo, useRef, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import formatCurrency from "../utils/formatCurrency";

import {
  EXPENSES_STORAGE_KEY,
  EXPENSE_FUNDS_STORAGE_KEY,
  EXPENSE_CATEGORIES,
  EXPENSE_PRIORITIES,
  EXPENSE_STATUSES,
  EXPENSE_PERIODS,
  EXPENSE_OWNERS,
  OBLIGATION_CATEGORIES,
  defaultExpenses,
  defaultFunds,
} from "../data/expensesData";
import {
  createExpense,
  createFund,
  formatDate,
  getDaysUntil,
  getExpenseSummary,
  getMonthKey,
  getPriorityTone,
  getStatusTone,
  getTodayInputDate,
  mergeMissingDefaultObligations,
  normalizeExpense,
  normalizeExpenses,
  normalizeFund,
  normalizeFunds,
} from "../utils/expensesUtils";

function ExpensesBoard() {
  const [expenses, setExpenses] = useState(() => normalizeExpenses(defaultExpenses));
  const [funds, setFunds] = useState(() => normalizeFunds(defaultFunds));
  const [newExpense, setNewExpense] = useState(() => createExpense());
  const [newFund, setNewFund] = useState(() => createFund());
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [monthFilter, setMonthFilter] = useState("Все");
  const [saveState, setSaveState] = useState("Сохранено");
  const [isLoaded, setIsLoaded] = useState(false);
  const saveRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadServerContent(EXPENSES_STORAGE_KEY),
      loadServerContent(EXPENSE_FUNDS_STORAGE_KEY),
    ]).then(([savedExpenses, savedFunds]) => {
      if (!isMounted) return;
      const nextExpenses = Array.isArray(savedExpenses) ? mergeMissingDefaultObligations(savedExpenses) : normalizeExpenses(defaultExpenses);
      const nextFunds = normalizeFunds(Array.isArray(savedFunds) ? savedFunds : defaultFunds);
      setExpenses(nextExpenses);
      setFunds(nextFunds);
      try {
        window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(nextExpenses));
        window.localStorage.setItem(EXPENSE_FUNDS_STORAGE_KEY, JSON.stringify(nextFunds));
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

  useEffect(() => {
    if (!isLoaded) return undefined;

    const saveTimer = window.setTimeout(() => {
      const requestId = saveRef.current + 1;
      saveRef.current = requestId;
      const normalized = normalizeFunds(funds);
      setSaveState("Сохраняю...");

      try {
        window.localStorage.setItem(EXPENSE_FUNDS_STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // Локальное сохранение не должно блокировать серверное.
      }

      saveServerContent(EXPENSE_FUNDS_STORAGE_KEY, normalized).then((ok) => {
        if (saveRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 450);

    return () => window.clearTimeout(saveTimer);
  }, [funds, isLoaded]);

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

  const allSummary = getExpenseSummary(expenses);
  const totalFunds = funds.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentBalance = totalFunds - allSummary.paid;
  const plannedBalance = totalFunds - allSummary.total;
  const today = getTodayInputDate();
  const next30Date = new Date();
  next30Date.setDate(next30Date.getDate() + 30);
  const next30InputDate = next30Date.toISOString().slice(0, 10);
  const upcomingObligations = expenses
    .filter((item) => item.status !== "Оплачено")
    .filter((item) => item.date >= today)
    .filter((item) => item.date <= next30InputDate || OBLIGATION_CATEGORIES.includes(item.category) || item.period !== "Разово")
    .sort((first, second) => first.date.localeCompare(second.date))
    .slice(0, 8);
  const upcoming30Total = expenses
    .filter((item) => item.status !== "Оплачено")
    .filter((item) => item.date >= today && item.date <= next30InputDate)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
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

  function updateFund(fundId, patch) {
    setFunds((current) => current.map((item) => (item.id === fundId ? normalizeFund({ ...item, ...patch }) : item)));
  }

  function addFund() {
    const title = newFund.title.trim();
    if (!title) return;
    setFunds((current) => [normalizeFund({ ...newFund, title }), ...current]);
    setNewFund(createFund({ date: newFund.date, source: newFund.source }));
  }

  function deleteFund(fundId) {
    const fund = funds.find((item) => item.id === fundId);
    if (!fund) return;
    const confirmed = window.confirm(`Удалить поступление «${fund.title}»?`);
    if (!confirmed) return;
    setFunds((current) => current.filter((item) => item.id !== fundId));
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
          <strong>{formatCurrency(currentBalance)}</strong>
          <small>остаток сейчас</small>
        </div>
      </div>

      <div className="analytics-expenses-kpis">
        <article>
          <span>Поступления</span>
          <strong>{formatCurrency(totalFunds)}</strong>
          <small>{funds.length} пополнений</small>
        </article>
        <article>
          <span>Остаток сейчас</span>
          <strong>{formatCurrency(currentBalance)}</strong>
          <small>поступления минус оплачено</small>
        </article>
        <article>
          <span>После плановых</span>
          <strong>{formatCurrency(plannedBalance)}</strong>
          <small>если закрыть все расходы</small>
        </article>
        <article>
          <span>Ближайшие 30 дней</span>
          <strong>{formatCurrency(upcoming30Total)}</strong>
          <small>ожидаемые оплаты</small>
        </article>
        <article>
          <span>Долги</span>
          <strong>{formatCurrency(allSummary.debts)}</strong>
          <small>отдельная нагрузка</small>
        </article>
        <article>
          <span>Высокий приоритет</span>
          <strong>{allSummary.urgent}</strong>
          <small>ещё не оплачено</small>
        </article>
      </div>

      <div className="analytics-expenses-grid">
        <div className="analytics-expenses-panel">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Кошелек</span>
              <h3 className="analytics-section-title">Поступления бюджета</h3>
              <p>Заносим пополнения кошелька или бюджета запуска, чтобы видеть, из какой суммы расходуем деньги.</p>
            </div>
          </div>
          <div className="analytics-expenses-fund-form">
            <input className="analytics-launch-input" value={newFund.title} onChange={(event) => setNewFund((current) => ({ ...current, title: event.target.value }))} placeholder="Например: пополнение кошелька" />
            <input className="analytics-launch-input" type="number" min="0" step="0.01" value={newFund.amount} onChange={(event) => setNewFund((current) => ({ ...current, amount: event.target.value }))} />
            <input className="analytics-launch-input" type="date" value={newFund.date} onChange={(event) => setNewFund((current) => ({ ...current, date: event.target.value }))} />
            <input className="analytics-launch-input" value={newFund.source} onChange={(event) => setNewFund((current) => ({ ...current, source: event.target.value }))} placeholder="Источник / кошелек" />
            <textarea className="analytics-launch-input" rows="2" value={newFund.comment} onChange={(event) => setNewFund((current) => ({ ...current, comment: event.target.value }))} placeholder="Комментарий к поступлению" />
            <button type="button" className="analytics-expenses-add" onClick={addFund} disabled={!newFund.title.trim()}>Добавить поступление</button>
          </div>
          <div className="analytics-expenses-funds">
            {funds.map((fund) => (
              <article key={fund.id}>
                <input className="analytics-launch-table-input analytics-launch-table-input-title" value={fund.title} onChange={(event) => updateFund(fund.id, { title: event.target.value })} />
                <div>
                  <input className="analytics-launch-table-input" type="number" min="0" step="0.01" value={fund.amount} onChange={(event) => updateFund(fund.id, { amount: event.target.value })} />
                  <input className="analytics-launch-table-input" type="date" value={fund.date} onChange={(event) => updateFund(fund.id, { date: event.target.value })} />
                </div>
                <input className="analytics-launch-table-input" value={fund.source} onChange={(event) => updateFund(fund.id, { source: event.target.value })} placeholder="Источник" />
                <textarea className="analytics-launch-table-input" rows="2" value={fund.comment} onChange={(event) => updateFund(fund.id, { comment: event.target.value })} placeholder="Комментарий" />
                <button type="button" onClick={() => deleteFund(fund.id)}>Удалить</button>
              </article>
            ))}
          </div>
        </div>

        <div className="analytics-expenses-panel">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Календарь</span>
              <h3 className="analytics-section-title">Ближайшие оплаты</h3>
              <p>Домены, серверы, подписки, долги и другие обязательства, которые нельзя пропустить.</p>
            </div>
          </div>
          <div className="analytics-expenses-upcoming">
            {upcomingObligations.map((expense) => {
              const days = getDaysUntil(expense.date);
              return (
                <article key={expense.id}>
                  <div>
                    <strong>{formatDate(expense.date)}</strong>
                    <small>{days === 0 ? "сегодня" : days && days > 0 ? `через ${days} дн.` : "просрочено"}</small>
                  </div>
                  <span>
                    <b>{expense.title}</b>
                    <small>{expense.category} · {expense.period}</small>
                  </span>
                  <em>{formatCurrency(expense.amount)}</em>
                </article>
              );
            })}
            {!upcomingObligations.length ? <p className="analytics-expenses-empty">Ближайших обязательных оплат нет.</p> : null}
          </div>
        </div>
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
