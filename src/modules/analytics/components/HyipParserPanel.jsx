import { useEffect, useMemo, useState } from "react";
import { loadServerContent, postServerJson, saveServerContent } from "../services/contentStore";

import {
  COUNTRY_OPTIONS,
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_STORAGE_KEY as HYIP_OUTREACH_STORAGE_KEY,
  STATUS_OPTIONS,
  STORAGE_KEY as HYIP_STORAGE_KEY,
  defaultLeads as hyipDefaultLeads,
} from "../data/hyipParserData";

function readStoredLeads(storageKey, seedLeads) {
  if (typeof window === "undefined") return seedLeads;

  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : null;
    if (!Array.isArray(parsed) || !parsed.length) return seedLeads;

    const savedIds = new Set(parsed.map((lead) => lead.id));
    const missingSeedLeads = seedLeads.filter((lead) => !savedIds.has(lead.id));
    return [...parsed, ...missingSeedLeads];
  } catch {
    return seedLeads;
  }
}

function readStoredOutreach(outreachStorageKey) {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(outreachStorageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractEmail(value = "") {
  return String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractTelegramHandle(value = "") {
  return String(value || "").match(/@[a-zA-Z0-9_]{5,}/)?.[0] || "";
}

function makeFollowUpDate(days = 2) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeOutreachRecord(lead, record = {}) {
  const email = record.email || extractEmail(lead.contacts);
  const telegram = record.telegram || extractTelegramHandle(lead.contacts);
  return {
    leadId: lead.id,
    status: record.status || (lead.status === "Готов к контакту" ? "Найден" : "Найден"),
    channel: record.channel || (email ? "email" : telegram ? "telegram" : "form"),
    email,
    telegram,
    subject: record.subject || "",
    draft: record.draft || "",
    price: record.price || "",
    conditions: record.conditions || "",
    nextStep: record.nextStep || "Создать черновик и запросить media kit",
    followUpAt: record.followUpAt || "",
    lastContactAt: record.lastContactAt || "",
    responseNotes: record.responseNotes || "",
    history: Array.isArray(record.history) ? record.history : [],
    sendState: "",
  };
}

function getOutreachRecord(lead, outreach) {
  return normalizeOutreachRecord(lead, outreach[lead.id]);
}

function buildOutreachDraft(lead, record = {}, draftOptions = {}) {
  const subject = record.subject || `Advertising placement request - Atlas System x ${lead.name}`;
  const intro = draftOptions.intro || (lead.country === "Индия"
    ? "We are preparing an India-focused Web3 advertising test and are reviewing relevant crypto, Telegram and monitor placements."
    : "We are preparing an international Web3 advertising campaign and are reviewing relevant crypto, Telegram and monitor placements.");
  const placementLine = draftOptions.placementLine || "Could you please send your current media kit and placement options?";
  const trafficLine = draftOptions.trafficLine || "3. Traffic by country, especially India and global crypto/Web3 audience";
  const body = [
    "Hello,",
    "",
    "My name is [Your Name], I represent Atlas System.",
    intro,
    "",
    placementLine,
    "",
    "We would like to understand:",
    "1. Available ad formats: banners, listings, reviews, Telegram/channel placements, newsletter or social posts",
    "2. Prices per week/month and available start dates",
    trafficLine,
    "4. Telegram/social audience size and engagement",
    "5. Moderation requirements and materials you need from our side",
    "6. Payment methods and invoice/confirmation process",
    "",
    "We can provide the website, creatives and project details for your review before any placement. We are looking for compliant paid advertising options and want to confirm all requirements first.",
    "",
    "Official website: https://atlas-system.io",
    "",
    "Thank you.",
    "Atlas System Partnerships",
  ].join("\n");

  return {
    ...record,
    status: "Черновик",
    subject,
    draft: body,
    nextStep: "Проверить текст и отправить email / написать в Telegram",
    followUpAt: record.followUpAt || makeFollowUpDate(2),
  };
}

function makeTelegramUrl(handle = "", text = "") {
  const cleanHandle = String(handle || "").replace(/^@/, "").trim();
  if (!cleanHandle) return "";
  return `https://t.me/${cleanHandle}?text=${encodeURIComponent(text)}`;
}

function getScoreTone(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "accent";
  return "danger";
}

function getStatusTone(status) {
  if (status === "Готов к контакту" || status === "Ответили" || status === "Цена получена" || status === "Договорились") return "success";
  if (status === "В работе" || status === "Черновик" || status === "Отправлено") return "accent";
  if (status === "Не подходит" || status === "Отказ") return "danger";
  return "default";
}

function getHostLabel(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "сайт";
  }
}

function getChannelLabel(record = {}) {
  if (record.email) return `Email: ${record.email}`;
  if (record.telegram) return `Telegram: ${record.telegram}`;
  if (record.channel === "form") return "Форма на сайте";
  return "Контакт проверить";
}

function makeCsv(leads) {
  const header = ["name", "country", "url", "category", "trafficScore", "aliveScore", "fitScore", "contacts", "status", "notes"];
  const rows = leads.map((lead) => header.map((key) => `"${String(lead[key] ?? "").replaceAll('"', '""')}"`).join(","));
  return [header.join(","), ...rows].join("\n");
}

function downloadLeadsCsv(leads, filename = "hyip-monitor-leads.csv") {
  const blob = new Blob([makeCsv(leads)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function HyipParserPanel({
  title = "Площадки для размещения Atlas System",
  kicker = "Parser / outreach",
  seedLeads = hyipDefaultLeads,
  storageKey = HYIP_STORAGE_KEY,
  outreachStorageKey = HYIP_OUTREACH_STORAGE_KEY,
  csvFilename = "hyip-monitor-leads.csv",
  manualLeadDefaults = {},
  draftOptions = {},
  tableAriaLabel = "Список площадок для outreach",
  searchPlaceholder = "название, страна, контакт...",
} = {}) {
  const [leads, setLeads] = useState(() => readStoredLeads(storageKey, seedLeads));
  const [outreach, setOutreach] = useState(() => readStoredOutreach(outreachStorageKey));
  const [isOutreachLoaded, setIsOutreachLoaded] = useState(false);
  const [outreachSaveState, setOutreachSaveState] = useState("Локально");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState("Все этапы");
  const [country, setCountry] = useState("Все страны");
  const [status, setStatus] = useState("Все статусы");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(outreachStorageKey).then((savedOutreach) => {
      if (!isMounted) return;
      if (savedOutreach && typeof savedOutreach === "object" && !Array.isArray(savedOutreach)) {
        setOutreach(savedOutreach);
        try {
          window.localStorage.setItem(outreachStorageKey, JSON.stringify(savedOutreach));
        } catch {
          // Серверная очередь уже загружена в состояние страницы.
        }
        setOutreachSaveState("Сохранено на сервере");
      }
      setIsOutreachLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [outreachStorageKey]);

  useEffect(() => {
    if (!isOutreachLoaded) return undefined;

    const timer = window.setTimeout(() => {
      setOutreachSaveState("Сохраняю...");
      try {
        window.localStorage.setItem(outreachStorageKey, JSON.stringify(outreach));
      } catch {
        // Очередь останется доступна в состоянии страницы.
      }

      saveServerContent(outreachStorageKey, outreach).then((ok) => {
        setOutreachSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isOutreachLoaded, outreach, outreachStorageKey]);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const record = getOutreachRecord(lead, outreach);
    const countryMatch = country === "Все страны" || lead.country === country;
    const statusMatch = status === "Все статусы" || lead.status === status;
    const pipelineMatch = pipelineStatus === "Все этапы" || record.status === pipelineStatus;
    const search = query.trim().toLowerCase();
    const queryMatch = !search || [lead.name, lead.country, lead.url, lead.category, lead.contacts, lead.notes, record.draft, record.price, record.conditions, record.responseNotes]
      .some((value) => String(value).toLowerCase().includes(search));
    return countryMatch && statusMatch && pipelineMatch && queryMatch;
  }), [country, leads, outreach, pipelineStatus, query, status]);

  const summary = useMemo(() => ({
    total: leads.length,
    ready: leads.filter((lead) => lead.status === "Готов к контакту").length,
    avgFit: Math.round(leads.reduce((sum, lead) => sum + lead.fitScore, 0) / Math.max(leads.length, 1)),
    contacts: leads.filter((lead) => lead.contacts && lead.contacts !== "form only").length,
  }), [leads]);

  const selectedLead = selectedLeadId ? leads.find((lead) => lead.id === selectedLeadId) : null;
  const selectedOutreach = selectedLead ? getOutreachRecord(selectedLead, outreach) : null;

  function persist(nextLeads) {
    setLeads(nextLeads);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextLeads));
    }
  }

  function updateLead(id, patch) {
    persist(leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  function updateOutreach(leadId, patch) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    const currentRecord = getOutreachRecord(lead, outreach);
    const nextRecord = {
      ...currentRecord,
      ...patch,
      history: patch.history || currentRecord.history,
    };
    setOutreach((current) => ({ ...current, [leadId]: nextRecord }));
  }

  function appendOutreachHistory(leadId, text, patch = {}) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    const currentRecord = getOutreachRecord(lead, outreach);
    updateOutreach(leadId, {
      ...patch,
      history: [
        { id: `outreach-${Date.now()}`, text, createdAt: new Date().toISOString() },
        ...currentRecord.history,
      ],
    });
  }

  function createDraft(lead) {
    const currentRecord = getOutreachRecord(lead, outreach);
    const nextRecord = buildOutreachDraft(lead, currentRecord, draftOptions);
    appendOutreachHistory(lead.id, "Агент создал черновик письма", nextRecord);
  }

  async function copyTelegramDraft(lead, record) {
    const draft = record.draft || buildOutreachDraft(lead, record, draftOptions).draft;
    try {
      await navigator.clipboard.writeText(draft);
      appendOutreachHistory(lead.id, "Telegram-текст скопирован", {
        ...record,
        draft,
        status: record.status === "Найден" ? "Черновик" : record.status,
        nextStep: "Открыть Telegram и отправить вручную",
      });
    } catch {
      window.alert("Не получилось скопировать текст. Выдели черновик вручную.");
    }
  }

  async function sendEmail(lead, record) {
    const draft = record.draft || buildOutreachDraft(lead, record, draftOptions).draft;
    const subject = record.subject || buildOutreachDraft(lead, record, draftOptions).subject;
    const email = record.email || extractEmail(lead.contacts);
    if (!email) {
      window.alert("У этого лида нет email. Добавь email в карточку outreach или используй Telegram/contact form.");
      return;
    }

    updateOutreach(lead.id, { ...record, draft, subject, email, sendState: "sending" });
    const result = await postServerJson("/api/outreach/send-email", {
      lead: { id: lead.id, name: lead.name, url: lead.url, country: lead.country, category: lead.category },
      to: email,
      subject,
      body: draft,
    });

    if (!result.ok) {
      const errorText = result.payload?.error === "outreach_email_not_configured"
        ? "Нужно подключить RESEND_API_KEY, OUTREACH_FROM_EMAIL и OUTREACH_REPLY_TO_EMAIL на сервере."
        : result.payload?.error === "invalid_recipient_email"
          ? "Email получателя выглядит некорректно."
          : "Email не отправился. Проверь настройки отправки.";
      updateOutreach(lead.id, { ...record, draft, subject, email, sendState: "error" });
      window.alert(errorText);
      return;
    }

    appendOutreachHistory(lead.id, `Email отправлен на ${email}`, {
      ...record,
      draft,
      subject,
      email,
      status: "Отправлено",
      lastContactAt: new Date().toISOString(),
      followUpAt: makeFollowUpDate(2),
      nextStep: "Ждать ответ или сделать follow-up через 2 дня",
      sendState: "sent",
    });
  }

  function addManualLead() {
    const nextLead = {
      id: `lead-${Date.now()}`,
      name: manualLeadDefaults.name || "Новая площадка",
      country: country === "Все страны" ? "Россия" : country,
      url: "https://",
      category: manualLeadDefaults.category || "HYIP monitor",
      trafficScore: 50,
      aliveScore: 50,
      fitScore: 50,
      contacts: "",
      status: "Новый",
      lastSeen: "только что",
      notes: manualLeadDefaults.notes || "Добавлено вручную, нужно проверить контакты и активность.",
    };
    persist([nextLead, ...leads]);
  }

  return (
    <WrapperShell>
      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">{kicker}</p>
            <h2>{title}</h2>
            <p>
              {filteredLeads.length} строк в фильтре · {summary.ready} готовы к контакту · {outreachSaveState}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => setIsTableEditing((value) => !value)}>
              {isTableEditing ? "Готово" : "Редактировать таблицу"}
            </button>
            <button type="button" onClick={addManualLead}>Добавить вручную</button>
            <button type="button" onClick={() => downloadLeadsCsv(filteredLeads, csvFilename)}>Экспорт CSV</button>
          </div>
        </div>
        <div className="analytics-parser-controls analytics-parser-controls-compact">
          <label>
            Страна
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              {COUNTRY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Лид
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Переговоры
            <select value={pipelineStatus} onChange={(event) => setPipelineStatus(event.target.value)}>
              {["Все этапы", ...OUTREACH_STATUS_OPTIONS].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
          </label>
        </div>
        <div className="analytics-parser-lead-table" role="table" aria-label={tableAriaLabel}>
          <div className="analytics-parser-lead-row analytics-parser-lead-row-head" role="row">
            <span>Площадка</span>
            <span>Сайт</span>
            <span>Контакт</span>
            <span>Статус</span>
            <span>Описание портала</span>
            <span>Ответ / заметка</span>
          </div>
          {filteredLeads.map((lead) => {
            const record = getOutreachRecord(lead, outreach);
            return (
              <div key={lead.id} className={`analytics-parser-lead-row${selectedLead?.id === lead.id ? " analytics-parser-row-active" : ""}`} role="row">
                <div>
                  {isTableEditing ? (
                    <>
                      <input
                        className="analytics-parser-lead-title"
                        value={lead.name}
                        onChange={(event) => updateLead(lead.id, { name: event.target.value })}
                        aria-label={`Название ${lead.name}`}
                      />
                      <select value={lead.country} onChange={(event) => updateLead(lead.id, { country: event.target.value })} aria-label={`Страна ${lead.name}`}>
                        {COUNTRY_OPTIONS.filter((item) => item !== "Все страны").map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </>
                  ) : (
                    <>
                      <strong className="analytics-parser-lead-name">{lead.name}</strong>
                      <span className="analytics-parser-lead-country">{lead.country}</span>
                    </>
                  )}
                  <small>{lead.category}</small>
                </div>
                <div>
                  <a className="analytics-parser-site-link" href={lead.url} target="_blank" rel="noreferrer">Сайт</a>
                  {isTableEditing ? (
                    <input value={lead.url} onChange={(event) => updateLead(lead.id, { url: event.target.value })} aria-label={`Сайт ${lead.name}`} />
                  ) : null}
                  <small>{getHostLabel(lead.url)}</small>
                </div>
                <div>
                  <strong>{getChannelLabel(record)}</strong>
                  {isTableEditing ? (
                    <textarea value={lead.contacts} onChange={(event) => updateLead(lead.id, { contacts: event.target.value })} rows="3" aria-label={`Контакты ${lead.name}`} />
                  ) : (
                    <p className="analytics-parser-static-text">{lead.contacts || "Контакты нужно проверить"}</p>
                  )}
                </div>
                <div className="analytics-parser-status-cell">
                  <select className={`analytics-parser-status analytics-parser-status-${getStatusTone(record.status)}`} value={record.status} onChange={(event) => appendOutreachHistory(lead.id, `Статус изменён: ${event.target.value}`, { status: event.target.value })} aria-label={`Статус переговоров ${lead.name}`}>
                    {OUTREACH_STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  {record.lastContactAt ? <small>{new Date(record.lastContactAt).toLocaleDateString("ru-RU")}</small> : <small>{record.nextStep}</small>}
                  <button type="button" className="analytics-parser-mini-button" onClick={() => { setSelectedLeadId(lead.id); createDraft(lead); }}>Черновик</button>
                  <button type="button" className="analytics-parser-mini-button" onClick={() => setSelectedLeadId(lead.id)}>Открыть карточку</button>
                </div>
                <div>
                  {isTableEditing ? (
                    <textarea value={lead.notes} onChange={(event) => updateLead(lead.id, { notes: event.target.value })} rows="4" aria-label={`Описание ${lead.name}`} />
                  ) : (
                    <p className="analytics-parser-static-text">{lead.notes}</p>
                  )}
                  <small>Fit {lead.fitScore}% · живость {lead.aliveScore}%</small>
                </div>
                <div>
                  <textarea
                    value={record.responseNotes}
                    onChange={(event) => updateOutreach(lead.id, { responseNotes: event.target.value, status: event.target.value ? "Ответили" : record.status })}
                    rows="4"
                    placeholder="Написали в Telegram, ждём цены / ответили $..."
                    aria-label={`Ответ или заметка ${lead.name}`}
                  />
                  {isTableEditing ? (
                    <input value={record.price} onChange={(event) => updateOutreach(lead.id, { price: event.target.value, status: event.target.value ? "Цена получена" : record.status })} placeholder="Цена / бюджет" aria-label={`Цена ${lead.name}`} />
                  ) : record.price ? (
                    <small>Цена: {record.price}</small>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedLead && selectedOutreach && (
        <section className="analytics-outreach-cockpit analytics-surface">
          <div className="analytics-outreach-agent">
            <div className="analytics-outreach-agent-head">
              <div>
                <p className="analytics-kicker">Карточка контакта</p>
                <h2>{selectedLead.name} · {selectedLead.country}</h2>
              </div>
              <button type="button" className="analytics-parser-mini-button" onClick={() => setSelectedLeadId("")}>Скрыть</button>
            </div>

            <div className="analytics-outreach-fields">
              <label>
                Email
                <input value={selectedOutreach.email} onChange={(event) => updateOutreach(selectedLead.id, { email: event.target.value })} placeholder="ads@example.com" />
              </label>
              <label>
                Telegram
                <input value={selectedOutreach.telegram} onChange={(event) => updateOutreach(selectedLead.id, { telegram: event.target.value })} placeholder="@manager" />
              </label>
              <label>
                Follow-up
                <input type="date" value={selectedOutreach.followUpAt} onChange={(event) => updateOutreach(selectedLead.id, { followUpAt: event.target.value })} />
              </label>
              <label>
                Следующий шаг
                <input value={selectedOutreach.nextStep} onChange={(event) => updateOutreach(selectedLead.id, { nextStep: event.target.value })} />
              </label>
            </div>

            <label className="analytics-outreach-subject">
              Тема email
              <input value={selectedOutreach.subject} onChange={(event) => updateOutreach(selectedLead.id, { subject: event.target.value })} placeholder="Advertising placement request..." />
            </label>

            <label className="analytics-outreach-draft">
              Черновик для отправки
              <textarea value={selectedOutreach.draft} onChange={(event) => updateOutreach(selectedLead.id, { draft: event.target.value, status: selectedOutreach.status === "Найден" ? "Черновик" : selectedOutreach.status })} rows="10" />
            </label>

            <div className="analytics-outreach-actions">
              <button type="button" onClick={() => createDraft(selectedLead)}>Создать черновик</button>
              <button type="button" onClick={() => sendEmail(selectedLead, selectedOutreach)}>
                {selectedOutreach.sendState === "sending" ? "Отправляю..." : "Отправить email"}
              </button>
              <button type="button" onClick={() => copyTelegramDraft(selectedLead, selectedOutreach)}>Скопировать Telegram</button>
              <a className={!selectedOutreach.telegram ? "is-disabled" : ""} href={makeTelegramUrl(selectedOutreach.telegram, selectedOutreach.draft)} target="_blank" rel="noreferrer">Открыть Telegram</a>
            </div>

            <div className="analytics-outreach-history">
              <strong>История</strong>
              {(selectedOutreach.history.length ? selectedOutreach.history : [{ id: "empty", text: "Пока действий нет", createdAt: "" }]).slice(0, 5).map((item) => (
                <p key={item.id}>{item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : ""} {item.text}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </WrapperShell>
  );
}

function WrapperShell({ children }) {
  return <section className="analytics-parser">{children}</section>;
}

function Metric({ label, value, tone }) {
  return (
    <article className={`analytics-parser-stat analytics-parser-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Score({ label, value }) {
  return (
    <div className="analytics-parser-score">
      <span>{label}</span>
      <progress value={value} max="100" />
      <b>{value}</b>
    </div>
  );
}
