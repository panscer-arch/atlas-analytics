import { useEffect, useMemo, useState } from "react";

import {
  SEGMENT_OUTREACH_COLUMNS,
  SEGMENT_OUTREACH_SEGMENTS,
  SEGMENT_OUTREACH_SOCIALS,
  SEGMENT_OUTREACH_STORAGE_KEY,
  defaultSegmentOutreachLeads,
} from "../data/segmentOutreachData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const STATUS_OPTIONS = ["Найти контакты", "Собрать список", "Изучить", "Выбрано", "Написали", "Ответили", "Пауза", "Не подходит"];

function hydrateLeads(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;

  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows
    .filter((row) => !String(row.id || "").includes("-generated-"))
    .map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredLeads() {
  if (typeof window === "undefined") return defaultSegmentOutreachLeads;

  try {
    const saved = window.localStorage.getItem(SEGMENT_OUTREACH_STORAGE_KEY);
    return hydrateLeads(saved ? JSON.parse(saved) : null, defaultSegmentOutreachLeads);
  } catch {
    return defaultSegmentOutreachLeads;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = ["№", "Сегмент", "Соцсеть", "Источник", "Тип", "Ссылка", "Контакт", "Регион", "Почему подходит", "Как заходить", "Цена", "Приоритет", "Статус", "Комментарий"];
  const body = rows.map((row, index) => [
    index + 1,
    row.segment,
    row.social,
    row.name,
    row.type,
    row.url,
    row.contact,
    row.region,
    row.fit,
    row.route,
    row.price,
    row.priority,
    row.status,
    row.notes,
  ].map(csvCell).join(","));
  return ["\ufeff" + header.map(csvCell).join(","), ...body].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-segment-outreach.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function statusTone(status) {
  if (status === "Выбрано" || status === "Ответили") return "success";
  if (status === "Не подходит") return "danger";
  return "accent";
}

export default function SegmentOutreachPanel() {
  const [leads, setLeads] = useState(readStoredLeads);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [isEditing, setIsEditing] = useState(false);
  const [activeSegment, setActiveSegment] = useState(SEGMENT_OUTREACH_SEGMENTS[0].id);
  const [activeSocial, setActiveSocial] = useState(SEGMENT_OUTREACH_SOCIALS[0].id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(SEGMENT_OUTREACH_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateLeads(savedRows, defaultSegmentOutreachLeads);
        setLeads(hydrated);
        try {
          window.localStorage.setItem(SEGMENT_OUTREACH_STORAGE_KEY, JSON.stringify(hydrated));
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
        window.localStorage.setItem(SEGMENT_OUTREACH_STORAGE_KEY, JSON.stringify(leads));
      } catch {
        // Серверное сохранение ниже всё равно попробуем.
      }

      saveServerContent(SEGMENT_OUTREACH_STORAGE_KEY, leads).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isLoaded, leads]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return leads.filter((row) => {
      if (row.deleted) return false;
      if (row.segment !== activeSegment) return false;
      if (row.social !== activeSocial) return false;
      if (!search) return true;
      return [row.name, row.type, row.url, row.contact, row.region, row.fit, row.route, row.price, row.priority, row.status, row.notes]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [activeSegment, activeSocial, leads, query]);

  const totalActive = leads.filter((row) => !row.deleted).length;
  const selectedSegment = SEGMENT_OUTREACH_SEGMENTS.find((segment) => segment.id === activeSegment);
  const socialCounts = useMemo(() => {
    return SEGMENT_OUTREACH_SOCIALS.reduce((acc, social) => {
      acc[social.id] = leads.filter((row) => !row.deleted && row.segment === activeSegment && row.social === social.id).length;
      return acc;
    }, {});
  }, [activeSegment, leads]);

  function updateLead(id, patch) {
    setLeads((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addLead() {
    setLeads((current) => [{
      id: `segment-outreach-manual-${Date.now()}`,
      segment: activeSegment,
      social: activeSocial,
      name: "Новый источник",
      type: "lead",
      url: "https://",
      contact: "Найти business email / Telegram / сайт / форму",
      region: "Global",
      fit: "Описать, почему подходит",
      route: "DM / contact / sponsored",
      price: "Запросить",
      priority: "2. Следом",
      status: "Найти контакты",
      notes: "Проверить живость, охват, цену и соответствие коммуникации Atlas.",
    }, ...current]);
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">Segment outreach / соцсети и новостные агрегаторы</p>
            <h2>Выборка источников по сегментам</h2>
            <p>
              {selectedSegment?.label} · {visibleRows.length} в текущей вкладке · всего {totalActive} · {saveState}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать таблицу"}
            </button>
            <button type="button" onClick={addLead}>Добавить источник</button>
            <button type="button" onClick={() => downloadCsv(leads.filter((row) => !row.deleted))}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-subtabs analytics-surface" role="tablist" aria-label="Сегмент рынка">
          {SEGMENT_OUTREACH_SEGMENTS.map((segment) => (
            <button
              key={segment.id}
              type="button"
              className={`analytics-parser-subtab${activeSegment === segment.id ? " analytics-parser-subtab-active" : ""}`}
              onClick={() => {
                setActiveSegment(segment.id);
                setActiveSocial(SEGMENT_OUTREACH_SOCIALS[0].id);
              }}
            >
              <span>{segment.label}</span>
              <small>{segment.hint}</small>
            </button>
          ))}
        </div>

        <div className="analytics-parser-subtabs analytics-surface" role="tablist" aria-label="Соцсеть или новостный агрегатор">
          {SEGMENT_OUTREACH_SOCIALS.map((social) => (
            <button
              key={social.id}
              type="button"
              className={`analytics-parser-subtab${activeSocial === social.id ? " analytics-parser-subtab-active" : ""}`}
              onClick={() => setActiveSocial(social.id)}
            >
              <span>{social.label}</span>
              <small>{socialCounts[social.id] || 0} источников</small>
            </button>
          ))}
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label>
            Поиск в текущей вкладке
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="канал, Telegram, X, статьи, цена..." />
          </label>
        </div>

        <div className="analytics-bitnest-youtube-table-scroll">
          <table className="analytics-bitnest-youtube-table">
            <thead>
              <tr>
                {SEGMENT_OUTREACH_COLUMNS.map((column) => <th key={column || "actions"}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-parser-mini-button analytics-bitnest-youtube-delete"
                      onClick={() => updateLead(row.id, { deleted: true })}
                      aria-label={`Удалить ${row.name}`}
                    >
                      x
                    </button>
                    <span>{index + 1}</span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.name || ""} onChange={(event) => updateLead(row.id, { name: event.target.value })} />
                    ) : row.name}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.type || ""} onChange={(event) => updateLead(row.id, { type: event.target.value })} />
                    ) : row.type}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.url || ""} onChange={(event) => updateLead(row.id, { url: event.target.value })} />
                    ) : (
                      <a href={row.url} target="_blank" rel="noreferrer">открыть</a>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.contact || ""} onChange={(event) => updateLead(row.id, { contact: event.target.value })} rows="2" />
                    ) : row.contact}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.region || ""} onChange={(event) => updateLead(row.id, { region: event.target.value })} />
                    ) : row.region}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.fit || ""} onChange={(event) => updateLead(row.id, { fit: event.target.value })} rows="3" />
                    ) : row.fit}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.route || ""} onChange={(event) => updateLead(row.id, { route: event.target.value })} rows="2" />
                    ) : row.route}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.price || ""} onChange={(event) => updateLead(row.id, { price: event.target.value })} />
                    ) : row.price}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.priority || ""} onChange={(event) => updateLead(row.id, { priority: event.target.value })} />
                    ) : row.priority}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.status || "Найти контакты"} onChange={(event) => updateLead(row.id, { status: event.target.value })}>
                        {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    ) : (
                      <strong className={`analytics-parser-status analytics-parser-status-${statusTone(row.status)}`}>{row.status}</strong>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.notes || ""} onChange={(event) => updateLead(row.id, { notes: event.target.value })} rows="3" />
                    ) : row.notes}
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
