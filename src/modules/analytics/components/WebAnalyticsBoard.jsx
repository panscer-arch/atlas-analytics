import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Eye,
  Flame,
  LockKeyhole,
  MousePointerClick,
  PlayCircle,
} from "lucide-react";
import { useState } from "react";
import GoogleAnalyticsBoard from "./GoogleAnalyticsBoard";

const CLARITY_PROJECT_ID = "y9w7xdh0dw";
const CLARITY_BASE_URL = `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}`;
const RYBBIT_SITE_ID = "9620a8e74f69";
const RYBBIT_DASHBOARD_URL = "https://app.rybbit.io/16955/main";

const PROVIDERS = [
  {
    id: "ga4",
    label: "Google Analytics",
    shortLabel: "GA4",
    description: "Источники, реклама и общая динамика",
    status: "Подключено",
    tone: "success",
  },
  {
    id: "clarity",
    label: "Microsoft Clarity",
    shortLabel: "Clarity",
    description: "Записи, клики, карты и AI-сводки",
    status: "Подключено",
    tone: "success",
  },
  {
    id: "rybbit",
    label: "Rybbit",
    shortLabel: "Rybbit",
    description: "Простые воронки и отчёты через AI",
    status: "Подключено",
    tone: "success",
  },
];

function ProviderSwitch({ activeProvider, onChange }) {
  return (
    <section className="analytics-surface web-analytics-provider-shell" aria-label="Источники веб-аналитики">
      <div className="web-analytics-heading">
        <div>
          <span className="analytics-kicker">Atlas System · единый обзор</span>
          <h2>Аналитика сайта</h2>
          <p>Выберите сервис под конкретный вопрос. Данные разных систем не смешиваются.</p>
        </div>
        <span className="web-analytics-domain">atlas-system.tech</span>
      </div>

      <div className="web-analytics-switch" role="tablist" aria-label="Сервис аналитики">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            role="tab"
            aria-selected={activeProvider === provider.id}
            className={`web-analytics-provider${activeProvider === provider.id ? " is-active" : ""}`}
            onClick={() => onChange(provider.id)}
          >
            <span className="web-analytics-provider-copy">
              <strong>{provider.label}</strong>
              <small>{provider.description}</small>
            </span>
            <span className={`web-analytics-status is-${provider.tone}`}>{provider.status}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ToolLink({ href, icon: Icon, label, detail }) {
  return (
    <a className="web-analytics-tool-link" href={href} target="_blank" rel="noreferrer">
      <span className="web-analytics-tool-icon"><Icon size={20} /></span>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <ExternalLink size={17} aria-hidden="true" />
    </a>
  );
}

function ClarityBoard() {
  return (
    <div className="web-analytics-provider-board" data-testid="clarity-analytics-board">
      <section className="analytics-surface web-analytics-provider-header is-clarity">
        <div className="web-analytics-provider-logo"><Eye size={25} /></div>
        <div>
          <span className="analytics-kicker">Microsoft Clarity · поведение пользователей</span>
          <h2>Смотреть, где люди останавливаются</h2>
          <p>Счётчик {CLARITY_PROJECT_ID} работает на atlas-system.tech через Cloudflare Zaraz. Новые сессии поступают прямо в проект Clarity.</p>
        </div>
        <a className="web-analytics-primary-link" href={`${CLARITY_BASE_URL}/dashboard`} target="_blank" rel="noreferrer">
          Открыть Clarity <ExternalLink size={16} />
        </a>
      </section>

      <section className="web-analytics-summary-grid">
        <article className="analytics-surface web-analytics-summary-card is-success">
          <CheckCircle2 size={21} />
          <span><strong>Проект подключён</strong><small>Atlas System — Public Site</small></span>
        </article>
        <article className="analytics-surface web-analytics-summary-card is-success">
          <MousePointerClick size={21} />
          <span><strong>Счётчик активен</strong><small>Clarity загружается через Cloudflare Zaraz</small></span>
        </article>
        <article className="analytics-surface web-analytics-summary-card">
          <LockKeyhole size={21} />
          <span><strong>Безопасный режим</strong><small>Конфиденциальный текст должен быть замаскирован</small></span>
        </article>
      </section>

      <section className="web-analytics-tools-grid">
        <ToolLink href={`${CLARITY_BASE_URL}/recordings`} icon={PlayCircle} label="Записи сессий" detail="Посмотреть путь реального пользователя" />
        <ToolLink href={`${CLARITY_BASE_URL}/heatmaps`} icon={Flame} label="Тепловые карты" detail="Клики, прокрутка и зоны внимания" />
        <ToolLink href={`${CLARITY_BASE_URL}/dashboard`} icon={BrainCircuit} label="AI-сводки" detail="Быстрые выводы по поведению" />
        <ToolLink href={`${CLARITY_BASE_URL}/gettingstarted`} icon={MousePointerClick} label="Статус подключения" detail="Проверить поступление новых сессий" />
      </section>

      <section className="analytics-surface web-analytics-explainer">
        <div><span className="analytics-kicker">Когда открывать Clarity</span><h3>Если нужно понять «почему»</h3></div>
        <ul>
          <li>Почему посетитель нажал Participate, но не продолжил.</li>
          <li>Где люди теряются на мобильной версии.</li>
          <li>Какие кнопки нажимают несколько раз из-за непонятного состояния.</li>
        </ul>
      </section>
    </div>
  );
}

function RybbitBoard() {
  return (
    <div className="web-analytics-provider-board" data-testid="rybbit-analytics-board">
      <section className="analytics-surface web-analytics-provider-header is-rybbit">
        <div className="web-analytics-provider-logo"><BarChart3 size={25} /></div>
        <div>
          <span className="analytics-kicker">Rybbit · понятные воронки</span>
          <h2>Простая аналитика без интерфейса GA</h2>
          <p>Standard trial активен. Счётчик {RYBBIT_SITE_ID} работает на atlas-system.tech через Cloudflare Zaraz, первое событие уже получено.</p>
        </div>
        <a className="web-analytics-primary-link" href={RYBBIT_DASHBOARD_URL} target="_blank" rel="noreferrer">
          Открыть Rybbit <ExternalLink size={16} />
        </a>
      </section>

      <section className="web-analytics-summary-grid">
        <article className="analytics-surface web-analytics-summary-card is-success">
          <CheckCircle2 size={21} />
          <span><strong>Счётчик активен</strong><small>Site ID {RYBBIT_SITE_ID}</small></span>
        </article>
        <article className="analytics-surface web-analytics-summary-card is-success">
          <BarChart3 size={21} />
          <span><strong>Standard подключён</strong><small>100 000 событий · до 5 сайтов</small></span>
        </article>
        <article className="analytics-surface web-analytics-summary-card">
          <LockKeyhole size={21} />
          <span><strong>Trial до 5 сентября</strong><small>Затем €136,46 в год до отмены</small></span>
        </article>
      </section>

      <section className="analytics-surface web-analytics-explainer">
        <div><span className="analytics-kicker">Что уже доступно</span><h3>Один понятный источник для воронок</h3></div>
        <ul>
          <li>Источник → Participate → кошелёк → выбранный план → Smart Cycle.</li>
          <li>Страны, устройства, UTM-метки, ошибки и пути пользователей.</li>
          <li>Вопросы к данным обычным языком через read-only MCP.</li>
        </ul>
        <p className="web-analytics-note">Официальный Rybbit MCP доступен отдельно. Постоянный AI-доступ пока не выдавался и требует отдельного подтверждения.</p>
      </section>
    </div>
  );
}

export default function WebAnalyticsBoard() {
  const [activeProvider, setActiveProvider] = useState("ga4");

  return (
    <div className="web-analytics-board" data-testid="web-analytics-board">
      <ProviderSwitch activeProvider={activeProvider} onChange={setActiveProvider} />
      {activeProvider === "ga4" ? <GoogleAnalyticsBoard /> : null}
      {activeProvider === "clarity" ? <ClarityBoard /> : null}
      {activeProvider === "rybbit" ? <RybbitBoard /> : null}
    </div>
  );
}
