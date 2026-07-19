import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { loadServerContentResult, saveServerContentResult } from "../services/contentStore";

import {
  EXPENSE_CENTER_STORAGE_KEY,
  EXPENSES_STORAGE_KEY,
  EXPENSE_FUNDS_STORAGE_KEY,
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_PERIODS,
  EXPENSE_PRIORITIES,
  EXPENSE_PROJECTS,
  EXPENSE_QUICK_TEMPLATES,
  EXPENSE_STATUSES,
  EXPENSE_SUBCATEGORIES,
  EXPENSE_OWNERS,
  PAYMENT_METHODS,
  defaultExpenseCenter,
} from "../data/expensesData";
import {
  createActivity,
  createExpense,
  createFund,
  createPaidExpenseUpdate,
  expandExpenseOccurrences,
  formatDate,
  getDaysUntil,
  getEffectiveStatus,
  getExpenseAmountBase,
  getMonthExpenseSummary,
  getMonthKey,
  getMonthRange,
  getMonthlyRecurringRunRate,
  getPriorityTone,
  getStatusTone,
  getTodayInputDate,
  migrateLegacyExpenseCenter,
  monthLabel,
  normalizeExpense,
  normalizeExpenseCenter,
  normalizeFund,
  shiftMonth,
} from "../utils/expensesUtils";

const VIEWS = [
  ["overview", "Обзор"],
  ["calendar", "Календарь"],
  ["registry", "Реестр"],
  ["budget", "Бюджет"],
];
const LOCAL_BACKUP_FORMAT = "supersus-expense-backup-v1";

function readLocalExpenseBackup() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXPENSE_CENTER_STORAGE_KEY) || "null");
    return parsed?.format === LOCAL_BACKUP_FORMAT ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalExpenseBackup(value, pending, baseRevision) {
  try {
    window.localStorage.setItem(EXPENSE_CENTER_STORAGE_KEY, JSON.stringify({
      format: LOCAL_BACKUP_FORMAT,
      pending,
      baseRevision: Number(baseRevision || 0),
      savedAt: new Date().toISOString(),
      value,
    }));
  } catch {
    // Если localStorage недоступен, серверное сохранение всё равно продолжается.
  }
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmount(amount) {
  return `${Number(amount || 0).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  })} USDT`;
}

function paymentCountLabel(count) {
  const normalized = Math.abs(Number(count || 0)) % 100;
  const lastDigit = normalized % 10;
  if (normalized >= 11 && normalized <= 19) return `${count} платежей`;
  if (lastDigit === 1) return `${count} платёж`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} платежа`;
  return `${count} платежей`;
}

function getDueLabel(date) {
  const days = getDaysUntil(date);
  if (days === null) return "без даты";
  if (days < 0) return `${Math.abs(days)} дн. просрочки`;
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  return `через ${days} дн.`;
}

function formatActivityDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadExpensesCsv(expenses) {
  const header = [
    "Название",
    "Категория",
    "Подкатегория",
    "Сумма",
    "Валюта",
    "Эквивалент USDT",
    "Плановая дата",
    "Фактическая дата",
    "Статус",
    "Приоритет",
    "Ответственный",
    "Регулярность",
    "Поставщик",
    "Проект",
    "Комментарий",
  ];
  const rows = expenses.map((item) => [
    item.title,
    item.category,
    item.subcategory,
    item.amount,
    item.currency,
    item.baseAmount,
    item.dueDate,
    item.paidDate,
    getEffectiveStatus(item),
    item.priority,
    item.owner,
    item.period,
    item.vendor,
    item.project,
    item.comment,
  ]);
  const csv = `\ufeff${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `supersus-expenses-${getTodayInputDate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ExpensesBoard() {
  const [center, setCenter] = useState(() => normalizeExpenseCenter(defaultExpenseCenter));
  const [view, setView] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(getTodayInputDate()));
  const [selectedDate, setSelectedDate] = useState(getTodayInputDate());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(() => createExpense());
  const [newFund, setNewFund] = useState(() => createFund());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [ownerFilter, setOwnerFilter] = useState("Все");
  const [periodFilter, setPeriodFilter] = useState("Все");
  const [saveState, setSaveState] = useState("Загрузка...");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveRef = useRef(0);
  const centerRef = useRef(center);
  const isLoadedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const pendingCenterRef = useRef(null);
  const isSavingRef = useRef(false);
  const serverRevisionRef = useRef(0);
  const editorTriggerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadServerContentResult(EXPENSE_CENTER_STORAGE_KEY),
      loadServerContentResult(EXPENSES_STORAGE_KEY),
      loadServerContentResult(EXPENSE_FUNDS_STORAGE_KEY),
    ]).then(([centerResult, expensesResult, fundsResult]) => {
      if (!isMounted) return;
      const hasCurrentCenter = centerResult.ok && centerResult.value?.version === 2;
      const canMigrateLegacy = centerResult.ok && expensesResult.ok && fundsResult.ok;
      if (!hasCurrentCenter && !canMigrateLegacy) {
        setSaveState("Ошибка загрузки — изменения заблокированы");
        return;
      }
      let nextCenter = hasCurrentCenter
        ? normalizeExpenseCenter(centerResult.value)
        : migrateLegacyExpenseCenter(expensesResult.value, fundsResult.value);
      const localBackup = readLocalExpenseBackup();
      const shouldRecoverLocal = localBackup?.pending === true
        && Number(localBackup.baseRevision || 0) === Number(nextCenter.revision || 0);
      if (shouldRecoverLocal) {
        nextCenter = normalizeExpenseCenter({
          ...localBackup.value,
          revision: nextCenter.revision,
        });
      }
      setCenter(nextCenter);
      centerRef.current = nextCenter;
      serverRevisionRef.current = Number(nextCenter.revision || 0);
      setIsLoaded(true);
      isLoadedRef.current = true;
      isDirtyRef.current = false;
      if (shouldRecoverLocal) {
        setSaveState("Восстанавливаю локальные изменения...");
        persistCenter(nextCenter);
      } else {
        setSaveState("Сохранено на сервере");
      }
    }).catch(() => {
      if (!isMounted) return;
      setSaveState("Ошибка загрузки — изменения заблокированы");
    });

    return () => {
      isMounted = false;
    };
  }, [loadAttempt]);

  useLayoutEffect(() => {
    centerRef.current = center;
  }, [center]);

  async function drainCenterSaves() {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    while (pendingCenterRef.current) {
      const normalized = pendingCenterRef.current;
      pendingCenterRef.current = null;
      const requestId = saveRef.current;
      const versioned = {
        ...normalized,
        revision: serverRevisionRef.current + 1,
      };
      const result = await saveServerContentResult(
        EXPENSE_CENTER_STORAGE_KEY,
        versioned,
        { keepalive: true },
      );
      if (result.ok) {
        serverRevisionRef.current = result.revision || versioned.revision;
        if (!pendingCenterRef.current) {
          isDirtyRef.current = false;
          writeLocalExpenseBackup(versioned, false, serverRevisionRef.current);
        } else {
          writeLocalExpenseBackup(pendingCenterRef.current, true, serverRevisionRef.current);
        }
      } else if (result.status === 409) {
        pendingCenterRef.current = null;
      }
      if (saveRef.current === requestId || !pendingCenterRef.current || result.status === 409) {
        setSaveState(
          result.ok
            ? "Сохранено на сервере"
            : result.status === 409
              ? "Конфликт изменений — обновите страницу"
              : "Ошибка сохранения",
        );
      }
      if (!result.ok) break;
    }

    isSavingRef.current = false;
  }

  function persistCenter(nextCenter) {
    const normalized = normalizeExpenseCenter(nextCenter);
    centerRef.current = normalized;
    isDirtyRef.current = true;
    const requestId = saveRef.current + 1;
    saveRef.current = requestId;
    pendingCenterRef.current = normalized;
    setSaveState("Сохраняю...");
    writeLocalExpenseBackup(normalized, true, serverRevisionRef.current);
    void drainCenterSaves();
  }

  function commitCenter(updater) {
    if (!isLoadedRef.current) return;
    const nextCenter = typeof updater === "function" ? updater(centerRef.current) : updater;
    centerRef.current = nextCenter;
    setCenter(nextCenter);
    persistCenter(nextCenter);
  }

  useEffect(() => {
    if (!isEditorOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditorOpen]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, []);

  const today = getTodayInputDate();
  const currentMonth = getMonthKey(today);
  const monthSummary = useMemo(
    () => getMonthExpenseSummary(center.expenses, selectedMonth, today),
    [center.expenses, selectedMonth, today],
  );
  const currentMonthSummary = useMemo(
    () => getMonthExpenseSummary(center.expenses, currentMonth, today),
    [center.expenses, currentMonth, today],
  );
  const totalFunds = center.funds.reduce((sum, item) => sum + Number(item.baseAmount || 0), 0);
  const totalPaid = center.expenses
    .filter((item) => getEffectiveStatus(item, today) === "Оплачено")
    .reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  const availableBudget = totalFunds - totalPaid;
  const recurringRunRate = getMonthlyRecurringRunRate(center.expenses);

  const next7Date = new Date();
  next7Date.setDate(next7Date.getDate() + 6);
  const next30Date = new Date();
  next30Date.setDate(next30Date.getDate() + 29);
  const next7 = expandExpenseOccurrences(center.expenses, today, toInputDate(next7Date))
    .filter((item) => !["Оплачено", "Отменено"].includes(getEffectiveStatus(item, today)));
  const next30 = expandExpenseOccurrences(center.expenses, today, toInputDate(next30Date))
    .filter((item) => !["Оплачено", "Отменено"].includes(getEffectiveStatus(item, today)));
  const next7Total = next7.reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  const next30Total = next30.reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  const overdueExpenses = center.expenses
    .filter((item) => getEffectiveStatus(item, today) === "Просрочено")
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));
  const overdueTotal = overdueExpenses.reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
  const budgetTotal = center.budgets
    .filter((item) => item.month === currentMonth)
    .reduce((sum, item) => sum + Number(item.monthlyLimit || 0), 0);
  const budgetUsage = budgetTotal > 0 ? currentMonthSummary.total / budgetTotal * 100 : 0;

  const categorySummary = useMemo(() => EXPENSE_CATEGORIES.map((category) => {
    const forecast = monthSummary.occurrences
      .filter((item) => item.category === category)
      .filter((item) => !["Оплачено", "Отменено"].includes(getEffectiveStatus(item, today)))
      .reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
    const paidActual = center.expenses
      .filter((item) => item.category === category)
      .filter((item) => item.status === "Оплачено")
      .filter((item) => getMonthKey(item.paidDate || item.dueDate) === selectedMonth)
      .reduce((sum, item) => sum + getExpenseAmountBase(item), 0);
    const total = forecast + paidActual;
    const limit = Number(center.budgets.find(
      (item) => item.category === category && item.month === selectedMonth,
    )?.monthlyLimit || 0);
    return { category, total, actual: paidActual, limit, variance: limit - total };
  }), [center.budgets, center.expenses, monthSummary.occurrences, selectedMonth, today]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return center.expenses
      .filter((item) => {
        const searchable = [item.title, item.vendor, item.comment, item.subcategory, item.project].join(" ").toLowerCase();
        const status = getEffectiveStatus(item, today);
        return (!query || searchable.includes(query))
          && (categoryFilter === "Все" || item.category === categoryFilter)
          && (statusFilter === "Все" || status === statusFilter)
          && (ownerFilter === "Все" || item.owner === ownerFilter)
          && (periodFilter === "Все" || item.period === periodFilter);
      })
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate));
  }, [categoryFilter, center.expenses, ownerFilter, periodFilter, search, statusFilter, today]);

  const calendarDays = useMemo(() => {
    const { days, year, month } = getMonthRange(selectedMonth);
    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const cells = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= days; day += 1) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entries = monthSummary.occurrences.filter((item) => item.dueDate === date);
      cells.push({
        date,
        day,
        entries,
        total: entries.reduce((sum, item) => sum + getExpenseAmountBase(item), 0),
      });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [monthSummary.occurrences, selectedMonth]);

  const selectedDateExpenses = monthSummary.occurrences.filter((item) => item.dueDate === selectedDate);
  const draftHasValidBaseAmount = draft.currency === "USDT" || Number(draft.baseAmount) > 0;
  const fundHasValidBaseAmount = newFund.currency === "USDT" || Number(newFund.baseAmount) > 0;

  function appendActivity(nextCenter, type, title, detail = "") {
    return {
      ...nextCenter,
      activity: [createActivity(type, title, detail), ...(nextCenter.activity || [])].slice(0, 200),
    };
  }

  function openNewExpense(template) {
    const [title = "", category = "Маркетинг и привлечение", subcategory = "Performance-реклама"] = template || [];
    setEditingId("");
    setDraft(createExpense({ title, category, subcategory, dueDate: selectedDate || today }));
    editorTriggerRef.current = document.activeElement;
    setIsEditorOpen(true);
  }

  function openExpense(expense) {
    const sourceExpense = center.expenses.find((item) => item.id === expense.id) || expense;
    setEditingId(sourceExpense.id);
    setDraft(normalizeExpense(sourceExpense));
    editorTriggerRef.current = document.activeElement;
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingId("");
    window.setTimeout(() => editorTriggerRef.current?.focus?.(), 0);
  }

  function saveExpense() {
    if (!draft.title.trim() || !draftHasValidBaseAmount) return;
    commitCenter((current) => {
      const normalized = normalizeExpense({ ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() });
      const expenses = editingId
        ? current.expenses.map((item) => (item.id === editingId ? normalized : item))
        : [normalized, ...current.expenses];
      return appendActivity(
        { ...current, expenses },
        editingId ? "updated" : "created",
        normalized.title,
        `${normalized.category} · ${formatAmount(getExpenseAmountBase(normalized))}`,
      );
    });
    closeEditor();
  }

  function updateExpense(expenseId, patch) {
    commitCenter((current) => {
      const expense = current.expenses.find((item) => item.id === expenseId);
      const nextCenter = {
        ...current,
        expenses: current.expenses.map((item) => (
          item.id === expenseId ? normalizeExpense({ ...item, ...patch, updatedAt: new Date().toISOString() }) : item
        )),
      };
      if (!expense) return nextCenter;
      return appendActivity(
        nextCenter,
        "updated",
        expense.title,
        patch.status ? `Статус: ${patch.status}` : "Карточка обновлена",
      );
    });
  }

  function deleteExpense(expenseId) {
    const expense = center.expenses.find((item) => item.id === expenseId);
    if (!expense || !window.confirm(`Удалить расход «${expense.title}»?`)) return;
    commitCenter((current) => appendActivity(
      { ...current, expenses: current.expenses.filter((item) => item.id !== expenseId) },
      "deleted",
      expense.title,
    ));
  }

  function markExpensePaid(expenseId) {
    const expense = center.expenses.find((item) => item.id === expenseId);
    if (!expense) return;
    const { history, next } = createPaidExpenseUpdate(expense, today);
    commitCenter((current) => {
      const without = current.expenses.filter((item) => item.id !== expenseId);
      const expenses = next ? [next, history, ...without] : [history, ...without];
      return appendActivity(
        { ...current, expenses },
        "paid",
        expense.title,
        `${formatAmount(getExpenseAmountBase(expense))}${next ? ` · следующая оплата ${formatDate(next.dueDate)}` : ""}`,
      );
    });
  }

  function addFund() {
    if (!newFund.title.trim() || !fundHasValidBaseAmount) return;
    const fund = normalizeFund({ ...newFund, title: newFund.title.trim() });
    commitCenter((current) => appendActivity(
      { ...current, funds: [fund, ...current.funds] },
      "fund",
      fund.title,
      formatAmount(fund.baseAmount),
    ));
    setNewFund(createFund());
  }

  function deleteFund(fundId) {
    const fund = center.funds.find((item) => item.id === fundId);
    if (!fund || !window.confirm(`Удалить поступление «${fund.title}»?`)) return;
    commitCenter((current) => appendActivity(
      { ...current, funds: current.funds.filter((item) => item.id !== fundId) },
      "fund-deleted",
      fund.title,
      formatAmount(fund.baseAmount),
    ));
  }

  function updateBudget(category, patch) {
    commitCenter((current) => {
      const index = current.budgets.findIndex(
        (item) => item.category === category && item.month === selectedMonth,
      );
      const budget = {
        category,
        month: selectedMonth,
        monthlyLimit: 0,
        comment: "",
        ...(index >= 0 ? current.budgets[index] : {}),
        ...patch,
      };
      const budgets = index >= 0
        ? current.budgets.map((item, itemIndex) => (itemIndex === index ? budget : item))
        : [...current.budgets, budget];
      return { ...current, budgets };
    });
  }

  function selectCalendarDate(date) {
    setSelectedDate(date);
  }

  function changeCalendarMonth(delta) {
    const nextMonth = shiftMonth(selectedMonth, delta);
    setSelectedMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  }

  function selectMonth(month) {
    setSelectedMonth(month);
    setSelectedDate(`${month}-01`);
  }

  function setDraftCategory(category) {
    setDraft((current) => ({
      ...current,
      category,
      subcategory: EXPENSE_SUBCATEGORIES[category]?.[0] || "",
    }));
  }

  return (
    <section className="analytics-expenses">
      <header className="analytics-expenses-hero analytics-surface">
        <div>
          <span className="analytics-kicker">SuperSUS / Финансы</span>
          <h2>Центр расходов</h2>
          <p>План, факт, обязательные платежи и календарь проекта в одном рабочем контуре.</p>
        </div>
        <div className="analytics-expenses-hero-actions">
          <span
            className={`analytics-expenses-save is-${saveState.includes("Ошибка") || saveState.includes("Конфликт") ? "error" : "ok"}`}
            role="status"
            aria-live="polite"
          >
            {saveState}
          </span>
          {saveState === "Ошибка сохранения" ? (
            <button type="button" className="analytics-expenses-secondary" onClick={() => persistCenter(centerRef.current)}>
              Повторить
            </button>
          ) : null}
          <button type="button" className="analytics-expenses-add" disabled={!isLoaded} onClick={() => openNewExpense()}>
            + Добавить расход
          </button>
        </div>
      </header>

      <nav className="analytics-expenses-nav analytics-surface" aria-label="Разделы расходов">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" className={view === id ? "is-active" : ""} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </nav>

      {!isLoaded ? (
        <section className="analytics-expenses-load-state analytics-surface">
          <span className="analytics-kicker">Данные расходов</span>
          <h3>{saveState.includes("Ошибка") ? "Не удалось загрузить финансовый реестр" : "Загружаю расходы..."}</h3>
          <p>{saveState.includes("Ошибка") ? "Ничего не перезаписано. Проверьте соединение с сервером и повторите загрузку." : "Получаю актуальные записи, бюджеты и календарь оплат."}</p>
          {saveState.includes("Ошибка") ? (
            <button type="button" className="analytics-expenses-secondary" onClick={() => {
              setSaveState("Загрузка...");
              setLoadAttempt((attempt) => attempt + 1);
            }}>
              Повторить загрузку
            </button>
          ) : null}
        </section>
      ) : null}

      {view === "overview" && isLoaded ? (
        <>
          <div className="analytics-expenses-kpis">
            <article>
              <span>Факт за месяц</span>
              <strong>{formatAmount(currentMonthSummary.actual)}</strong>
              <small>оплачено в {monthLabel(currentMonth)}</small>
            </article>
            <article>
              <span>Прогноз месяца</span>
              <strong>{formatAmount(currentMonthSummary.total)}</strong>
              <small>факт + ожидаемые оплаты</small>
            </article>
            <article>
              <span>Следующие 7 дней</span>
              <strong>{formatAmount(next7Total)}</strong>
              <small>{paymentCountLabel(next7.length)}</small>
            </article>
            <article className={overdueTotal > 0 ? "is-danger" : ""}>
              <span>Просрочено</span>
              <strong>{formatAmount(overdueTotal)}</strong>
              <small>{overdueExpenses.length} обязательств</small>
            </article>
            <article>
              <span>Регулярно в месяц</span>
              <strong>{formatAmount(recurringRunRate)}</strong>
              <small>средняя сумма обязательных платежей</small>
            </article>
            <article className={budgetUsage > 100 ? "is-danger" : budgetUsage >= 90 ? "is-warning" : ""}>
              <span>Использование бюджета</span>
              <strong>{budgetTotal ? `${budgetUsage.toFixed(0)}%` : "—"}</strong>
              <small>{budgetTotal ? `${formatAmount(currentMonthSummary.total)} из ${formatAmount(budgetTotal)}` : "лимиты не заданы"}</small>
            </article>
          </div>

          <div className="analytics-expenses-overview-grid">
            <section className="analytics-expenses-panel analytics-surface">
              <div className="analytics-expenses-panel-head">
                <div>
                  <span className="analytics-kicker">Контроль оплат</span>
                  <h3>Ближайшие 30 дней</h3>
                </div>
                <strong>{formatAmount(next30Total)}</strong>
              </div>
              <div className="analytics-expenses-upcoming">
                {[...overdueExpenses, ...next30].slice(0, 10).map((expense) => {
                  const status = getEffectiveStatus(expense, today);
                  return (
                    <article key={expense.occurrenceId || expense.id} className={`is-${getStatusTone(status)}`}>
                      <button type="button" onClick={() => openExpense(expense)}>
                        <span>
                          <b>{expense.title}</b>
                          <small>{expense.vendor || expense.subcategory} · {expense.owner || "без ответственного"}</small>
                        </span>
                        <span>
                          <strong>{formatAmount(getExpenseAmountBase(expense))}</strong>
                          <small>{formatDate(expense.dueDate)} · {getDueLabel(expense.dueDate)}</small>
                        </span>
                      </button>
                    </article>
                  );
                })}
                {!overdueExpenses.length && !next30.length ? <p className="analytics-expenses-empty">Обязательных оплат пока нет.</p> : null}
              </div>
            </section>

            <section className="analytics-expenses-panel analytics-surface">
              <div className="analytics-expenses-panel-head">
                <div>
                  <span className="analytics-kicker">Структура месяца</span>
                  <h3>Категории расходов</h3>
                </div>
                <select value={selectedMonth} onChange={(event) => selectMonth(event.target.value)}>
                  {[currentMonth, shiftMonth(currentMonth, 1), shiftMonth(currentMonth, 2)].map((month) => (
                    <option key={month} value={month}>{monthLabel(month)}</option>
                  ))}
                </select>
              </div>
              <div className="analytics-expenses-category-list">
                {categorySummary.map((item) => (
                  <button key={item.category} type="button" onClick={() => {
                    setCategoryFilter(item.category);
                    setView("registry");
                  }}>
                    <span>
                      <strong>{item.category}</strong>
                      <b>{formatAmount(item.total)}</b>
                    </span>
                    <progress max={Math.max(item.limit || item.total, 1)} value={item.limit ? item.total : 0} />
                    <small>{item.limit ? `лимит ${formatAmount(item.limit)} · остаток ${formatAmount(item.variance)}` : "месячный лимит не задан"}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="analytics-expenses-quick analytics-surface">
            <div className="analytics-expenses-panel-head">
              <div>
                <span className="analytics-kicker">Быстрое добавление</span>
                <h3>Частые статьи расходов</h3>
              </div>
            </div>
            <div>
              {EXPENSE_QUICK_TEMPLATES.map((template) => (
                <button key={template[0]} type="button" onClick={() => openNewExpense(template)}>{template[0]}</button>
              ))}
            </div>
          </section>

          <section className="analytics-expenses-activity analytics-surface">
            <div className="analytics-expenses-panel-head">
              <div>
                <span className="analytics-kicker">История действий</span>
                <h3>Последние изменения</h3>
              </div>
            </div>
            <div>
              {(center.activity || []).slice(0, 8).map((item) => (
                <article key={item.id}>
                  <span>
                    <b>{item.title}</b>
                    <small>{item.detail || "Изменение в реестре"}</small>
                  </span>
                  <time dateTime={item.createdAt}>{formatActivityDate(item.createdAt)}</time>
                </article>
              ))}
              {!center.activity?.length ? <p className="analytics-expenses-empty">Изменений пока нет.</p> : null}
            </div>
          </section>
        </>
      ) : null}

      {view === "calendar" && isLoaded ? (
        <div className="analytics-expenses-calendar-layout">
          <section className="analytics-expenses-panel analytics-surface">
            <div className="analytics-expenses-calendar-head">
              <button type="button" aria-label="Предыдущий месяц" onClick={() => changeCalendarMonth(-1)}>‹</button>
              <div>
                <span className="analytics-kicker">Календарь оплат</span>
                <h3>{monthLabel(selectedMonth)}</h3>
              </div>
              <button type="button" aria-label="Следующий месяц" onClick={() => changeCalendarMonth(1)}>›</button>
            </div>
            <div className="analytics-expenses-calendar-weekdays">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="analytics-expenses-calendar">
              {calendarDays.map((cell, index) => cell ? (
                <button
                  key={cell.date}
                  type="button"
                  className={`${cell.date === today ? "is-today" : ""} ${cell.date === selectedDate ? "is-selected" : ""} ${cell.entries.some((item) => getEffectiveStatus(item, today) === "Просрочено") ? "is-overdue" : ""}`}
                  onClick={() => selectCalendarDate(cell.date)}
                >
                  <span>{cell.day}</span>
                  {cell.entries.length ? <strong>{formatAmount(cell.total)}</strong> : null}
                  {cell.entries.slice(0, 2).map((item) => <small key={item.occurrenceId}>{item.title}</small>)}
                  {cell.entries.length > 2 ? <em>+{cell.entries.length - 2}</em> : null}
                </button>
              ) : <span key={`empty-${index}`} className="is-empty" />)}
            </div>
          </section>

          <aside className="analytics-expenses-panel analytics-surface">
            <div className="analytics-expenses-panel-head">
              <div>
                <span className="analytics-kicker">Выбранный день</span>
                <h3>{formatDate(selectedDate)}</h3>
              </div>
              <button type="button" className="analytics-expenses-icon-action" onClick={() => openNewExpense(["", "Маркетинг и привлечение", "Performance-реклама"])}>+</button>
            </div>
            <div className="analytics-expenses-day-list">
              {selectedDateExpenses.map((expense) => (
                <article key={expense.occurrenceId}>
                  <button type="button" onClick={() => openExpense(expense)}>
                    <b>{expense.title}</b>
                    <span>{expense.category}</span>
                    <strong>{formatAmount(getExpenseAmountBase(expense))}</strong>
                  </button>
                </article>
              ))}
              {!selectedDateExpenses.length ? <p className="analytics-expenses-empty">На этот день платежей нет.</p> : null}
            </div>
            <div className="analytics-expenses-month-total">
              <span>Всего за месяц</span>
              <strong>{formatAmount(monthSummary.total)}</strong>
              <small>факт {formatAmount(monthSummary.actual)} · ожидается {formatAmount(monthSummary.forecast)}</small>
            </div>
          </aside>
        </div>
      ) : null}

      {view === "registry" && isLoaded ? (
        <section className="analytics-expenses-panel analytics-surface">
          <div className="analytics-expenses-panel-head">
            <div>
              <span className="analytics-kicker">Expense CRM</span>
              <h3>Реестр расходов</h3>
            </div>
            <button type="button" className="analytics-expenses-secondary" onClick={() => downloadExpensesCsv(filteredExpenses)}>Экспорт CSV</button>
          </div>
          <div className="analytics-expenses-toolbar">
            <label className="analytics-expenses-search">
              <span>Поиск</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Расход, поставщик, проект..." />
            </label>
            <label>
              <span>Категория</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="Все">Все категории</option>
                {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              <span>Статус</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="Все">Все статусы</option>
                {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>
              <span>Ответственный</span>
              <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="Все">Все</option>
                {EXPENSE_OWNERS.filter(Boolean).map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
            </label>
            <label>
              <span>Регулярность</span>
              <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                <option value="Все">Все</option>
                {EXPENSE_PERIODS.map((period) => <option key={period} value={period}>{period}</option>)}
              </select>
            </label>
          </div>
          <div className="analytics-table-responsive">
            <table className="analytics-table analytics-expenses-table">
              <thead>
                <tr>
                  <th>Расход</th>
                  <th>Сумма</th>
                  <th>Оплата</th>
                  <th>Статус</th>
                  <th>Ответственный</th>
                  <th>Период</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const status = getEffectiveStatus(expense, today);
                  return (
                    <tr key={expense.id}>
                      <td>
                        <button type="button" className="analytics-expenses-record-title" onClick={() => openExpense(expense)}>{expense.title}</button>
                        <small>{expense.category} · {expense.subcategory}</small>
                        <small>{expense.vendor || "поставщик не указан"} · {expense.project}</small>
                      </td>
                      <td>
                        <strong>{expense.amount.toLocaleString("ru-RU")} {expense.currency}</strong>
                        {expense.currency !== "USDT" ? <small>≈ {formatAmount(expense.baseAmount)}</small> : null}
                      </td>
                      <td>
                        <strong>{formatDate(expense.status === "Оплачено" ? expense.paidDate || expense.dueDate : expense.dueDate)}</strong>
                        <small>{expense.status === "Оплачено" ? "фактически оплачено" : getDueLabel(expense.dueDate)}</small>
                      </td>
                      <td>
                        <select
                          className={`analytics-expenses-status analytics-expenses-status-${getStatusTone(status)}`}
                          value={expense.status}
                          disabled={expense.status === "Оплачено"}
                          onChange={(event) => updateExpense(expense.id, { status: event.target.value })}
                        >
                          {expense.status === "Оплачено" ? <option value="Оплачено">Оплачено</option> : null}
                          {EXPENSE_STATUSES.filter((item) => !["Просрочено", "Оплачено"].includes(item)).map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {status === "Просрочено" ? <small className="analytics-expenses-overdue-label">Просрочено автоматически</small> : null}
                      </td>
                      <td>{expense.owner || "Не назначен"}</td>
                      <td>{expense.period}</td>
                      <td>
                        <div className="analytics-expenses-actions">
                          {status !== "Оплачено" && status !== "Отменено" ? <button type="button" onClick={() => markExpensePaid(expense.id)}>Отметить оплату</button> : null}
                          <button type="button" onClick={() => openExpense(expense)}>Изменить</button>
                          <button type="button" onClick={() => deleteExpense(expense.id)}>Удалить</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredExpenses.length ? (
                  <tr><td colSpan="7" className="analytics-expenses-empty">По выбранным фильтрам расходов нет.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "budget" && isLoaded ? (
        <div className="analytics-expenses-budget-layout">
          <section className="analytics-expenses-panel analytics-surface">
            <div className="analytics-expenses-panel-head">
              <div>
                <span className="analytics-kicker">План / факт</span>
                <h3>Месячные лимиты</h3>
              </div>
              <select value={selectedMonth} onChange={(event) => selectMonth(event.target.value)}>
                {[currentMonth, shiftMonth(currentMonth, 1), shiftMonth(currentMonth, 2)].map((month) => (
                  <option key={month} value={month}>{monthLabel(month)}</option>
                ))}
              </select>
            </div>
            <div className="analytics-expenses-budget-list">
              {categorySummary.map((item) => {
                const ratio = item.limit > 0 ? item.total / item.limit * 100 : 0;
                return (
                  <article key={item.category} className={ratio > 100 ? "is-danger" : ratio >= 90 ? "is-warning" : ""}>
                    <div>
                      <strong>{item.category}</strong>
                      <span>прогноз {formatAmount(item.total)} · факт {formatAmount(item.actual)}</span>
                    </div>
                    <label>
                      <span>Лимит USDT</span>
                      <input type="number" min="0" step="10" value={item.limit} onChange={(event) => updateBudget(item.category, { monthlyLimit: Number(event.target.value || 0) })} />
                    </label>
                    <div>
                      <progress max={Math.max(item.limit, item.total, 1)} value={item.total} />
                      <small>{item.limit ? `${ratio.toFixed(0)}% · ${item.variance >= 0 ? "остаток" : "перерасход"} ${formatAmount(Math.abs(item.variance))}` : "лимит не задан"}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="analytics-expenses-panel analytics-surface">
            <div className="analytics-expenses-panel-head">
              <div>
                <span className="analytics-kicker">Доступные средства</span>
                <h3>Поступления бюджета</h3>
              </div>
              <strong>{formatAmount(availableBudget)}</strong>
            </div>
            <div className="analytics-expenses-fund-form">
              <input value={newFund.title} onChange={(event) => setNewFund((current) => ({ ...current, title: event.target.value }))} placeholder="Название поступления" />
              <div>
                <input type="number" min="0" step="0.01" value={newFund.amount} onChange={(event) => {
                  const amount = Number(event.target.value || 0);
                  setNewFund((current) => ({ ...current, amount, baseAmount: current.currency === "USDT" ? amount : current.baseAmount }));
                }} />
                <select value={newFund.currency} onChange={(event) => setNewFund((current) => ({
                  ...current,
                  currency: event.target.value,
                  baseAmount: event.target.value === "USDT" ? current.amount : 0,
                }))}>
                  {EXPENSE_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              {newFund.currency !== "USDT" ? (
                <>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newFund.baseAmount}
                    aria-invalid={!fundHasValidBaseAmount}
                    onChange={(event) => setNewFund((current) => ({ ...current, baseAmount: Number(event.target.value || 0) }))}
                    placeholder="Эквивалент в USDT"
                  />
                  {!fundHasValidBaseAmount ? <small>Укажите эквивалент в USDT.</small> : null}
                </>
              ) : null}
              <input type="date" value={newFund.date} onChange={(event) => setNewFund((current) => ({ ...current, date: event.target.value }))} />
              <input value={newFund.source} onChange={(event) => setNewFund((current) => ({ ...current, source: event.target.value }))} placeholder="Источник / кошелёк" />
              <button
                type="button"
                className="analytics-expenses-add"
                disabled={!newFund.title.trim() || !fundHasValidBaseAmount}
                onClick={addFund}
              >
                Добавить
              </button>
            </div>
            <div className="analytics-expenses-funds">
              {center.funds.map((fund) => (
                <article key={fund.id}>
                  <span>
                    <b>{fund.title}</b>
                    <small>{fund.source || "источник не указан"} · {formatDate(fund.date)}</small>
                  </span>
                  <strong>{formatAmount(fund.baseAmount)}</strong>
                  <button type="button" aria-label={`Удалить ${fund.title}`} onClick={() => deleteFund(fund.id)}>×</button>
                </article>
              ))}
              {!center.funds.length ? <p className="analytics-expenses-empty">Поступления бюджета ещё не внесены.</p> : null}
            </div>
            <div className="analytics-expenses-cash-summary">
              <span><small>Внесено</small><b>{formatAmount(totalFunds)}</b></span>
              <span><small>Оплачено</small><b>{formatAmount(totalPaid)}</b></span>
              <span><small>Расчётный остаток</small><b>{formatAmount(availableBudget)}</b></span>
            </div>
          </aside>
        </div>
      ) : null}

      {isEditorOpen ? (
        <div className="analytics-expenses-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditor();
        }}>
          <section className="analytics-expenses-editor analytics-surface" role="dialog" aria-modal="true" aria-labelledby="expense-editor-title">
            <header>
              <div>
                <span className="analytics-kicker">{editingId ? "Редактирование" : "Новый расход"}</span>
                <h3 id="expense-editor-title">{editingId ? draft.title || "Расход" : "Добавить расход"}</h3>
              </div>
              <button type="button" aria-label="Закрыть" onClick={closeEditor}>×</button>
            </header>
            <div className="analytics-expenses-form">
              <label className="analytics-expenses-form-wide">
                <span>Название</span>
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="За что платим" autoFocus />
              </label>
              <label>
                <span>Категория</span>
                <select value={draft.category} onChange={(event) => setDraftCategory(event.target.value)}>
                  {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span>Подкатегория</span>
                <select value={draft.subcategory} onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))}>
                  {(EXPENSE_SUBCATEGORIES[draft.category] || []).map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
                </select>
              </label>
              <label>
                <span>Сумма</span>
                <input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => {
                  const amount = Number(event.target.value || 0);
                  setDraft((current) => ({ ...current, amount, baseAmount: current.currency === "USDT" ? amount : current.baseAmount }));
                }} />
              </label>
              <label>
                <span>Валюта</span>
                <select value={draft.currency} onChange={(event) => setDraft((current) => ({
                  ...current,
                  currency: event.target.value,
                  baseAmount: event.target.value === "USDT" ? current.amount : 0,
                }))}>
                  {EXPENSE_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              {draft.currency !== "USDT" ? (
                <label>
                  <span>Эквивалент USDT</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.baseAmount}
                    aria-invalid={!draftHasValidBaseAmount}
                    onChange={(event) => setDraft((current) => ({ ...current, baseAmount: Number(event.target.value || 0) }))}
                  />
                  {!draftHasValidBaseAmount ? <small>Укажите эквивалент в USDT для итогов.</small> : null}
                </label>
              ) : null}
              <label>
                <span>Плановая дата оплаты</span>
                <input type="date" value={draft.dueDate} onChange={(event) => {
                  const dueDate = event.target.value;
                  const anchorDate = new Date(`${dueDate}T00:00:00`);
                  setDraft((current) => ({
                    ...current,
                    dueDate,
                    recurrenceAnchorDay: Number.isNaN(anchorDate.getTime()) ? current.recurrenceAnchorDay : anchorDate.getDate(),
                  }));
                }} />
              </label>
              <label>
                <span>Статус</span>
                <select
                  value={draft.status}
                  disabled={draft.status === "Оплачено"}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                >
                  {draft.status === "Оплачено" ? <option value="Оплачено">Оплачено</option> : null}
                  {EXPENSE_STATUSES.filter((status) => !["Просрочено", "Оплачено"].includes(status)).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              {draft.status === "Оплачено" ? (
                <label>
                  <span>Фактическая дата оплаты</span>
                  <input
                    type="date"
                    value={draft.paidDate}
                    onChange={(event) => setDraft((current) => ({ ...current, paidDate: event.target.value }))}
                  />
                </label>
              ) : null}
              <label>
                <span>Приоритет</span>
                <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
                  {EXPENSE_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <label>
                <span>Регулярность</span>
                <select value={draft.period} onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value }))}>
                  {EXPENSE_PERIODS.map((period) => <option key={period} value={period}>{period}</option>)}
                </select>
              </label>
              <label>
                <span>Ответственный</span>
                <select value={draft.owner} onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}>
                  {EXPENSE_OWNERS.map((owner) => <option key={owner || "empty"} value={owner}>{owner || "Не назначен"}</option>)}
                </select>
              </label>
              <label>
                <span>Поставщик</span>
                <input value={draft.vendor} onChange={(event) => setDraft((current) => ({ ...current, vendor: event.target.value }))} placeholder="Компания / человек / сервис" />
              </label>
              <label>
                <span>Проект</span>
                <select value={draft.project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}>
                  {EXPENSE_PROJECTS.map((project) => <option key={project} value={project}>{project}</option>)}
                </select>
              </label>
              <label>
                <span>Способ оплаты</span>
                <select value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}>
                  {PAYMENT_METHODS.map((method) => <option key={method || "empty"} value={method}>{method || "Не указан"}</option>)}
                </select>
              </label>
              <label>
                <span>Напомнить за, дней</span>
                <input type="number" min="0" max="90" value={draft.reminderDays} onChange={(event) => setDraft((current) => ({ ...current, reminderDays: Number(event.target.value || 0) }))} />
              </label>
              <label className="analytics-expenses-form-wide">
                <span>Счёт / документ / ссылка</span>
                <input value={draft.documentUrl} onChange={(event) => setDraft((current) => ({ ...current, documentUrl: event.target.value }))} placeholder="https://..." />
              </label>
              <label className="analytics-expenses-form-wide">
                <span>Комментарий</span>
                <textarea rows="3" value={draft.comment} onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))} placeholder="Условия, договорённость, что входит в оплату" />
              </label>
            </div>
            <footer>
              <button type="button" className="analytics-expenses-secondary" onClick={closeEditor}>Отмена</button>
              <button
                type="button"
                className="analytics-expenses-add"
                disabled={!draft.title.trim() || !draftHasValidBaseAmount}
                onClick={saveExpense}
              >
                Сохранить
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default ExpensesBoard;
