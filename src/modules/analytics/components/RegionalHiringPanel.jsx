import { useEffect, useMemo, useRef, useState } from "react";

import {
  REGIONAL_HIRING_COLUMNS,
  REGIONAL_HIRING_REGIONS,
  REGIONAL_HIRING_STATUS_OPTIONS,
  REGIONAL_HIRING_STORAGE_KEY,
  defaultRegionalHiringPlatforms,
  regionalHiringPlaybook,
} from "../data/regionalHiringData";
import {
  loadServerContent,
  saveServerContent,
  saveServerContentResult,
} from "../services/contentStore";

function hydrateRows(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;
  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredRows() {
  if (typeof window === "undefined") return defaultRegionalHiringPlatforms;
  try {
    const saved = window.localStorage.getItem(REGIONAL_HIRING_STORAGE_KEY);
    return hydrateRows(saved ? JSON.parse(saved) : null, defaultRegionalHiringPlatforms);
  } catch {
    return defaultRegionalHiringPlatforms;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = REGIONAL_HIRING_COLUMNS.map((column) => column.label);
  const body = rows.map((row) => REGIONAL_HIRING_COLUMNS.map((column) => row[column.key]).map(csvCell).join(","));
  return ["\ufeff" + header.map(csvCell).join(","), ...body].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-regional-hiring-platforms.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function statusTone(status) {
  if (status === "Разместили" || status === "Есть отклики") return "success";
  if (status === "Не подходит" || status === "Пауза") return "danger";
  return "accent";
}

export default function RegionalHiringPanel({ onRowsChange } = {}) {
  const [rows, setRows] = useState(readStoredRows);
  const [activeRegion, setActiveRegion] = useState("all");
  const [query, setQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const latestRowsRef = useRef(rows);
  const isLoadedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const changeRevisionRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    loadServerContent(REGIONAL_HIRING_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateRows(savedRows, defaultRegionalHiringPlatforms);
        latestRowsRef.current = hydrated;
        setRows(hydrated);
        try {
          window.localStorage.setItem(REGIONAL_HIRING_STORAGE_KEY, JSON.stringify(hydrated));
        } catch {
          // Интерфейс продолжит работать без локального кеша.
        }
        setSaveState("Сохранено на сервере");
      }
      isLoadedRef.current = true;
      setIsLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    latestRowsRef.current = rows;
    try {
      window.localStorage.setItem(REGIONAL_HIRING_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // Серверное сохранение ниже всё равно попробуем.
    }
    if (!isDirtyRef.current) return undefined;
    const revision = changeRevisionRef.current;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      saveServerContent(REGIONAL_HIRING_STORAGE_KEY, rows).then((ok) => {
        if (ok && changeRevisionRef.current === revision) {
          isDirtyRef.current = false;
        }
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  useEffect(() => {
    onRowsChange?.(rows);
  }, [onRowsChange, rows]);

  useEffect(() => () => {
    if (!isLoadedRef.current || !isDirtyRef.current) return;
    void saveServerContentResult(
      REGIONAL_HIRING_STORAGE_KEY,
      latestRowsRef.current,
      { keepalive: true },
    );
  }, []);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.deleted) return false;
      if (activeRegion !== "all" && row.region !== activeRegion) return false;
      if (!search) return true;
      return REGIONAL_HIRING_COLUMNS.some((column) => String(row[column.key] || "").toLowerCase().includes(search));
    });
  }, [activeRegion, query, rows]);

  const stats = useMemo(() => {
    const activeRows = rows.filter((row) => !row.deleted);
    return {
      total: activeRows.length,
      web3: activeRows.filter((row) => row.region === "web3").length,
      indonesia: activeRows.filter((row) => row.region === "indonesia").length,
      africa: activeRows.filter((row) => row.region === "africa").length,
      live: activeRows.filter((row) => ["Разместили", "Есть отклики"].includes(row.status)).length,
    };
  }, [rows]);

  function updateRow(id, patch) {
    setRows((current) => {
      const nextRows = current.map((row) => (row.id === id ? { ...row, ...patch } : row));
      isDirtyRef.current = true;
      changeRevisionRef.current += 1;
      latestRowsRef.current = nextRows;
      try {
        window.localStorage.setItem(REGIONAL_HIRING_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // Финальная отправка на сервер всё равно будет выполнена.
      }
      return nextRows;
    });
  }

  function addRow() {
    setRows((current) => {
      const nextRows = [{
        id: `regional-hiring-${Date.now()}`,
        platform: "Новая площадка",
        region: activeRegion === "all" ? "remote" : activeRegion,
        type: "Job board",
        url: "https://",
        roleAngle: "Regional Web3 Community Partner",
        candidateFit: "Описать нужный профиль кандидата.",
        offer: "Partner role, webinars, community growth, performance rewards.",
        riskNote: "Не обещать гарантированный доход или штатную зарплату без основания.",
        price: "Проверить",
        status: "Кандидат",
        notes: "Проверить правила размещения, цену, модерацию и релевантность.",
      }, ...current];
      isDirtyRef.current = true;
      changeRevisionRef.current += 1;
      latestRowsRef.current = nextRows;
      try {
        window.localStorage.setItem(REGIONAL_HIRING_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // Финальная отправка на сервер всё равно будет выполнена.
      }
      return nextRows;
    });
  }

  return (
    <section className="analytics-parser analytics-regional-hiring">
      <section className="analytics-surface analytics-regional-hiring-hero">
        <div>
          <p className="analytics-kicker">Regional partners / hiring hypothesis</p>
          <h2>Площадки для поиска региональных партнёров Atlas</h2>
          <p>
            Рабочая гипотеза: искать не штатных сотрудников, а local Web3 / crypto / MLM community leaders,
            которые смогут проводить вебинары, развивать региональные группы и приводить участников через прозрачную партнёрскую модель.
          </p>
        </div>
        <div className="analytics-regional-hiring-verdict">
          <span>Формат</span>
          <strong>Partner role</strong>
          <p>Contract / freelance / performance-based rewards. Без обещаний фиксированной зарплаты, если её нет.</p>
        </div>
      </section>

      <section className="analytics-regional-hiring-stats">
        <article><span>Всего</span><strong>{stats.total}</strong><small>площадок</small></article>
        <article><span>Web3</span><strong>{stats.web3}</strong><small>глобальные job boards</small></article>
        <article><span>Индонезия</span><strong>{stats.indonesia}</strong><small>локальные площадки</small></article>
        <article><span>Африка</span><strong>{stats.africa}</strong><small>региональные площадки</small></article>
        <article><span>В работе</span><strong>{stats.live}</strong><small>размещено / отклики</small></article>
      </section>

      <section className="analytics-regional-hiring-playbook analytics-surface">
        <article>
          <h3>Как позиционировать</h3>
          <ul>{regionalHiringPlaybook.positioning.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <h3>Названия ролей</h3>
          <ul>{regionalHiringPlaybook.roleTitles.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <h3>Что можно обещать</h3>
          <ul>{regionalHiringPlaybook.allowedOffer.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <h3>Что нельзя писать</h3>
          <ul>{regionalHiringPlaybook.forbiddenWording.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">CRM / job boards</p>
            <h2>Список площадок</h2>
            <p>{visibleRows.length} в фильтре · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать"}
            </button>
            <button type="button" onClick={addRow}>Добавить площадку</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-quick-filters">
          {REGIONAL_HIRING_REGIONS.map((region) => (
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
            Поиск по площадкам, ролям, странам и комментариям
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Indonesia, Web3, community, Africa..." />
          </label>
        </div>

        <div className="analytics-regional-hiring-table-scroll">
          <table className="analytics-regional-hiring-table">
            <thead>
              <tr>
                <th>Площадка</th>
                <th>Регион</th>
                <th>Роль и кандидат</th>
                <th>Оффер / ограничения</th>
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
                        <button type="button" className="analytics-parser-mini-button" onClick={() => updateRow(row.id, { deleted: true })}>Удалить</button>
                      </>
                    ) : (
                      <>
                        <strong>{row.platform}</strong>
                        <span>{row.type}</span>
                        <a href={row.url} target="_blank" rel="noreferrer">Открыть сайт</a>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.region} onChange={(event) => updateRow(row.id, { region: event.target.value })}>
                        {REGIONAL_HIRING_REGIONS.filter((region) => region.id !== "all").map((region) => (
                          <option key={region.id} value={region.id}>{region.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="analytics-regional-hiring-pill">{REGIONAL_HIRING_REGIONS.find((region) => region.id === row.region)?.label || row.region}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <textarea value={row.roleAngle} onChange={(event) => updateRow(row.id, { roleAngle: event.target.value })} />
                        <textarea value={row.candidateFit} onChange={(event) => updateRow(row.id, { candidateFit: event.target.value })} />
                      </>
                    ) : (
                      <>
                        <strong>{row.roleAngle}</strong>
                        <p>{row.candidateFit}</p>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <textarea value={row.offer} onChange={(event) => updateRow(row.id, { offer: event.target.value })} />
                        <textarea value={row.riskNote} onChange={(event) => updateRow(row.id, { riskNote: event.target.value })} />
                      </>
                    ) : (
                      <>
                        <p>{row.offer}</p>
                        <small>{row.riskNote}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.price} onChange={(event) => updateRow(row.id, { price: event.target.value })} />
                    ) : (
                      <span>{row.price}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })}>
                        {REGIONAL_HIRING_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
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
