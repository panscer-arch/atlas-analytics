import { useEffect, useMemo, useState } from "react";

import {
  UNIVERSAL_SOCIAL_COLUMNS,
  UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY,
  UNIVERSAL_SOCIAL_RISK_OPTIONS,
  UNIVERSAL_SOCIAL_STATUS_OPTIONS,
  defaultUniversalSocialConnectors,
  socialParserArchitecture,
  socialParserMarketFindings,
  socialParserMvpPlan,
  socialParserTargetSegments,
} from "../data/universalSocialParserData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

function hydrateRows(savedRows, seedRows) {
  if (!Array.isArray(savedRows) || !savedRows.length) return seedRows;
  const seedById = new Map(seedRows.map((row) => [row.id, row]));
  const hydrated = savedRows.map((row) => ({ ...(seedById.get(row.id) || {}), ...row }));
  const savedIds = new Set(hydrated.map((row) => row.id));
  return [...hydrated, ...seedRows.filter((row) => !savedIds.has(row.id))];
}

function readStoredRows() {
  if (typeof window === "undefined") return defaultUniversalSocialConnectors;
  try {
    const saved = window.localStorage.getItem(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY);
    return hydrateRows(saved ? JSON.parse(saved) : null, defaultUniversalSocialConnectors);
  } catch {
    return defaultUniversalSocialConnectors;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(rows) {
  const header = UNIVERSAL_SOCIAL_COLUMNS.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) => UNIVERSAL_SOCIAL_COLUMNS.map((column) => csvCell(row[column.key])).join(","));
  const blob = new Blob(["\ufeff" + [header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-universal-social-parser.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function riskTone(risk) {
  if (risk === "Низкий") return "success";
  if (risk === "Средний") return "accent";
  return "danger";
}

function statusTone(status) {
  if (status === "MVP") return "success";
  if (status === "Исследовать" || status === "Только API") return "accent";
  if (status === "Позже") return "default";
  return "danger";
}

export default function UniversalSocialParserPanel() {
  const [rows, setRows] = useState(readStoredRows);
  const [activePlatform, setActivePlatform] = useState("Все");
  const [activeStatus, setActiveStatus] = useState("Все");
  const [query, setQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Локально");

  useEffect(() => {
    let isMounted = true;
    loadServerContent(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY).then((savedRows) => {
      if (!isMounted) return;
      if (Array.isArray(savedRows) && savedRows.length) {
        const hydrated = hydrateRows(savedRows, defaultUniversalSocialConnectors);
        setRows(hydrated);
        try {
          window.localStorage.setItem(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY, JSON.stringify(hydrated));
        } catch {
          // Страница останется рабочей в памяти браузера.
        }
        setSaveState("Сохранено на сервере");
      }
      setIsLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const timer = window.setTimeout(() => {
      setSaveState("Сохраняю...");
      try {
        window.localStorage.setItem(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY, JSON.stringify(rows));
      } catch {
        // Серверная синхронизация ниже остаётся основным контуром.
      }
      saveServerContent(UNIVERSAL_SOCIAL_PARSER_STORAGE_KEY, rows).then((ok) => {
        setSaveState(ok ? "Сохранено на сервере" : "Локально, сервер недоступен");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isLoaded, rows]);

  const platformOptions = useMemo(() => ["Все", ...rows.map((row) => row.platform)], [rows]);
  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.deleted) return false;
      if (activePlatform !== "Все" && row.platform !== activePlatform) return false;
      if (activeStatus !== "Все" && row.status !== activeStatus) return false;
      if (!search) return true;
      return UNIVERSAL_SOCIAL_COLUMNS.some((column) => String(row[column.key] || "").toLowerCase().includes(search));
    });
  }, [activePlatform, activeStatus, query, rows]);

  const stats = useMemo(() => {
    const activeRows = rows.filter((row) => !row.deleted);
    return {
      total: activeRows.length,
      mvp: activeRows.filter((row) => row.status === "MVP").length,
      highRisk: activeRows.filter((row) => row.risk === "Высокий" || row.risk === "Критичный").length,
      apiOnly: activeRows.filter((row) => row.status === "Только API").length,
    };
  }, [rows]);

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [{
      id: `social-source-${Date.now()}`,
      platform: "Новая соцсеть",
      status: "Исследовать",
      risk: "Средний",
      accessRoute: "Описать разрешённый способ доступа: API, публичные каталоги, ручной импорт, партнёрский источник.",
      targets: "Кого ищем в этой сети.",
      queries: "Ключевые слова и языки.",
      tooling: "Готовые библиотеки / API / SaaS.",
      notes: "Что проверить перед запуском коннектора.",
    }, ...current]);
  }

  return (
    <section className="analytics-parser">
      <section className="analytics-parser-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Universal Social Parser / Atlas outreach</p>
          <h1>Универсальный парсер по соцсетям</h1>
          <p>
            Единая система поиска сетевиков, лидеров мнений, crypto/Web3-аудиторий, активных предпринимателей и региональных партнёров
            через Instagram, Facebook, LinkedIn, VK, Discord, WeChat, Line, KakaoTalk, Viber, Snapchat и новые источники.
          </p>
        </div>
        <div className="analytics-parser-run-card">
          <span>Рекомендация v1</span>
          <strong>Instagram → Facebook → VK</strong>
          <progress value="42" max="100" />
          <small>Начинаем с одного коннектора, но сразу держим универсальную схему данных.</small>
        </div>
      </section>

      <section className="analytics-parser-stats">
        <article><span>Соцсетей в карте</span><strong>{stats.total}</strong><small>можно расширять</small></article>
        <article><span>MVP</span><strong>{stats.mvp}</strong><small>первые коннекторы</small></article>
        <article><span>API only</span><strong>{stats.apiOnly}</strong><small>без серого скрейпинга</small></article>
        <article><span>Высокий риск</span><strong>{stats.highRisk}</strong><small>нужна ручная/легальная схема</small></article>
      </section>

      <section className="analytics-parser-grid">
        <div className="analytics-parser-panel analytics-surface">
          <div className="analytics-parser-panel-head">
            <div>
              <h2>Как это должно работать</h2>
              <p>Не один хрупкий скрипт, а конвейер из коннекторов с единой CRM-карточкой.</p>
            </div>
          </div>
          <div className="analytics-parser-stage-list">
            {socialParserArchitecture.map((item, index) => (
              <article key={item.title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="analytics-parser-panel analytics-parser-rules analytics-surface">
          <h2>Вывод по рынку</h2>
          <ul>
            {socialParserMarketFindings.map((item) => (
              <li key={item.title}><strong>{item.title}.</strong> {item.text}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="analytics-parser-outreach analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Кого ищем</h2>
            <p>Сегменты для поиска лидеров, партнёров, комьюнити и рекламных контактов.</p>
          </div>
        </div>
        <div className="analytics-parser-outreach-grid">
          {socialParserTargetSegments.map((segment) => (
            <article key={segment}>
              <strong>{segment}</strong>
              <textarea readOnly rows="3" value={`Искать по соцсетям, странам и языкам. После нахождения: проверить активность, контактный маршрут, рекламную историю, риск и fit для Atlas.`} />
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Карта коннекторов</h2>
            <p>{visibleRows.length} источников в текущем фильтре · {saveState}</p>
          </div>
          <div>
            <button type="button" onClick={addRow}>Добавить соцсеть</button>
            <button type="button" onClick={() => downloadCsv(visibleRows)}>Экспорт CSV</button>
          </div>
        </div>
        <div className="analytics-parser-controls">
          <label>
            Соцсеть
            <select value={activePlatform} onChange={(event) => setActivePlatform(event.target.value)}>
              {platformOptions.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
          </label>
          <label>
            Статус
            <select value={activeStatus} onChange={(event) => setActiveStatus(event.target.value)}>
              {["Все", ...UNIVERSAL_SOCIAL_STATUS_OPTIONS].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="analytics-parser-wide">
            Поиск
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Instagram, MLM, airdrop, direct selling, API..." />
          </label>
        </div>
        <div className="analytics-parser-table-scroll">
          <table className="analytics-table analytics-parser-table">
            <thead>
              <tr>{UNIVERSAL_SOCIAL_COLUMNS.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input value={row.platform} onChange={(event) => updateRow(row.id, { platform: event.target.value })} />
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${statusTone(row.status)}`} value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })}>
                      {UNIVERSAL_SOCIAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${riskTone(row.risk)}`} value={row.risk} onChange={(event) => updateRow(row.id, { risk: event.target.value })}>
                      {UNIVERSAL_SOCIAL_RISK_OPTIONS.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
                    </select>
                  </td>
                  <td><textarea value={row.accessRoute} onChange={(event) => updateRow(row.id, { accessRoute: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.targets} onChange={(event) => updateRow(row.id, { targets: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.queries} onChange={(event) => updateRow(row.id, { queries: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.tooling} onChange={(event) => updateRow(row.id, { tooling: event.target.value })} rows="4" /></td>
                  <td><textarea value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} rows="4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="analytics-parser-outreach analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>MVP-план</h2>
            <p>Делаем быстро, но так, чтобы добавление новых соцсетей не ломало систему.</p>
          </div>
        </div>
        <div className="analytics-parser-outreach-grid">
          {socialParserMvpPlan.map((item) => (
            <article key={item.phase}>
              <strong>{item.phase}: {item.title}</strong>
              <textarea readOnly rows="4" value={item.result} />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

