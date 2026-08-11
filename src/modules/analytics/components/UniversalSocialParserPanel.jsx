import { useEffect, useMemo, useState } from "react";

import {
  SEGMENT_OUTREACH_SEGMENTS,
  SEGMENT_OUTREACH_STORAGE_KEY,
  defaultSegmentOutreachLeads,
} from "../data/segmentOutreachData";
import {
  getServerJson,
  loadServerContent,
  postServerJson,
  saveServerContent,
} from "../services/contentStore";
import {
  COUNTRY_DISCOVERY_REGIONS,
  COUNTRY_DISCOVERY_TIERS,
  countryDiscoveryRows,
  createCountryDiscoverySearchUrl,
} from "../data/countryDiscoveryData";

const INSTAGRAM_PARSER_LEADS_STORAGE_KEY = "atlas.analytics.instagramParser.leads.v1";
const INSTAGRAM_PARSER_RUNS_STORAGE_KEY = "atlas.analytics.instagramParser.runs.v1";
const AGENT_REACH_LEADS_STORAGE_KEY = "atlas.analytics.socialParser.leads.v2";
const AGENT_REACH_PLATFORMS = new Set(["linkedin", "facebook", "x", "youtube", "reddit", "github", "web"]);

const SOCIAL_PARSER_TABS = [
  { id: "instagram", label: "Instagram", ready: true },
  { id: "countries", label: "Страны", ready: true, provider: "Discovery map" },
  { id: "linkedin", label: "LinkedIn", ready: true, provider: "Agent Reach" },
  { id: "facebook", label: "Facebook", ready: true, provider: "Agent Reach" },
  { id: "x", label: "X", ready: true, provider: "Agent Reach" },
  { id: "youtube", label: "YouTube", ready: true, provider: "Agent Reach" },
  { id: "reddit", label: "Reddit", ready: true, provider: "Agent Reach" },
  { id: "github", label: "GitHub", ready: true, provider: "Agent Reach" },
  { id: "web", label: "Web", ready: true, provider: "Agent Reach" },
  { id: "vk", label: "VK" },
  { id: "discord", label: "Discord" },
  { id: "wechat", label: "WeChat" },
  { id: "line", label: "Line" },
  { id: "kakaotalk", label: "KakaoTalk" },
  { id: "snapchat", label: "Snapchat" },
  { id: "viber", label: "Viber" },
];

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

const DEFAULT_AGENT_REACH_FORM = {
  query: "web3 crypto community marketing",
  segment: "cryptoMlm",
  country: "Global",
  language: "en",
  limit: "10",
};

function getInitialSocialParserTab() {
  const requested = new URLSearchParams(window.location.search).get("social");
  return SOCIAL_PARSER_TABS.some((tab) => tab.id === requested) ? requested : "instagram";
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadInstagramCsv(rows) {
  const header = [
    "Username",
    "Name",
    "Profile",
    "Source",
    "Bio",
    "Contact",
    "Segment",
    "Country",
    "Language",
    "Score",
    "Status",
    "Captured",
  ];
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
  const blob = new Blob([["\ufeff" + header.map(csvCell).join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-instagram-parser-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadAgentReachCsv(rows) {
  const header = [
    "Platform",
    "Name",
    "Profile",
    "Description",
    "Public contact",
    "Segment",
    "Country",
    "Language",
    "Score",
    "Status",
    "Provider",
    "Captured",
  ];
  const body = rows.map((row) => [
    row.platform,
    row.displayName,
    row.profileUrl,
    row.bioExcerpt,
    row.publicContact,
    row.segment,
    row.country,
    row.language,
    row.score,
    row.reviewStatus || row.contactStatus,
    row.rawProvider,
    row.capturedAt,
  ].map(csvCell).join(","));
  const blob = new Blob([["\ufeff" + header.map(csvCell).join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-agent-reach-social-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
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
      "Источник: Instagram / Apify",
      `Score: ${lead.score || 0}`,
      `Captured: ${lead.capturedAt || ""}`,
      `Lawful basis: ${lead.lawfulBasis || "legitimate_interest"}`,
      `Contact status: ${status}`,
      lead.bioExcerpt ? `Bio: ${lead.bioExcerpt}` : "",
    ].filter(Boolean).join(" · "),
  };
}

function mapAgentReachLeadToSegmentRow(lead) {
  const status = lead.reviewStatus || lead.contactStatus || "not_contacted";
  return {
    id: `segment-outreach-${lead.platform}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    segment: lead.segment || "cryptoMlm",
    social: lead.platform,
    name: lead.displayName || `${lead.platform} lead`,
    type: `${lead.platform} public profile`,
    url: lead.profileUrl || lead.sourceUrl,
    contact: lead.publicContact || "Проверить публичные контакты на странице",
    region: [lead.country, lead.language].filter(Boolean).join(" / ") || "Global",
    fit: lead.relevanceReason || "Публичный профиль найден Agent Reach. Требуется ручная проверка.",
    route: "Открыть источник, проверить актуальность и публичный business contact, затем подготовить персональное сообщение.",
    price: "Запросить условия сотрудничества",
    priority: Number(lead.score || 0) >= 75 ? "1. Сначала" : "2. Следом",
    status: status === "human_review_approved" ? "Найти контакты" : "Ручная проверка",
    notes: [
      `Источник: ${lead.platform} / Agent Reach`,
      `Score: ${lead.score || 0}`,
      `Captured: ${lead.capturedAt || ""}`,
      `Contact status: ${status}`,
      lead.bioExcerpt ? `Описание: ${lead.bioExcerpt}` : "",
    ].filter(Boolean).join(" · "),
  };
}

function EmptySocialParserTab({ label }) {
  return (
    <section className="analytics-parser-table-wrap analytics-surface">
      <div className="analytics-parser-table-head">
        <div>
          <h2>{label}</h2>
          <p>Парсер для {label} еще не настроен.</p>
        </div>
        <button type="button" disabled>Будет подключено позже</button>
      </div>
    </section>
  );
}

function CountryDiscoveryPanel() {
  const [region, setRegion] = useState("Все регионы");
  const [tier, setTier] = useState("Все приоритеты");
  const [platform, setPlatform] = useState("Все платформы");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState("brazil");
  const [notice, setNotice] = useState("");

  const platforms = useMemo(() => [
    "Все платформы",
    ...Array.from(new Set(countryDiscoveryRows.flatMap((country) => country.discovery))).sort((a, b) => a.localeCompare(b, "ru")),
  ], []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return countryDiscoveryRows
      .filter((country) => region === "Все регионы" || country.region === region)
      .filter((country) => tier === "Все приоритеты" || country.tier === tier)
      .filter((country) => platform === "Все платформы" || country.discovery.includes(platform))
      .filter((country) => !normalized || [
        country.country,
        country.countryEn,
        country.region,
        country.languages,
        country.marketSignal,
        country.discovery.join(" "),
        country.conversation.join(" "),
        country.queries.join(" "),
      ].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => b.score - a.score);
  }, [platform, query, region, tier]);

  async function copyQueries(country) {
    const text = country.queries.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`Запросы для ${country.country} скопированы.`);
    } catch {
      setNotice("Не удалось скопировать. Выдели запросы вручную.");
    }
  }

  function openDiscovery(country) {
    const primaryPlatform = country.discovery[0];
    window.open(createCountryDiscoverySearchUrl(country, country.queries[0], primaryPlatform), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="analytics-country-discovery">
      <section className="analytics-parser-table-wrap analytics-surface analytics-country-discovery-head">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Карта MLM-комьюнити по странам</h2>
            <p>{rows.length} рынков в выборке · discovery → проверка → персональный контакт после решения человека</p>
          </div>
          <div className="analytics-country-discovery-kpis" aria-label="Сводка">
            <span><b>{countryDiscoveryRows.filter((item) => item.tier === "A").length}</b> Tier A</span>
            <span><b>{new Set(countryDiscoveryRows.flatMap((item) => item.discovery)).size}</b> платформ</span>
          </div>
        </div>

        <div className="analytics-parser-controls analytics-country-discovery-filters">
          <label>
            Регион
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              {COUNTRY_DISCOVERY_REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Приоритет
            <select value={tier} onChange={(event) => setTier(event.target.value)}>
              {COUNTRY_DISCOVERY_TIERS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Платформа
            <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
              {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="страна, язык, платформа..." />
          </label>
        </div>
        <p className="analytics-country-discovery-guardrail">
          Tier показывает приоритет публичного поиска и ручного исследования, а не готовность страны к запуску. До оффера нужны локальная юридическая проверка и подтверждение допустимого платёжного контура.
        </p>
        {notice ? <p className="analytics-country-discovery-notice" role="status">{notice}</p> : null}
      </section>

      <section className="analytics-country-discovery-list" aria-label="Страны">
        {rows.map((country) => {
          const expanded = expandedId === country.id;
          return (
            <article key={country.id} className={`analytics-surface analytics-country-row ${expanded ? "analytics-country-row-expanded" : ""}`}>
              <button
                type="button"
                className="analytics-country-row-summary"
                onClick={() => setExpandedId(expanded ? "" : country.id)}
                aria-expanded={expanded}
              >
                <span className="analytics-country-code">{country.flag}</span>
                <span className="analytics-country-name">
                  <strong>{country.country}</strong>
                  <small>{country.region} · {country.languages}</small>
                </span>
                <span className={`analytics-country-tier analytics-country-tier-${country.tier.toLowerCase()}`}>Tier {country.tier}</span>
                <span className="analytics-country-score"><b>{country.score}</b><small>приоритет поиска</small></span>
                <span className="analytics-country-primary"><b>{country.discovery[0]}</b><small>искать сначала</small></span>
                <span className="analytics-country-expand">{expanded ? "Свернуть" : "Открыть"}</span>
              </button>

              {expanded ? (
                <div className="analytics-country-row-details">
                  <div className="analytics-country-detail-main">
                    <section>
                      <h3>Сигнал рынка</h3>
                      <p>{country.marketSignal}</p>
                    </section>
                    <section>
                      <h3>Где обнаруживать</h3>
                      <div className="analytics-country-tags">
                        {country.discovery.map((item, index) => <span key={item}>{index + 1}. {item}</span>)}
                      </div>
                    </section>
                    <section>
                      <h3>Где продолжают разговор</h3>
                      <div className="analytics-country-tags analytics-country-tags-contact">
                        {country.conversation.map((item) => <span key={item}>{item}</span>)}
                      </div>
                    </section>
                    <section>
                      <h3>Типы сообществ</h3>
                      <ul>{country.communities.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  </div>

                  <aside className="analytics-country-query-panel">
                    <div>
                      <h3>Локальные запросы</h3>
                      <ol>{country.queries.map((item) => <li key={item}>{item}</li>)}</ol>
                    </div>
                    <div className="analytics-country-actions">
                      <button type="button" onClick={() => openDiscovery(country)}>Открыть поиск</button>
                      <button type="button" onClick={() => copyQueries(country)}>Скопировать запросы</button>
                    </div>
                    <div className="analytics-country-caution">
                      <strong>Проверить перед работой</strong>
                      <p>{country.caution}</p>
                    </div>
                    <div className="analytics-country-sources">
                      <strong>Источники · confidence: {country.confidence}</strong>
                      {country.sources.map((source, index) => (
                        <a key={source} href={source} target="_blank" rel="noreferrer">Источник {index + 1}</a>
                      ))}
                    </div>
                  </aside>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {!rows.length ? (
        <section className="analytics-surface analytics-youtube-api-empty">
          <strong>Страны не найдены</strong>
          <p>Измени регион, приоритет, платформу или поисковую строку.</p>
        </section>
      ) : null}
    </section>
  );
}

function AgentReachParserPanel({ platform, label, status }) {
  const [form, setForm] = useState(DEFAULT_AGENT_REACH_FORM);
  const [savedLeads, setSavedLeads] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [notice, setNotice] = useState("Загружаю очередь Agent Reach...");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadServerContent(AGENT_REACH_LEADS_STORAGE_KEY).then((stored) => {
      if (!isMounted) return;
      const rows = uniqueByProfile(Array.isArray(stored) ? stored : []);
      setSavedLeads(rows);
      setResults(rows.filter((lead) => lead.platform === platform));
      setSelectedIds([]);
      setNotice(status?.ok
        ? `Agent Reach ${status.version || ""} готов. Сохранено для ${label}: ${rows.filter((lead) => lead.platform === platform).length}.`
        : "Agent Reach на сервере пока недоступен. После деплоя статус обновится автоматически.");
    });
    return () => {
      isMounted = false;
    };
  }, [label, platform, status?.ok, status?.version]);

  const selectedResults = useMemo(() => {
    const selected = new Set(selectedIds);
    return results.filter((lead) => selected.has(lead.id));
  }, [results, selectedIds]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateLead(id, patch) {
    setResults((current) => current.map((lead) => (
      lead.id === id
        ? { ...lead, ...patch, contactStatus: patch.reviewStatus || patch.contactStatus || lead.contactStatus }
        : lead
    )));
  }

  async function persistQueue(nextPlatformRows) {
    const otherPlatforms = savedLeads.filter((lead) => lead.platform !== platform);
    const next = uniqueByProfile([...nextPlatformRows, ...otherPlatforms]);
    const ok = await saveServerContent(AGENT_REACH_LEADS_STORAGE_KEY, next);
    if (ok) setSavedLeads(next);
    return ok;
  }

  async function runSearch() {
    setIsSearching(true);
    setSelectedIds([]);
    setNotice(`Agent Reach ищет публичные страницы ${label}...`);
    const response = await postServerJson("/api/content/agent-reach-search", {
      ...form,
      platform,
      limit: Number(form.limit || 10),
    });
    setIsSearching(false);

    if (!response.ok) {
      if (response.status === 401) {
        setNotice("Нужен доступ к маркетинг-центру. Открой SuperSUS по своей защищенной ссылке.");
        return;
      }
      setNotice(`Agent Reach: ${response.payload?.message || response.payload?.error || "ошибка поиска"}`);
      return;
    }

    const items = Array.isArray(response.payload?.items) ? response.payload.items : [];
    const currentPlatformRows = savedLeads.filter((lead) => lead.platform === platform);
    const merged = uniqueByProfile([...items, ...currentPlatformRows]);
    setResults(merged);
    await persistQueue(merged);
    setNotice(`Найдено: ${items.length}. В очереди ${label}: ${merged.length}.`);
  }

  async function saveSelected() {
    if (!selectedResults.length) {
      setNotice("Сначала выбери строки в таблице.");
      return;
    }
    const allowed = selectedResults.filter((lead) => !["opted_out", "do_not_contact"].includes(lead.reviewStatus || lead.contactStatus));
    if (!allowed.length) {
      setNotice("Выбранные строки помечены как opted_out/do_not_contact.");
      return;
    }
    const merged = uniqueByProfile([...allowed, ...results]);
    const ok = await persistQueue(merged);
    setResults(merged);
    setNotice(ok ? `Сохранено: ${allowed.length}.` : "Не удалось сохранить: проверь доступ к маркетинг-центру.");
  }

  async function sendToSegment() {
    const approved = selectedResults.filter((lead) => lead.reviewStatus === "human_review_approved");
    if (!approved.length) {
      setNotice("В сегментный парсер идут только выбранные строки со статусом human_review_approved.");
      return;
    }
    const current = await loadServerContent(SEGMENT_OUTREACH_STORAGE_KEY);
    const rows = Array.isArray(current) && current.length ? current : defaultSegmentOutreachLeads;
    const next = uniqueSegmentRows([...approved.map(mapAgentReachLeadToSegmentRow), ...rows]);
    const ok = await saveServerContent(SEGMENT_OUTREACH_STORAGE_KEY, next);
    setNotice(ok ? `Передано в сегментный парсер: ${approved.length}.` : "Не удалось сохранить в сегментный парсер.");
  }

  function toggleSelected(id) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  return (
    <section className="analytics-parser-table-wrap analytics-surface">
      <div className="analytics-parser-table-head">
        <div>
          <h2>{label} · Agent Reach</h2>
          <p>{notice}</p>
        </div>
        <div>
          <button type="button" onClick={runSearch} disabled={isSearching || status?.ok === false}>
            {isSearching ? "Ищу..." : "Найти"}
          </button>
          <button type="button" onClick={saveSelected}>Сохранить</button>
          <button type="button" onClick={sendToSegment}>В сегментный парсер</button>
          <button type="button" onClick={() => downloadAgentReachCsv(selectedResults.length ? selectedResults : results)}>CSV</button>
        </div>
      </div>

      <div className="analytics-parser-controls analytics-youtube-api-form">
        <label className="analytics-parser-wide">
          Ключевые слова
          <input value={form.query} onChange={(event) => updateField("query", event.target.value)} placeholder="web3 community marketing defi" />
        </label>
        <label>
          Сегмент
          <select value={form.segment} onChange={(event) => updateField("segment", event.target.value)}>
            {SEGMENT_OUTREACH_SEGMENTS.map((segment) => <option key={segment.id} value={segment.id}>{segment.label}</option>)}
          </select>
        </label>
        <label>
          GEO
          <input value={form.country} onChange={(event) => updateField("country", event.target.value)} placeholder="Global, India, Indonesia..." />
        </label>
        <label>
          Язык
          <input value={form.language} onChange={(event) => updateField("language", event.target.value)} placeholder="en, id, es..." />
        </label>
        <label>
          Лимит
          <input type="number" min="1" max="30" value={form.limit} onChange={(event) => updateField("limit", event.target.value)} />
        </label>
      </div>

      <div className="analytics-parser-table-scroll">
        <table className="analytics-table analytics-parser-table analytics-instagram-parser-table analytics-agent-reach-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="analytics-parser-mini-button"
                  onClick={() => setSelectedIds(selectedIds.length === results.length ? [] : results.map((lead) => lead.id))}
                >
                  {selectedIds.length === results.length && results.length ? "Снять" : "Все"}
                </button>
              </th>
              <th>Профиль / страница</th>
              <th>Описание / причина</th>
              <th>Публичный контакт</th>
              <th>Score</th>
              <th>Статус</th>
              <th>Источник</th>
            </tr>
          </thead>
          <tbody>
            {results.length ? results.map((lead) => (
              <tr key={lead.id}>
                <td data-label="Выбор">
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelected(lead.id)} aria-label={`Выбрать ${lead.displayName}`} />
                </td>
                <td data-label="Профиль / страница">
                  <strong>{lead.displayName}</strong>
                  <small>{lead.country || "Global"} / {lead.language || "en"}</small>
                  <a className="analytics-parser-site-link" href={lead.profileUrl} target="_blank" rel="noreferrer">Открыть</a>
                </td>
                <td data-label="Описание / причина">
                  <textarea value={lead.bioExcerpt || ""} onChange={(event) => updateLead(lead.id, { bioExcerpt: event.target.value })} rows="4" />
                  <textarea value={lead.relevanceReason || ""} onChange={(event) => updateLead(lead.id, { relevanceReason: event.target.value })} rows="3" />
                </td>
                <td data-label="Публичный контакт">
                  <textarea value={lead.publicContact || ""} onChange={(event) => updateLead(lead.id, { publicContact: event.target.value })} rows="3" />
                  <small>Только публичные business contacts · без auto-DM</small>
                </td>
                <td data-label="Score">
                  <div className="analytics-parser-score">
                    <b>{lead.score || 0}</b>
                    <progress value={lead.score || 0} max="100" />
                  </div>
                </td>
                <td data-label="Статус">
                  <select value={lead.reviewStatus || "not_contacted"} onChange={(event) => updateLead(lead.id, { reviewStatus: event.target.value })}>
                    {INSTAGRAM_REVIEW_STATUSES.map((reviewStatus) => <option key={reviewStatus} value={reviewStatus}>{reviewStatus}</option>)}
                  </select>
                </td>
                <td data-label="Источник">
                  <a className="analytics-parser-site-link" href={lead.sourceUrl} target="_blank" rel="noreferrer">Source</a>
                  <small>{lead.rawProvider || "agent-reach/exa"} · {lead.capturedAt?.slice(0, 10)}</small>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7">
                  <p className="analytics-parser-static-text">Пока результатов нет. Введи запрос и нажми "Найти".</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function UniversalSocialParserPanel() {
  const [activeSocialTab, setActiveSocialTab] = useState(getInitialSocialParserTab);
  const [instagramForm, setInstagramForm] = useState(DEFAULT_INSTAGRAM_FORM);
  const [instagramResults, setInstagramResults] = useState([]);
  const [instagramSavedLeads, setInstagramSavedLeads] = useState([]);
  const [instagramSelectedIds, setInstagramSelectedIds] = useState([]);
  const [instagramNotice, setInstagramNotice] = useState("Загружаю очередь Instagram...");
  const [isInstagramSearching, setIsInstagramSearching] = useState(false);
  const [agentReachStatus, setAgentReachStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      loadServerContent(INSTAGRAM_PARSER_LEADS_STORAGE_KEY),
      loadServerContent(INSTAGRAM_PARSER_RUNS_STORAGE_KEY),
    ]).then(([savedInstagramLeads]) => {
      if (!isMounted) return;
      const savedLeads = uniqueByProfile(Array.isArray(savedInstagramLeads) ? savedInstagramLeads : []);
      setInstagramSavedLeads(savedLeads);
      setInstagramResults(savedLeads);
      setInstagramNotice(savedLeads.length
        ? `В таблице сохраненная очередь Instagram: ${savedLeads.length}.`
        : "Очередь пустая. Запусти поиск или добавь Instagram URL вручную.");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getServerJson("/api/content/agent-reach-status").then((response) => {
      if (isMounted) setAgentReachStatus(response.payload || { ok: false });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeTab = SOCIAL_PARSER_TABS.find((tab) => tab.id === activeSocialTab) || SOCIAL_PARSER_TABS[0];

  function selectSocialTab(tabId) {
    setActiveSocialTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set("social", tabId);
    window.history.replaceState({}, "", url);
  }

  const selectedInstagramResults = useMemo(() => {
    const ids = new Set(instagramSelectedIds);
    return instagramResults.filter((lead) => ids.has(lead.id));
  }, [instagramResults, instagramSelectedIds]);

  function updateInstagramField(name, value) {
    setInstagramForm((current) => ({ ...current, [name]: value }));
  }

  function updateInstagramLead(id, patch) {
    setInstagramResults((current) => current.map((lead) => (
      lead.id === id
        ? { ...lead, ...patch, contactStatus: patch.reviewStatus || patch.contactStatus || lead.contactStatus }
        : lead
    )));
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

  async function persistInstagramQueue(nextLeads) {
    const next = uniqueByProfile(nextLeads);
    setInstagramSavedLeads(next);
    await saveServerContent(INSTAGRAM_PARSER_LEADS_STORAGE_KEY, next);
    return next;
  }

  async function runInstagramSearch() {
    setIsInstagramSearching(true);
    setInstagramSelectedIds([]);
    setInstagramNotice("Ищу публичные Instagram-профили...");

    const response = await postServerJson("/api/content/instagram-search", {
      ...instagramForm,
      hashtags: splitInput(instagramForm.hashtags),
      profileUrls: splitInput(instagramForm.profileUrls),
      limit: Number(instagramForm.limit || 25),
    });
    setIsInstagramSearching(false);

    if (!response.ok) {
      const payload = response.payload || {};
      setInstagramNotice(payload.needsApiKey
        ? "Нужен APIFY_TOKEN на сервере. Можно пока добавить URL вручную."
        : `Ошибка Instagram parser: ${payload.message || payload.error || "unknown_error"}`);
      return;
    }

    const items = Array.isArray(response.payload.items) ? response.payload.items : [];
    const merged = uniqueByProfile([...items, ...instagramSavedLeads]);
    setInstagramResults(merged);
    await persistInstagramQueue(merged);
    setInstagramNotice(`Найдено новых/обновленных: ${items.length}. В таблице: ${merged.length}.`);
  }

  function createManualInstagramLeads() {
    const urls = splitInput(instagramForm.profileUrls).map(normalizeInstagramProfileUrl).filter(Boolean);
    if (!urls.length) {
      setInstagramNotice("Вставь Instagram profile URLs или handles в поле URL.");
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
    setInstagramNotice(`Добавлено вручную: ${manualLeads.length}. Отметь нужные и нажми "Сохранить".`);
  }

  async function saveSelectedInstagramLeads() {
    const saveable = selectedInstagramResults.filter(isSaveableInstagramLead);
    if (!saveable.length) {
      setInstagramNotice("Сначала выбери лиды в таблице.");
      return [];
    }
    const allowed = saveable.filter((lead) => !["opted_out", "do_not_contact"].includes(lead.reviewStatus || lead.contactStatus));
    if (!allowed.length) {
      setInstagramNotice("Выбранные лиды помечены как opted_out/do_not_contact.");
      return [];
    }
    const next = await persistInstagramQueue([...allowed, ...instagramSavedLeads]);
    setInstagramResults((current) => uniqueByProfile([...allowed, ...current]));
    setInstagramNotice(`Сохранено в очередь Instagram: ${allowed.length}. Всего в очереди: ${next.length}.`);
    return allowed;
  }

  async function sendSelectedInstagramToSegment() {
    const approved = selectedInstagramResults
      .filter(isSaveableInstagramLead)
      .filter((lead) => lead.reviewStatus === "human_review_approved")
      .filter((lead) => !["opted_out", "do_not_contact"].includes(lead.reviewStatus || lead.contactStatus));

    if (!approved.length) {
      setInstagramNotice("В сегментный парсер идут только выбранные лиды со статусом human_review_approved.");
      return;
    }

    const current = await loadServerContent(SEGMENT_OUTREACH_STORAGE_KEY);
    const rows = Array.isArray(current) && current.length ? current : defaultSegmentOutreachLeads;
    const next = uniqueSegmentRows([...approved.map(mapInstagramLeadToSegmentRow), ...rows]);
    const ok = await saveServerContent(SEGMENT_OUTREACH_STORAGE_KEY, next);
    await persistInstagramQueue([...approved, ...instagramSavedLeads]);
    setInstagramNotice(ok
      ? `Передано в сегментный парсер: ${approved.length}.`
      : "Не удалось сохранить в сегментный парсер: content API недоступен.");
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-subtabs analytics-surface" role="tablist" aria-label="Соцсети">
        {SOCIAL_PARSER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-parser-subtab ${activeSocialTab === tab.id ? "analytics-parser-subtab-active" : ""}`}
            onClick={() => selectSocialTab(tab.id)}
            role="tab"
            aria-selected={activeSocialTab === tab.id}
          >
            <span>{tab.label}</span>
            <small>{tab.provider || (tab.ready ? "работает" : "не настроен")}</small>
          </button>
        ))}
      </section>

      {activeSocialTab === "countries" ? (
        <CountryDiscoveryPanel />
      ) : activeSocialTab === "instagram" ? (
        <section className="analytics-parser-table-wrap analytics-surface">
          <div className="analytics-parser-table-head">
            <div>
              <h2>Instagram</h2>
              <p>{instagramNotice}</p>
            </div>
            <div>
              <button type="button" onClick={runInstagramSearch} disabled={isInstagramSearching}>
                {isInstagramSearching ? "Ищу..." : "Найти"}
              </button>
              <button type="button" onClick={createManualInstagramLeads}>Добавить URL</button>
              <button type="button" onClick={saveSelectedInstagramLeads}>Сохранить</button>
              <button type="button" onClick={sendSelectedInstagramToSegment}>В сегментный парсер</button>
              <button type="button" onClick={() => downloadInstagramCsv(selectedInstagramResults.length ? selectedInstagramResults : instagramResults)}>CSV</button>
            </div>
          </div>

          <div className="analytics-parser-controls analytics-youtube-api-form">
            <label className="analytics-parser-wide">
              Ключевые слова
              <input value={instagramForm.query} onChange={(event) => updateInstagramField("query", event.target.value)} placeholder="network marketing crypto web3 business coach" />
            </label>
            <label>
              Хэштеги
              <textarea value={instagramForm.hashtags} onChange={(event) => updateInstagramField("hashtags", event.target.value)} rows="2" placeholder="networkmarketing, mlm, web3" />
            </label>
            <label>
              URL / handles
              <textarea value={instagramForm.profileUrls} onChange={(event) => updateInstagramField("profileUrls", event.target.value)} rows="2" placeholder="@example или https://www.instagram.com/example/" />
            </label>
            <label>
              Сегмент
              <select value={instagramForm.segment} onChange={(event) => updateInstagramField("segment", event.target.value)}>
                {SEGMENT_OUTREACH_SEGMENTS.map((segment) => <option key={segment.id} value={segment.id}>{segment.label}</option>)}
              </select>
            </label>
            <label>
              GEO
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
                      <p className="analytics-parser-static-text">Пока результатов нет. Нажми "Найти" или вставь Instagram URL вручную.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : AGENT_REACH_PLATFORMS.has(activeSocialTab) ? (
        <AgentReachParserPanel
          key={activeSocialTab}
          platform={activeSocialTab}
          label={activeTab.label}
          status={agentReachStatus}
        />
      ) : (
        <EmptySocialParserTab label={activeTab.label} />
      )}
    </section>
  );
}
