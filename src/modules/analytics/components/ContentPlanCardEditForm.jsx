import {
  FORMAT_OPTIONS,
  PRIORITY_OPTIONS,
  REVIEW_OPTIONS,
  SOCIAL_OPTIONS,
  STAGE_OPTIONS,
  VISUAL_OPTIONS,
} from "../data/contentPlanData";

export default function ContentPlanCardEditForm({ getUrlFieldWarning, item, onUpdateItem }) {
  function updateField(field, value) {
    onUpdateItem(item.id, { [field]: value });
  }

  return (
    <div className="analytics-content-plan-edit">
      <input className="analytics-launch-input" type="date" value={item.date} onChange={(event) => updateField("date", event.target.value)} />
      <select className="analytics-launch-input" value={item.channel} onChange={(event) => updateField("channel", event.target.value)}>
        {SOCIAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <select className="analytics-launch-input" value={item.format} onChange={(event) => updateField("format", event.target.value)}>
        {FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <select className="analytics-launch-input" value={item.stage} onChange={(event) => updateField("stage", event.target.value)}>
        {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <input className="analytics-launch-input" value={item.topicBlock} onChange={(event) => updateField("topicBlock", event.target.value)} placeholder="Блок" />
      <select className="analytics-launch-input" value={item.reviewStatus} onChange={(event) => updateField("reviewStatus", event.target.value)}>
        {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <select className="analytics-launch-input" value={item.visualStatus} onChange={(event) => updateField("visualStatus", event.target.value)}>
        {VISUAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <select className="analytics-launch-input" value={item.priority} onChange={(event) => updateField("priority", event.target.value)}>
        {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <input className="analytics-launch-input" value={item.owner} onChange={(event) => updateField("owner", event.target.value)} placeholder="Ответственный" />
      <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.visualBrief} onChange={(event) => updateField("visualBrief", event.target.value)} placeholder="Визуал / картинка / видео" />
      <label className="analytics-content-plan-url-field analytics-content-plan-wide">
        <input className="analytics-launch-input" value={item.visualLink} onChange={(event) => updateField("visualLink", event.target.value)} placeholder="Ссылка на визуал / макет / файл" aria-invalid={Boolean(getUrlFieldWarning(item.visualLink))} />
        {getUrlFieldWarning(item.visualLink) ? <small>{getUrlFieldWarning(item.visualLink)}</small> : null}
      </label>
      <textarea className="analytics-launch-input analytics-content-plan-wide" rows="5" value={item.copy} onChange={(event) => updateField("copy", event.target.value)} placeholder="Финальный текст / сценарий" />
      <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.comment} onChange={(event) => updateField("comment", event.target.value)} placeholder="Рабочий комментарий автора / SMM" />
      <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={item.adminComment} onChange={(event) => updateField("adminComment", event.target.value)} placeholder="Админ-комментарий: что исправить перед публикацией" />
      <label className="analytics-content-plan-url-field analytics-content-plan-wide">
        <input className="analytics-launch-input" value={item.publishedUrl || ""} onChange={(event) => updateField("publishedUrl", event.target.value)} placeholder="Ссылка на опубликованный пост" aria-invalid={Boolean(getUrlFieldWarning(item.publishedUrl))} />
        {getUrlFieldWarning(item.publishedUrl) ? <small>{getUrlFieldWarning(item.publishedUrl)}</small> : null}
      </label>
      {item.status === "Опубликовано" ? (
        <label className="analytics-content-plan-url-field analytics-content-plan-wide">
          <input className="analytics-launch-input" type="date" value={item.publishedAt || ""} onChange={(event) => updateField("publishedAt", event.target.value)} aria-label="Дата фактической публикации" />
          <small>Дата фактической публикации для отчётов</small>
        </label>
      ) : null}
    </div>
  );
}
