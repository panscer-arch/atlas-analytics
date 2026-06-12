import {
  FORMAT_OPTIONS,
  PRIORITY_OPTIONS,
  REVIEW_OPTIONS,
  SOCIAL_OPTIONS,
  STAGE_OPTIONS,
  STATUS_OPTIONS,
  VISUAL_OPTIONS,
} from "../data/contentPlanData";

export default function ContentPlanAddForm({ newItem, setNewItem, getUrlFieldWarning, onAddItem }) {
  function updateDraftField(field, value) {
    setNewItem((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="analytics-surface analytics-content-plan-form">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Добавить публикацию</span>
          <h3 className="analytics-section-title">Новая карточка контента</h3>
        </div>
      </div>
      <div className="analytics-content-plan-add-grid">
        <input className="analytics-launch-input" type="date" value={newItem.date} onChange={(event) => updateDraftField("date", event.target.value)} />
        <select className="analytics-launch-input" value={newItem.channel} onChange={(event) => updateDraftField("channel", event.target.value)}>
          {SOCIAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-input" value={newItem.format} onChange={(event) => updateDraftField("format", event.target.value)}>
          {FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-input" value={newItem.stage} onChange={(event) => updateDraftField("stage", event.target.value)}>
          {STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input className="analytics-launch-input" value={newItem.topicBlock} onChange={(event) => updateDraftField("topicBlock", event.target.value)} placeholder="Блок: Smart Cycle, Web3..." />
        <input className="analytics-launch-input" value={newItem.title} onChange={(event) => updateDraftField("title", event.target.value)} placeholder="Тема публикации" />
        <select className="analytics-launch-input" value={newItem.status} onChange={(event) => updateDraftField("status", event.target.value)}>
          {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-input" value={newItem.reviewStatus} onChange={(event) => updateDraftField("reviewStatus", event.target.value)}>
          {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-input" value={newItem.visualStatus} onChange={(event) => updateDraftField("visualStatus", event.target.value)}>
          {VISUAL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="analytics-launch-input" value={newItem.priority} onChange={(event) => updateDraftField("priority", event.target.value)}>
          {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input className="analytics-launch-input" value={newItem.owner} onChange={(event) => updateDraftField("owner", event.target.value)} placeholder="Ответственный" />
        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.visualBrief} onChange={(event) => updateDraftField("visualBrief", event.target.value)} placeholder="Что должно быть на картинке / видео / обложке" />
        <label className="analytics-content-plan-url-field analytics-content-plan-wide">
          <input className="analytics-launch-input" value={newItem.visualLink} onChange={(event) => updateDraftField("visualLink", event.target.value)} placeholder="Ссылка на визуал / макет / файл" aria-invalid={Boolean(getUrlFieldWarning(newItem.visualLink))} />
          {getUrlFieldWarning(newItem.visualLink) ? <small>{getUrlFieldWarning(newItem.visualLink)}</small> : null}
        </label>
        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="3" value={newItem.copy} onChange={(event) => updateDraftField("copy", event.target.value)} placeholder="Финальный текст / сценарий / тезисы" />
        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.comment} onChange={(event) => updateDraftField("comment", event.target.value)} placeholder="Рабочий комментарий автора / SMM" />
        <textarea className="analytics-launch-input analytics-content-plan-wide" rows="2" value={newItem.adminComment} onChange={(event) => updateDraftField("adminComment", event.target.value)} placeholder="Админ-комментарий: что исправить перед публикацией" />
        <label className="analytics-content-plan-url-field analytics-content-plan-wide">
          <input className="analytics-launch-input" value={newItem.publishedUrl} onChange={(event) => updateDraftField("publishedUrl", event.target.value)} placeholder="Ссылка на опубликованный пост" aria-invalid={Boolean(getUrlFieldWarning(newItem.publishedUrl))} />
          {getUrlFieldWarning(newItem.publishedUrl) ? <small>{getUrlFieldWarning(newItem.publishedUrl)}</small> : null}
        </label>
        <button type="button" className="analytics-content-plan-add-btn" onClick={onAddItem} disabled={!newItem.title.trim()}>
          Добавить
        </button>
      </div>
    </div>
  );
}
