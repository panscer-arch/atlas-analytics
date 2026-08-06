import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Filter,
  Plus,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import { loadServerContent, saveServerContent } from "../services/contentStore";
import "./MlmGatewayTracker.css";

const COMPANY_STORAGE_KEY = "atlas.analytics.mlmGateway.outreach.v1";
const PLATFORM_STORAGE_KEY = "atlas.analytics.mlmIndustryPlatforms.v1";

const COMPANY_STATUS_OPTIONS = [
  "Не начато",
  "Контакт найден",
  "Заполнено",
  "Отправлено",
  "Ответили",
  "Переговоры",
  "Согласовано",
  "Отказ",
];
const COMPANY_PRIORITY_OPTIONS = ["Высокий", "Средний", "Низкий"];
const PLATFORM_STATUS_OPTIONS = [
  "Не начато",
  "Подготовка",
  "Исследование",
  "В работе",
  "Мониторинг",
  "Контакт найден",
  "Отправлено",
  "Ответили",
  "Переговоры",
  "Согласовано",
  "Отказ",
];
const PLATFORM_PRIORITY_OPTIONS = ["A", "B", "C"];

function normalizeCompanySeed(row, index) {
  return {
    id: `mlmg-${row.profile_id || index}`,
    company: row.name || "Без названия",
    country: row.country || "Не указана",
    category: row.category || "Не указана",
    memberType: row.member_type || "Member",
    joinFee: row.join_fee || "Не указана",
    contactUrl: row.contact_route || row.source_url || "",
    profileUrl: row.learn_more || row.source_url || "",
    status: "Не начато",
    priority: row.risk_flag ? "Низкий" : "Средний",
    responsible: "",
    notes: row.risk_flag || row.duplicate || "",
    riskFlag: row.risk_flag || "",
    duplicate: row.duplicate || "",
    verifiedAt: row.verified_at || "2026-08-04",
  };
}

function normalizePlatformSeed(row, index) {
  return {
    id: `platform-${row.id || index}`,
    name: row.name || "Без названия",
    category: row.category || "Не указана",
    region: row.region || "Global",
    priority: row.priority || "C",
    purpose: row.purpose || "",
    atlasAction: row.atlas_action || "",
    website: row.website || "",
    contactUrl: row.contact_url || "",
    status: row.status || "Не начато",
    responsible: "",
    nextAction: row.next_action || "",
    notes: row.notes || "",
    verifiedAt: row.verified_at || "2026-08-06",
  };
}

function hydrateRows(saved, seed) {
  if (!Array.isArray(saved) || !saved.length) return seed;
  const seedById = new Map(seed.map((row) => [row.id, row]));
  const hydrated = saved.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const ids = new Set(hydrated.map((row) => row.id));
  return [...hydrated, ...seed.filter((row) => !ids.has(row.id))];
}

function normalizeCompanyRows(rawRows) {
  const seen = new Set();
  return rawRows.map((row, index) => {
    const normalized = normalizeCompanySeed(row, index);
    if (seen.has(normalized.id)) normalized.id = `${normalized.id}-${index}`;
    seen.add(normalized.id);
    return normalized;
  });
}

function readLocalRows(key) {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv(rows, columns, filename) {
  const lines = [
    columns.map(([, label]) => csvCell(label)).join(","),
    ...rows.map((row) => columns.map(([key]) => csvCell(row[key])).join(",")),
  ];
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function statusClass(status) {
  if (status === "Согласовано" || status === "Ответили") return "is-positive";
  if (status === "Отказ") return "is-negative";
  if (["Отправлено", "Переговоры", "В работе"].includes(status)) return "is-active";
  if (["Заполнено", "Контакт найден", "Подготовка", "Исследование"].includes(status)) return "is-ready";
  if (status === "Мониторинг") return "is-monitoring";
  return "is-idle";
}

export default function MlmGatewayTracker() {
  const [activeView, setActiveView] = useState("companies");
  const [companySeedRows, setCompanySeedRows] = useState([]);
  const [companyRows, setCompanyRows] = useState([]);
  const [platformSeedRows, setPlatformSeedRows] = useState([]);
  const [platformRows, setPlatformRows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все статусы");
  const [regionFilter, setRegionFilter] = useState("Все рынки");
  const [companySaveState, setCompanySaveState] = useState("Загрузка...");
  const [platformSaveState, setPlatformSaveState] = useState("Загрузка...");
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [platformsLoaded, setPlatformsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/data/mlm-gateway-companies.json").then((response) => response.json()),
      loadServerContent(COMPANY_STORAGE_KEY),
    ]).then(([rawSeed, savedRows]) => {
      if (!mounted) return;
      const normalized = Array.isArray(rawSeed) ? normalizeCompanyRows(rawSeed) : [];
      const localRows = readLocalRows(COMPANY_STORAGE_KEY);
      const source = Array.isArray(savedRows) && savedRows.length ? savedRows : localRows;
      setCompanySeedRows(normalized);
      setCompanyRows(hydrateRows(source, normalized));
      setCompanySaveState(Array.isArray(savedRows) ? "Сохранено на сервере" : "Готово к работе");
      setCompaniesLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      setCompanyRows(readLocalRows(COMPANY_STORAGE_KEY) || []);
      setCompanySaveState("Локальные данные");
      setCompaniesLoaded(true);
    });

    Promise.all([
      fetch("/data/mlm-industry-platforms.json").then((response) => response.json()),
      loadServerContent(PLATFORM_STORAGE_KEY),
    ]).then(([rawSeed, savedRows]) => {
      if (!mounted) return;
      const normalized = Array.isArray(rawSeed) ? rawSeed.map(normalizePlatformSeed) : [];
      const localRows = readLocalRows(PLATFORM_STORAGE_KEY);
      const source = Array.isArray(savedRows) && savedRows.length ? savedRows : localRows;
      setPlatformSeedRows(normalized);
      setPlatformRows(hydrateRows(source, normalized));
      setPlatformSaveState(Array.isArray(savedRows) ? "Сохранено на сервере" : "Готово к работе");
      setPlatformsLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      setPlatformRows(readLocalRows(PLATFORM_STORAGE_KEY) || []);
      setPlatformSaveState("Локальные данные");
      setPlatformsLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!companiesLoaded) return undefined;
    setCompanySaveState("Сохраняю...");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(companyRows));
      } catch {
        // Серверное сохранение остаётся основным.
      }
      saveServerContent(COMPANY_STORAGE_KEY, companyRows).then((saved) => {
        setCompanySaveState(saved ? "Сохранено на сервере" : "Сохранено локально");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [companiesLoaded, companyRows]);

  useEffect(() => {
    if (!platformsLoaded) return undefined;
    setPlatformSaveState("Сохраняю...");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(platformRows));
      } catch {
        // Серверное сохранение остаётся основным.
      }
      saveServerContent(PLATFORM_STORAGE_KEY, platformRows).then((saved) => {
        setPlatformSaveState(saved ? "Сохранено на сервере" : "Сохранено локально");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [platformRows, platformsLoaded]);

  useEffect(() => {
    setQuery("");
    setStatusFilter("Все статусы");
    setRegionFilter("Все рынки");
  }, [activeView]);

  const marketOptions = useMemo(() => {
    const values = activeView === "companies"
      ? companyRows.map((row) => row.country)
      : platformRows.map((row) => row.region);
    return [
      "Все рынки",
      ...Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    ];
  }, [activeView, companyRows, platformRows]);

  const visibleCompanyRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return companyRows.filter((row) => {
      if (statusFilter !== "Все статусы" && row.status !== statusFilter) return false;
      if (regionFilter !== "Все рынки" && row.country !== regionFilter) return false;
      if (!search) return true;
      return [row.company, row.country, row.category, row.memberType, row.notes, row.responsible]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [companyRows, query, regionFilter, statusFilter]);

  const visiblePlatformRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return platformRows.filter((row) => {
      if (statusFilter !== "Все статусы" && row.status !== statusFilter) return false;
      if (regionFilter !== "Все рынки" && row.region !== regionFilter) return false;
      if (!search) return true;
      return [row.name, row.category, row.region, row.purpose, row.atlasAction, row.nextAction, row.notes, row.responsible]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [platformRows, query, regionFilter, statusFilter]);

  const stats = useMemo(() => {
    if (activeView === "companies") {
      return [
        ["ВСЕГО В БАЗЕ", companyRows.length, "компании"],
        ["ЗАПОЛНЕНО", companyRows.filter((row) => row.status === "Заполнено").length, "готово к отправке"],
        ["ОТПРАВЛЕНО", companyRows.filter((row) => ["Отправлено", "Ответили", "Переговоры", "Согласовано"].includes(row.status)).length, "контактов"],
        ["ЕСТЬ ОТВЕТ", companyRows.filter((row) => ["Ответили", "Переговоры", "Согласовано"].includes(row.status)).length, "диалогов"],
      ];
    }
    return [
      ["ВСЕГО ПЛОЩАДОК", platformRows.length, "каналов роста"],
      ["ПРИОРИТЕТ A", platformRows.filter((row) => row.priority === "A").length, "сделать первыми"],
      ["В РАБОТЕ", platformRows.filter((row) => ["Подготовка", "Исследование", "В работе", "Контакт найден", "Отправлено", "Ответили", "Переговоры", "Согласовано"].includes(row.status)).length, "активных действий"],
      ["ЕСТЬ РЕЗУЛЬТАТ", platformRows.filter((row) => ["Ответили", "Переговоры", "Согласовано"].includes(row.status)).length, "диалогов"],
    ];
  }, [activeView, companyRows, platformRows]);

  const visibleRows = activeView === "companies" ? visibleCompanyRows : visiblePlatformRows;
  const totalRows = activeView === "companies" ? companyRows.length : platformRows.length;
  const saveState = activeView === "companies" ? companySaveState : platformSaveState;
  const statuses = activeView === "companies" ? COMPANY_STATUS_OPTIONS : PLATFORM_STATUS_OPTIONS;

  function updateCompanyRow(id, patch) {
    setCompanyRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updatePlatformRow(id, patch) {
    setPlatformRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (activeView === "companies") {
      setCompanyRows((current) => [{
        id: `mlmg-custom-${Date.now()}`,
        company: "Новая компания",
        country: "Не указана",
        category: "Не указана",
        memberType: "Custom",
        joinFee: "Не указана",
        contactUrl: "",
        profileUrl: "",
        status: "Не начато",
        priority: "Средний",
        responsible: "",
        notes: "",
        verifiedAt: new Date().toISOString().slice(0, 10),
      }, ...current]);
      return;
    }
    setPlatformRows((current) => [{
      id: `platform-custom-${Date.now()}`,
      name: "Новая площадка",
      category: "Не указана",
      region: "Global",
      priority: "C",
      purpose: "",
      atlasAction: "",
      website: "",
      contactUrl: "",
      status: "Не начато",
      responsible: "",
      nextAction: "",
      notes: "",
      verifiedAt: new Date().toISOString().slice(0, 10),
    }, ...current]);
  }

  function downloadCsv() {
    if (activeView === "companies") {
      exportCsv(visibleCompanyRows, [
        ["company", "Компания"], ["country", "Страна"], ["category", "Категория"],
        ["memberType", "Тип участника"], ["joinFee", "Вход"], ["status", "Статус"],
        ["priority", "Приоритет"], ["responsible", "Ответственный"], ["notes", "Комментарий"],
        ["contactUrl", "Контакт"], ["profileUrl", "Профиль"],
      ], "atlas-mlm-gateway-companies.csv");
      return;
    }
    exportCsv(visiblePlatformRows, [
      ["name", "Площадка"], ["category", "Категория"], ["region", "Регион"],
      ["priority", "Приоритет"], ["status", "Статус"], ["responsible", "Ответственный"],
      ["purpose", "Назначение"], ["atlasAction", "Действие Atlas"], ["nextAction", "Следующий шаг"],
      ["website", "Сайт"], ["contactUrl", "Контакт"], ["notes", "Примечание"],
    ], "atlas-mlm-industry-platforms.csv");
  }

  return (
    <section className="mlmg-tracker">
      <header className="mlmg-hero">
        <div className="mlmg-brand">
          <span className="mlmg-brand-mark"><Sparkles size={20} /></span>
          <div>
            <small>ATLAS OUTREACH LEDGER</small>
            <strong>MLM Growth Directory</strong>
          </div>
        </div>
        <div className="mlmg-hero-copy">
          <p>International network directory</p>
          <h1>Компании, лидеры<br />и площадки роста</h1>
          <span>Контакты, статусы и следующие действия собраны в одной рабочей базе и сохраняются автоматически.</span>
        </div>
        <div className="mlmg-hero-actions">
          <button type="button" onClick={addRow}><Plus size={17} /> Добавить</button>
          <button type="button" onClick={downloadCsv}><Download size={17} /> Скачать CSV</button>
        </div>
      </header>

      <section className="mlmg-listing-card">
        <div className="mlmg-listing-icon"><Check size={24} /></div>
        <div>
          <small>НАШЕ РАЗМЕЩЕНИЕ</small>
          <h2>Atlas System</h2>
          <p>Business Opportunity опубликована. Первая статья отправлена на ручную модерацию MLM Gateway.</p>
        </div>
        <div className="mlmg-listing-meta">
          <span><Check size={14} /> Профиль заполнен</span>
          <span><Check size={14} /> Карточка добавлена</span>
          <span><Send size={14} /> Статья: Pending Review · 05.08.2026</span>
          <span className="mlmg-vault-note">Пароль хранится в SuperSUS Vault</span>
        </div>
        <a href="https://www.mlmgateway.com/announcementscenter.php" target="_blank" rel="noreferrer">
          Проверить модерацию <ArrowUpRight size={16} />
        </a>
      </section>

      <nav className="mlmg-view-switch" aria-label="Разделы базы">
        <button type="button" className={activeView === "companies" ? "is-active" : ""} onClick={() => setActiveView("companies")} aria-pressed={activeView === "companies"}>
          <span>Компании MLM Gateway</span><strong>{companyRows.length}</strong>
        </button>
        <button type="button" className={activeView === "platforms" ? "is-active" : ""} onClick={() => setActiveView("platforms")} aria-pressed={activeView === "platforms"}>
          <span>Площадки продвижения</span><strong>{platformRows.length}</strong>
        </button>
      </nav>

      <section className="mlmg-stats" aria-label="Сводка по базе">
        {stats.map(([label, value, note]) => (
          <article key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></article>
        ))}
      </section>

      <section className="mlmg-table-panel">
        <div className="mlmg-toolbar">
          <div>
            <h2>{activeView === "companies" ? "Компании и контакты" : "Площадки продвижения"}</h2>
            <p>{visibleRows.length} из {totalRows} · {saveState}</p>
          </div>
          <label className="mlmg-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeView === "companies" ? "Компания, страна, ответственный..." : "Площадка, категория, задача..."} />
          </label>
          <label className="mlmg-select">
            <Filter size={16} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>Все статусы</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          <label className="mlmg-select">
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
              {marketOptions.map((market) => <option key={market}>{market}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
        </div>

        <div className="mlmg-table-scroll">
          {activeView === "companies" ? (
            <table className="mlmg-table mlmg-company-table">
              <thead>
                <tr>
                  <th>Компания</th><th>Рынок</th><th>Вход</th><th>Статус</th>
                  <th>Приоритет</th><th>Ответственный</th><th>Комментарий</th><th>Контакт</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanyRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input className="mlmg-cell-title" value={row.company} onChange={(event) => updateCompanyRow(row.id, { company: event.target.value })} />
                      <span>{row.memberType}</span>
                      {row.riskFlag ? <em>Проверить обещания</em> : null}
                    </td>
                    <td>
                      <input value={row.country} onChange={(event) => updateCompanyRow(row.id, { country: event.target.value })} />
                      <input value={row.category} onChange={(event) => updateCompanyRow(row.id, { category: event.target.value })} />
                    </td>
                    <td><input value={row.joinFee} onChange={(event) => updateCompanyRow(row.id, { joinFee: event.target.value })} /></td>
                    <td>
                      <select className={`mlmg-status ${statusClass(row.status)}`} value={row.status} onChange={(event) => updateCompanyRow(row.id, { status: event.target.value })}>
                        {COMPANY_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={row.priority} onChange={(event) => updateCompanyRow(row.id, { priority: event.target.value })}>
                        {COMPANY_PRIORITY_OPTIONS.map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </td>
                    <td><input value={row.responsible} onChange={(event) => updateCompanyRow(row.id, { responsible: event.target.value })} placeholder="Назначить" /></td>
                    <td><textarea value={row.notes} onChange={(event) => updateCompanyRow(row.id, { notes: event.target.value })} placeholder="Что отправили, что ответили..." /></td>
                    <td>
                      {row.contactUrl ? <a href={row.contactUrl} target="_blank" rel="noreferrer"><Send size={15} /> Написать</a> : null}
                      {row.profileUrl ? <a href={row.profileUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> Профиль</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="mlmg-table mlmg-platform-table">
              <thead>
                <tr>
                  <th>Площадка</th><th>Регион</th><th>Приоритет</th><th>Статус</th>
                  <th>Ответственный</th><th>Для Atlas</th><th>Следующий шаг</th><th>Ссылки</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlatformRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input className="mlmg-cell-title" value={row.name} onChange={(event) => updatePlatformRow(row.id, { name: event.target.value })} />
                      <input value={row.category} onChange={(event) => updatePlatformRow(row.id, { category: event.target.value })} />
                    </td>
                    <td><input value={row.region} onChange={(event) => updatePlatformRow(row.id, { region: event.target.value })} /></td>
                    <td>
                      <select className={`mlmg-priority is-${row.priority.toLowerCase()}`} value={row.priority} onChange={(event) => updatePlatformRow(row.id, { priority: event.target.value })}>
                        {PLATFORM_PRIORITY_OPTIONS.map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className={`mlmg-status ${statusClass(row.status)}`} value={row.status} onChange={(event) => updatePlatformRow(row.id, { status: event.target.value })}>
                        {PLATFORM_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </td>
                    <td><input value={row.responsible} onChange={(event) => updatePlatformRow(row.id, { responsible: event.target.value })} placeholder="Назначить" /></td>
                    <td>
                      <p className="mlmg-purpose">{row.purpose}</p>
                      <textarea value={row.atlasAction} onChange={(event) => updatePlatformRow(row.id, { atlasAction: event.target.value })} placeholder="Что делаем на площадке" />
                    </td>
                    <td>
                      <textarea value={row.nextAction} onChange={(event) => updatePlatformRow(row.id, { nextAction: event.target.value })} placeholder="Конкретный следующий шаг" />
                      <textarea className="mlmg-notes" value={row.notes} onChange={(event) => updatePlatformRow(row.id, { notes: event.target.value })} placeholder="Примечание" />
                    </td>
                    <td>
                      {row.contactUrl ? <a href={row.contactUrl} target="_blank" rel="noreferrer"><Send size={15} /> Контакт</a> : null}
                      {row.website ? <a href={row.website} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> Сайт</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!visibleRows.length ? <div className="mlmg-empty">По выбранным фильтрам записей нет.</div> : null}
        </div>
      </section>
      <footer className="mlmg-footer">
        <span>{activeView === "companies" ? "Источник: MLM Gateway · проверено 4 августа 2026" : "Глобальный реестр MLM-площадок · актуализировано 6 августа 2026"}</span>
        <span>{activeView === "companies" ? companySeedRows.length : platformSeedRows.length} исходных записей</span>
      </footer>
    </section>
  );
}
