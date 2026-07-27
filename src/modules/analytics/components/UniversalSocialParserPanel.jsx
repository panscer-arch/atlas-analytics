import { useEffect, useMemo, useState } from "react";

import {
  UNIVERSAL_SOCIAL_COLUMNS,
  UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY,
  UNIVERSAL_SOCIAL_RISK_OPTIONS,
  UNIVERSAL_SOCIAL_STATUS_OPTIONS,
  defaultUniversalSocialConnectors,
  socialParserArchitecture,
  socialParserMarketFindings,
  socialParserMvpPlan,
  socialParserTargetSegments,
} from "../data/universalSocialParserData";
import {
  SEGMENT_OUTREACH_SEGMENTS,
  SEGMENT_OUTREACH_STORAGE_KEY,
  defaultSegmentOutreachLeads,
} from "../data/segmentOutreachData";
import { loadServerContent, postServerJson, saveServerContent } from "../services/contentStore";

const INSTAGRAM_PARSER_LEADS_STORAGE_KEY = "atlas.analytics.instagramParser.leads.v1";
const INSTAGRAM_PARSER_RUNS_STORAGE_KEY = "atlas.analytics.instagramParser.runs.v1";

const INSTAGRAM_REVIEW_STATUSES = [
  "not_contacted",
  "human_review_approved",
  "contacted_once",
  "replied",
  "opted_out",
  "do_not_contact",
  "not_relevant",
];

const DEFAULT_INSTAGRAM_FORM = {
  query: "network marketing crypto web3 business coach",
  hashtags: "networkmarketing, mlm, web3, cryptoeducation",
  profileUrls: "",
  segment: "cryptoMlm",
  country: "Global",
  language: "en",
  limit: "25",
  mode: "profiles",
};

function hydrateRows(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;
  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  return [...hydrated, ...seedRows.filter((row) => !savedIds.has(row.id))];
}

function readStoredRows() {
  if (typeof window === "undefined") return defaultUniversalSocialConnectors;
  try {
    const saved = window.localStorage.getItem(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY);
    return hydrateRows(saved ? JSON.parse(saved) : null, defaultUniversalSocialConnectors);
  } catch {
    return defaultUniversalSocialConnectors;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(rows) {
  const header = UNIVERSAL_SOCIAL_COLUMNS.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) => UNIVERSAL_SOCIAL_COLUMNS.map((column) => csvCell(row[column.key])).join(","));
  const blob = new Blob(["\ufeff" + [header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-universal-social-parser.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadInstagramCsv(rows) {
  const header = ["Username", "Name", "Profile", "Source", "Bio", "Contact", "Segment", "Country", "Language", "Score", "Status", "Captured"];
  const body = rows.map((row) => [
    row.username,
    row.displayName,
    row.profileUrl,
    row.sourceUrl,
    row.bioExcerpt,
    row.publicContact,
    row.segment,
    row.country,
    row.language,
    row.score,
    row.reviewStatus || row.contactStatus,
    row.capturedAt,
  ].map(csvCell).join(","));
  const blob = new Blob([["\ufeff" + header.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-instagram-parser-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function riskTone(risk) {
  if (risk === "Низкий") return "success";
  if (risk === "Средний") return "accent";
  return "danger";
}

function statusTone(status) {
  if (status === "MVP") return "success";
  if (status === "Исследовать" || status === "Только API") return "accent";
  if (status === "Позже") return "default";
  return "danger";
}

function splitInput(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeInstagramProfileUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "/");
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").split(/[/?#]/)[0];
  return handle ? `https://www.instagram.com/${handle}/` : "";
}

function instagramUsernameFromUrl(value) {
  const match = String(value || "").match(/instagram\.com\/([^/?#]+)/i);
  return match?.[1] || String(value || "").replace(/^@/, "").split(/[/?#]/)[0] || "";
}

function uniqueByProfile(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.profileUrl || row.sourceUrl || row.username || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSegmentRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.url || row.profileUrl || row.sourceUrl || row.id || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isSaveableInstagramLead(lead) {
  return Boolean(lead?.sourceUrl && lead?.capturedAt && lead?.lawfulBasis && (lead?.contactStatus || lead?.reviewStatus));
}

function mapInstagramLeadToSegmentRow(lead) {
  const status = lead.reviewStatus || lead.contactStatus || "not_contacted";
  return {
    id: `segment-outreach-instagram-${lead.username || Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    segment: lead.segment || "cryptoMlm",
    social: "instagram",
    name: lead.displayName || lead.username || "Instagram lead",
    type: "Instagram profile",
    url: lead.profileUrl || lead.sourceUrl,
    contact: lead.publicContact || "Instagram bio / link in bio / публичный business contact",
    region: [lead.country, lead.language].filter(Boolean).join(" / ") || "Global",
    fit: lead.relevanceReason || "Публичный Instagram-профиль подходит под Atlas outreach. Требуется ручная проверка.",
    route: "Проверить профиль вручную, убедиться в business context, затем писать один персональный контакт без auto-DM.",
    price: "Запросить / partnership / collab",
    priority: Number(lead.score || 0) >= 75 ? "1. Сначала" : "2. Следом",
    status: status === "human_review_approved" ? "Найти контакты" : "Ручная проверка",
    notes: [
      `Источник: Instagram / Apify`,
      `Score: ${lead.score || 0}`,
      `Captured: ${lead.capturedAt || ""}`,
      `Lawful basis: ${lead.lawfulBasis || "legitimate_interest"}`,
      `Contact status: ${status}`,
      lead.bioExcerpt ? `Bio: ${lead.bioExcerpt}` : "",
    ].filter(Boolean).join(" · "),
  };
}

export default function UniversalSocialParserPanel() {
  const [rows, setRows] = useState(readStoredRows);
  const [activePlatform, setActivePlatform] = useState("Все");
  const [activeStatus, setActiveStatus] = useState("Все");
  const [query, setQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const [instagramForm, setInstagramForm] = useState(DEFAULT_INSTAGRAM_FORM);
  const [instagramResults, setInstagramResults] = useState([]);
  const [instagramSavedLeads, setInstagramSavedLeads] = useState([]);
  const [instagramSelectedIds, setInstagramSelectedIds] = useState([]);
  const [instagramRuns, setInstagramRuns] = useState([]);
  const [instagramNotice, setInstagramNotice] = useState("Готово к поиску. APIFY_TOKEN хранится только на сервере.");
  const [isInstagramSearching, setIsInstagramSearching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      loadServerContent(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY),
      loadServerContent(INSTAGRAM_PARSER_LEADS_STORAGE_KEY),
      loadServerContent(INSTAGRAM_PARSER_RUNS_STORAGE_KEY),
    ]).then(([savedRows, savedInstagramLeads, savedRuns]) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateRows(savedRows, defaultUniversalSocialConnectors);
        setRows(hydrated);
        try {
          window.localStorage.setItem(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY, JSON.stringify(hydrated));
        } catch {
          // Страница останется рабочей в памяти браузера.
        }
        setSaveState("Сохранено на сервере");
      }
      if (Array.isArray(savedInstagramLeads)) {
        setInstagramSavedLeads(uniqueByProfile(savedInstagramLeads));
      }
      if (Array.isArray(savedRuns)) {
        setInstagramRuns(savedRuns.slice(0, 20));
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
        window.localStorage.setItem(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY, JSON.stringify(rows));
      } catch {
        // Серверная синхронизация ниже остаётся основным контуром.
      }
      saveServerContent(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY, rows).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  const platformOptions = useMemo(() => ["Все", ...rows.map((row) => row.platform)], [rows]);
  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.deleted) return false;
      if (activePlatform !== "Все" && row.platform !== activePlatform) return false;
      if (activeStatus !== "Все" && row.status !== activeStatus) return false;
      if (!search) return true;
      return UNIVERSAL_SOCIAL_COLUMNS.some((column) => String(row[column.key] || "").toLowerCase().includes(search));
    });
  }, [activePlatform, activeStatus, query, rows]);

  const stats = useMemo(() => {
    const activeRows = rows.filter((row) => !row.deleted);
    return {
      total: activeRows.length,
      mvp: activeRows.filter((row) => row.status === "MVP").length,
      highRisk: activeRows.filter((row) => row.risk === "Высокий" || row.risk === "Критичный").length,
      apiOnly: activeRows.filter((row) => row.status === "Только API").length,
    };
  }, [rows]);

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [{
      id: `social-source-${Date.now()}`,
      platform: "Новая соцсеть",
      status: "Исследовать",
      risk: "Средний",
      accessRoute: "Описать разрешённый способ доступа: API, публичные каталоги, ручной импорт, партнёрский источник.",
      targets: "Кого ищем в этой сети.",
      queries: "Ключевые слова и языки.",
      tooling: "Готовые библиотеки / API / SaaS.",
      notes: "Что проверить перед запуском коннектора.",
    }, ...current]);
  }

  const selectedInstagramResults = useMemo(() => {
    const ids = new Set(instagramSelectedIds);
    return instagramResults.filter((lead) => ids.has(lead.id));
  }, [instagramResults, instagramSelectedIds]);

  const instagramStats = useMemo(() => {
    const approved = instagramResults.filter((lead) => lead.reviewStatus === "human_review_approved").length;
    const blocked = instagramResults.filter((lead) => lead.reviewStatus === "opted_out" || lead.reviewStatus === "do_not_contact").length;
    const withContact = instagramResults.filter((lead) => lead.publicContact && !/проверить/i.test(lead.publicContact)).length;
    return { approved, blocked, withContact, selected: instagramSelectedIds.length };
  }, [instagramResults, instagramSelectedIds]);

  function updateInstagramField(name, value) {
    setInstagramForm((current) => ({ ...current, [name]: value }));
  }

  function updateInstagramLead(id, patch) {
    setInstagramResults((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch, contactStatus: patch.reviewStatus || patch.contactStatus || lead.contactStatus } : lead)));
  }

  function toggleInstagramSelected(id) {
    setInstagramSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function toggleAllInstagramSelected() {
    setInstagramSelectedIds((current) => (
      current.length === instagramResults.length ? [] : instagramResults.map((lead) => lead.id)
    ));
  }

  async function runInstagramSearch() {
    setIsInstagramSearching(true);
    setInstagramSelectedIds([]);
    setInstagramNotice("Ищу публичные Instagram-сигналы через Apify...");

    const response = await postServerJson("/api/content/instagram-search", {
      ...instagramForm,
      hashtags: splitInput(instagramForm.hashtags),
      profileUrls: splitInput(instagramForm.profileUrls),
      limit: Number(instagramForm.limit || 25),
    });
    setIsInstagramSearching(false);

    if (!response.ok) {
      const payload = response.payload || {};
      setInstagramResults([]);
      setInstagramNotice(payload.needsApiKey
        ? "Нужен APIFY_TOKEN на сервере. Можно пока добавить URL вручную и сохранить их как лиды."
        : `Instagram parser вернул ошибку: ${payload.message || payload.error || "unknown_error"}`);
      return;
    }

    const items = Array.isArray(response.payload.items) ? response.payload.items : [];
    setInstagramResults(items);
    setInstagramRuns((current) => response.payload.run ? [response.payload.run, ...current].slice(0, 20) : current);
    setInstagramNotice(`Найдено ${items.length}. Отметь подходящих, проведи human review и сохрани в очередь/сегментный парсер.`);
  }

  function createManualInstagramLeads() {
    const urls = splitInput(instagramForm.profileUrls).map(normalizeInstagramProfileUrl).filter(Boolean);
    if (!urls.length) {
      setInstagramNotice("Для ручного добавления вставь Instagram profile URLs или handles в поле profile URLs.");
      return;
    }
    const now = new Date().toISOString();
    const manualLeads = urls.map((url, index) => {
      const username = instagramUsernameFromUrl(url);
      return {
        id: `instagram-manual-${Date.now()}-${index}`,
        username,
        displayName: username || "Instagram lead",
        profileUrl: url,
        sourceUrl: url,
        bioExcerpt: "",
        publicContact: "Проверить public bio / link in bio",
        followersApprox: 0,
        segment: instagramForm.segment,
        country: instagramForm.country,
        language: instagramForm.language,
        relevanceReason: "Ручной импорт Instagram URL. Требуется проверка публичного business context перед outreach.",
        score: 40,
        reviewStatus: "not_contacted",
        contactStatus: "not_contacted",
        consentStatus: "not_requested",
        lawfulBasis: "legitimate_interest",
        sourceType: "instagram_public_profile",
        rawProvider: "manual",
        capturedAt: now,
      };
    });
    setInstagramResults((current) => uniqueByProfile([...manualLeads, ...current]));
    setInstagramNotice(`Добавлено вручную: ${manualLeads.length}. Теперь можно провести проверку и сохранить выбранные.`);
  }

  async function saveSelectedInstagramLeads() {
    const saveable = selectedInstagramResults.filter(isSaveableInstagramLead);
    if (!saveable.length) {
      setInstagramNotice("Сначала выбери лиды. У каждого должны быть source URL, дата сбора, lawful basis и contact status.");
      return;
    }
    const allowed = saveable.filter((lead) => !["opted_out", "do_not_contact"].includes(lead.reviewStatus || lead.contactStatus));
    if (!allowed.length) {
      setInstagramNotice("Выбранные лиды помечены как opted_out/do_not_contact, сохранять в outreach нельзя.");
      return;
    }
    const next = uniqueByProfile([...allowed, ...instagramSavedLeads]);
    setInstagramSavedLeads(next);
    await saveServerContent(INSTAGRAM_PARSER_LEADS_STORAGE_KEY, next);
    setInstagramNotice(`Сохранено в очередь Instagram: ${allowed.length}.`);
  }

  async function sendSelectedInstagramToSegment() {
    const approved = selectedInstagramResults
      .filter(isSaveableInstagramLead)
      .filter((lead) => lead.reviewStatus === "human_review_approved")
      .filter((lead) => !["opted_out", "do_not_contact"].includes(lead.reviewStatus || lead.contactStatus));

    if (!approved.length) {
      setInstagramNotice("В сегментный парсер отправляются только выбранные лиды со статусом human_review_approved.");
      return;
    }

    const current = await loadServerContent(SEGMENT_OUTREACH_STORAGE_KEY);
    const rows = Array.isArray(current) && current.length ? current : defaultSegmentOutreachLeads;
    const next = uniqueSegmentRows([...approved.map(mapInstagramLeadToSegmentRow), ...rows]);
    const ok = await saveServerContent(SEGMENT_OUTREACH_STORAGE_KEY, next);
    await saveSelectedInstagramLeads();
    setInstagramNotice(ok
      ? `Передано в сегментный парсер: ${approved.length}. Ищи их в social = Instagram.`
      : "Не удалось сохранить в сегментный парсер: сервер content API недоступен.");
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Universal Social Parser / Atlas outreach</p>
          <h1>Универсальный парсер по соцсетям</h1>
          <p>
            Единая система поиска сетевиков, лидеров мнений, crypto/Web3-аудиторий, активных предпринимателей и региональных партнёров
            через Instagram, Facebook, LinkedIn, VK, Discord, WeChat, Line, KakaoTalk, Viber, Snapchat и новые источники.
          </p>
        </div>
        <div className="analytics-parser-run-card">
          <span>Рекомендация v1</span>
          <strong>Instagram → Facebook → VK</strong>
          <progress value="42" max="100" />
          <small>Начинаем с одного коннектора, но сразу держим универсальную схему данных.</small>
        </div>
      </section>

      <section className="analytics-parser-stats">
        <article><span>Соцсетей в карте</span><strong>{stats.total}</strong><small>можно расширять</small></article>
        <article><span>MVP</span><strong>{stats.mvp}</strong><small>первые коннекторы</small></article>
        <article><span>API only</span><strong>{stats.apiOnly}</strong><small>без серого скрейпинга</small></article>
        <article><span>Высокий риск</span><strong>{stats.highRisk}</strong><small>нужна ручная/легальная схема</small></article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">Instagram MVP / Apify</p>
            <h2>Первый рабочий парсер Instagram</h2>
            <p>{instagramNotice}</p>
          </div>
          <div>
            <button type="button" onClick={runInstagramSearch} disabled={isInstagramSearching}>
              {isInstagramSearching ? "Ищу..." : "Найти через Apify"}
            </button>
            <button type="button" onClick={createManualInstagramLeads}>Добавить URL вручную</button>
            <button type="button" onClick={saveSelectedInstagramLeads}>Сохранить выбранные</button>
            <button type="button" onClick={sendSelectedInstagramToSegment}>В сегментный парсер</button>
            <button type="button" onClick={() => downloadInstagramCsv(selectedInstagramResults.length ? selectedInstagramResults : instagramResults)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-stats analytics-instagram-parser-stats">
          <article><span>Найдено</span><strong>{instagramResults.length}</strong><small>последний запуск</small></article>
          <article><span>Выбрано</span><strong>{instagramStats.selected}</strong><small>для сохранения</small></article>
          <article><span>Approved</span><strong>{instagramStats.approved}</strong><small>можно переносить</small></article>
          <article><span>Public contact</span><strong>{instagramStats.withContact}</strong><small>есть сигнал контакта</small></article>
          <article><span>Блок</span><strong>{instagramStats.blocked}</strong><small>opt-out / DNC</small></article>
          <article><span>В очереди</span><strong>{instagramSavedLeads.length}</strong><small>сохранено</small></article>
        </div>

        <div className="analytics-parser-controls analytics-youtube-api-form">
          <label className="analytics-parser-wide">
            Ключевые слова
            <input value={instagramForm.query} onChange={(event) => updateInstagramField("query", event.target.value)} placeholder="network marketing crypto web3 business coach" />
          </label>
          <label>
            Хэштеги
            <textarea value={instagramForm.hashtags} onChange={(event) => updateInstagramField("hashtags", event.target.value)} rows="3" placeholder="networkmarketing, mlm, web3" />
          </label>
          <label>
            Profile URLs / handles
            <textarea value={instagramForm.profileUrls} onChange={(event) => updateInstagramField("profileUrls", event.target.value)} rows="3" placeholder="@example или https://www.instagram.com/example/" />
          </label>
          <label>
            Сегмент
            <select value={instagramForm.segment} onChange={(event) => updateInstagramField("segment", event.target.value)}>
              {SEGMENT_OUTREACH_SEGMENTS.map((segment) => <option key={segment.id} value={segment.id}>{segment.label}</option>)}
            </select>
          </label>
          <label>
            Страна / GEO
            <input value={instagramForm.country} onChange={(event) => updateInstagramField("country", event.target.value)} placeholder="Global, Singapore, Indonesia..." />
          </label>
          <label>
            Язык
            <input value={instagramForm.language} onChange={(event) => updateInstagramField("language", event.target.value)} placeholder="en, ru, id..." />
          </label>
          <label>
            Лимит
            <input type="number" min="1" max="100" value={instagramForm.limit} onChange={(event) => updateInstagramField("limit", event.target.value)} />
          </label>
          <label>
            Режим
            <select value={instagramForm.mode} onChange={(event) => updateInstagramField("mode", event.target.value)}>
              <option value="profiles">Profiles</option>
              <option value="posts">Posts</option>
              <option value="hashtags">Hashtags</option>
            </select>
          </label>
        </div>

        <div className="analytics-parser-rules analytics-instagram-parser-guardrails">
          <ul>
            <li><strong>Без auto-DM.</strong> Парсер только ищет публичные business-сигналы, первое сообщение делает человек.</li>
            <li><strong>Human review обязателен.</strong> В сегментный парсер уходят только лиды со статусом human_review_approved.</li>
            <li><strong>Opt-out блокирует контакт.</strong> Статусы opted_out и do_not_contact не переносятся в outreach.</li>
          </ul>
        </div>

        <div className="analytics-parser-table-scroll">
          <table className="analytics-table analytics-parser-table analytics-instagram-parser-table">
            <thead>
              <tr>
                <th><button type="button" className="analytics-parser-mini-button" onClick={toggleAllInstagramSelected}>{instagramSelectedIds.length === instagramResults.length && instagramResults.length ? "Снять" : "Все"}</button></th>
                <th>Профиль</th>
                <th>Bio / причина</th>
                <th>Контакт</th>
                <th>Score</th>
                <th>Статус</th>
                <th>Источник</th>
              </tr>
            </thead>
            <tbody>
              {instagramResults.length ? instagramResults.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <input type="checkbox" checked={instagramSelectedIds.includes(lead.id)} onChange={() => toggleInstagramSelected(lead.id)} aria-label={`Выбрать ${lead.username || lead.displayName}`} />
                  </td>
                  <td>
                    <strong>{lead.displayName || lead.username}</strong>
                    <small>@{lead.username || "unknown"} · {lead.country || "Global"} / {lead.language || "en"}</small>
                    <a className="analytics-parser-site-link" href={lead.profileUrl || lead.sourceUrl} target="_blank" rel="noreferrer">Открыть</a>
                  </td>
                  <td>
                    <textarea value={lead.bioExcerpt || ""} onChange={(event) => updateInstagramLead(lead.id, { bioExcerpt: event.target.value })} rows="3" placeholder="Bio excerpt / публичный сигнал" />
                    <textarea value={lead.relevanceReason || ""} onChange={(event) => updateInstagramLead(lead.id, { relevanceReason: event.target.value })} rows="3" placeholder="Почему подходит Atlas" />
                  </td>
                  <td>
                    <textarea value={lead.publicContact || ""} onChange={(event) => updateInstagramLead(lead.id, { publicContact: event.target.value })} rows="3" />
                    <small>{lead.lawfulBasis || "legitimate_interest"} · {lead.consentStatus || "not_requested"}</small>
                  </td>
                  <td>
                    <div className="analytics-parser-score">
                      <b>{lead.score || 0}</b>
                      <progress value={lead.score || 0} max="100" />
                    </div>
                  </td>
                  <td>
                    <select value={lead.reviewStatus || lead.contactStatus || "not_contacted"} onChange={(event) => updateInstagramLead(lead.id, { reviewStatus: event.target.value, contactStatus: event.target.value })}>
                      {INSTAGRAM_REVIEW_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <a className="analytics-parser-site-link" href={lead.sourceUrl || lead.profileUrl} target="_blank" rel="noreferrer">Source</a>
                    <small>{lead.rawProvider || "apify"} · {lead.capturedAt ? lead.capturedAt.slice(0, 10) : "no date"}</small>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">
                    <p className="analytics-parser-static-text">Пока результатов нет. Запусти Apify-поиск или вставь Instagram URL вручную.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {instagramRuns.length ? (
          <div className="analytics-parser-stage-list analytics-instagram-parser-runs">
            {instagramRuns.slice(0, 3).map((run) => (
              <article key={run.id}>
                <span>{run.status === "finished" ? "OK" : "!"}</span>
                <div>
                  <strong>{run.id}</strong>
                  <p>{run.provider || "apify"} · {run.status} · raw {run.counts?.raw ?? run.count ?? 0} / normalized {run.counts?.normalized ?? run.count ?? 0}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="analytics-parser-grid">
        <div className="analytics-parser-panel analytics-surface">
          <div className="analytics-parser-panel-head">
            <div>
              <h2>Как это должно работать</h2>
              <p>Не один хрупкий скрипт, а конвейер из коннекторов с единой CRM-карточкой.</p>
            </div>
          </div>
          <div className="analytics-parser-stage-list">
            {socialParserArchitecture.map((item, index) => (
              <article key={item.title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="analytics-parser-panel analytics-parser-rules analytics-surface">
          <h2>Вывод по рынку</h2>
          <ul>
            {socialParserMarketFindings.map((item) => (
              <li key={item.title}><strong>{item.title}.</strong> {item.text}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="analytics-parser-outreach analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Кого ищем</h2>
            <p>Сегменты для поиска лидеров, партнёров, комьюнити и рекламных контактов.</p>
          </div>
        </div>
        <div className="analytics-parser-outreach-grid">
          {socialParserTargetSegments.map((segment) => (
            <article key={segment}>
              <strong>{segment}</strong>
              <textarea readOnly rows="3" value={`Искать по соцсетям, странам и языкам. После нахождения: проверить активность, контактный маршрут, рекламную историю, риск и fit для Atlas.`} />
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Карта коннекторов</h2>
            <p>{visibleRows.length} источников в текущем фильтре · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={addRow}>Добавить соцсеть</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>
        <div className="analytics-parser-controls">
          <label>
            Соцсеть
            <select value={activePlatform} onChange={(event) => setActivePlatform(event.target.value)}>
              {platformOptions.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
          </label>
          <label>
            Статус
            <select value={activeStatus} onChange={(event) => setActiveStatus(event.target.value)}>
              {["Все", ...UNIVERSAL_SOCIAL_STATUS_OPTIONS].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="analytics-parser-wide">
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Instagram, MLM, airdrop, direct selling, API..." />
          </label>
        </div>
        <div className="analytics-parser-table-scroll">
          <table className="analytics-table analytics-parser-table">
            <thead>
              <tr>{UNIVERSAL_SOCIAL_COLUMNS.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input value={row.platform} onChange={(event) => updateRow(row.id, { platform: event.target.value })} />
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${statusTone(row.status)}`} value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })}>
                      {UNIVERSAL_SOCIAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${riskTone(row.risk)}`} value={row.risk} onChange={(event) => updateRow(row.id, { risk: event.target.value })}>
                      {UNIVERSAL_SOCIAL_RISK_OPTIONS.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
                    </select>
                  </td>
                  <td><textarea value={row.accessRoute} onChange={(event) => updateRow(row.id, { accessRoute: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.targets} onChange={(event) => updateRow(row.id, { targets: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.queries} onChange={(event) => updateRow(row.id, { queries: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.tooling} onChange={(event) => updateRow(row.id, { tooling: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} rows="4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="analytics-parser-outreach analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>MVP-план</h2>
            <p>Делаем быстро, но так, чтобы добавление новых соцсетей не ломало систему.</p>
          </div>
        </div>
        <div className="analytics-parser-outreach-grid">
          {socialParserMvpPlan.map((item) => (
            <article key={item.phase}>
              <strong>{item.phase}: {item.title}</strong>
              <textarea readOnly rows="4" value={item.result} />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
