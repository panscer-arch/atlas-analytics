import { useEffect, useMemo, useState } from "react";

import {
  SEGMENT_OUTREACH_SEGMENTS,
  SEGMENT_OUTREACH_STORAGE_KEY,
  defaultSegmentOutreachLeads,
} from "../data/segmentOutreachData";
import { loadServerContent, postServerJson, saveServerContent } from "../services/contentStore";

const INSTAGRAM_PARSER_LEADS_STORAGE_KEY = "atlas.analytics.instagramParser.leads.v1";
const INSTAGRAM_PARSER_RUNS_STORAGE_KEY = "atlas.analytics.instagramParser.runs.v1";

const SOCIAL_PARSER_TABS = [
  { id: "instagram", label: "Instagram", ready: true },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
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

export default function UniversalSocialParserPanel() {
  const [activeSocialTab, setActiveSocialTab] = useState("instagram");
  const [instagramForm, setInstagramForm] = useState(DEFAULT_INSTAGRAM_FORM);
  const [instagramResults, setInstagramResults] = useState([]);
  const [instagramSavedLeads, setInstagramSavedLeads] = useState([]);
  const [instagramSelectedIds, setInstagramSelectedIds] = useState([]);
  const [instagramNotice, setInstagramNotice] = useState("Загружаю очередь Instagram...");
  const [isInstagramSearching, setIsInstagramSearching] = useState(false);

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

  const activeTab = SOCIAL_PARSER_TABS.find((tab) => tab.id === activeSocialTab) || SOCIAL_PARSER_TABS[0];

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
            onClick={() => setActiveSocialTab(tab.id)}
            role="tab"
            aria-selected={activeSocialTab === tab.id}
          >
            <span>{tab.label}</span>
            <small>{tab.ready ? "работает" : "не настроен"}</small>
          </button>
        ))}
      </section>

      {activeSocialTab !== "instagram" ? (
        <EmptySocialParserTab label={activeTab.label} />
      ) : (
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
      )}
    </section>
  );
}
