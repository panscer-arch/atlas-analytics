import { useEffect, useMemo, useState } from "react";

import {
  MARKET_SEGMENTS_COLUMNS,
  MARKET_SEGMENTS_STORAGE_KEY,
  defaultMarketSegments,
} from "../data/marketSegmentsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const STATUS_OPTIONS = ["Активно искать", "Готовить angle", "Фильтровать", "Запас", "Пауза"];
const ALLOWED_ATLAS_FIT = new Set(["Высокая", "Очень высокая"]);

function hydrateSegments(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;

  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows
    .map((row) => ({ ...(seedById.get(row.id) || {}), ...row }))
    .filter((row) => ALLOWED_ATLAS_FIT.has(row.atlasFit));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredSegments() {
  if (typeof window === "undefined") return defaultMarketSegments;

  try {
    const saved = window.localStorage.getItem(MARKET_SEGMENTS_STORAGE_KEY);
    return hydrateSegments(saved ? JSON.parse(saved) : null, defaultMarketSegments);
  } catch {
    return defaultMarketSegments;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = ["№", "Направление", "Примеры", "Как зарабатывают", "Близость к Atlas", "Где искать", "Качество лида", "Риск", "Приоритет", "Комментарий", "Статус"];
  const body = rows.map((row, index) => [
    index + 1,
    row.direction,
    row.examples,
    row.earningLogic,
    row.atlasFit,
    row.whereToFind,
    row.leadQuality,
    row.risk,
    row.priority,
    row.notes,
    row.status,
  ].map(csvCell).join(","));
  return ["\ufeff" + header.map(csvCell).join(","), ...body].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-market-segments.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function optionList(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

function statusTone(status) {
  if (status === "Активно искать") return "success";
  if (status === "Фильтровать") return "danger";
  return "accent";
}

function fitTone(fit) {
  if (fit === "Очень высокая") return "success";
  if (fit === "Высокая") return "accent";
  return "danger";
}

export default function MarketSegmentsPanel() {
  const [segments, setSegments] = useState(readStoredSegments);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [atlasFit, setAtlasFit] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(MARKET_SEGMENTS_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateSegments(savedRows, defaultMarketSegments);
        setSegments(hydrated);
        try {
          window.localStorage.setItem(MARKET_SEGMENTS_STORAGE_KEY, JSON.stringify(hydrated));
        } catch {
          // Таблица останется доступна в состоянии страницы.
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
        window.localStorage.setItem(MARKET_SEGMENTS_STORAGE_KEY, JSON.stringify(segments));
      } catch {
        // Серверное сохранение ниже всё равно попробуем.
      }

      saveServerContent(MARKET_SEGMENTS_STORAGE_KEY, segments).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isLoaded, segments]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return segments.filter((row) => {
      if (row.deleted) return false;
      if (priority && row.priority !== priority) return false;
      if (atlasFit && row.atlasFit !== atlasFit) return false;
      if (status && row.status !== status) return false;
      if (!search) return true;
      return [row.direction, row.examples, row.earningLogic, row.atlasFit, row.whereToFind, row.leadQuality, row.risk, row.priority, row.notes, row.status]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [atlasFit, priority, query, segments, status]);

  const priorityOptions = useMemo(() => optionList(segments, "priority"), [segments]);
  const fitOptions = useMemo(() => optionList(segments, "atlasFit"), [segments]);
  const deletedCount = segments.filter((row) => row.deleted).length;
  const activeCount = segments.length - deletedCount;
  const hotCount = segments.filter((row) => !row.deleted && row.status === "Активно искать").length;

  function updateSegment(id, patch) {
    setSegments((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addSegment() {
    setSegments((current) => [{
      id: `market-segment-manual-${Date.now()}`,
      direction: "Новое направление",
      examples: "Указать примеры проектов",
      earningLogic: "Описать, как там зарабатывают",
      atlasFit: "Высокая",
      whereToFind: "Telegram, YouTube, X",
      leadQuality: "Смешанный",
      risk: "Средний",
      priority: "3. Запас",
      notes: "Проверить релевантность и подготовить отдельный angle для Atlas.",
      status: "Готовить angle",
    }, ...current]);
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">Atlas market map / близкие направления</p>
            <h2>Сегменты рынка для Atlas</h2>
            <p>
              {visibleRows.length} в фильтре · {activeCount} направлений · активных {hotCount} · удалено {deletedCount} · {saveState}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать таблицу"}
            </button>
            <button type="button" onClick={addSegment}>Добавить направление</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label>
            Приоритет
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">все приоритеты</option>
              {priorityOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Близость к Atlas
            <select value={atlasFit} onChange={(event) => setAtlasFit(event.target.value)}>
              <option value="">любая близость</option>
              {fitOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Статус
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">все статусы</option>
              {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="HYIP, MLM, токены, DeFi, P2P..." />
          </label>
        </div>

        <div className="analytics-bitnest-youtube-table-scroll">
          <table className="analytics-bitnest-youtube-table">
            <thead>
              <tr>
                {MARKET_SEGMENTS_COLUMNS.map((column) => <th key={column || "actions"}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-parser-mini-button analytics-bitnest-youtube-delete"
                      onClick={() => updateSegment(row.id, { deleted: true })}
                      aria-label={`Удалить ${row.direction}`}
                    >
                      x
                    </button>
                    <span>{index + 1}</span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.direction || ""} onChange={(event) => updateSegment(row.id, { direction: event.target.value })} />
                    ) : row.direction}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.examples || ""} onChange={(event) => updateSegment(row.id, { examples: event.target.value })} rows="3" />
                    ) : row.examples}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.earningLogic || ""} onChange={(event) => updateSegment(row.id, { earningLogic: event.target.value })} rows="3" />
                    ) : row.earningLogic}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.atlasFit || ""} onChange={(event) => updateSegment(row.id, { atlasFit: event.target.value })} />
                    ) : (
                      <strong className={`analytics-parser-status analytics-parser-status-${fitTone(row.atlasFit)}`}>{row.atlasFit}</strong>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.whereToFind || ""} onChange={(event) => updateSegment(row.id, { whereToFind: event.target.value })} rows="3" />
                    ) : row.whereToFind}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.leadQuality || ""} onChange={(event) => updateSegment(row.id, { leadQuality: event.target.value })} />
                    ) : row.leadQuality}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.risk || ""} onChange={(event) => updateSegment(row.id, { risk: event.target.value })} />
                    ) : row.risk}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.priority || ""} onChange={(event) => updateSegment(row.id, { priority: event.target.value })} />
                    ) : row.priority}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.notes || ""} onChange={(event) => updateSegment(row.id, { notes: event.target.value })} rows="3" />
                    ) : row.notes}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.status || "Готовить angle"} onChange={(event) => updateSegment(row.id, { status: event.target.value })}>
                        {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    ) : (
                      <strong className={`analytics-parser-status analytics-parser-status-${statusTone(row.status)}`}>{row.status}</strong>
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
