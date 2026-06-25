import { useEffect, useMemo, useState } from "react";

import {
  WEB3_SEGMENTS_COLUMNS,
  WEB3_SEGMENTS_STORAGE_KEY,
  defaultWeb3Segments,
} from "../data/web3SegmentsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const STATUS_OPTIONS = ["Искать источники", "Готовить angle", "Фильтровать", "Пауза"];

function hydrateRows(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;

  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredRows() {
  if (typeof window === "undefined") return defaultWeb3Segments;

  try {
    const saved = window.localStorage.getItem(WEB3_SEGMENTS_STORAGE_KEY);
    return hydrateRows(saved ? JSON.parse(saved) : null, defaultWeb3Segments);
  } catch {
    return defaultWeb3Segments;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = ["№", "Сегмент", "Кто это", "Что им важно", "Где искать", "Angle для Atlas", "Каналы", "Приоритет", "Риск", "Следующий шаг", "Статус"];
  const body = rows.map((row, index) => [
    index + 1,
    row.segment,
    row.audience,
    row.motivation,
    row.whereToFind,
    row.atlasAngle,
    row.channels,
    row.priority,
    row.risk,
    row.nextStep,
    row.status,
  ].map(csvCell).join(","));
  return ["\ufeff" + header.map(csvCell).join(","), ...body].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-web3-segments.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function optionList(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

function statusTone(status) {
  if (status === "Искать источники") return "success";
  if (status === "Фильтровать") return "danger";
  return "accent";
}

function priorityTone(priority = "") {
  if (priority.startsWith("1.")) return "success";
  if (priority.startsWith("2.")) return "accent";
  return "default";
}

export default function Web3SegmentsPanel() {
  const [rows, setRows] = useState(readStoredRows);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(WEB3_SEGMENTS_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateRows(savedRows, defaultWeb3Segments);
        setRows(hydrated);
        try {
          window.localStorage.setItem(WEB3_SEGMENTS_STORAGE_KEY, JSON.stringify(hydrated));
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
        window.localStorage.setItem(WEB3_SEGMENTS_STORAGE_KEY, JSON.stringify(rows));
      } catch {
        // Серверное сохранение ниже всё равно попробуем.
      }

      saveServerContent(WEB3_SEGMENTS_STORAGE_KEY, rows).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.deleted) return false;
      if (priority && row.priority !== priority) return false;
      if (status && row.status !== status) return false;
      if (!search) return true;
      return [row.segment, row.audience, row.motivation, row.whereToFind, row.atlasAngle, row.channels, row.priority, row.risk, row.nextStep, row.status]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [priority, query, rows, status]);

  const priorityOptions = useMemo(() => optionList(rows, "priority"), [rows]);
  const totalActive = rows.filter((row) => !row.deleted).length;
  const hotCount = rows.filter((row) => !row.deleted && row.priority?.startsWith("1.")).length;

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [{
      id: `web3-segment-manual-${Date.now()}`,
      segment: "Новый Web3-сегмент",
      audience: "Описать аудиторию",
      motivation: "Что им важно",
      whereToFind: "Telegram, X, YouTube, Discord",
      atlasAngle: "Как объяснить Atlas этому сегменту",
      channels: "Telegram, X",
      priority: "3. Запас",
      risk: "Средний",
      nextStep: "Собрать источники и проверить живость",
      status: "Искать источники",
    }, ...current]);
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">Web3 audience map / сегментация</p>
            <h2>Сегменты Web3-аудитории для Atlas</h2>
            <p>
              {visibleRows.length} в фильтре · {totalActive} сегментов · приоритетных {hotCount} · {saveState}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать таблицу"}
            </button>
            <button type="button" onClick={addRow}>Добавить сегмент</button>
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
            Статус
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">все статусы</option>
              {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="DeFi, airdrop, DAO, BNB, wallet..." />
          </label>
        </div>

        <div className="analytics-bitnest-youtube-table-scroll">
          <table className="analytics-bitnest-youtube-table">
            <thead>
              <tr>
                {WEB3_SEGMENTS_COLUMNS.map((column) => <th key={column || "actions"}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-parser-mini-button analytics-bitnest-youtube-delete"
                      onClick={() => updateRow(row.id, { deleted: true })}
                      aria-label={`Удалить ${row.segment}`}
                    >
                      x
                    </button>
                    <span>{index + 1}</span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.segment || ""} onChange={(event) => updateRow(row.id, { segment: event.target.value })} />
                    ) : row.segment}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.audience || ""} onChange={(event) => updateRow(row.id, { audience: event.target.value })} rows="3" />
                    ) : row.audience}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.motivation || ""} onChange={(event) => updateRow(row.id, { motivation: event.target.value })} rows="3" />
                    ) : row.motivation}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.whereToFind || ""} onChange={(event) => updateRow(row.id, { whereToFind: event.target.value })} rows="3" />
                    ) : row.whereToFind}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.atlasAngle || ""} onChange={(event) => updateRow(row.id, { atlasAngle: event.target.value })} rows="3" />
                    ) : row.atlasAngle}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.channels || ""} onChange={(event) => updateRow(row.id, { channels: event.target.value })} />
                    ) : row.channels}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.priority || ""} onChange={(event) => updateRow(row.id, { priority: event.target.value })} />
                    ) : (
                      <strong className={`analytics-parser-status analytics-parser-status-${priorityTone(row.priority)}`}>{row.priority}</strong>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.risk || ""} onChange={(event) => updateRow(row.id, { risk: event.target.value })} />
                    ) : row.risk}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.nextStep || ""} onChange={(event) => updateRow(row.id, { nextStep: event.target.value })} rows="3" />
                    ) : row.nextStep}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.status || "Искать источники"} onChange={(event) => updateRow(row.id, { status: event.target.value })}>
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
