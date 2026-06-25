import { useEffect, useMemo, useState } from "react";

import {
  BITNEST_YOUTUBE_STORAGE_KEY,
  defaultBitnestYoutubeChannels,
} from "../data/bitnestYoutubeParserData";
import {
  SEGMENT_OUTREACH_STORAGE_KEY,
  defaultSegmentOutreachLeads,
} from "../data/segmentOutreachData";
import { getServerJson, loadServerContent, saveServerContent } from "../services/contentStore";

const YOUTUBE_API_LEADS_STORAGE_KEY = "atlas.analytics.youtubeApiSearch.leads.v1";

const DEFAULT_FORM = {
  query: "HYIP crypto income USDT payout proof",
  type: "video",
  regionCode: "",
  relevanceLanguage: "en",
  minSubscribers: "10000",
  maxResults: "25",
  period: "",
  order: "relevance",
  target: "segmentOutreach",
};

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("ru-RU") : "0";
}

function uniqueByUrl(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.channelUrl || row.url || row.cu || row.id || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(rows) {
  const header = ["Название", "Канал", "Видео", "Подписчики", "Просмотры", "Регион", "Язык", "Контакт", "Статус", "Комментарий"];
  const body = rows.map((row) => [
    row.channelTitle,
    row.channelUrl,
    row.videoUrl,
    row.subscriberCount,
    row.viewCount,
    row.region,
    row.language,
    row.contactRoute,
    row.status,
    row.notes,
  ].map(csvCell).join(","));
  const blob = new Blob([["\ufeff" + header.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "youtube-api-search-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function mapToBitnestRow(item) {
  return {
    id: `yt-api-bitnest-${item.channelId || Date.now()}`,
    n: item.channelTitle || "YouTube channel",
    t: "нейтрально",
    l: item.language || item.region || "en",
    nv: 1,
    vw: item.viewCount || 0,
    d: item.publishedAt ? item.publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    cu: item.channelUrl,
    vu: item.videoUrl,
    ti: item.videoTitle || item.query || "Найдено через YouTube API",
    reach: item.subscriberCount || 0,
  };
}

function mapToSegmentRow(item) {
  return {
    id: `yt-api-segment-${item.channelId || Date.now()}`,
    segment: "hyip",
    social: "youtube",
    name: item.channelTitle || "YouTube channel",
    type: "канал",
    url: item.channelUrl,
    contact: item.contactRoute || "YouTube About / business email / links in description",
    region: item.region || item.language || "Global",
    fit: item.fit || "Проверить аудиторию и соответствие high-risk / crypto income тематике.",
    route: item.outreachRoute || "About / business email / DM / sponsored integration",
    price: item.priceFormat || "Запросить / review / sponsored video",
    priority: item.subscriberCount >= 100000 ? "1. Сначала" : "2. Следом",
    status: "Найти контакты",
    notes: [
      item.videoTitle ? `Видео: ${item.videoTitle}` : "",
      item.subscriberCount ? `Подписчики: ${formatNumber(item.subscriberCount)}` : "",
      item.viewCount ? `Просмотры видео: ${formatNumber(item.viewCount)}` : "",
      "Источник: YouTube Data API",
    ].filter(Boolean).join(" · "),
  };
}

function readLocalLeads() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(YOUTUBE_API_LEADS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function YouTubeApiSearchPanel() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [results, setResults] = useState([]);
  const [savedLeads, setSavedLeads] = useState(readLocalLeads);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notice, setNotice] = useState("Готово к поиску. Ключ YouTube API хранится только на сервере.");
  const [saveState, setSaveState] = useState("Локально");

  useEffect(() => {
    let isMounted = true;
    loadServerContent(YOUTUBE_API_LEADS_STORAGE_KEY).then((serverRows) => {
      if (!isMounted) return;
      if (Array.isArray(serverRows)) {
        setSavedLeads(uniqueByUrl(serverRows));
        try {
          window.localStorage.setItem(YOUTUBE_API_LEADS_STORAGE_KEY, JSON.stringify(serverRows));
        } catch {
          // Локальный кеш не критичен.
        }
        setSaveState("Сохранено на сервере");
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedResults = useMemo(() => {
    const ids = new Set(selectedIds);
    return results.filter((item) => ids.has(item.id));
  }, [results, selectedIds]);

  const stats = useMemo(() => {
    const subscribers = results.reduce((sum, item) => sum + Number(item.subscriberCount || 0), 0);
    const withVideo = results.filter((item) => item.videoUrl).length;
    const selected = selectedIds.length;
    return { subscribers, withVideo, selected };
  }, [results, selectedIds]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function runSearch() {
    setIsSearching(true);
    setNotice("Ищу через YouTube Data API...");
    setSelectedIds([]);

    const params = new URLSearchParams({
      q: form.query,
      type: form.type,
      maxResults: form.maxResults,
      order: form.order,
    });
    if (form.regionCode) params.set("regionCode", form.regionCode);
    if (form.relevanceLanguage) params.set("relevanceLanguage", form.relevanceLanguage);
    if (form.minSubscribers) params.set("minSubscribers", form.minSubscribers);
    if (form.period) params.set("period", form.period);

    const response = await getServerJson(`/api/content/youtube-search?${params.toString()}`);
    setIsSearching(false);

    if (!response.ok) {
      const payload = response.payload || {};
      setResults([]);
      setNotice(payload.needsApiKey
        ? "Нужен YOUTUBE_API_KEY на сервере. Интерфейс готов, но реальный API-поиск пока не запустится."
        : `YouTube API вернул ошибку: ${payload.error || payload.message || "unknown_error"}`);
      return;
    }

    const items = Array.isArray(response.payload.items) ? response.payload.items : [];
    setResults(items);
    setNotice(`Найдено ${items.length}. Выбери каналы и сохрани их в нужный список.`);
  }

  function toggleSelected(id) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function toggleAll() {
    setSelectedIds((current) => (
      current.length === results.length ? [] : results.map((item) => item.id)
    ));
  }

  async function saveSelected() {
    if (!selectedResults.length) {
      setNotice("Сначала выбери хотя бы один канал.");
      return;
    }

    const nextSaved = uniqueByUrl([...selectedResults, ...savedLeads]);
    setSavedLeads(nextSaved);
    setSaveState("Сохраняю...");
    try {
      window.localStorage.setItem(YOUTUBE_API_LEADS_STORAGE_KEY, JSON.stringify(nextSaved));
    } catch {
      // Серверное сохранение ниже важнее.
    }
    const savedQueue = await saveServerContent(YOUTUBE_API_LEADS_STORAGE_KEY, nextSaved);

    if (form.target === "bitnestYoutube") {
      const current = await loadServerContent(BITNEST_YOUTUBE_STORAGE_KEY);
      const rows = Array.isArray(current) && current.length ? current : defaultBitnestYoutubeChannels;
      await saveServerContent(BITNEST_YOUTUBE_STORAGE_KEY, uniqueByUrl([...selectedResults.map(mapToBitnestRow), ...rows]));
    }

    if (form.target === "segmentOutreach") {
      const current = await loadServerContent(SEGMENT_OUTREACH_STORAGE_KEY);
      const rows = Array.isArray(current) && current.length ? current : defaultSegmentOutreachLeads;
      await saveServerContent(SEGMENT_OUTREACH_STORAGE_KEY, uniqueByUrl([...selectedResults.map(mapToSegmentRow), ...rows]));
    }

    setSaveState(savedQueue ? "Сохранено на сервере" : "Локально, сервер недоступен");
    setNotice(`Сохранено ${selectedResults.length}: очередь YouTube API + ${form.target === "bitnestYoutube" ? "Битнест YouTube" : "Сегментный парсер / HYIP / YouTube"}.`);
  }

  return (
    <section className="analytics-parser analytics-youtube-api-search">
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">YouTube Data API / поиск каналов</p>
            <h2>YouTube API Search</h2>
            <p>{notice} · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={runSearch} disabled={isSearching}>
              {isSearching ? "Ищу..." : "Найти через API"}
            </button>
            <button type="button" onClick={saveSelected}>Сохранить выбранные</button>
            <button type="button" onClick={() => downloadCsv(selectedResults.length ? selectedResults : results)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-youtube-api-stats">
          <article>
            <span>Найдено</span>
            <strong>{results.length}</strong>
            <small>каналов / результатов</small>
          </article>
          <article>
            <span>Выбрано</span>
            <strong>{stats.selected}</strong>
            <small>для сохранения</small>
          </article>
          <article>
            <span>Суммарно</span>
            <strong>{formatNumber(stats.subscribers)}</strong>
            <small>подписчиков в выдаче</small>
          </article>
          <article>
            <span>С видео</span>
            <strong>{stats.withVideo}</strong>
            <small>есть пример ролика</small>
          </article>
        </div>

        <div className="analytics-parser-controls analytics-youtube-api-form">
          <label className="analytics-parser-wide">
            Запрос / хэштеги
            <input value={form.query} onChange={(event) => updateField("query", event.target.value)} placeholder="#hyip USDT payout proof" />
          </label>
          <label>
            Тип поиска
            <select value={form.type} onChange={(event) => updateField("type", event.target.value)}>
              <option value="video">Видео → каналы</option>
              <option value="channel">Каналы</option>
            </select>
          </label>
          <label>
            Страна
            <input value={form.regionCode} onChange={(event) => updateField("regionCode", event.target.value.toUpperCase())} placeholder="US / ID / IN" />
          </label>
          <label>
            Язык
            <input value={form.relevanceLanguage} onChange={(event) => updateField("relevanceLanguage", event.target.value.toLowerCase())} placeholder="en / es / id" />
          </label>
          <label>
            Мин. подписчиков
            <input type="number" min="0" value={form.minSubscribers} onChange={(event) => updateField("minSubscribers", event.target.value)} />
          </label>
          <label>
            Макс. результатов
            <input type="number" min="1" max="50" value={form.maxResults} onChange={(event) => updateField("maxResults", event.target.value)} />
          </label>
          <label>
            Период
            <select value={form.period} onChange={(event) => updateField("period", event.target.value)}>
              <option value="">Любой</option>
              <option value="7">7 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="365">1 год</option>
            </select>
          </label>
          <label>
            Сортировка
            <select value={form.order} onChange={(event) => updateField("order", event.target.value)}>
              <option value="relevance">Релевантность</option>
              <option value="date">Новые</option>
              <option value="viewCount">Просмотры</option>
              <option value="rating">Rating</option>
            </select>
          </label>
          <label>
            Куда сохранять
            <select value={form.target} onChange={(event) => updateField("target", event.target.value)}>
              <option value="segmentOutreach">Сегментный парсер / HYIP / YouTube</option>
              <option value="bitnestYoutube">Битнест YouTube</option>
            </select>
          </label>
        </div>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">Search results</p>
            <h2>Результаты поиска</h2>
            <p>Выбирай только релевантные каналы. Email и контакты потом проверяем вручную через About.</p>
          </div>
          <div>
            <button type="button" onClick={toggleAll} disabled={!results.length}>
              {selectedIds.length === results.length && results.length ? "Снять выбор" : "Выбрать всё"}
            </button>
          </div>
        </div>

        <div className="analytics-youtube-api-results">
          {!results.length ? (
            <div className="analytics-youtube-api-empty">
              <strong>Пока нет результатов</strong>
              <p>Запусти поиск. Если на сервере ещё нет API-ключа, система покажет понятное предупреждение.</p>
            </div>
          ) : results.map((item) => (
            <article key={item.id} className={`analytics-youtube-api-result${selectedIds.includes(item.id) ? " analytics-youtube-api-result-selected" : ""}`}>
              <label className="analytics-youtube-api-check">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
              </label>
              {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <div className="analytics-youtube-api-thumb">YT</div>}
              <div className="analytics-youtube-api-main">
                <strong>{item.channelTitle}</strong>
                <span>{formatNumber(item.subscriberCount)} подписчиков · {formatNumber(item.viewCount)} просмотров видео</span>
                <p>{item.videoTitle || item.description || "Канал найден через YouTube API."}</p>
                <small>{item.fit}</small>
              </div>
              <div className="analytics-youtube-api-links">
                <a href={item.channelUrl} target="_blank" rel="noreferrer">Канал</a>
                {item.videoUrl ? <a href={item.videoUrl} target="_blank" rel="noreferrer">Видео</a> : null}
                <span>{item.region || "Global"} {item.language ? `· ${item.language}` : ""}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
