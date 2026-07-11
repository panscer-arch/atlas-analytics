import { useEffect, useMemo, useState } from "react";

import BusinessForHomeLeadsPanel from "./BusinessForHomeLeadsPanel";
import DirectSalesDirectoryLeadsPanel from "./DirectSalesDirectoryLeadsPanel";
import {
  MLM_LEADER_OUTREACH_COLUMNS,
  MLM_LEADER_OUTREACH_REGIONS,
  MLM_LEADER_OUTREACH_STATUS_OPTIONS,
  MLM_LEADER_OUTREACH_STORAGE_KEY,
  defaultMlmLeaderOutreachPlatforms,
  mlmLeaderOutreachPlaybook,
} from "../data/mlmLeaderOutreachData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

function hydrateRows(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;
  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredRows() {
  if (typeof window === "undefined") return defaultMlmLeaderOutreachPlatforms;
  try {
    const saved = window.localStorage.getItem(MLM_LEADER_OUTREACH_STORAGE_KEY);
    return hydrateRows(saved ? JSON.parse(saved) : null, defaultMlmLeaderOutreachPlatforms);
  } catch {
    return defaultMlmLeaderOutreachPlatforms;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = MLM_LEADER_OUTREACH_COLUMNS.map((column) => column.label);
  const body = rows.map((row) => MLM_LEADER_OUTREACH_COLUMNS.map((column) => row[column.key]).map(csvCell).join(","));
  return ["\ufeff" + header.map(csvCell).join(","), ...body].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-mlm-leader-outreach.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function statusTone(status) {
  if (status === "Ответили" || status === "Разместили") return "success";
  if (status === "Не подходит" || status === "Пауза") return "danger";
  return "accent";
}

function MlmViewSwitch({ activeView, onChange }) {
  return (
    <div className="analytics-mlm-view-switch analytics-surface" role="tablist" aria-label="База MLM-лидеров">
      <button
        type="button"
        className={activeView === "sources" ? "analytics-mlm-view-switch-active" : ""}
        onClick={() => onChange("sources")}
        role="tab"
        aria-selected={activeView === "sources"}
      >
        <span>Источники</span>
        <small>площадки и сообщества</small>
      </button>
      <button
        type="button"
        className={activeView === "northAmerica" ? "analytics-mlm-view-switch-active" : ""}
        onClick={() => onChange("northAmerica")}
        role="tab"
        aria-selected={activeView === "northAmerica"}
      >
        <span>Лидеры США / Канада</span>
        <small>Direct Sales Directory</small>
      </button>
      <button
        type="button"
        className={activeView === "leaders" ? "analytics-mlm-view-switch-active" : ""}
        onClick={() => onChange("leaders")}
        role="tab"
        aria-selected={activeView === "leaders"}
      >
        <span>Лидеры BFH</span>
        <small>публичный каталог</small>
      </button>
    </div>
  );
}

export default function MlmLeaderOutreachPanel() {
  const [rows, setRows] = useState(readStoredRows);
  const [activeRegion, setActiveRegion] = useState("all");
  const [query, setQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [activeView, setActiveView] = useState("sources");

  useEffect(() => {
    let isMounted = true;
    loadServerContent(MLM_LEADER_OUTREACH_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateRows(savedRows, defaultMlmLeaderOutreachPlatforms);
        setRows(hydrated);
        try {
          window.localStorage.setItem(MLM_LEADER_OUTREACH_STORAGE_KEY, JSON.stringify(hydrated));
        } catch {
          // Таблица останется доступна в памяти страницы.
        }
        setSaveState("Сохранено на сервере");
      }
      setIsLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      try {
        window.localStorage.setItem(MLM_LEADER_OUTREACH_STORAGE_KEY, JSON.stringify(rows));
      } catch {
        // Серверное сохранение ниже всё равно попробуем.
      }
      saveServerContent(MLM_LEADER_OUTREACH_STORAGE_KEY, rows).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.deleted) return false;
      if (activeRegion !== "all" && row.region !== activeRegion) return false;
      if (!search) return true;
      return MLM_LEADER_OUTREACH_COLUMNS.some((column) => String(row[column.key] || "").toLowerCase().includes(search));
    });
  }, [activeRegion, query, rows]);

  const stats = useMemo(() => {
    const activeRows = rows.filter((row) => !row.deleted);
    return {
      total: activeRows.length,
      global: activeRows.filter((row) => row.region === "global").length,
      asia: activeRows.filter((row) => row.region === "asia").length,
      africa: activeRows.filter((row) => row.region === "africa").length,
      latam: activeRows.filter((row) => row.region === "latam").length,
      hot: activeRows.filter((row) => row.priority === "1. Сначала").length,
    };
  }, [rows]);

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [{
      id: `mlm-leader-${Date.now()}`,
      platform: "Новая площадка",
      country: "Global",
      region: activeRegion === "all" ? "global" : activeRegion,
      type: "MLM / network marketing source",
      url: "https://",
      contactRoute: "Contact / DM / advertise / members",
      audience: "Network marketing leaders and community builders.",
      whyFits: "Описать, почему здесь можно найти сетевиков.",
      outreachAngle: "Regional Web3 Community Partner, not classic MLM job.",
      price: "Запросить",
      priority: "2. Следом",
      status: "Кандидат",
      notes: "Проверить контакт, стоимость, релевантность и правила публикации.",
    }, ...current]);
  }

  if (activeView === "leaders") {
    return (
      <section className="analytics-parser analytics-mlm-leaders">
        <MlmViewSwitch activeView={activeView} onChange={setActiveView} />
        <BusinessForHomeLeadsPanel />
      </section>
    );
  }

  if (activeView === "northAmerica") {
    return (
      <section className="analytics-parser analytics-mlm-leaders">
        <MlmViewSwitch activeView={activeView} onChange={setActiveView} />
        <DirectSalesDirectoryLeadsPanel />
      </section>
    );
  }

  return (
    <section className="analytics-parser analytics-mlm-leaders">
      <MlmViewSwitch activeView={activeView} onChange={setActiveView} />
      <section className="analytics-surface analytics-mlm-leaders-hero">
        <div>
          <p className="analytics-kicker">MLM / Network Marketing leaders</p>
          <h2>Поиск сетевых лидеров для Atlas</h2>
          <p>
            Это отдельная карта источников для поиска network marketing лидеров: direct selling ассоциации,
            MLM-медиа, тренеры, recruiter-сервисы, события и job/community площадки.
          </p>
        </div>
        <div className="analytics-mlm-leaders-verdict">
          <span>Главный вывод</span>
          <strong>Не job, а partner program</strong>
          <p>Ищем региональных партнёров и community leaders, а не обычных сотрудников на зарплату.</p>
        </div>
      </section>

      <section className="analytics-mlm-leaders-stats">
        <article><span>Всего</span><strong>{stats.total}</strong><small>источника</small></article>
        <article><span>Global</span><strong>{stats.global}</strong><small>медиа / тренеры / рекрутеры</small></article>
        <article><span>Азия</span><strong>{stats.asia}</strong><small>ассоциации и рынки</small></article>
        <article><span>Африка</span><strong>{stats.africa}</strong><small>direct selling рынки</small></article>
        <article><span>Латам</span><strong>{stats.latam}</strong><small>испанский / португальский</small></article>
        <article><span>Приоритет</span><strong>{stats.hot}</strong><small>сначала проверить</small></article>
      </section>

      <section className="analytics-mlm-leaders-playbook analytics-surface">
        <article>
          <h3>Позиционирование</h3>
          <ul>{mlmLeaderOutreachPlaybook.positioning.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <h3>Лучшие формулировки</h3>
          <ul>{mlmLeaderOutreachPlaybook.bestAngles.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <h3>Не писать</h3>
          <ul>{mlmLeaderOutreachPlaybook.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">CRM / MLM leaders outreach</p>
            <h2>Список источников</h2>
            <p>{visibleRows.length} в фильтре · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать"}
            </button>
            <button type="button" onClick={addRow}>Добавить источник</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-quick-filters">
          {MLM_LEADER_OUTREACH_REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={`analytics-parser-filter-chip${activeRegion === region.id ? " analytics-parser-filter-chip-active" : ""}`}
              onClick={() => setActiveRegion(region.id)}
            >
              {region.label}
            </button>
          ))}
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label className="analytics-parser-wide">
            Поиск по стране, площадке, типу, аудитории или комментарию
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Indonesia, DSA, MLM Nation, Africa, recruiter..." />
          </label>
        </div>

        <div className="analytics-mlm-leaders-table-scroll">
          <table className="analytics-mlm-leaders-table">
            <thead>
              <tr>
                <th>Источник</th>
                <th>Страна / регион</th>
                <th>Аудитория</th>
                <th>Почему подходит</th>
                <th>Как заходить</th>
                <th>Цена</th>
                <th>Статус</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {isEditing ? (
                      <>
                        <input value={row.platform} onChange={(event) => updateRow(row.id, { platform: event.target.value })} />
                        <input value={row.url} onChange={(event) => updateRow(row.id, { url: event.target.value })} />
                        <input value={row.type} onChange={(event) => updateRow(row.id, { type: event.target.value })} />
                        <button type="button" className="analytics-parser-mini-button" onClick={() => updateRow(row.id, { deleted: true })}>Удалить</button>
                      </>
                    ) : (
                      <>
                        <strong>{row.platform}</strong>
                        <span>{row.type}</span>
                        <a href={row.url} target="_blank" rel="noreferrer">Открыть</a>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <input value={row.country} onChange={(event) => updateRow(row.id, { country: event.target.value })} />
                        <select value={row.region} onChange={(event) => updateRow(row.id, { region: event.target.value })}>
                          {MLM_LEADER_OUTREACH_REGIONS.filter((region) => region.id !== "all").map((region) => (
                            <option key={region.id} value={region.id}>{region.label}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <strong>{row.country}</strong>
                        <span className="analytics-mlm-leaders-pill">{MLM_LEADER_OUTREACH_REGIONS.find((region) => region.id === row.region)?.label || row.region}</span>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <textarea value={row.audience} onChange={(event) => updateRow(row.id, { audience: event.target.value })} />
                        <textarea value={row.contactRoute} onChange={(event) => updateRow(row.id, { contactRoute: event.target.value })} />
                      </>
                    ) : (
                      <>
                        <p>{row.audience}</p>
                        <small>{row.contactRoute}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.whyFits} onChange={(event) => updateRow(row.id, { whyFits: event.target.value })} />
                    ) : (
                      <p>{row.whyFits}</p>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.outreachAngle} onChange={(event) => updateRow(row.id, { outreachAngle: event.target.value })} />
                    ) : (
                      <p>{row.outreachAngle}</p>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <input value={row.price} onChange={(event) => updateRow(row.id, { price: event.target.value })} />
                        <select value={row.priority} onChange={(event) => updateRow(row.id, { priority: event.target.value })}>
                          <option value="1. Сначала">1. Сначала</option>
                          <option value="2. Следом">2. Следом</option>
                          <option value="3. Позже">3. Позже</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <span>{row.price}</span>
                        <small>{row.priority}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })}>
                        {MLM_LEADER_OUTREACH_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    ) : (
                      <span className={`analytics-parser-status-${statusTone(row.status)}`}>{row.status}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} />
                    ) : (
                      <p>{row.notes}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
