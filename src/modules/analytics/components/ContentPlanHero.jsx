function ContentPlanHero({ dashboard, onFocusFilter }) {
  return (
    <div className="analytics-surface analytics-content-plan-hero">
      <div>
        <span className="analytics-kicker">Контент-план / BI-центр</span>
        <h2 className="analytics-agent-template-title">Редакционный центр Atlas</h2>
        <p className="analytics-page-subtitle">
          Автор готовит текст и визуал, администратор согласует карточку, после проверки публикация уходит в работу.
        </p>
        <div className="analytics-content-plan-coverage">
          <span>Покрытие проверки</span>
          <strong>{dashboard.reviewProgress}%</strong>
          <progress value={dashboard.reviewProgress} max="100" aria-label="Покрытие проверки контент-плана" />
        </div>
        <div className="analytics-content-plan-coverage analytics-content-plan-coverage-links">
          <span>Покрытие ссылок</span>
          <strong>{dashboard.publishedLinkProgress}%</strong>
          <progress value={dashboard.publishedLinkProgress} max="100" aria-label="Покрытие ссылок опубликованных постов" />
          <small>{dashboard.publishedWithLink} из {dashboard.published} опубликованных постов с валидной ссылкой</small>
          <div className="analytics-content-plan-coverage-actions" aria-label="Быстрые фильтры по ссылкам опубликованных постов">
            <button type="button" onClick={() => onFocusFilter({ status: "Опубликовано", linkIssue: "Опубликовано без ссылки" })} disabled={!dashboard.publishedWithoutLink}>
              Без ссылки {dashboard.publishedWithoutLink}
            </button>
            <button type="button" onClick={() => onFocusFilter({ status: "Опубликовано", linkIssue: "Некорректная ссылка публикации" })} disabled={!dashboard.publishedInvalidLink}>
              URL {dashboard.publishedInvalidLink}
            </button>
            <button type="button" onClick={() => onFocusFilter({ status: "Опубликовано", linkIssue: "Опубликовано без даты" })} disabled={!dashboard.publishedWithoutDate}>
              Без даты {dashboard.publishedWithoutDate}
            </button>
            <button type="button" onClick={() => onFocusFilter({ status: "Опубликовано", linkIssue: "Дата публикации в будущем" })} disabled={!dashboard.publishedFutureDate}>
              Будущая дата {dashboard.publishedFutureDate}
            </button>
            <button type="button" onClick={() => onFocusFilter({ linkIssue: "Некорректная ссылка визуала" })} disabled={!dashboard.invalidVisualLinks}>
              Макет URL {dashboard.invalidVisualLinks}
            </button>
          </div>
        </div>
      </div>
      <div className="analytics-content-plan-stats">
        <span><strong>{dashboard.total}</strong> карточек</span>
        <span><strong>{dashboard.review}</strong> на вычитке</span>
        <span><strong>{dashboard.approved}</strong> проверено</span>
        <span><strong>{dashboard.visualReady}</strong> визуал ok</span>
        <span><strong>{dashboard.publishReady}</strong> к публикации</span>
        <span><strong>{dashboard.published}</strong> опубликовано</span>
      </div>
    </div>
  );
}

export default ContentPlanHero;
