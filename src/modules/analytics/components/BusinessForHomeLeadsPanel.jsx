import { useEffect, useMemo, useState } from "react";

import {
  BUSINESS_FOR_HOME_LEADS_STORAGE_KEY,
  BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS,
  defaultBusinessForHomeLeads,
} from "../data/businessForHomeLeadsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const PAGE_SIZE = 50;

function hydrateLeads(savedLeads) {
  if (!Array.isArray(savedLeads) || !savedLeads.length) return defaultBusinessForHomeLeads;
  const savedById = new Map(savedLeads.map((lead) => [lead.id, lead]));
  return defaultBusinessForHomeLeads.map((lead) => ({ ...lead, ...(savedById.get(lead.id) || {}) }));
}

function readStoredLeads() {
  if (typeof window === "undefined") return defaultBusinessForHomeLeads;
  try {
    return hydrateLeads(JSON.parse(window.localStorage.getItem(BUSINESS_FOR_HOME_LEADS_STORAGE_KEY) || "null"));
  } catch {
    return defaultBusinessForHomeLeads;
  }
}

function downloadCsv(rows) {
  const escape = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
  const header = ["Лидер", "Страна", "Компания", "Сайт", "Facebook", "Business For Home", "Статус", "Заметка"];
  const body = rows.map((lead) => [
    lead.name,
    lead.country,
    lead.company,
    lead.website,
    lead.facebook,
    lead.profileUrl,
    lead.status,
    lead.notes,
  ].map(escape).join(","));
  const blob = new Blob(["\ufeff" + [header.map(escape).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-business-for-home-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function BusinessForHomeLeadsPanel() {
  const [leads, setLeads] = useState(readStoredLeads);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Все страны");
  const [status, setStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");

  useEffect(() => {
    let active = true;
    loadServerContent(BUSINESS_FOR_HOME_LEADS_STORAGE_KEY).then((savedLeads) => {
      if (!active) return;
      if (Array.isArray(savedLeads) && savedLeads.length) {
        const hydrated = hydrateLeads(savedLeads);
        setLeads(hydrated);
        window.localStorage.setItem(BUSINESS_FOR_HOME_LEADS_STORAGE_KEY, JSON.stringify(hydrated));
        setSaveState("Сохранено на сервере");
      }
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      window.localStorage.setItem(BUSINESS_FOR_HOME_LEADS_STORAGE_KEY, JSON.stringify(leads));
      saveServerContent(BUSINESS_FOR_HOME_LEADS_STORAGE_KEY, leads).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, leads]);

  const countries = useMemo(() => ["Все страны", ...new Set(leads.map((lead) => lead.country).filter(Boolean).sort())], [leads]);
  const visibleLeads = useMemo(() => {
    const search = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (country !== "Все страны" && lead.country !== country) return false;
      if (status !== "Все статусы" && lead.status !== status) return false;
      if (!search) return true;
      return [lead.name, lead.country, lead.company, lead.status, lead.notes]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [country, leads, query, status]);

  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedLeads = visibleLeads.slice(pageStart, pageStart + PAGE_SIZE);
  const displayStart = visibleLeads.length ? pageStart + 1 : 0;
  const displayEnd = Math.min(pageStart + PAGE_SIZE, visibleLeads.length);

  const stats = useMemo(() => ({
    total: leads.length,
    withWebsite: leads.filter((lead) => lead.website).length,
    withFacebook: leads.filter((lead) => lead.facebook).length,
    ready: leads.filter((lead) => lead.status === "Готовить оффер").length,
  }), [leads]);

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
          <p className="analytics-kicker">Business For Home / public directory</p>
          <h2>Сетевые лидеры и публичные каналы связи</h2>
          <p>Рабочая база из открытых профилей: страна, текущая компания, личный сайт, Facebook и карточка источника.</p>
        </div>
        <div className="analytics-bfh-leads-verdict">
          <span>Источник</span>
          <strong>Business For Home</strong>
          <p>Публичные данные. Перед предложением всегда проверяем, активен ли лидер и его текущая компания.</p>
        </div>
      </section>

      <section className="analytics-bfh-leads-stats" aria-label="Сводка базы сетевых лидеров">
        <article><span>Лидеры</span><strong>{stats.total}</strong><small>в базе</small></article>
        <article><span>Сайт</span><strong>{stats.withWebsite}</strong><small>публичных ссылок</small></article>
        <article><span>Facebook</span><strong>{stats.withFacebook}</strong><small>публичных профилей</small></article>
        <article><span>Оффер</span><strong>{stats.ready}</strong><small>готовить персонально</small></article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">CRM / leader outreach</p>
            <h2>Лидеры Business For Home</h2>
            <p>{visibleLeads.length} в фильтре · показано {displayStart}–{displayEnd} · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Готово" : "Редактировать"}</button>
            <button type="button" onClick={() => downloadCsv(visibleLeads)}>Экспорт CSV</button>
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
              {BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
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
                    <a href={lead.profileUrl} target="_blank" rel="noreferrer">Профиль BFH</a>
                  </td>
                  <td><p>{lead.company || "Не указана в профиле"}</p></td>
                  <td>
                    <div className="analytics-bfh-leads-actions">
                      {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer">Сайт</a> : <span>Сайт не указан</span>}
                      {lead.facebook ? <a href={lead.facebook} target="_blank" rel="noreferrer">Facebook</a> : null}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value })}>
                        {BUSINESS_FOR_HOME_LEAD_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
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
