import { useEffect, useMemo, useState } from "react";

import {
  MARKETING_PIPELINE_STATUSES,
} from "../data/marketingDashboardData";

const RESULT_STATUSES = new Set(["Подключено", "Размещено", "Опубликовано", "Завершено"]);
const IN_PROGRESS_STATUSES = new Set(["Квалифицирован", "Связались", "Переговоры", "Договорились", "Запланировано"]);
const DIRECTION_VIEWS = new Set(["overview", "base", "materials", "notes"]);

function readDirectionView() {
  if (typeof window === "undefined") return "overview";
  const view = new URL(window.location.href).searchParams.get("view");
  return DIRECTION_VIEWS.has(view) ? view : "overview";
}

function rowStats(rows) {
  const activeRows = rows.filter((row) => !row.deleted);
  return {
    total: activeRows.length,
    results: activeRows.filter((row) => RESULT_STATUSES.has(row.status)).length,
    inProgress: activeRows.filter((row) => IN_PROGRESS_STATUSES.has(row.status)).length,
    candidates: activeRows.filter((row) => row.status === "Кандидат").length,
  };
}

function updateItem(items, id, patch) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export default function MarketingDirectionWorkspace({
  direction,
  value,
  sourceStats,
  syncStatus,
  syncLabel,
  operationalPhase,
  onChange,
  onBack,
  linkedPanel,
}) {
  const [activeView, setActiveView] = useState(readDirectionView);
  const stats = useMemo(() => rowStats(value.rows || []), [value.rows]);
  const displayedStats = sourceStats || stats;

  useEffect(() => {
    function handleHistoryChange() {
      setActiveView(readDirectionView());
    }

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  function selectView(nextView) {
    setActiveView(nextView);
    const url = new URL(window.location.href);
    if (nextView === "overview") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", nextView);
    }
    window.history.pushState({}, "", url);
  }

  function updateRows(rows) {
    onChange({ rows });
  }

  function addRow() {
    updateRows([
      {
        id: `${direction.id}-${Date.now()}`,
        name: "Новый контакт / площадка",
        type: "Указать тип",
        status: "Кандидат",
        contact: "Найти контакт",
        lastContactAt: "",
        nextStep: "Проверить и квалифицировать",
        nextActionDueAt: "",
        note: "",
      },
      ...(value.rows || []),
    ]);
  }

  function addMaterial() {
    onChange({
      materials: [
        {
          id: `${direction.id}-material-${Date.now()}`,
          title: "Новый материал",
          url: "",
          status: "Черновик",
          note: "",
        },
        ...(value.materials || []),
      ],
    });
  }

  return (
    <div className="analytics-marketing-direction">
      <section className={`analytics-marketing-direction-head analytics-surface is-${direction.accent}`}>
        <button type="button" className="analytics-marketing-back" onClick={onBack} aria-label="Вернуться в Marketing Dashboard">
          ←
        </button>
        <div className="analytics-marketing-direction-title">
          <p className="analytics-kicker">Marketing Dashboard / {String(direction.order).padStart(2, "0")}</p>
          <h2>{direction.title}</h2>
          <p>{direction.description}</p>
          <span className={`analytics-marketing-sync is-${syncStatus || "loading"}`}>
            {syncLabel || "Проверяем синхронизацию…"}
          </span>
        </div>
        <div className="analytics-marketing-direction-controls">
          <label>
            Ответственный
            <input
              value={value.owner}
              onChange={(event) => onChange({ owner: event.target.value })}
              placeholder="Назначить"
            />
          </label>
          <label>
            Этап
            <select
              value={value.phase === "На паузе" ? "На паузе" : "Авто"}
              onChange={(event) => onChange({ phase: event.target.value })}
            >
              <option value="Авто">Автоматически: {operationalPhase}</option>
              <option value="На паузе">На паузе</option>
            </select>
          </label>
        </div>
      </section>

      <nav className="analytics-marketing-direction-tabs analytics-surface" role="tablist" aria-label={`Разделы ${direction.title}`}>
        {[
          ["overview", "Обзор"],
          ["base", "Рабочая база"],
          ["materials", "Материалы"],
          ["notes", "Заметки"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeView === id}
            className={activeView === id ? "is-active" : ""}
            onClick={() => selectView(id)}
          >
            {label}
            {id === "materials" ? <small>{(value.materials || []).filter((item) => !item.deleted).length}</small> : null}
          </button>
        ))}
      </nav>

      {activeView === "overview" ? (
        <>
          <section className="analytics-marketing-direction-metrics">
            <article><span>Всего в базе</span><strong>{displayedStats.total ?? 0}</strong><small>контактов и площадок</small></article>
            <article><span>В работе</span><strong>{displayedStats.inProgress ?? displayedStats.negotiations ?? 0}</strong><small>контакт и переговоры</small></article>
            <article><span>Результат</span><strong>{displayedStats.results ?? displayedStats.connected ?? 0}</strong><small>подключено / размещено</small></article>
            <article><span>Кандидаты</span><strong>{displayedStats.candidates ?? 0}</strong><small>можно брать в работу</small></article>
          </section>
          <section className="analytics-marketing-direction-overview analytics-surface">
            <div>
              <span>Ответственный</span>
              <strong>{value.owner || "Не назначен"}</strong>
            </div>
            <div>
              <span>Текущий этап</span>
              <strong>{operationalPhase}</strong>
            </div>
            <div>
              <span>Следующее действие</span>
              <strong>{displayedStats.nextStep || "Назначить ответственного и взять первые контакты в работу"}</strong>
            </div>
            {direction.sourceUrl ? (
              <a href={direction.sourceUrl} target="_blank" rel="noreferrer">
                {direction.sourceLabel || "Открыть исходную таблицу"} ↗
              </a>
            ) : null}
          </section>
        </>
      ) : null}

      {activeView === "base" ? (
        linkedPanel || (
          <section className="analytics-marketing-crm analytics-surface">
            <div className="analytics-marketing-crm-head">
              <div>
                <p className="analytics-kicker">Pipeline / outreach</p>
                <h3>Контакты, площадки и переговоры</h3>
                <p>{stats.total} записей · {stats.inProgress} в работе · {stats.results} с результатом</p>
              </div>
              <button type="button" onClick={addRow}>Добавить запись</button>
            </div>
            {(value.rows || []).filter((row) => !row.deleted).length ? (
              <div className="analytics-marketing-crm-table-wrap">
                <table className="analytics-marketing-crm-table">
                  <thead>
                    <tr>
                      <th>Контакт / площадка</th>
                      <th>Тип</th>
                      <th>Статус</th>
                      <th>Как связаться</th>
                      <th>Последний контакт</th>
                      <th>Следующий шаг</th>
                      <th>Сделать до</th>
                      <th>Заметка</th>
                      <th aria-label="Удалить" />
                    </tr>
                  </thead>
                  <tbody>
                    {(value.rows || []).filter((row) => !row.deleted).map((row) => (
                      <tr key={row.id}>
                        <td><input value={row.name} onChange={(event) => updateRows(updateItem(value.rows, row.id, { name: event.target.value }))} /></td>
                        <td><input value={row.type} onChange={(event) => updateRows(updateItem(value.rows, row.id, { type: event.target.value }))} /></td>
                        <td>
                          <select value={row.status} onChange={(event) => updateRows(updateItem(value.rows, row.id, { status: event.target.value }))}>
                            {MARKETING_PIPELINE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                          </select>
                        </td>
                        <td><input value={row.contact} onChange={(event) => updateRows(updateItem(value.rows, row.id, { contact: event.target.value }))} /></td>
                        <td><input type="date" value={row.lastContactAt || ""} onChange={(event) => updateRows(updateItem(value.rows, row.id, { lastContactAt: event.target.value }))} /></td>
                        <td><input value={row.nextStep} onChange={(event) => updateRows(updateItem(value.rows, row.id, { nextStep: event.target.value }))} /></td>
                        <td><input type="date" value={row.nextActionDueAt || ""} onChange={(event) => updateRows(updateItem(value.rows, row.id, { nextActionDueAt: event.target.value }))} /></td>
                        <td><textarea rows="2" value={row.note} onChange={(event) => updateRows(updateItem(value.rows, row.id, { note: event.target.value }))} /></td>
                        <td>
                          <button type="button" className="analytics-marketing-row-delete" onClick={() => updateRows(updateItem(value.rows, row.id, { deleted: true }))} aria-label={`Удалить ${row.name}`}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="analytics-marketing-empty">
                <strong>Рабочая база пока пустая</strong>
                <p>Добавь первый контакт или площадку. Здесь будут храниться статусы, контакты, следующий шаг и история работы.</p>
                <button type="button" onClick={addRow}>Добавить первую запись</button>
              </div>
            )}
          </section>
        )
      ) : null}

      {activeView === "materials" ? (
        <section className="analytics-marketing-materials analytics-surface">
          <div className="analytics-marketing-crm-head">
            <div>
              <p className="analytics-kicker">Files / links / articles</p>
              <h3>Материалы направления</h3>
              <p>Ссылки на статьи, брифы, тексты, таблицы и готовые рекламные материалы.</p>
            </div>
            <button type="button" onClick={addMaterial}>Добавить материал</button>
          </div>
          <div className="analytics-marketing-material-list">
            {(value.materials || []).filter((item) => !item.deleted).map((item) => (
              <article key={item.id}>
                <input value={item.title} onChange={(event) => onChange({ materials: updateItem(value.materials, item.id, { title: event.target.value }) })} />
                <input value={item.url} onChange={(event) => onChange({ materials: updateItem(value.materials, item.id, { url: event.target.value }) })} placeholder="https://" />
                <input value={item.status} onChange={(event) => onChange({ materials: updateItem(value.materials, item.id, { status: event.target.value }) })} />
                <textarea rows="2" value={item.note} onChange={(event) => onChange({ materials: updateItem(value.materials, item.id, { note: event.target.value }) })} placeholder="Комментарий" />
                {item.url ? <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Открыть ${item.title}`}>↗</a> : <span />}
                <button type="button" onClick={() => onChange({ materials: updateItem(value.materials, item.id, { deleted: true }) })} aria-label={`Удалить ${item.title}`}>×</button>
              </article>
            ))}
            {!(value.materials || []).some((item) => !item.deleted) ? (
              <div className="analytics-marketing-empty">
                <strong>Материалов пока нет</strong>
                <p>Добавь ссылку на бриф, статью, таблицу или рекламный макет, когда он появится.</p>
                <button type="button" onClick={addMaterial}>Добавить первый материал</button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeView === "notes" ? (
        <section className="analytics-marketing-notes analytics-surface">
          <div>
            <p className="analytics-kicker">Shared notes</p>
            <h3>Рабочие заметки</h3>
            <p>Решения, договоренности, контекст и то, что важно не потерять между созвонами.</p>
          </div>
          <textarea
            rows="14"
            value={value.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Запиши здесь важную информацию по направлению..."
          />
        </section>
      ) : null}
    </div>
  );
}
