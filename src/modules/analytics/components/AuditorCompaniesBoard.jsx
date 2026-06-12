import { useEffect, useMemo, useRef, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import {
  AUDITOR_COMPANIES_STORAGE_KEY,
  AUDITOR_PRIORITY_OPTIONS,
  AUDITOR_STATUS_OPTIONS,
  defaultAuditorCompanies,
} from "../data/securityReviewData";

function normalizeAuditorCompany(item = {}) {
  const fallback = defaultAuditorCompanies.find((company) => company.id === item.id) || {};
  return {
    id: item.id || `audit-company-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: item.name || fallback.name || "",
    country: item.country || fallback.country || "",
    region: item.region || fallback.region || "",
    site: item.site || fallback.site || "",
    contact: item.contact ?? fallback.contact ?? "",
    budget: item.budget || fallback.budget || "Уточнить",
    budgetRank: Number.isFinite(item.budgetRank) ? item.budgetRank : fallback.budgetRank || 999,
    priority: AUDITOR_PRIORITY_OPTIONS.includes(item.priority) ? item.priority : fallback.priority || "2. Запас",
    status: AUDITOR_STATUS_OPTIONS.includes(item.status) ? item.status : "Не писали",
    response: item.response ?? "",
    notes: item.notes ?? fallback.notes ?? "",
    updatedAt: item.updatedAt || "",
  };
}

function mergeAuditorCompanies(savedItems) {
  const savedById = new Map(Array.isArray(savedItems) ? savedItems.map((item) => [item.id, item]) : []);
  const mergedDefaultItems = defaultAuditorCompanies.map((company) => normalizeAuditorCompany({ ...company, ...(savedById.get(company.id) || {}) }));
  const customItems = Array.isArray(savedItems)
    ? savedItems.filter((item) => item?.id && !defaultAuditorCompanies.some((company) => company.id === item.id)).map(normalizeAuditorCompany)
    : [];
  return [...mergedDefaultItems, ...customItems].sort((a, b) => a.budgetRank - b.budgetRank || a.name.localeCompare(b.name));
}

function getAuditStatusTone(status) {
  if (status === "Ответили" || status === "В работе") return "success";
  if (status === "Написали") return "work";
  if (status === "Дорого" || status === "Не подходит") return "muted";
  return "idea";
}

function getAuditorHostLabel(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

function AuditorCompaniesBoard() {
  const [companies, setCompanies] = useState(defaultAuditorCompanies);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка...");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [query, setQuery] = useState("");
  const saveRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    loadServerContent(AUDITOR_COMPANIES_STORAGE_KEY).then((savedItems) => {
      if (!isMounted) return;
      setCompanies(mergeAuditorCompanies(savedItems));
      setIsLoaded(true);
      setSaveState("Сохранено");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      const requestId = saveRef.current + 1;
      saveRef.current = requestId;
      setSaveState("Сохраняю...");
      saveServerContent(AUDITOR_COMPANIES_STORAGE_KEY, companies).then((ok) => {
        if (saveRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [companies, isLoaded]);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies.filter((company) => {
      if (statusFilter !== "Все" && company.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [company.name, company.country, company.region, company.budget, company.notes, company.response]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [companies, query, statusFilter]);

  const stats = useMemo(() => {
    const wrote = companies.filter((company) => company.status !== "Не писали").length;
    const answered = companies.filter((company) => company.status === "Ответили" || company.status === "В работе").length;
    const pending = companies.filter((company) => company.status === "Не писали").length;
    return { total: companies.length, wrote, answered, pending };
  }, [companies]);

  const updateCompany = (id, field, value) => {
    setCompanies((currentCompanies) =>
      currentCompanies.map((company) =>
        company.id === id
          ? { ...company, [field]: value, updatedAt: new Date().toISOString() }
          : company
      )
    );
  };

  return (
    <div className="analytics-security-section analytics-auditor-crm">
      <div className="analytics-auditor-crm-head">
        <div>
          <span className="analytics-kicker">External audit outreach</span>
          <h3>Список компаний для аудита смарт-контракта</h3>
          <p>
            Рабочая таблица для рассылки: кому написали, кто ответил, какой бюджет ожидается и что важно учесть.
            Список отсортирован от более вероятных бюджетных вариантов к репутационным и дорогим.
          </p>
        </div>
        <div className="analytics-auditor-save-state">{saveState}</div>
      </div>

      <div className="analytics-auditor-stats">
        <article><span>Всего компаний</span><strong>{stats.total}</strong></article>
        <article><span>Не написали</span><strong>{stats.pending}</strong></article>
        <article><span>Уже написали</span><strong>{stats.wrote}</strong></article>
        <article><span>Ответили / в работе</span><strong>{stats.answered}</strong></article>
      </div>

      <div className="analytics-auditor-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по компании, стране, заметке..."
          aria-label="Поиск по компаниям"
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Фильтр по статусу">
          <option value="Все">Все статусы</option>
          {AUDITOR_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <div className="analytics-auditor-table" role="table" aria-label="Список компаний для аудита">
        <div className="analytics-auditor-row analytics-auditor-row-head" role="row">
          <span>Компания</span>
          <span>Страна / бюджет</span>
          <span>Сайт</span>
          <span>Статус</span>
          <span>Ответ / заметка</span>
        </div>
        {filteredCompanies.map((company) => (
          <div key={company.id} className="analytics-auditor-row" role="row">
            <div>
              <strong>{company.name}</strong>
              <small>{company.region}</small>
            </div>
            <div>
              <strong>{company.country}</strong>
              <input
                value={company.budget}
                onChange={(event) => updateCompany(company.id, "budget", event.target.value)}
                aria-label={`Бюджет ${company.name}`}
              />
            </div>
            <div>
              <a className="analytics-auditor-site-link" href={company.site} target="_blank" rel="noreferrer">Сайт</a>
              <small>{getAuditorHostLabel(company.site)}</small>
            </div>
            <div className="analytics-auditor-status-cell">
              <select
                className={`analytics-auditor-status analytics-auditor-status-${getAuditStatusTone(company.status)}`}
                value={company.status}
                onChange={(event) => updateCompany(company.id, "status", event.target.value)}
                aria-label={`Статус ${company.name}`}
              >
                {AUDITOR_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {company.updatedAt ? <small>{new Date(company.updatedAt).toLocaleDateString("ru-RU")}</small> : <small>без изменений</small>}
            </div>
            <div>
              <textarea
                value={company.response}
                onChange={(event) => updateCompany(company.id, "response", event.target.value)}
                placeholder={company.notes}
                aria-label={`Ответ или заметка ${company.name}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditorCompaniesBoard;
