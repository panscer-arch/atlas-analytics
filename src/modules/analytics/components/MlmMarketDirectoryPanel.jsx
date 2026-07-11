import { useEffect, useMemo, useState } from "react";

import {
  MLM_MARKET_DIRECTORY_STORAGE_KEY,
  MLM_MARKET_DIRECTORY_VERIFICATION_OPTIONS,
  MLM_LEADER_OUTREACH_STATUS_OPTIONS,
  defaultMlmMarketDirectoryRows,
} from "../data/mlmLeaderOutreachData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

const PAGE_SIZE = 25;

function hydrateRows(savedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return defaultMlmMarketDirectoryRows;
  const savedById = new Map(savedRows.map((row) => [row.id, row]));
  return defaultMlmMarketDirectoryRows.map((row) => ({ ...row, ...(savedById.get(row.id) || {}) }));
}

function downloadCsv(rows) {
  const cell = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
  const header = ["Рынок / компания", "Страна", "Тип", "Источник", "Источник URL", "Контактный маршрут", "Проверка", "Дата проверки", "Статус", "Приоритет", "Заметка"];
  const body = rows.map((row) => [
    row.platform, row.country, row.type, row.source, row.sourceUrl, row.contactRoute,
    row.verificationStatus, row.lastVerifiedAt, row.status, row.priority, row.notes,
  ].map(cell).join(","));
  const blob = new Blob(["\ufeff" + [header.map(cell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-mlm-markets-and-companies.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function MlmMarketDirectoryPanel() {
  const [rows, setRows] = useState(() => hydrateRows());
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Все страны");
  const [verification, setVerification] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");

  useEffect(() => {
    let active = true;
    loadServerContent(MLM_MARKET_DIRECTORY_STORAGE_KEY).then((savedRows) => {
      if (!active) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateRows(savedRows);
        setRows(hydrated);
        window.localStorage.setItem(MLM_MARKET_DIRECTORY_STORAGE_KEY, JSON.stringify(hydrated));
        setSaveState("Сохранено на сервере");
      }
      setIsLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      window.localStorage.setItem(MLM_MARKET_DIRECTORY_STORAGE_KEY, JSON.stringify(rows));
      saveServerContent(MLM_MARKET_DIRECTORY_STORAGE_KEY, rows).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  const countries = useMemo(() => ["Все страны", ...new Set(rows.map((row) => row.country).filter(Boolean).sort())], [rows]);
  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (country !== "Все страны" && row.country !== country) return false;
      if (verification !== "Все статусы" && row.verificationStatus !== verification) return false;
      return !term || [row.platform, row.country, row.type, row.source, row.notes].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [country, query, rows, verification]);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const stats = useMemo(() => ({
    total: rows.length,
    checked: rows.filter((row) => row.verificationStatus === "Проверено").length,
    countries: new Set(rows.map((row) => row.country)).size,
    ready: rows.filter((row) => row.status === "Готовить оффер").length,
  }), [rows]);

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  return (
    <section className="analytics-parser analytics-bfh-leads analytics-mlm-market-directory">
      <section className="analytics-surface analytics-bfh-leads-hero">
        <div>
          <p className="analytics-kicker">MLM / direct selling market intelligence</p>
          <h2>Компании и рынки</h2>
          <p>Карта официальных ассоциаций, реестров и каталогов. Здесь нет личных лидов: только проверяемые входы в рынки и компании.</p>
        </div>
        <div className="analytics-bfh-leads-verdict">
          <span>Правило базы</span>
          <strong>Сначала проверить</strong>
          <p>В outreach попадают только найденные отдельно публичные профили людей. Реестр компании - это точка исследования, не контакт для рассылки.</p>
        </div>
      </section>

      <section className="analytics-bfh-leads-stats">
        <article><span>Рынки</span><strong>{stats.total}</strong><small>источников и реестров</small></article>
        <article><span>Проверено</span><strong>{stats.checked}</strong><small>живых источников</small></article>
        <article><span>Страны</span><strong>{stats.countries}</strong><small>в первой волне</small></article>
        <article><span>Оффер</span><strong>{stats.ready}</strong><small>после проверки лидера</small></article>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <p className="analytics-kicker">CRM / markets and companies</p>
            <h2>Проверяемые рынки</h2>
            <p>{visibleRows.length} в фильтре · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Готово" : "Редактировать"}</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>

        <div className="analytics-parser-controls analytics-parser-controls-compact analytics-bfh-leads-controls">
          <label className="analytics-parser-wide">Поиск по стране, источнику, типу или заметке
            <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Например: India, registry, Brazil..." />
          </label>
          <label>Страна
            <select value={country} onChange={(event) => { setPage(1); setCountry(event.target.value); }}>
              {countries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Проверка
            <select value={verification} onChange={(event) => { setPage(1); setVerification(event.target.value); }}>
              <option value="Все статусы">Все статусы</option>
              {MLM_MARKET_DIRECTORY_VERIFICATION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className="analytics-bfh-leads-table-scroll">
          <table className="analytics-bfh-leads-table">
            <thead><tr><th>Рынок / компания</th><th>Источник</th><th>Контактный маршрут</th><th>Проверка</th><th>Заметка</th></tr></thead>
            <tbody>{pagedRows.map((row) => <tr key={row.id}>
              <td><strong>{row.platform}</strong><span>{row.country}</span><span>{row.type}</span></td>
              <td><a href={row.sourceUrl} target="_blank" rel="noreferrer">Открыть источник</a><p>{row.profileType} · {row.contactVisibility}</p></td>
              <td><p>{row.contactRoute}</p><span>{row.audience}</span></td>
              <td>{isEditing ? <><select value={row.verificationStatus} onChange={(event) => updateRow(row.id, { verificationStatus: event.target.value })}>{MLM_MARKET_DIRECTORY_VERIFICATION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select><select value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })}>{MLM_LEADER_OUTREACH_STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></> : <><span className={`analytics-bfh-lead-status analytics-bfh-lead-status-${row.verificationStatus === "Проверено" ? "success" : "accent"}`}>{row.verificationStatus}</span><p>Проверено: {row.lastVerifiedAt || "не указано"}</p></>}</td>
              <td>{isEditing ? <textarea value={row.notes || ""} onChange={(event) => updateRow(row.id, { notes: event.target.value })} /> : <p>{row.notes || "Добавьте результат проверки."}</p>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="analytics-bfh-leads-pagination"><span>Страница {safePage} из {totalPages}</span><div><button type="button" disabled={safePage === 1} onClick={() => setPage((value) => value - 1)}>Назад</button><button type="button" disabled={safePage === totalPages} onClick={() => setPage((value) => value + 1)}>Далее</button></div></div>
      </section>
    </section>
  );
}
