export default function ContentPlanCardView({
  copyStats,
  formatPlanDate,
  getDateState,
  getDateStateLabel,
  hasTextValue,
  isExpanded,
  isValidHttpUrl,
  item,
  onUpdateItem,
  publicationChecks,
  qualitySignals,
}) {
  return (
    <>
      <div className="analytics-content-plan-quality" aria-label="Контроль качества карточки">
        {qualitySignals.map((signal) => (
          <span key={`${signal.label}-${signal.detail}`} className={`analytics-content-plan-quality-${signal.tone}`}>
            <b>{signal.label}</b>
            {signal.detail}
          </span>
        ))}
      </div>
      <div className="analytics-content-plan-meta">
        <span><b>Этап</b>{item.stage}</span>
        <span><b>Блок</b>{item.topicBlock || "Без блока"}</span>
        <span className="analytics-content-plan-review-badge"><b>Проверка</b>{item.reviewStatus}</span>
        <span><b>Визуал</b>{item.visualStatus}</span>
        <span><b>Приоритет</b>{item.priority || "Средний"}</span>
        <span><b>Срок</b>{getDateStateLabel(getDateState(item.date, item.status))}</span>
        <span><b>Owner</b>{item.owner || "Не назначен"}</span>
        {item.status === "Опубликовано" ? <span className="analytics-content-plan-published-meta"><b>Опубликовано</b>{formatPlanDate(item.publishedAt)}</span> : null}
        {item.status === "Опубликовано" && hasTextValue(item.publishedUrl) && isValidHttpUrl(item.publishedUrl) ? (
          <span className="analytics-content-plan-published-link-meta">
            <b>Пост</b>
            <a href={item.publishedUrl} target="_blank" rel="noreferrer">Открыть публикацию</a>
          </span>
        ) : null}
        <span className={copyStats.isXOverLimit ? "analytics-content-plan-copy-stat analytics-content-plan-copy-stat-warn" : "analytics-content-plan-copy-stat"}>
          <b>Объем</b>{copyStats.isXOverLimit ? `${copyStats.label} / X > 280` : copyStats.label}
        </span>
      </div>
      {item.visualBrief || item.visualLink ? (
        <div className="analytics-content-plan-visual">
          <strong>Визуал</strong>
          {item.visualBrief ? <span>{item.visualBrief}</span> : null}
          {hasTextValue(item.visualLink) && isValidHttpUrl(item.visualLink) ? <a href={item.visualLink} target="_blank" rel="noreferrer">Открыть макет / файл</a> : null}
        </div>
      ) : null}
      {isExpanded ? <p>{item.copy || "Текст пока не добавлен."}</p> : null}
      {item.comment ? <small>{item.comment}</small> : null}
      <div className="analytics-content-plan-publish-gate">
        <strong>Гейт публикации</strong>
        <div>
          {publicationChecks.map((check) => (
            <span key={check.key} className={check.done ? "analytics-content-plan-gate-ok" : "analytics-content-plan-gate-wait"}>
              <b>{check.label}</b>
              {check.detail}
            </span>
          ))}
        </div>
      </div>
      <label className="analytics-content-plan-admin-note">
        <strong>Комментарий администратора</strong>
        <textarea
          className="analytics-launch-input analytics-content-plan-admin-input"
          rows="2"
          value={item.adminComment || ""}
          onChange={(event) => onUpdateItem(item.id, { adminComment: event.target.value })}
          placeholder="Что исправить перед публикацией"
        />
      </label>
    </>
  );
}
