import { useEffect, useMemo, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import {
  BITNEST_YOUTUBE_COLUMNS,
  BITNEST_YOUTUBE_STORAGE_KEY,
  defaultBitnestYoutubeChannels,
} from "../data/bitnestYoutubeParserData";

function hydrateChannels(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;

  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  const missingRows = seedRows.filter((row) => !savedIds.has(row.id));
  return [...hydrated, ...missingRows];
}

function readStoredChannels() {
  if (typeof window === "undefined") return defaultBitnestYoutubeChannels;

  try {
    const saved = window.localStorage.getItem(BITNEST_YOUTUBE_STORAGE_KEY);
    return hydrateChannels(saved ? JSON.parse(saved) : null, defaultBitnestYoutubeChannels);
  } catch {
    return defaultBitnestYoutubeChannels;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const header = ["№", "Название канала", "Тип", "Язык", "Видео о BitNest", "Просмотры", "Дата", "Ссылка на канал", "Пример видео", "Заголовок видео"];
  const body = rows.map((row, index) => [
    index + 1,
    row.n,
    row.t,
    row.l,
    row.nv,
    row.vw,
    row.d,
    row.cu,
    row.vu,
    row.ti,
  ].map(csvCell).join(","));
  return ["\ufeff" + header.map(csvCell).join(","), ...body].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bitnest-youtube-channels.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function typeTone(type) {
  if (type === "реклама") return "success";
  if (type === "разоблачение") return "danger";
  return "accent";
}

export default function BitnestYoutubeParserPanel() {
  const [channels, setChannels] = useState(readStoredChannels);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(BITNEST_YOUTUBE_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateChannels(savedRows, defaultBitnestYoutubeChannels);
        setChannels(hydrated);
        try {
          window.localStorage.setItem(BITNEST_YOUTUBE_STORAGE_KEY, JSON.stringify(hydrated));
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
        window.localStorage.setItem(BITNEST_YOUTUBE_STORAGE_KEY, JSON.stringify(channels));
      } catch {
        // Серверное сохранение ниже всё равно попробуем.
      }

      saveServerContent(BITNEST_YOUTUBE_STORAGE_KEY, channels).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [channels, isLoaded]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return channels.filter((row) => {
      if (row.deleted) return false;
      if (type && row.t !== type) return false;
      if (language && row.l !== language) return false;
      if (!search) return true;
      return [row.n, row.t, row.l, row.d, row.cu, row.vu, row.ti]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [channels, language, query, type]);

  const typeOptions = useMemo(() => [...new Set(channels.map((row) => row.t).filter(Boolean))].sort(), [channels]);
  const languageOptions = useMemo(() => [...new Set(channels.map((row) => row.l).filter(Boolean))].sort(), [channels]);
  const deletedCount = channels.filter((row) => row.deleted).length;

  function updateChannel(id, patch) {
    setChannels((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addChannel() {
    setChannels((current) => [{
      id: `manual-${Date.now()}`,
      n: "Новый YouTube-канал",
      t: "нейтрально",
      l: "en",
      nv: 1,
      vw: 0,
      d: "указать дату",
      cu: "https://www.youtube.com/@",
      vu: "https://youtu.be/",
      ti: "Видео о BitNest",
      reach: 0,
    }, ...current]);
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">Bitnest parser / YouTube</p>
            <h2>Битнест YouTube</h2>
            <p>
              {visibleRows.length} строк в фильтре · всего {channels.length} · удалено {deletedCount} · {saveState}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Готово" : "Редактировать таблицу"}
            </button>
            <button type="button" onClick={addChannel}>Добавить канал</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label>
            Тип
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">все типы</option>
              {typeOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Язык
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="">все языки</option>
              {languageOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="канал, язык, заголовок, ссылка..." />
          </label>
        </div>

        <div className="analytics-bitnest-youtube-table-scroll">
          <table className="analytics-bitnest-youtube-table">
            <thead>
              <tr>
                {BITNEST_YOUTUBE_COLUMNS.map((column) => <th key={column || "actions"}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-parser-mini-button analytics-bitnest-youtube-delete"
                      onClick={() => updateChannel(row.id, { deleted: true })}
                      aria-label={`Удалить ${row.n}`}
                    >
                      x
                    </button>
                    <span>{index + 1}</span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.n || ""} onChange={(event) => updateChannel(row.id, { n: event.target.value })} />
                    ) : (
                      <a href={row.cu} target="_blank" rel="noreferrer">{row.n}</a>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={row.t || "нейтрально"} onChange={(event) => updateChannel(row.id, { t: event.target.value })}>
                        {["реклама", "разоблачение", "нейтрально"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    ) : (
                      <strong className={`analytics-parser-status analytics-parser-status-${typeTone(row.t)}`}>{row.t}</strong>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.l || ""} onChange={(event) => updateChannel(row.id, { l: event.target.value })} />
                    ) : row.l}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={row.nv || 0} onChange={(event) => updateChannel(row.id, { nv: Number(event.target.value) })} />
                    ) : formatNumber(row.nv)}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={row.vw || 0} onChange={(event) => updateChannel(row.id, { vw: Number(event.target.value) })} />
                    ) : formatNumber(row.vw)}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.d || ""} onChange={(event) => updateChannel(row.id, { d: event.target.value })} />
                    ) : row.d}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.cu || ""} onChange={(event) => updateChannel(row.id, { cu: event.target.value })} />
                    ) : (
                      <a href={row.cu} target="_blank" rel="noreferrer">канал</a>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={row.vu || ""} onChange={(event) => updateChannel(row.id, { vu: event.target.value })} />
                    ) : (
                      <a href={row.vu} target="_blank" rel="noreferrer">смотреть</a>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={row.ti || ""} onChange={(event) => updateChannel(row.id, { ti: event.target.value })} rows="2" />
                    ) : row.ti}
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
