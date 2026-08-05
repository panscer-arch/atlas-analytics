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

const STORAGE_KEY = "atlas.analytics.mlmGateway.outreach.v1";
const LOCAL_KEY = STORAGE_KEY;
const STATUS_OPTIONS = [
  "Не начато",
  "Контакт найден",
  "Заполнено",
  "Отправлено",
  "Ответили",
  "Переговоры",
  "Согласовано",
  "Отказ",
];
const PRIORITY_OPTIONS = ["Высокий", "Средний", "Низкий"];

function normalizeSeed(row, index) {
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

function hydrateRows(saved, seed) {
  if (!Array.isArray(saved) || !saved.length) return seed;
  const seedById = new Map(seed.map((row) => [row.id, row]));
  const hydrated = saved.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const ids = new Set(hydrated.map((row) => row.id));
  return [...hydrated, ...seed.filter((row) => !ids.has(row.id))];
}

function readLocalRows() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "null");
  } catch {
    return null;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv(rows) {
  const columns = [
    ["company", "Компания"],
    ["country", "Страна"],
    ["category", "Категория"],
    ["memberType", "Тип участника"],
    ["joinFee", "Вход"],
    ["status", "Статус"],
    ["priority", "Приоритет"],
    ["responsible", "Ответственный"],
    ["notes", "Комментарий"],
    ["contactUrl", "Контакт"],
    ["profileUrl", "Профиль"],
  ];
  const lines = [
    columns.map(([, label]) => csvCell(label)).join(","),
    ...rows.map((row) => columns.map(([key]) => csvCell(row[key])).join(",")),
  ];
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-mlm-gateway-outreach.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function statusClass(status) {
  if (status === "Согласовано" || status === "Ответили") return "is-positive";
  if (status === "Отказ") return "is-negative";
  if (status === "Отправлено" || status === "Переговоры") return "is-active";
  if (status === "Заполнено" || status === "Контакт найден") return "is-ready";
  return "is-idle";
}

export default function MlmGatewayTracker() {
  const [seedRows, setSeedRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все статусы");
  const [countryFilter, setCountryFilter] = useState("Все страны");
  const [saveState, setSaveState] = useState("Загрузка...");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/data/mlm-gateway-companies.json").then((response) => response.json()),
      loadServerContent(STORAGE_KEY),
    ]).then(([rawSeed, savedRows]) => {
      if (!mounted) return;
      const normalized = Array.isArray(rawSeed) ? rawSeed.map(normalizeSeed) : [];
      const localRows = readLocalRows();
      const source = Array.isArray(savedRows) && savedRows.length ? savedRows : localRows;
      const hydrated = hydrateRows(source, normalized);
      setSeedRows(normalized);
      setRows(hydrated);
      setSaveState(Array.isArray(savedRows) ? "Сохранено на сервере" : "Готово к работе");
      setIsLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      const localRows = readLocalRows() || [];
      setRows(localRows);
      setSaveState("Локальные данные");
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    setSaveState("Сохраняю...");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
      } catch {
        // Серверное сохранение остаётся основным.
      }
      saveServerContent(STORAGE_KEY, rows).then((saved) => {
        setSaveState(saved ? "Сохранено на сервере" : "Сохранено локально");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  const countries = useMemo(() => [
    "Все страны",
    ...Array.from(new Set(rows.map((row) => row.country).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
  ], [rows]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "Все статусы" && row.status !== statusFilter) return false;
      if (countryFilter !== "Все страны" && row.country !== countryFilter) return false;
      if (!search) return true;
      return [row.company, row.country, row.category, row.memberType, row.notes, row.responsible]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [countryFilter, query, rows, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    prepared: rows.filter((row) => row.status === "Заполнено").length,
    sent: rows.filter((row) => ["Отправлено", "Ответили", "Переговоры", "Согласовано"].includes(row.status)).length,
    replies: rows.filter((row) => ["Ответили", "Переговоры", "Согласовано"].includes(row.status)).length,
  }), [rows]);

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [{
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
  }

  return (
    <section className="mlmg-tracker">
      <header className="mlmg-hero">
        <div className="mlmg-brand">
          <span className="mlmg-brand-mark"><Sparkles size={20} /></span>
          <div>
            <small>ATLAS OUTREACH LEDGER</small>
            <strong>MLM Gateway</strong>
          </div>
        </div>
        <div className="mlmg-hero-copy">
          <p>International network directory</p>
          <h1>Контакты, отправки<br />и ответы в одном месте</h1>
          <span>Редактируй статусы прямо в таблице. Все изменения сохраняются автоматически.</span>
        </div>
        <div className="mlmg-hero-actions">
          <button type="button" onClick={addRow}><Plus size={17} /> Добавить</button>
          <button type="button" onClick={() => exportCsv(visibleRows)}><Download size={17} /> Скачать CSV</button>
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

      <section className="mlmg-stats" aria-label="Сводка по базе">
        <article><small>ВСЕГО В БАЗЕ</small><strong>{stats.total}</strong><span>компании</span></article>
        <article><small>ЗАПОЛНЕНО</small><strong>{stats.prepared}</strong><span>готово к отправке</span></article>
        <article><small>ОТПРАВЛЕНО</small><strong>{stats.sent}</strong><span>контактов</span></article>
        <article><small>ЕСТЬ ОТВЕТ</small><strong>{stats.replies}</strong><span>диалогов</span></article>
      </section>

      <section className="mlmg-table-panel">
        <div className="mlmg-toolbar">
          <div>
            <h2>Компании и контакты</h2>
            <p>{visibleRows.length} из {rows.length} · {saveState}</p>
          </div>
          <label className="mlmg-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Компания, страна, ответственный..." />
          </label>
          <label className="mlmg-select">
            <Filter size={16} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>Все статусы</option>
              {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          <label className="mlmg-select">
            <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
              {countries.map((country) => <option key={country}>{country}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
        </div>

        <div className="mlmg-table-scroll">
          <table className="mlmg-table">
            <thead>
              <tr>
                <th>Компания</th>
                <th>Рынок</th>
                <th>Вход</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>Ответственный</th>
                <th>Комментарий</th>
                <th>Контакт</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input className="mlmg-cell-title" value={row.company} onChange={(event) => updateRow(row.id, { company: event.target.value })} />
                    <span>{row.memberType}</span>
                    {row.riskFlag ? <em>Проверить обещания</em> : null}
                  </td>
                  <td>
                    <input value={row.country} onChange={(event) => updateRow(row.id, { country: event.target.value })} />
                    <input value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value })} />
                  </td>
                  <td><input value={row.joinFee} onChange={(event) => updateRow(row.id, { joinFee: event.target.value })} /></td>
                  <td>
                    <select className={`mlmg-status ${statusClass(row.status)}`} value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })}>
                      {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={row.priority} onChange={(event) => updateRow(row.id, { priority: event.target.value })}>
                      {PRIORITY_OPTIONS.map((priority) => <option key={priority}>{priority}</option>)}
                    </select>
                  </td>
                  <td><input value={row.responsible} onChange={(event) => updateRow(row.id, { responsible: event.target.value })} placeholder="Назначить" /></td>
                  <td><textarea value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} placeholder="Что отправили, что ответили..." /></td>
                  <td>
                    {row.contactUrl ? <a href={row.contactUrl} target="_blank" rel="noreferrer"><Send size={15} /> Написать</a> : null}
                    {row.profileUrl ? <a href={row.profileUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> Профиль</a> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleRows.length ? <div className="mlmg-empty">По выбранным фильтрам записей нет.</div> : null}
        </div>
      </section>
      <footer className="mlmg-footer">
        <span>Источник: MLM Gateway · проверено 4 августа 2026</span>
        <span>{seedRows.length} исходных записей</span>
      </footer>
    </section>
  );
}
