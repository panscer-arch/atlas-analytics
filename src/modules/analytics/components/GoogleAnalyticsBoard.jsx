import {
  Activity,
  BarChart3,
  Clock3,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getServerJson, unlockMarketingContent } from "../services/contentStore";

const RANGE_OPTIONS = [
  { id: "1d", label: "24 часа" },
  { id: "7d", label: "7 дней" },
  { id: "28d", label: "28 дней" },
  { id: "90d", label: "90 дней" },
];

const numberFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatPercent(value, alreadyPercent = false) {
  return `${percentFormatter.format(Number(value || 0) * (alreadyPercent ? 1 : 100))}%`;
}

function formatDuration(value) {
  const seconds = Math.max(0, Math.round(Number(value || 0)));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(value) {
  const raw = String(value || "");
  if (!/^\d{8}$/.test(raw)) return raw;
  return `${raw.slice(6, 8)}.${raw.slice(4, 6)}`;
}

function formatGeneratedAt(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "нет данных";
  return parsed.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ChangeBadge({ value }) {
  const numeric = Number(value || 0);
  const tone = numeric > 0.05 ? "positive" : numeric < -0.05 ? "negative" : "neutral";
  return (
    <span className={`ga4-change is-${tone}`}>
      {numeric > 0 ? "+" : ""}{formatPercent(numeric, true)}
    </span>
  );
}

function Metric({ icon: Icon, label, value, detail, change }) {
  return (
    <div className="ga4-metric">
      <div className="ga4-metric-head">
        <span className="ga4-metric-icon"><Icon size={18} strokeWidth={1.9} /></span>
        <span>{label}</span>
        {typeof change === "number" ? <ChangeBadge value={change} /> : null}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function EmptyConnection({ propertyId }) {
  return (
    <section className="analytics-surface ga4-connection" data-testid="ga4-connection-state">
      <div className="ga4-connection-icon"><ShieldCheck size={28} /></div>
      <div>
        <span className="analytics-kicker">Read-only подключение</span>
        <h2>Google Analytics ещё не подключён к SuperSUS</h2>
        <p>
          Экран готов для GA4 property {propertyId || "546276265"}. Нужен сервисный аккаунт с ролью Viewer;
          ключ хранится только в секрете сервера.
        </p>
      </div>
    </section>
  );
}

function AccessGate({ onUnlocked }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!password.trim()) return;
    setStatus("Проверяю...");
    const result = await unlockMarketingContent(password);
    if (!result.ok) {
      setStatus(result.status === 401 ? "Неверный пароль" : "Не удалось проверить пароль");
      return;
    }
    setPassword("");
    setStatus("");
    onUnlocked();
  }

  return (
    <section className="analytics-surface ga4-access" data-testid="ga4-access-gate">
      <div className="ga4-connection-icon"><ShieldCheck size={28} /></div>
      <div>
        <span className="analytics-kicker">Внутренняя аналитика</span>
        <h2>Введите общий пароль SuperSUS</h2>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль"
            autoComplete="current-password"
            aria-label="Пароль SuperSUS"
          />
          <button type="submit">Открыть</button>
        </form>
        {status ? <p>{status}</p> : null}
      </div>
    </section>
  );
}

function DataTable({ title, rows, columns }) {
  return (
    <section className="analytics-surface ga4-table-section">
      <div className="ga4-section-head">
        <h3>{title}</h3>
        <span>{rows.length} строк</span>
      </div>
      <div className="ga4-table-scroll">
        <table className="ga4-table">
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || index}>
                {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function GoogleAnalyticsBoard() {
  const [range, setRange] = useState("28d");
  const [state, setState] = useState({ loading: true, payload: null, error: "", accessRequired: false });

  const loadData = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "", accessRequired: false }));
    const result = await getServerJson(`/api/content/google-analytics?range=${range}`);
    if (result.ok) {
      setState({ loading: false, payload: result.payload, error: "", accessRequired: false });
      return;
    }
    if (result.status === 401) {
      setState({ loading: false, payload: null, error: "", accessRequired: true });
      return;
    }
    if (result.payload?.configured === false) {
      setState({ loading: false, payload: result.payload, error: "", accessRequired: false });
      return;
    }
    setState({
      loading: false,
      payload: result.payload || null,
      error: result.payload?.error || "Не удалось получить данные Google Analytics",
      accessRequired: false,
    });
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const payload = state.payload;
  const trend = useMemo(() => (payload?.trend || []).map((row) => ({ ...row, label: formatDate(row.date) })), [payload]);

  if (state.accessRequired) {
    return <AccessGate onUnlocked={loadData} />;
  }

  if (!state.loading && payload?.configured === false) {
    return <EmptyConnection propertyId={payload.propertyId} />;
  }

  return (
    <div className="ga4-board" data-testid="google-analytics-board">
      <section className="analytics-surface ga4-toolbar">
        <div className="ga4-title">
          <span className="ga4-google-mark" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <span className="analytics-kicker">GA4 · Atlas System</span>
            <h2>Google Analytics</h2>
            <p>Property {payload?.propertyId || "546276265"} · обновлено {formatGeneratedAt(payload?.generatedAt)}</p>
          </div>
        </div>
        <div className="ga4-toolbar-actions">
          <div className="ga4-ranges" role="tablist" aria-label="Период Google Analytics">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={range === option.id ? "is-active" : ""}
                onClick={() => setRange(option.id)}
                aria-selected={range === option.id}
                role="tab"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="ga4-refresh" onClick={loadData} disabled={state.loading} title="Обновить данные" aria-label="Обновить данные">
            <RefreshCw size={18} className={state.loading ? "is-spinning" : ""} />
          </button>
          <a className="ga4-open" href="https://analytics.google.com/analytics/web/#/p546276265/reports/intelligenthome" target="_blank" rel="noreferrer" title="Открыть Google Analytics" aria-label="Открыть Google Analytics">
            <ExternalLink size={18} />
          </a>
        </div>
      </section>

      {state.error ? (
        <section className="analytics-surface ga4-error" role="alert">
          <strong>Google Analytics временно недоступен</strong>
          <span>{state.error}</span>
          <button type="button" onClick={loadData}>Повторить</button>
        </section>
      ) : null}

      {state.loading && !payload ? (
        <section className="analytics-surface ga4-loading"><RefreshCw className="is-spinning" size={22} /> Получаю живые данные GA4...</section>
      ) : null}

      {payload?.ok ? (
        <>
          <section className="ga4-metrics" aria-label="Основные показатели">
            <Metric icon={Users} label="Активные пользователи" value={formatNumber(payload.current.activeUsers)} detail={`${formatNumber(payload.current.newUsers)} новых`} change={payload.changes.activeUsers} />
            <Metric icon={BarChart3} label="Сессии" value={formatNumber(payload.current.sessions)} detail={`${formatNumber(payload.current.engagedSessions)} вовлечённых`} change={payload.changes.sessions} />
            <Metric icon={Activity} label="Вовлечение" value={formatPercent(payload.current.engagementRate)} detail={`${formatNumber(payload.current.eventCount)} событий`} change={payload.changes.engagementRate} />
            <Metric icon={Clock3} label="Активное время" value={formatDuration(payload.current.averageEngagementSeconds)} detail="на активного пользователя" />
            <Metric icon={Activity} label="Ключевые события" value={formatNumber(payload.current.keyEvents)} detail={`${formatNumber(payload.current.screenPageViews)} просмотров`} change={payload.changes.keyEvents} />
            <Metric icon={Users} label="Сейчас на сайте" value={formatNumber(payload.realtime.activeUsers)} detail="последние 30 минут" />
          </section>

          <section className="ga4-primary-grid">
            <div className="analytics-surface ga4-chart-section">
              <div className="ga4-section-head">
                <div><span className="analytics-kicker">Динамика</span><h3>Сессии и активные пользователи</h3></div>
                <span>{payload.rangeLabel}</span>
              </div>
              <div className="ga4-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ga4Sessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff9d32" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="#ff9d32" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(157,178,255,.09)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#8fa3c0", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                    <YAxis tick={{ fill: "#8fa3c0", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#111a28", border: "1px solid rgba(255,157,50,.28)", borderRadius: 8, color: "#f6f9ff" }} />
                    <Area type="monotone" dataKey="sessions" name="Сессии" stroke="#ff9d32" strokeWidth={2.2} fill="url(#ga4Sessions)" />
                    <Area type="monotone" dataKey="activeUsers" name="Активные" stroke="#5ff0bf" strokeWidth={1.8} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="analytics-surface ga4-insights">
              <div className="ga4-section-head">
                <div><span className="analytics-kicker">Расшифровка</span><h3>Что означают цифры</h3></div>
                <span>автоанализ</span>
              </div>
              <div className="ga4-insight-list">
                {payload.insights.map((insight, index) => (
                  <article key={`${insight.title}-${index}`} className={`ga4-insight is-${insight.tone}`}>
                    <i aria-hidden="true" />
                    <div><strong>{insight.title}</strong><p>{insight.text}</p></div>
                  </article>
                ))}
              </div>
              <p className="ga4-caveat">{payload.caveat}</p>
            </div>
          </section>

          <section className="ga4-tables-grid">
            <DataTable
              title="Источники трафика"
              rows={payload.sources}
              columns={[
                { key: "source", label: "Источник / канал", render: (row) => row.sessionSourceMedium || "(not set)" },
                { key: "sessions", label: "Сессии", render: (row) => formatNumber(row.sessions) },
                { key: "engagement", label: "Вовлечение", render: (row) => formatPercent(row.engagementRate) },
                { key: "events", label: "Ключевые", render: (row) => formatNumber(row.keyEvents) },
              ]}
            />
            <DataTable
              title="Посадочные страницы"
              rows={payload.landingPages}
              columns={[
                { key: "page", label: "Страница входа", render: (row) => <span className="ga4-path">{row.landingPagePlusQueryString || "/"}</span> },
                { key: "sessions", label: "Сессии", render: (row) => formatNumber(row.sessions) },
                { key: "engagement", label: "Вовлечение", render: (row) => formatPercent(row.engagementRate) },
                { key: "events", label: "Ключевые", render: (row) => formatNumber(row.keyEvents) },
              ]}
            />
            <DataTable
              title="География"
              rows={payload.countries}
              columns={[
                { key: "country", label: "Страна", render: (row) => row.country || "Не определено" },
                { key: "users", label: "Пользователи", render: (row) => formatNumber(row.activeUsers) },
                { key: "sessions", label: "Сессии", render: (row) => formatNumber(row.sessions) },
                { key: "engagement", label: "Вовлечение", render: (row) => formatPercent(row.engagementRate) },
              ]}
            />
            <DataTable
              title="Устройства"
              rows={payload.devices}
              columns={[
                { key: "device", label: "Устройство", render: (row) => row.deviceCategory || "Не определено" },
                { key: "users", label: "Пользователи", render: (row) => formatNumber(row.activeUsers) },
                { key: "sessions", label: "Сессии", render: (row) => formatNumber(row.sessions) },
              ]}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
