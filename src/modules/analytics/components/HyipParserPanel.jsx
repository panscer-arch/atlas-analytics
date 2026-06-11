import { useMemo, useState } from "react";

const COUNTRY_OPTIONS = ["Все страны", "Россия", "Казахстан", "Украина", "Беларусь", "Индия", "Индонезия", "Вьетнам", "Бразилия", "Турция"];
const STATUS_OPTIONS = ["Все статусы", "Новый", "Проверить", "Готов к контакту", "В работе", "Не подходит"];
const STORAGE_KEY = "atlas.analytics.hyipParserLeads.v1";

const defaultLeads = [
  {
    id: "lead-hyipblock",
    name: "HYIPBlock",
    country: "Россия",
    url: "https://hyipblock.ru",
    category: "HYIP monitor",
    trafficScore: 84,
    aliveScore: 91,
    fitScore: 88,
    contacts: "contact@hyipblock.ru, Telegram: @hyipblock",
    status: "Готов к контакту",
    lastSeen: "2 ч назад",
    notes: "Похож на целевой монитор: рейтинги, листинги, новости проектов.",
  },
  {
    id: "lead-profit-hunters",
    name: "Profit Hunters",
    country: "Россия",
    url: "https://profit-hunters.example",
    category: "monitor / community",
    trafficScore: 72,
    aliveScore: 78,
    fitScore: 74,
    contacts: "Telegram на странице контактов",
    status: "Проверить",
    lastSeen: "5 ч назад",
    notes: "Нужно вручную подтвердить активность и рекламные форматы.",
  },
  {
    id: "lead-asia-yield-watch",
    name: "Asia Yield Watch",
    country: "Индонезия",
    url: "https://asia-yield-watch.example",
    category: "regional monitor",
    trafficScore: 66,
    aliveScore: 82,
    fitScore: 69,
    contacts: "WhatsApp указан в футере",
    status: "Новый",
    lastSeen: "сегодня",
    notes: "Региональный монитор, проверить язык размещения и требования к листингу.",
  },
  {
    id: "lead-crypto-watchlist",
    name: "Crypto Watchlist",
    country: "Турция",
    url: "https://crypto-watchlist.example",
    category: "listing directory",
    trafficScore: 58,
    aliveScore: 64,
    fitScore: 53,
    contacts: "form only",
    status: "Не подходит",
    lastSeen: "1 д назад",
    notes: "Слабая активность, мало свежих обновлений.",
  },
];

const parserStages = [
  ["Поиск", "Google/Bing/Yandex queries по стране и языку"],
  ["Классификация", "monitor, listing, forum, Telegram directory"],
  ["Контакты", "email, Telegram, WhatsApp, contact form"],
  ["Оценка", "живость, трафик, свежесть, рекламный fit"],
  ["Очередь", "передача в outreach-таблицу"],
];

function readStoredLeads() {
  if (typeof window === "undefined") return defaultLeads;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : defaultLeads;
  } catch {
    return defaultLeads;
  }
}

function getScoreTone(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "accent";
  return "danger";
}

function getStatusTone(status) {
  if (status === "Готов к контакту") return "success";
  if (status === "В работе") return "accent";
  if (status === "Не подходит") return "danger";
  return "default";
}

function makeCsv(leads) {
  const header = ["name", "country", "url", "category", "trafficScore", "aliveScore", "fitScore", "contacts", "status", "notes"];
  const rows = leads.map((lead) => header.map((key) => `"${String(lead[key] ?? "").replaceAll('"', '""')}"`).join(","));
  return [header.join(","), ...rows].join("\n");
}

function downloadLeadsCsv(leads) {
  const blob = new Blob([makeCsv(leads)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hyip-monitor-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function HyipParserPanel() {
  const [leads, setLeads] = useState(readStoredLeads);
  const [country, setCountry] = useState("Все страны");
  const [status, setStatus] = useState("Все статусы");
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(42);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const countryMatch = country === "Все страны" || lead.country === country;
    const statusMatch = status === "Все статусы" || lead.status === status;
    const search = query.trim().toLowerCase();
    const queryMatch = !search || [lead.name, lead.country, lead.url, lead.category, lead.contacts, lead.notes]
      .some((value) => String(value).toLowerCase().includes(search));
    return countryMatch && statusMatch && queryMatch;
  }), [country, leads, query, status]);

  const summary = useMemo(() => ({
    total: leads.length,
    ready: leads.filter((lead) => lead.status === "Готов к контакту").length,
    avgFit: Math.round(leads.reduce((sum, lead) => sum + lead.fitScore, 0) / Math.max(leads.length, 1)),
    contacts: leads.filter((lead) => lead.contacts && lead.contacts !== "form only").length,
  }), [leads]);

  function persist(nextLeads) {
    setLeads(nextLeads);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLeads));
    }
  }

  function updateLead(id, patch) {
    persist(leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  function startParserRun() {
    setIsRunning(true);
    setRunProgress((current) => (current >= 95 ? 18 : Math.min(current + 17, 95)));
  }

  function stopParserRun() {
    setIsRunning(false);
  }

  function addManualLead() {
    const nextLead = {
      id: `lead-${Date.now()}`,
      name: "Новая площадка",
      country: country === "Все страны" ? "Россия" : country,
      url: "https://",
      category: "HYIP monitor",
      trafficScore: 50,
      aliveScore: 50,
      fitScore: 50,
      contacts: "",
      status: "Новый",
      lastSeen: "только что",
      notes: "Добавлено вручную, нужно проверить контакты и активность.",
    };
    persist([nextLead, ...leads]);
  }

  return (
    <WrapperShell>
      <section className="analytics-parser-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Parser / HYIP monitors</p>
          <h1>Парсер HYIP-мониторов</h1>
          <p>
            Поиск рекламных площадок по странам: мониторы, листинги, форумы и комьюнити-каталоги. Модуль собирает публичные контакты,
            оценивает живость площадки и готовит лиды для аккуратного outreach.
          </p>
        </div>
        <div className="analytics-parser-run-card">
          <span>{isRunning ? "Поиск идет" : "Очередь готова"}</span>
          <strong>{runProgress}%</strong>
          <progress value={runProgress} max="100" />
          <div>
            <button type="button" onClick={startParserRun}>{isRunning ? "Продолжить поиск" : "Запустить парсер"}</button>
            <button type="button" onClick={stopParserRun}>Пауза</button>
          </div>
        </div>
      </section>

      <section className="analytics-parser-stats">
        <Metric label="Найдено площадок" value={summary.total} tone="success" />
        <Metric label="Готовы к контакту" value={summary.ready} tone="accent" />
        <Metric label="Средний fit score" value={`${summary.avgFit}%`} tone={getScoreTone(summary.avgFit)} />
        <Metric label="Есть контакты" value={summary.contacts} tone="success" />
      </section>

      <section className="analytics-parser-grid">
        <div className="analytics-parser-panel analytics-surface">
          <div className="analytics-parser-panel-head">
            <div>
              <h2>Настройки поиска</h2>
              <p>Страны, ключи и безопасный режим сбора публичных данных.</p>
            </div>
          </div>
          <div className="analytics-parser-controls">
            <label>
              Страна
              <select value={country} onChange={(event) => setCountry(event.target.value)}>
                {COUNTRY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Статус
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="analytics-parser-wide">
              Поиск / ключевые слова
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="hyip monitor, profit monitor, listing..." />
            </label>
          </div>
          <div className="analytics-parser-stage-list">
            {parserStages.map(([title, text], index) => (
              <article key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="analytics-parser-panel analytics-parser-rules analytics-surface">
          <h2>Что должен считать парсер</h2>
          <ul>
            <li>Только публичные страницы и контакты: email, Telegram, WhatsApp, contact form.</li>
            <li>Без обхода капчи, авторизации, paywall и запретов robots.txt.</li>
            <li>Оценка живости: свежие посты, обновления листингов, соцсети, индексируемость.</li>
            <li>Оценка пригодности: страна, язык, рекламные форматы, похожесть аудитории.</li>
            <li>Перед контактом нужен ручной review текста, без обещаний гарантированной доходности.</li>
          </ul>
        </div>
      </section>

      <section className="analytics-parser-table-wrap analytics-surface">
        <div className="analytics-parser-table-head">
          <div>
            <h2>Найденные площадки</h2>
            <p>{filteredLeads.length} строк в текущем фильтре</p>
          </div>
          <div>
            <button type="button" onClick={addManualLead}>Добавить вручную</button>
            <button type="button" onClick={() => downloadLeadsCsv(filteredLeads)}>Экспорт CSV</button>
          </div>
        </div>
        <div className="analytics-parser-table-scroll">
          <table className="analytics-table analytics-parser-table">
            <thead>
              <tr>
                <th>Площадка</th>
                <th>Страна</th>
                <th>Контакты</th>
                <th>Скоринг</th>
                <th>Статус</th>
                <th>Заметки</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <input value={lead.name} onChange={(event) => updateLead(lead.id, { name: event.target.value })} />
                    <input value={lead.url} onChange={(event) => updateLead(lead.id, { url: event.target.value })} />
                    <small>{lead.category} · {lead.lastSeen}</small>
                  </td>
                  <td>
                    <select value={lead.country} onChange={(event) => updateLead(lead.id, { country: event.target.value })}>
                      {COUNTRY_OPTIONS.filter((item) => item !== "Все страны").map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td>
                    <textarea value={lead.contacts} onChange={(event) => updateLead(lead.id, { contacts: event.target.value })} rows="3" />
                  </td>
                  <td>
                    <Score label="Traffic" value={lead.trafficScore} />
                    <Score label="Alive" value={lead.aliveScore} />
                    <Score label="Fit" value={lead.fitScore} />
                  </td>
                  <td>
                    <select className={`analytics-parser-status analytics-parser-status-${getStatusTone(lead.status)}`} value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value })}>
                      {STATUS_OPTIONS.filter((item) => item !== "Все статусы").map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td>
                    <textarea value={lead.notes} onChange={(event) => updateLead(lead.id, { notes: event.target.value })} rows="4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
