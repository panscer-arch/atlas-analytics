import { useEffect, useMemo, useState } from "react";

import {
  ARTICLE_PLACEMENT_COLUMNS,
  ARTICLE_PLACEMENT_STORAGE_KEY,
  defaultArticlePlacementResources,
} from "../data/articlePlacementData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const STATUS_OPTIONS = [
  "Выбрано до $500",
  "Не писали",
  "Найти контакт",
  "Написали",
  "Ответили",
  "Договориться",
  "Опубликовано",
  "Отказ",
  "Пауза",
];

function hydrateResources(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;

  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredResources() {
  if (typeof window === "undefined") return defaultArticlePlacementResources;

  try {
    const saved = window.localStorage.getItem(ARTICLE_PLACEMENT_STORAGE_KEY);
    return hydrateResources(saved ? JSON.parse(saved) : null, defaultArticlePlacementResources);
  } catch {
    return defaultArticlePlacementResources;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = [
    "№",
    "Площадка",
    "Регион",
    "Страна",
    "Язык",
    "Тип",
    "Охват",
    "Fit",
    "Score",
    "Цена",
    "Приоритет",
    "Маршрут размещения",
    "Сайт",
    "Контакт / действие",
    "Комментарий",
    "Статус",
  ];
  const body = rows.map((row, index) => [
    index + 1,
    row.name,
    row.region,
    row.country,
    row.language,
    row.type,
    row.reach,
    row.fit,
    row.score,
    row.price,
    row.priority,
    row.route,
    row.url,
    row.contact,
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
  link.download = "supersource-article-placement.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function statusTone(status) {
  if (status === "Выбрано до $500") return "success";
  if (status === "Опубликовано") return "success";
  if (status === "Отказ") return "danger";
  if (status === "Ответили" || status === "Договориться") return "accent";
  return "accent";
}

function scoreTone(score) {
  if (Number(score) >= 85) return "success";
  if (Number(score) >= 75) return "accent";
  return "danger";
}

function optionList(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

export default function ArticlePlacementPanel() {
  const [resources, setResources] = useState(readStoredResources);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [reach, setReach] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(ARTICLE_PLACEMENT_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateResources(savedRows, defaultArticlePlacementResources);
        setResources(hydrated);
        try {
          window.localStorage.setItem(ARTICLE_PLACEMENT_STORAGE_KEY, JSON.stringify(hydrated));
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
        window.localStorage.setItem(ARTICLE_PLACEMENT_STORAGE_KEY, JSON.stringify(resources));
      } catch {
        // Серверное сохранение ниже всё равно попробуем.
      }

      saveServerContent(ARTICLE_PLACEMENT_STORAGE_KEY, resources).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isLoaded, resources]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return resources.filter((row) => {
      if (row.deleted) return false;
      if (region && row.region !== region) return false;
      if (type && row.type !== type) return false;
      if (reach && row.reach !== reach) return false;
      if (status && row.status !== status) return false;
      if (!search) return true;
      return [row.name, row.url, row.region, row.country, row.language, row.type, row.reach, row.fit, row.price, row.route, row.contact, row.notes, row.status]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [query, reach, region, resources, status, type]);

  const regionOptions = useMemo(() => optionList(resources, "region"), [resources]);
  const typeOptions = useMemo(() => optionList(resources, "type"), [resources]);
  const reachOptions = useMemo(() => optionList(resources, "reach"), [resources]);
  const deletedCount = resources.filter((row) => row.deleted).length;
  const activeCount = resources.length - deletedCount;
  const averageScore = activeCount
    ? Math.round(resources.filter((row) => !row.deleted).reduce((sum, row) => sum + Number(row.score || 0), 0) / activeCount)
    : 0;

  function updateResource(id, patch) {
    setResources((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addResource() {
    setResources((current) => [{
      id: `article-placement-manual-${Date.now()}`,
      name: "Новая площадка",
      url: "https://",
      region: "Global",
      country: "",
      language: "EN",
      type: "Crypto media",
      reach: "Medium",
      fit: "Web3 / crypto audience",
      score: 70,
      price: "Запросить",
      route: "Contact / sponsored inquiry",
      contact: "Найти контакт",
      notes: "Проверить живость, аудиторию, цену и формат размещения.",
      status: "Не писали",
      priority: "3. Запас",
      verified: "Нужно проверить условия размещения перед оплатой",
    }, ...current]);
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">SuperSource / размещение статей</p>
            <h2>SuperSource: площадки для статей</h2>
            <p>
              {visibleRows.length} в фильтре · {activeCount} активных · удалено {deletedCount} · средний score {averageScore} · {saveState}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать таблицу"}
            </button>
            <button type="button" onClick={addResource}>Добавить площадку</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label>
            Регион
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">все регионы</option>
              {regionOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Тип
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">все типы</option>
              {typeOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Охват
            <select value={reach} onChange={(event) => setReach(event.target.value)}>
              <option value="">любой охват</option>
              {reachOptions.map((item) => <option key={item}>{item}</option>)}
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="площадка, регион, DAO, PR, контакт..." />
          </label>
        </div>

        <div className="analytics-bitnest-youtube-table-scroll">
          <table className="analytics-bitnest-youtube-table">
            <thead>
              <tr>
                {ARTICLE_PLACEMENT_COLUMNS.map((column) => <th key={column || "actions"}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-parser-mini-button analytics-bitnest-youtube-delete"
                      onClick={() => updateResource(row.id, { deleted: true })}
                      aria-label={`Удалить ${row.name}`}
                    >
                      x
                    </button>
                    <span>{index + 1}</span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.name || ""} onChange={(event) => updateResource(row.id, { name: event.target.value })} />
                    ) : (
                      <a href={row.url} target="_blank" rel="noreferrer">{row.name}</a>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.region || ""} onChange={(event) => updateResource(row.id, { region: event.target.value })} />
                    ) : row.region}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.language || ""} onChange={(event) => updateResource(row.id, { language: event.target.value })} />
                    ) : row.language}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.type || ""} onChange={(event) => updateResource(row.id, { type: event.target.value })} />
                    ) : row.type}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.reach || ""} onChange={(event) => updateResource(row.id, { reach: event.target.value })} />
                    ) : row.reach}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.fit || ""} onChange={(event) => updateResource(row.id, { fit: event.target.value })} />
                    ) : row.fit}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" min="0" max="100" value={row.score || 0} onChange={(event) => updateResource(row.id, { score: Number(event.target.value) })} />
                    ) : (
                      <strong className={`analytics-parser-status analytics-parser-status-${scoreTone(row.score)}`}>{row.score}</strong>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.price || ""} onChange={(event) => updateResource(row.id, { price: event.target.value })} />
                    ) : row.price || "Запросить"}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.route || ""} onChange={(event) => updateResource(row.id, { route: event.target.value })} rows="2" />
                    ) : row.route}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.url || ""} onChange={(event) => updateResource(row.id, { url: event.target.value })} />
                    ) : (
                      <a href={row.url} target="_blank" rel="noreferrer">сайт</a>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.contact || ""} onChange={(event) => updateResource(row.id, { contact: event.target.value })} rows="2" />
                    ) : row.contact}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.notes || ""} onChange={(event) => updateResource(row.id, { notes: event.target.value })} rows="3" />
                    ) : row.notes}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.status || "Не писали"} onChange={(event) => updateResource(row.id, { status: event.target.value })}>
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
