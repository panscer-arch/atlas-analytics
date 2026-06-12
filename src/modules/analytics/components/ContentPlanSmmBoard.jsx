import {
  SMM_FACEBOOK_TOPICS,
  SMM_TOPIC_SECTIONS,
} from "../data/contentPlanData";

function ContentPlanSmmBoard({
  isEditing,
  rows,
  approvals,
  saveMeta,
  stats,
  theme,
  onAddRow,
  onToggleEditing,
  onUpdateApproval,
  onUpdateRow,
  onUpdateTheme,
}) {
  function renderCell(row, field, placeholder, options = {}) {
    const value = row[field] || "";
    if (!isEditing) {
      return (
        <div className={`analytics-smm-read-cell ${options.title ? "analytics-smm-read-title" : ""} ${value ? "" : "analytics-smm-empty"}`}>
          {value || "-"}
        </div>
      );
    }

    if (options.singleLine) {
      return (
        <input
          className="analytics-smm-cell-input"
          value={value}
          onChange={(event) => onUpdateRow(row.id, field, event.target.value)}
          placeholder={placeholder}
        />
      );
    }

    return (
      <textarea
        className={`analytics-smm-cell-input ${options.title ? "analytics-smm-cell-title" : ""} ${field === "edits" ? "analytics-smm-edits-input" : ""}`}
        value={value}
        onChange={(event) => onUpdateRow(row.id, field, event.target.value)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <section className={`analytics-content-plan analytics-smm-plan analytics-smm-plan-${theme}`}>
      <div className="analytics-surface analytics-smm-plan-hero">
        <div>
          <span className="analytics-kicker">SMM / согласование</span>
          <h2 className="analytics-agent-template-title">Контент-план ближайших постов Atlas</h2>
          <p className="analytics-page-subtitle">
            Таблица перенесена из SMM-файла: пост, дата, смысл, формат, тексты, визуал, сценарий видео и правки. В конце каждой строки можно отметить OK или Не OK.
          </p>
        </div>
        <div className="analytics-smm-plan-save">
          <span>{saveMeta.label}</span>
          <small>{saveMeta.detail}</small>
        </div>
        <div className="analytics-smm-theme-toggle" aria-label="Тема таблицы SMM">
          <button type="button" className={theme === "dark" ? "is-active" : ""} onClick={() => onUpdateTheme("dark")}>
            Темная
          </button>
          <button type="button" className={theme === "light" ? "is-active" : ""} onClick={() => onUpdateTheme("light")}>
            Светлая
          </button>
        </div>
      </div>

      <section className="analytics-surface analytics-smm-section analytics-smm-production">
        <div className="analytics-smm-section-head">
          <div>
            <span>Production table</span>
            <h3>SMM-таблица из файла</h3>
          </div>
          <div className="analytics-smm-section-actions">
            <strong>{rows.length} строк</strong>
            <button type="button" onClick={onToggleEditing}>
              {isEditing ? "Готово" : "Редактировать"}
            </button>
            {isEditing ? <button type="button" onClick={onAddRow}>Добавить пост</button> : null}
          </div>
        </div>

        <div className="analytics-smm-table-wrap" aria-label="SMM production table">
          <table className="analytics-smm-table analytics-smm-production-table">
            <thead>
              <tr>
                <th>Пост</th>
                <th>Дата</th>
                <th>Смысл</th>
                <th>Формат</th>
                <th>Текст</th>
                <th>Текст Англ</th>
                <th>Картинка</th>
                <th>Сценарий видео</th>
                <th>Правки</th>
                <th>OK / Не OK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const approval = approvals[row.id] || "";
                return (
                  <tr
                    key={row.id}
                    data-smm-block={row.id}
                    data-smm-approval={approval}
                    className={approval ? `analytics-smm-row-${approval}` : ""}
                  >
                    <td>{renderCell(row, "post", "Название поста", { title: true })}</td>
                    <td>{renderCell(row, "date", "дд.мм.гггг", { singleLine: true })}</td>
                    <td>{renderCell(row, "meaning", "Смысл")}</td>
                    <td>{renderCell(row, "format", "Формат", { singleLine: true })}</td>
                    <td>{renderCell(row, "text", "Текст")}</td>
                    <td>{renderCell(row, "englishText", "Text EN")}</td>
                    <td>{renderCell(row, "visual", "Картинка")}</td>
                    <td>{renderCell(row, "videoScript", "Сценарий видео")}</td>
                    <td>{renderCell(row, "edits", "Правки / комментарий")}</td>
                    <td>
                      <div className="analytics-smm-approval">
                        <button
                          type="button"
                          data-smm-action={`ok-${row.id}`}
                          className={approval === "ok" ? "is-active" : ""}
                          onClick={() => onUpdateApproval(row.id, "ok")}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          data-smm-action={`not-ok-${row.id}`}
                          className={approval === "not-ok" ? "is-active" : ""}
                          onClick={() => onUpdateApproval(row.id, "not-ok")}
                        >
                          Не OK
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="analytics-smm-stats">
        <article className="analytics-surface">
          <span>Блоков</span>
          <strong>{stats.blocks}</strong>
          <small>до / после / рубрики</small>
        </article>
        <article className="analytics-surface">
          <span>Постов в планах</span>
          <strong>{stats.plannedPosts}</strong>
          <small>верхние блоки</small>
        </article>
        <article className="analytics-surface">
          <span>Строк таблицы</span>
          <strong>{stats.productionRows}</strong>
          <small>на согласование</small>
        </article>
        <article className="analytics-surface">
          <span>OK</span>
          <strong>{stats.ok}</strong>
          <small>согласовано</small>
        </article>
        <article className="analytics-surface">
          <span>Не OK</span>
          <strong>{stats.notOk}</strong>
          <small>нужна правка</small>
        </article>
        <article className="analytics-surface">
          <span>Без решения</span>
          <strong>{stats.pending}</strong>
          <small>еще посмотреть</small>
        </article>
      </div>

      <div className="analytics-smm-topic-grid">
        {SMM_TOPIC_SECTIONS.map((section) => (
          <section key={section.id} className="analytics-surface analytics-smm-section">
            <div className="analytics-smm-section-head">
              <div>
                <span>{section.subtitle}</span>
                <h3>{section.title}</h3>
              </div>
              <strong>{section.blocks.length} блоков</strong>
            </div>

            <div className="analytics-smm-block-grid">
              {section.blocks.map((block) => (
                <article key={block.id} className="analytics-smm-topic-card">
                  <strong>{block.title}</strong>
                  <ol>
                    {block.posts.map((post) => <li key={post}>{post}</li>)}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="analytics-surface analytics-smm-section">
          <div className="analytics-smm-section-head">
            <div>
              <span>Отдельный список</span>
              <h3>Темы для Facebook</h3>
            </div>
            <strong>{stats.facebookTopics} тем</strong>
          </div>
          <div className="analytics-smm-facebook-grid">
            {SMM_FACEBOOK_TOPICS.map((block) => (
              <article key={block.id} className="analytics-smm-topic-card">
                <strong>{block.title}</strong>
                <ol>
                  {block.posts.map((post) => <li key={post}>{post}</li>)}
                </ol>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default ContentPlanSmmBoard;
