import { useEffect, useMemo, useState } from "react";

import {
  BUSINESS_FOR_HOME_LEADS_STORAGE_KEY,
  BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS,
  defaultBusinessForHomeLeads,
} from "../data/businessForHomeLeadsData";
import { defaultLinkedInMlmLeads } from "../data/socialMlmLeadsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const PAGE_SIZE = 50;
const CONNECTION_STATUS_OPTIONS = [
  "Не определено",
  "Не подключён",
  "Подключается",
  "Подключён",
  "Отказался",
  "Пауза",
];
const NEGOTIATION_STAGE_OPTIONS = [
  "Новый",
  "Проверить активность",
  "Готовить оффер",
  "Написали",
  "Ответили",
  "Созвон назначен",
  "Презентация Atlas",
  "Обсуждение условий",
  "Договорились",
  "Онбординг",
  "Пауза",
  "Не подходит",
];
const ACTIVE_NEGOTIATION_STAGES = new Set([
  "Написали",
  "Ответили",
  "Созвон назначен",
  "Презентация Atlas",
  "Обсуждение условий",
  "Договорились",
  "Онбординг",
]);
const DEFAULT_LEADER_DIRECTORY = {
  storageKey: BUSINESS_FOR_HOME_LEADS_STORAGE_KEY,
  statusOptions: BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS,
  defaultLeads: [...defaultBusinessForHomeLeads, ...defaultLinkedInMlmLeads],
  sourceName: "Business For Home",
  sourceDescription: "Публичные данные. Перед предложением всегда проверяем, активен ли лидер и его текущая компания.",
  profileLabel: "Профиль BFH",
  csvFileName: "atlas-business-for-home-leads.csv",
  sourceUrl: "https://www.businessforhome.org/",
  lastVerifiedAt: "2026-07-11",
};

function cleanToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function leadIdentity(lead, index = 0) {
  return [
    lead.profileUrl,
    lead.linkedin,
    lead.facebook,
    lead.email,
    [lead.name, lead.country, lead.company].filter(Boolean).join("|"),
    `row-${index}`,
  ].find((value) => String(value || "").trim());
}

function inferConnectionStatus(lead) {
  if (lead.connectionStatus) return lead.connectionStatus;
  if (lead.status === "Подключён" || lead.status === "Подключено") return "Подключён";
  if (lead.status === "Не подходит") return "Не подключён";
  if (lead.status === "Пауза") return "Пауза";
  return "Не определено";
}

function connectionTone(connectionStatus) {
  if (connectionStatus === "Подключён") return "success";
  if (connectionStatus === "Отказался" || connectionStatus === "Не подключён") return "danger";
  if (connectionStatus === "Подключается") return "accent";
  return "neutral";
}

function normalizeLeads(leads, sourceName) {
  const usedIds = new Set();
  const usedIdentities = new Set();

  return (Array.isArray(leads) ? leads : []).reduce((result, lead, index) => {
    const identity = cleanToken(leadIdentity(lead, index)) || `row-${index}`;
    if (usedIdentities.has(identity)) return result;
    usedIdentities.add(identity);

    const originalId = lead.id && lead.id !== "bfh-NaN" ? cleanToken(lead.id) : "";
    let id = originalId || `${cleanToken(sourceName) || "leader"}-${identity}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${originalId || `${cleanToken(sourceName) || "leader"}-${identity}`}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    result.push({
      ...lead,
      id,
      source: lead.source || sourceName,
      profileType: lead.profileType || "leader",
      contactVisibility: lead.contactVisibility || "Публичный профиль",
      connectionStatus: inferConnectionStatus(lead),
      nextStep: lead.nextStep || "",
    });
    return result;
  }, []);
}

function hydrateLeads(savedLeads, seedLeads, sourceName) {
  const normalizedSeeds = normalizeLeads(seedLeads, sourceName);
  if (!Array.isArray(savedLeads) || !savedLeads.length) return normalizedSeeds;

  const normalizedSaved = normalizeLeads(savedLeads, sourceName);
  const savedByIdentity = new Map(
    normalizedSaved.map((lead, index) => [cleanToken(leadIdentity(lead, index)), lead]),
  );
  const seedIdentities = new Set();
  const hydratedSeeds = normalizedSeeds.map((lead, index) => {
    const identity = cleanToken(leadIdentity(lead, index));
    seedIdentities.add(identity);
    return { ...lead, ...(savedByIdentity.get(identity) || {}) };
  });
  const manualRows = normalizedSaved.filter(
    (lead, index) => !seedIdentities.has(cleanToken(leadIdentity(lead, index))),
  );

  return normalizeLeads([...manualRows, ...hydratedSeeds], sourceName);
}

function readStoredLeads(storageKey, seedLeads, sourceName) {
  if (typeof window === "undefined") return seedLeads;
  try {
    return hydrateLeads(
      JSON.parse(window.localStorage.getItem(storageKey) || "null"),
      seedLeads,
      sourceName,
    );
  } catch {
    return normalizeLeads(seedLeads, sourceName);
  }
}

function downloadCsv(rows, fileName) {
  const escape = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
  const header = ["Лидер", "Страна", "Компания", "Источник", "Источник URL", "Тип записи", "Видимость контакта", "Проверено", "Сайт", "Email", "Facebook", "LinkedIn", "Профиль источника", "Подключение", "Этап переговоров", "Следующий шаг", "Заметка"];
  const body = rows.map((lead) => [
    lead.name,
    lead.country,
    lead.company,
    lead.source,
    lead.sourceUrl,
    lead.profileType,
    lead.contactVisibility,
    lead.lastVerifiedAt,
    lead.website,
    lead.email,
    lead.facebook,
    lead.linkedin,
    lead.profileUrl,
    lead.connectionStatus,
    lead.status,
    lead.nextStep,
    lead.notes,
  ].map(escape).join(","));
  const blob = new Blob(["\ufeff" + [header.map(escape).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BusinessForHomeLeadsPanel({
  directory = DEFAULT_LEADER_DIRECTORY,
  initialSourceFilter = "Все источники",
  initialContactFilter = "Все контакты",
  title = "Сетевые лидеры и публичные каналы связи",
  description = "Рабочая база из открытых профилей: страна, текущая компания, публичный контакт, источник и дата проверки.",
  displaySourceName = "",
  displaySourceDescription = "",
  displayVerifiedAt = "",
  verificationLabel = "",
  kicker = "",
  tableTitle = "",
  totalStatLabel = "Лидеры",
  allowManualAdd = true,
  restrictToInitialSource = false,
}) {
  const { storageKey, statusOptions, defaultLeads, sourceName, sourceDescription, profileLabel, csvFileName, sourceUrl, lastVerifiedAt } = directory;
  const [leads, setLeads] = useState(() => readStoredLeads(storageKey, defaultLeads, sourceName));
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Все страны");
  const [status, setStatus] = useState("Все статусы");
  const [connectionFilter, setConnectionFilter] = useState("Все подключения");
  const [source, setSource] = useState(initialSourceFilter);
  const [contactFilter, setContactFilter] = useState(initialContactFilter);
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");
  const effectiveSource = restrictToInitialSource ? initialSourceFilter : source;

  useEffect(() => {
    let active = true;
    loadServerContent(storageKey).then((savedLeads) => {
      if (!active) return;
      if (Array.isArray(savedLeads) && savedLeads.length) {
        const hydrated = hydrateLeads(savedLeads, defaultLeads, sourceName).map((lead) => ({
          ...lead,
          source: lead.source || sourceName,
          sourceUrl: lead.sourceUrl || sourceUrl,
          profileType: lead.profileType || "leader",
          contactVisibility: lead.contactVisibility || "Публичный профиль",
          lastVerifiedAt: lead.lastVerifiedAt || lastVerifiedAt,
          connectionStatus: inferConnectionStatus(lead),
          nextStep: lead.nextStep || "",
        }));
        setLeads(hydrated);
        window.localStorage.setItem(storageKey, JSON.stringify(hydrated));
        setSaveState("Сохранено на сервере");
      }
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [defaultLeads, lastVerifiedAt, sourceName, sourceUrl, storageKey]);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      window.localStorage.setItem(storageKey, JSON.stringify(leads));
      saveServerContent(storageKey, leads).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, leads, storageKey]);

  const normalizedLeads = useMemo(() => leads.map((lead) => ({
    ...lead,
    source: lead.source || sourceName,
    sourceUrl: lead.sourceUrl || sourceUrl,
    profileType: lead.profileType || "leader",
    contactVisibility: lead.contactVisibility || "Публичный профиль",
    lastVerifiedAt: lead.lastVerifiedAt || lastVerifiedAt,
    connectionStatus: inferConnectionStatus(lead),
    nextStep: lead.nextStep || "",
  })), [lastVerifiedAt, leads, sourceName, sourceUrl]);
  const countries = useMemo(() => ["Все страны", ...new Set(normalizedLeads.map((lead) => lead.country).filter(Boolean).sort())], [normalizedLeads]);
  const sources = useMemo(() => ["Все источники", ...new Set(normalizedLeads.map((lead) => lead.source).filter(Boolean).sort())], [normalizedLeads]);
  const availableStatusOptions = useMemo(
    () => [...new Set([...statusOptions, ...NEGOTIATION_STAGE_OPTIONS])],
    [statusOptions],
  );
  const visibleLeads = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = normalizedLeads.filter((lead) => {
      if (country !== "Все страны" && lead.country !== country) return false;
      if (status !== "Все статусы" && lead.status !== status) return false;
      if (connectionFilter !== "Все подключения" && lead.connectionStatus !== connectionFilter) return false;
      if (effectiveSource !== "Все источники" && lead.source !== effectiveSource) return false;
      if (contactFilter === "Facebook" && !lead.facebook) return false;
      if (contactFilter === "LinkedIn" && !lead.linkedin) return false;
      if (contactFilter === "Email" && !lead.email) return false;
      if (contactFilter === "Сайт" && !lead.website) return false;
      if (contactFilter === "Соцсети" && !lead.facebook && !lead.linkedin) return false;
      if (!search) return true;
      return [
        lead.name,
        lead.country,
        lead.company,
        lead.source,
        lead.status,
        lead.connectionStatus,
        lead.nextStep,
        lead.notes,
        lead.facebook,
        lead.linkedin,
        lead.email,
      ]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
    if (initialContactFilter === "Соцсети") {
      filtered.sort((left, right) => Number(Boolean(right.linkedin)) - Number(Boolean(left.linkedin)));
    }
    return filtered;
  }, [connectionFilter, contactFilter, country, effectiveSource, initialContactFilter, normalizedLeads, query, status]);

  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedLeads = visibleLeads.slice(pageStart, pageStart + PAGE_SIZE);
  const displayStart = visibleLeads.length ? pageStart + 1 : 0;
  const displayEnd = Math.min(pageStart + PAGE_SIZE, visibleLeads.length);

  const stats = useMemo(() => {
    const scopedLeads = normalizedLeads.filter((lead) => {
      if (initialSourceFilter !== "Все источники" && lead.source !== initialSourceFilter) return false;
      if (initialContactFilter === "Facebook" && !lead.facebook) return false;
      if (initialContactFilter === "LinkedIn" && !lead.linkedin) return false;
      if (initialContactFilter === "Соцсети" && !lead.facebook && !lead.linkedin) return false;
      if (initialContactFilter === "Email" && !lead.email) return false;
      if (initialContactFilter === "Сайт" && !lead.website) return false;
      return true;
    });
    return {
      total: scopedLeads.length,
      withFacebook: scopedLeads.filter((lead) => lead.facebook).length,
      withLinkedIn: scopedLeads.filter((lead) => lead.linkedin).length,
      negotiating: scopedLeads.filter((lead) => ACTIVE_NEGOTIATION_STAGES.has(lead.status)).length,
      connected: scopedLeads.filter((lead) => lead.connectionStatus === "Подключён").length,
    };
  }, [initialContactFilter, initialSourceFilter, normalizedLeads]);

  function updateLead(id, patch) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  function resetPage(callback) {
    setPage(1);
    callback();
  }

  function addLead() {
    const nextLead = {
      id: `social-mlm-${Date.now()}`,
      name: "Новый MLM-лидер",
      country: "",
      company: "",
      source: "Добавлено вручную",
      sourceUrl: "",
      profileUrl: "",
      profileType: "Network marketing leader",
      contactVisibility: "Публичный профиль",
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
      website: "",
      email: "",
      facebook: "",
      linkedin: "",
      status: "Новый",
      connectionStatus: "Не определено",
      nextStep: "Проверить профиль и выбрать канал для первого контакта",
      notes: "",
    };
    setLeads((current) => [nextLead, ...current]);
    setSource(initialSourceFilter);
    setContactFilter("Все контакты");
    setCountry("Все страны");
    setStatus("Все статусы");
    setConnectionFilter("Все подключения");
    setPage(1);
    setIsEditing(true);
  }

  return (
    <section className="analytics-parser analytics-bfh-leads">
      <section className="analytics-surface analytics-bfh-leads-hero">
        <div>
          <p className="analytics-kicker">{kicker || `${displaySourceName || sourceName} / public directory`}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="analytics-bfh-leads-verdict">
          <span>Источник</span>
          <strong>{displaySourceName || sourceName}</strong>
          <p>{displaySourceDescription || sourceDescription}</p>
          <small>{verificationLabel || `Проверено: ${displayVerifiedAt || lastVerifiedAt}`}</small>
        </div>
      </section>

      <section className="analytics-bfh-leads-stats" aria-label="Сводка базы сетевых лидеров">
        <article><span>{totalStatLabel}</span><strong>{stats.total}</strong><small>в базе</small></article>
        <article><span>Facebook</span><strong>{stats.withFacebook}</strong><small>публичных профилей</small></article>
        <article><span>LinkedIn</span><strong>{stats.withLinkedIn}</strong><small>публичных профилей</small></article>
        <article><span>Переговоры</span><strong>{stats.negotiating}</strong><small>активных диалогов</small></article>
        <article><span>Подключено</span><strong>{stats.connected}</strong><small>лидеров Atlas</small></article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">CRM / leader outreach</p>
            <h2>{tableTitle || `Лидеры ${displaySourceName || sourceName}`}</h2>
            <p>{visibleLeads.length} в фильтре · показано {displayStart}–{displayEnd} · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Готово" : "Редактировать"}</button>
            {allowManualAdd ? <button type="button" onClick={addLead}>Добавить лидера</button> : null}
            <button type="button" onClick={() => downloadCsv(visibleLeads, csvFileName)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact analytics-bfh-leads-controls">
          <label className="analytics-parser-wide">
            Поиск по имени, стране, компании или заметке
            <input value={query} onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder="Например: Germany, iGenius, Jennifer..." />
          </label>
          <label>
            Страна
            <select value={country} onChange={(event) => resetPage(() => setCountry(event.target.value))}>
              {countries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Этап переговоров
            <select value={status} onChange={(event) => resetPage(() => setStatus(event.target.value))}>
              <option value="Все статусы">Все статусы</option>
              {availableStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Подключение
            <select value={connectionFilter} onChange={(event) => resetPage(() => setConnectionFilter(event.target.value))}>
              <option value="Все подключения">Все подключения</option>
              {CONNECTION_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {!restrictToInitialSource ? (
            <label>
              Источник
              <select value={source} onChange={(event) => resetPage(() => setSource(event.target.value))}>
                {sources.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            Контакт
            <select value={contactFilter} onChange={(event) => resetPage(() => setContactFilter(event.target.value))}>
              {["Все контакты", "Соцсети", "Facebook", "LinkedIn", "Email", "Сайт"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="analytics-bfh-leads-table-scroll">
          <table className="analytics-bfh-leads-table">
            <thead>
              <tr>
                <th>Лидер</th>
                <th>Компания</th>
                <th>Контакты</th>
                <th>Подключение / переговоры</th>
                <th>Заметка</th>
              </tr>
            </thead>
            <tbody>
              {pagedLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    {isEditing ? (
                      <>
                        <input value={lead.name || ""} onChange={(event) => updateLead(lead.id, { name: event.target.value })} placeholder="Имя лидера" />
                        <input value={lead.country || ""} onChange={(event) => updateLead(lead.id, { country: event.target.value })} placeholder="Страна" />
                        <input value={lead.profileUrl || ""} onChange={(event) => updateLead(lead.id, { profileUrl: event.target.value })} placeholder="Ссылка на исходный профиль" />
                      </>
                    ) : (
                      <>
                        <strong>{lead.name}</strong>
                        <span>{lead.country || "Страна не указана"}</span>
                        {lead.profileUrl ? <a href={lead.profileUrl} target="_blank" rel="noreferrer">{lead.source === "LinkedIn" ? "Профиль LinkedIn" : profileLabel}</a> : null}
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <input value={lead.company || ""} onChange={(event) => updateLead(lead.id, { company: event.target.value })} placeholder="Компания" />
                        <input value={lead.source || ""} onChange={(event) => updateLead(lead.id, { source: event.target.value })} placeholder="Источник" />
                      </>
                    ) : (
                      <>
                        <p>{lead.company || "Не указана в профиле"}</p>
                        <span>{lead.source || sourceName}</span>
                      </>
                    )}
                  </td>
                  <td>
                    <div className="analytics-bfh-leads-actions">
                      {isEditing ? (
                        <>
                          <input value={lead.facebook || ""} onChange={(event) => updateLead(lead.id, { facebook: event.target.value })} placeholder="Facebook URL" />
                          <input value={lead.linkedin || ""} onChange={(event) => updateLead(lead.id, { linkedin: event.target.value })} placeholder="LinkedIn URL" />
                          <input value={lead.website || ""} onChange={(event) => updateLead(lead.id, { website: event.target.value })} placeholder="Сайт" />
                          <input value={lead.email || ""} onChange={(event) => updateLead(lead.id, { email: event.target.value })} placeholder="Публичный email" />
                        </>
                      ) : (
                        <>
                          {lead.facebook ? <a href={lead.facebook} target="_blank" rel="noreferrer">Facebook</a> : null}
                          {lead.linkedin ? <a href={lead.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> : null}
                          {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer">Сайт</a> : null}
                          {lead.email ? <a href={`mailto:${lead.email}`}>Email</a> : null}
                          {!lead.facebook && !lead.linkedin && !lead.website && !lead.email ? <span>Контакт не указан</span> : null}
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="analytics-bfh-lead-pipeline">
                        <label>
                          Подключение
                          <select value={lead.connectionStatus || "Не определено"} onChange={(event) => updateLead(lead.id, { connectionStatus: event.target.value })}>
                            {CONNECTION_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </label>
                        <label>
                          Этап переговоров
                          <select value={lead.status || "Новый"} onChange={(event) => updateLead(lead.id, { status: event.target.value })}>
                            {availableStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </label>
                        <label>
                          Следующий шаг
                          <input value={lead.nextStep || ""} onChange={(event) => updateLead(lead.id, { nextStep: event.target.value })} placeholder="Что сделать дальше" />
                        </label>
                      </div>
                    ) : (
                      <div className="analytics-bfh-lead-pipeline">
                        <span className={`analytics-bfh-lead-status analytics-bfh-lead-status-${connectionTone(lead.connectionStatus)}`}>{lead.connectionStatus}</span>
                        <strong>{lead.status || "Новый"}</strong>
                        <small>{lead.nextStep ? `Дальше: ${lead.nextStep}` : "Следующий шаг не указан"}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <textarea value={lead.notes || ""} onChange={(event) => updateLead(lead.id, { notes: event.target.value })} placeholder="Что проверили, когда написать, реакция лидера..." />
                        <button type="button" className="analytics-parser-mini-button" onClick={() => setLeads((current) => current.filter((item) => item.id !== lead.id))}>Удалить</button>
                      </>
                    ) : (
                      <p>{lead.notes || "Добавьте заметку после проверки профиля."}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="analytics-bfh-leads-pagination">
          <span>Страница {safePage} из {totalPages}</span>
          <div>
            <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Назад</button>
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Далее</button>
          </div>
        </div>
      </section>
    </section>
  );
}
