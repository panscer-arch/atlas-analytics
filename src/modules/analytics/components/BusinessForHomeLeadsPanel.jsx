import { useEffect, useMemo, useState } from "react";

import {
  BUSINESS_FOR_HOME_LEADS_STORAGE_KEY,
  BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS,
  defaultBusinessForHomeLeads,
} from "../data/businessForHomeLeadsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const PAGE_SIZE = 50;

function hydrateLeads(savedLeads, seedLeads) {
  if (!Array.isArray(savedLeads) || !savedLeads.length) return seedLeads;
  const savedById = new Map(savedLeads.map((lead) => [lead.id, lead]));
  return seedLeads.map((lead) => ({ ...lead, ...(savedById.get(lead.id) || {}) }));
}

function readStoredLeads(storageKey, seedLeads) {
  if (typeof window === "undefined") return seedLeads;
  try {
    return hydrateLeads(JSON.parse(window.localStorage.getItem(storageKey) || "null"), seedLeads);
  } catch {
    return seedLeads;
  }
}

function downloadCsv(rows, fileName) {
  const escape = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
  const header = ["Лидер", "Страна", "Компания", "Источник", "Источник URL", "Тип записи", "Видимость контакта", "Проверено", "Сайт", "Email", "Facebook", "Профиль источника", "Статус", "Заметка"];
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
    lead.profileUrl,
    lead.status,
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
  directory = {
    storageKey: BUSINESS_FOR_HOME_LEADS_STORAGE_KEY,
    statusOptions: BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS,
    defaultLeads: defaultBusinessForHomeLeads,
    sourceName: "Business For Home",
    sourceDescription: "Публичные данные. Перед предложением всегда проверяем, активен ли лидер и его текущая компания.",
    profileLabel: "Профиль BFH",
    csvFileName: "atlas-business-for-home-leads.csv",
    sourceUrl: "https://www.businessforhome.org/",
    lastVerifiedAt: "2026-07-11",
  },
}) {
  const { storageKey, statusOptions, defaultLeads, sourceName, sourceDescription, profileLabel, csvFileName, sourceUrl, lastVerifiedAt } = directory;
  const [leads, setLeads] = useState(() => readStoredLeads(storageKey, defaultLeads));
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Все страны");
  const [status, setStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");

  useEffect(() => {
    let active = true;
    loadServerContent(storageKey).then((savedLeads) => {
      if (!active) return;
      if (Array.isArray(savedLeads) && savedLeads.length) {
        const hydrated = hydrateLeads(savedLeads, defaultLeads).map((lead) => ({
          ...lead,
          source: lead.source || sourceName,
          sourceUrl: lead.sourceUrl || sourceUrl,
          profileType: lead.profileType || "leader",
          contactVisibility: lead.contactVisibility || "Публичный профиль",
          lastVerifiedAt: lead.lastVerifiedAt || lastVerifiedAt,
        }));
        setLeads(hydrated);
        window.localStorage.setItem(BUSINESS_FOR_HOME_LEADS_STORAGE_KEY, JSON.stringify(hydrated));
        setSaveState("Сохранено на сервере");
      }
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [defaultLeads, storageKey]);

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
  })), [lastVerifiedAt, leads, sourceName, sourceUrl]);
  const countries = useMemo(() => ["Все страны", ...new Set(normalizedLeads.map((lead) => lead.country).filter(Boolean).sort())], [normalizedLeads]);
  const visibleLeads = useMemo(() => {
    const search = query.trim().toLowerCase();
    return normalizedLeads.filter((lead) => {
      if (country !== "Все страны" && lead.country !== country) return false;
      if (status !== "Все статусы" && lead.status !== status) return false;
      if (!search) return true;
      return [lead.name, lead.country, lead.company, lead.status, lead.notes]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [country, normalizedLeads, query, status]);

  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedLeads = visibleLeads.slice(pageStart, pageStart + PAGE_SIZE);
  const displayStart = visibleLeads.length ? pageStart + 1 : 0;
  const displayEnd = Math.min(pageStart + PAGE_SIZE, visibleLeads.length);

  const stats = useMemo(() => ({
    total: normalizedLeads.length,
    withWebsite: normalizedLeads.filter((lead) => lead.website).length,
    withEmail: normalizedLeads.filter((lead) => lead.email).length,
    withFacebook: normalizedLeads.filter((lead) => lead.facebook).length,
    ready: normalizedLeads.filter((lead) => lead.status === "Готовить оффер").length,
  }), [normalizedLeads]);

  function updateLead(id, patch) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  function resetPage(callback) {
    setPage(1);
    callback();
  }

  return (
    <section className="analytics-parser analytics-bfh-leads">
      <section className="analytics-surface analytics-bfh-leads-hero">
        <div>
          <p className="analytics-kicker">{sourceName} / public directory</p>
          <h2>Сетевые лидеры и публичные каналы связи</h2>
          <p>Рабочая база из открытых профилей: страна, текущая компания, публичный контакт, источник и дата проверки.</p>
        </div>
        <div className="analytics-bfh-leads-verdict">
          <span>Источник</span>
          <strong>{sourceName}</strong>
          <p>{sourceDescription}</p>
          <small>Проверено: {lastVerifiedAt}</small>
        </div>
      </section>

      <section className="analytics-bfh-leads-stats" aria-label="Сводка базы сетевых лидеров">
        <article><span>Лидеры</span><strong>{stats.total}</strong><small>в базе</small></article>
        <article><span>Сайт</span><strong>{stats.withWebsite}</strong><small>публичных ссылок</small></article>
        <article><span>Email</span><strong>{stats.withEmail}</strong><small>публичных адресов</small></article>
        <article><span>Оффер</span><strong>{stats.ready}</strong><small>готовить персонально</small></article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">CRM / leader outreach</p>
            <h2>Лидеры {sourceName}</h2>
            <p>{visibleLeads.length} в фильтре · показано {displayStart}–{displayEnd} · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Готово" : "Редактировать"}</button>
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
            Статус
            <select value={status} onChange={(event) => resetPage(() => setStatus(event.target.value))}>
              <option value="Все статусы">Все статусы</option>
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
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
                <th>Переговоры</th>
                <th>Заметка</th>
              </tr>
            </thead>
            <tbody>
              {pagedLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.name}</strong>
                    <span>{lead.country || "Страна не указана"}</span>
                    <a href={lead.profileUrl} target="_blank" rel="noreferrer">{profileLabel}</a>
                  </td>
                  <td><p>{lead.company || "Не указана в профиле"}</p></td>
                  <td>
                    <div className="analytics-bfh-leads-actions">
                      {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer">Сайт</a> : <span>Сайт не указан</span>}
                      {lead.email ? <a href={`mailto:${lead.email}`}>Email</a> : null}
                      {lead.facebook ? <a href={lead.facebook} target="_blank" rel="noreferrer">Facebook</a> : null}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value })}>
                        {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    ) : (
                      <span className={`analytics-bfh-lead-status analytics-bfh-lead-status-${lead.status === "Ответили" ? "success" : lead.status === "Не подходит" ? "danger" : "accent"}`}>{lead.status}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea value={lead.notes} onChange={(event) => updateLead(lead.id, { notes: event.target.value })} placeholder="Что проверили, когда написать, реакция лидера..." />
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
