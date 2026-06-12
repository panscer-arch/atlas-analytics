const CONTENT_PLAN_SIGNAL_CARDS = [
  { label: "Просрочено", valueKey: "overdue", detail: "Нужна новая дата или статус", patch: { dateState: "Просрочено" }, tone: "analytics-content-plan-signal-danger" },
  { label: "Сегодня", valueKey: "todayItems", detail: "Публикации на текущий день", patch: { dateState: "Сегодня" }, tone: "analytics-content-plan-signal-accent" },
  { label: "Без даты", valueKey: "withoutDate", detail: "Нужно назначить слот", patch: { dateState: "Без даты" }, tone: "analytics-content-plan-signal-focus" },
  { label: "Без текста", valueKey: "withoutCopy", detail: "Нет финального copy", patch: { copyIssue: "Без текста" }, tone: "analytics-content-plan-signal-danger" },
  { label: "Нужны правки", valueKey: "needsRevision", detail: "Вернуть автору после комментария", patch: { reviewStatus: "Нужны правки" }, tone: "analytics-content-plan-signal-focus" },
  { label: "Без комментария", valueKey: "revisionWithoutComment", detail: "Автору нужно пояснение", patch: { revisionIssue: "Без комментария" }, tone: "analytics-content-plan-signal-danger" },
  { label: "На вычитку", valueKey: "sendToReview", detail: "Текст есть, нужен редактор", patch: { nextAction: "Отправить на вычитку" }, tone: "analytics-content-plan-signal-focus" },
  { label: "Высокий приоритет", valueKey: "highPriority", detail: "То, что держит запуск", patch: { priority: "Высокий" } },
  { label: "К публикации", valueKey: "publishReady", detail: "Текст и визуал согласованы", patch: { readiness: "К публикации" }, tone: "analytics-content-plan-signal-ready" },
  { label: "X > 280", valueKey: "xOverLimit", detail: "Посты X нужно сократить", patch: { copyIssue: "X > 280" }, tone: "analytics-content-plan-signal-focus" },
  { label: "Визуал не готов", valueKey: "visualIssue", detail: "Готовится или ждет проверки", patch: { visualIssue: "Визуал не готов" }, tone: "analytics-content-plan-signal-accent" },
  { label: "Дубли", valueKey: "duplicateItems", detail: "Та же дата, канал и заголовок", patch: { duplicateIssue: "Найдены" }, tone: "analytics-content-plan-signal-focus" },
  { label: "Согласовать визуал", valueKey: "approveVisual", detail: "Текст готов, визуал ждет OK", patch: { nextAction: "Согласовать визуал" }, tone: "analytics-content-plan-signal-accent" },
  { label: "Без ответственного", valueKey: "withoutOwner", detail: "Нужно назначить владельца", patch: { owner: "Не назначен" }, tone: "analytics-content-plan-signal-focus" },
];

function ContentPlanCommandPanel({ dashboard, formatPlanDate, getSignalClass, isFocusActive, onFocusFilter }) {
  return (
    <div className="analytics-content-plan-command">
      {CONTENT_PLAN_SIGNAL_CARDS.map((card) => (
        <button
          key={card.label}
          type="button"
          className={getSignalClass(isFocusActive(card.patch), card.tone)}
          onClick={() => onFocusFilter(card.patch)}
          aria-pressed={isFocusActive(card.patch)}
        >
          <span>{card.label}</span>
          <strong>{dashboard[card.valueKey]}</strong>
          <small>{card.detail}</small>
        </button>
      ))}
      <article className="analytics-surface analytics-content-plan-next">
        <span>Ближайшие публикации</span>
        {dashboard.nextItems.length ? dashboard.nextItems.map((item) => (
          <button key={item.id} type="button" onClick={() => onFocusFilter({ date: item.date })}>
            <strong>{formatPlanDate(item.date)}</strong>
            <small>{item.channel} / {item.title}</small>
          </button>
        )) : <small>Ближайшие даты не назначены.</small>}
      </article>
    </div>
  );
}

export default ContentPlanCommandPanel;
