import { useEffect, useMemo, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { getServerJson, loadServerContent, postServerJson, saveServerContent } from "../services/contentStore";
import {
  ATLAS_FUNNEL_STORAGE_KEY,
  defaultAtlasFunnel,
  funnelStatusOptions,
  itemStatusOptions,
} from "../data/atlasFunnelData";
import {
  ATLAS_FUNNEL_PILOT_URL,
  atlasFunnelPilotQuestions,
  atlasFunnelPilotSegments,
} from "../data/atlasFunnelPilotData";
import {
  buildAtlasFunnelMarkdown,
  calculateFunnelStats,
  calculateMetricRows,
  hydrateAtlasFunnel,
} from "../utils/atlasFunnelUtils";
import "./AtlasFunnelBoard.css";

const WORKSPACE_TABS = [
  { id: "map", label: "Карта" },
  { id: "content", label: "Контент" },
  { id: "segments", label: "Сегменты" },
  { id: "build", label: "Сборка" },
  { id: "metrics", label: "Метрики" },
  { id: "test", label: "Тест" },
];

const EXPERIMENT_STATUS_OPTIONS = ["Очередь", "Готов к тесту", "Запущен", "Победитель найден", "Остановлен"];
const PILOT_LEAD_STATUS_OPTIONS = [
  { id: "new", label: "Новая" },
  { id: "contacted", label: "Связались" },
  { id: "qualified", label: "Подтверждена" },
  { id: "closed", label: "Завершена" },
  { id: "rejected", label: "Отклонена" },
];
const PILOT_SOURCE_LABELS = Object.fromEntries(
  atlasFunnelPilotQuestions.find((question) => question.id === "source")?.options
    .map((option) => [option.id, option.label]) || [],
);

function readStoredFunnel() {
  if (typeof window === "undefined") return hydrateAtlasFunnel(defaultAtlasFunnel);
  try {
    const saved = window.localStorage.getItem(ATLAS_FUNNEL_STORAGE_KEY);
    return hydrateAtlasFunnel(saved ? JSON.parse(saved) : defaultAtlasFunnel);
  } catch {
    return hydrateAtlasFunnel(defaultAtlasFunnel);
  }
}

function statusTone(status) {
  if (status === "Готово" || status === "Запущен" || status === "Победитель найден") return "ready";
  if (status === "В работе" || status === "Пилот" || status === "На вычитке" || status === "Готов к тесту") return "work";
  if (status === "Заблокировано" || status === "Остановлен") return "blocked";
  return "todo";
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Field({ value, onChange, editMode, multiline = false, className = "", label }) {
  if (!editMode) {
    return <div className={`atlas-funnel-read-value ${className}`}>{value || "Не заполнено"}</div>;
  }

  const Component = multiline ? "textarea" : "input";
  return (
    <label className={`atlas-funnel-field ${className}`}>
      {label ? <span>{label}</span> : null}
      <Component value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StatusSelect({ value, onChange, editMode, options = itemStatusOptions }) {
  if (!editMode) {
    return <span className={`atlas-funnel-status atlas-funnel-status-${statusTone(value)}`}>{value || "Не начато"}</span>;
  }

  return (
    <select className="atlas-funnel-select" value={value || options[0]} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}

function AtlasFunnelBoard() {
  const [funnel, setFunnel] = useState(readStoredFunnel);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка...");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "map";
    const requestedTab = new URL(window.location.href).searchParams.get("funnelTab");
    return WORKSPACE_TABS.some((tab) => tab.id === requestedTab) ? requestedTab : "map";
  });
  const [editMode, setEditMode] = useState(false);
  const [copyState, setCopyState] = useState("idle");
  const [simulatorSegmentId, setSimulatorSegmentId] = useState("web3-new");
  const [simulatorStep, setSimulatorStep] = useState(0);
  const [simulatorEvents, setSimulatorEvents] = useState([]);
  const [pilotSummary, setPilotSummary] = useState(null);
  const [pilotSummaryState, setPilotSummaryState] = useState("idle");
  const [pilotLeadUpdateId, setPilotLeadUpdateId] = useState("");
  const saveRequestRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve(true));
  const skipInitialAutoSaveRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    loadServerContent(ATLAS_FUNNEL_STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      const hydrated = hydrateAtlasFunnel(saved || readStoredFunnel());
      setFunnel(hydrated);
      setSaveState(saved ? "Загружено с сервера" : "Сохранится после первой правки");
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    if (skipInitialAutoSaveRef.current) {
      skipInitialAutoSaveRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      const requestId = saveRequestRef.current + 1;
      saveRequestRef.current = requestId;
      const next = { ...funnel, updatedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(ATLAS_FUNNEL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Серверная запись ниже остаётся основным хранилищем.
      }
      setSaveState("Сохраняю...");
      const ok = await enqueueServerSave(next);
      if (saveRequestRef.current === requestId) {
        setSaveState(ok ? "Сохранено на сервере" : "Сохранено локально, сервер недоступен");
      }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [funnel, isLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextTab = WORKSPACE_TABS.some((tab) => tab.id === activeTab) ? activeTab : "map";
    const url = new URL(window.location.href);
    url.searchParams.set("board", "funnel");
    url.searchParams.set("funnelTab", nextTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "metrics" || pilotSummaryState !== "idle") return;
    void refreshPilotSummary();
  }, [activeTab, pilotSummaryState]);

  const stats = useMemo(() => calculateFunnelStats(funnel), [funnel]);
  const metricRows = useMemo(() => calculateMetricRows(funnel.metrics), [funnel.metrics]);
  const markdown = useMemo(() => buildAtlasFunnelMarkdown(funnel), [funnel]);
  const simulatorSegment = funnel.segments.find((item) => item.id === simulatorSegmentId) || funnel.segments[0];
  const simulatorMessage = funnel.sequence[simulatorStep] || funnel.sequence[0];

  function updateMeta(field, value) {
    setFunnel((current) => ({ ...current, meta: { ...current.meta, [field]: value } }));
  }

  function updateCollection(collection, id, field, value) {
    setFunnel((current) => ({
      ...current,
      [collection]: current[collection].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  }

  function enqueueServerSave(next) {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => false)
      .then(() => saveServerContent(ATLAS_FUNNEL_STORAGE_KEY, next));
    return saveQueueRef.current;
  }

  async function forceSave() {
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    const next = { ...funnel, updatedAt: new Date().toISOString() };
    setSaveState("Сохраняю...");
    try {
      window.localStorage.setItem(ATLAS_FUNNEL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Серверная запись всё равно выполняется.
    }
    const ok = await enqueueServerSave(next);
    if (saveRequestRef.current === requestId) setSaveState(ok ? "Сохранено на сервере" : "Сохранено локально, сервер недоступен");
  }

  async function refreshPilotSummary() {
    setPilotSummaryState("loading");
    const result = await getServerJson("/api/funnel/summary");
    if (result.ok) {
      setPilotSummary(result.payload);
      setPilotSummaryState("ready");
      return;
    }
    setPilotSummaryState("unavailable");
  }

  async function updatePilotLeadStatus(leadId, status) {
    setPilotLeadUpdateId(leadId);
    const result = await postServerJson("/api/funnel/leads/status", { leadId, status });
    if (result.ok) {
      setPilotSummary((current) => ({
        ...current,
        leads: {
          ...current?.leads,
          recent: (current?.leads?.recent || []).map((lead) => (
            lead.id === leadId ? { ...lead, status } : lead
          )),
        },
      }));
      await refreshPilotSummary();
    }
    setPilotLeadUpdateId("");
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
    }
  }

  function addSimulatorEvent(eventName, label) {
    setSimulatorEvents((current) => [
      ...current,
      {
        id: `${eventName}-${Date.now()}`,
        event: eventName,
        label,
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
    ]);
  }

  function startSimulator() {
    setSimulatorStep(0);
    setSimulatorEvents([]);
    window.setTimeout(() => addSimulatorEvent("funnel_started", "Маршрут начат"), 0);
  }

  function nextSimulatorStep() {
    const nextIndex = Math.min(simulatorStep + 1, funnel.sequence.length - 1);
    setSimulatorStep(nextIndex);
    const nextMessage = funnel.sequence[nextIndex];
    addSimulatorEvent(nextIndex === funnel.sequence.length - 1 ? "route_completed" : `step_${nextIndex}_opened`, nextMessage?.title || "Следующий шаг");
  }

  function handleSimulatorPrimaryAction() {
    if (simulatorStep === funnel.sequence.length - 1) {
      addSimulatorEvent("qualified_action", simulatorSegment.cta);
      return;
    }
    nextSimulatorStep();
  }

  return (
    <section className="atlas-funnel-board" aria-busy={!isLoaded}>
      <header className="atlas-funnel-header">
        <div className="atlas-funnel-header-copy">
          <span className="analytics-kicker">Первая воронка Atlas</span>
          {editMode ? (
            <input
              className="atlas-funnel-title-input"
              value={funnel.meta.name}
              onChange={(event) => updateMeta("name", event.target.value)}
              aria-label="Название воронки"
            />
          ) : (
            <h2>{funnel.meta.name}</h2>
          )}
          <Field
            value={funnel.meta.promise}
            onChange={(value) => updateMeta("promise", value)}
            editMode={editMode}
            multiline
            className="atlas-funnel-header-promise"
            label="Обещание маршрута"
          />
          <div className="atlas-funnel-meta-line">
            <span>Канал: <b>{funnel.meta.primaryChannel}</b></span>
            <span>Владелец: <b>{funnel.meta.owner}</b></span>
            <span>Запуск: <b>{funnel.meta.launchDate || "после пилота"}</b></span>
          </div>
        </div>
        <div className="atlas-funnel-header-actions">
          <StatusSelect value={funnel.meta.status} onChange={(value) => updateMeta("status", value)} editMode={editMode} options={funnelStatusOptions} />
          <AnalyticsActionButton
            variant={editMode ? "warning" : "primary"}
            onClick={() => setEditMode((current) => !current)}
            disabled={!isLoaded}
          >
            {editMode ? "Закончить редактирование" : "Редактировать"}
          </AnalyticsActionButton>
          <AnalyticsActionButton onClick={forceSave} disabled={!isLoaded}>Сохранить</AnalyticsActionButton>
          <AnalyticsActionButton
            variant="primary"
            onClick={() => window.open(ATLAS_FUNNEL_PILOT_URL, "_blank", "noopener,noreferrer")}
          >
            Открыть пилот
          </AnalyticsActionButton>
          <AnalyticsActionButton onClick={copyMarkdown}>
            {copyState === "copied" ? "Скопировано" : copyState === "error" ? "Не скопировано" : "Копировать ТЗ"}
          </AnalyticsActionButton>
          <AnalyticsActionButton onClick={() => downloadTextFile("atlas-web3-start-funnel.md", markdown)}>Скачать MD</AnalyticsActionButton>
          <small>{saveState}</small>
        </div>
      </header>

      <div className="atlas-funnel-kpis" aria-label="Готовность воронки">
        <div>
          <span>Launch gate</span>
          <strong>{stats.readiness}%</strong>
          <small>{stats.completedGates} из {stats.requiredGates} проверок</small>
        </div>
        <div>
          <span>Материалы</span>
          <strong>{stats.readyAssets}/{stats.totalAssets}</strong>
          <small>готово к пилоту</small>
        </div>
        <div>
          <span>Сообщения</span>
          <strong>{stats.approvedMessages}/{stats.totalMessages}</strong>
          <small>согласовано</small>
        </div>
        <div>
          <span>Первый тест</span>
          <strong>30–50</strong>
          <small>тёплых контактов</small>
        </div>
      </div>

      <nav className="atlas-funnel-tabs" aria-label="Разделы воронки">
        {WORKSPACE_TABS.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "map" ? (
        <div className="atlas-funnel-workspace">
          <section className="atlas-funnel-strategy">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Стратегия v1</span>
                <h3>Начинаем с Telegram и тёплой аудитории</h3>
              </div>
              <p>Сначала проверяем связку на реальных людях, затем усиливаем контентом и только после подтверждённой конверсии включаем платный трафик.</p>
            </div>
            <div className="atlas-funnel-strategy-grid">
              <div>
                <b>Для кого</b>
                <Field value={funnel.meta.audience} onChange={(value) => updateMeta("audience", value)} editMode={editMode} multiline />
              </div>
              <div>
                <b>Цель</b>
                <Field value={funnel.meta.goal} onChange={(value) => updateMeta("goal", value)} editMode={editMode} multiline />
              </div>
              <div>
                <b>Главная метрика</b>
                <Field value={funnel.meta.northStar} onChange={(value) => updateMeta("northStar", value)} editMode={editMode} multiline />
              </div>
              <div>
                <b>Не входит в первую версию</b>
                <Field value={funnel.meta.nonGoal} onChange={(value) => updateMeta("nonGoal", value)} editMode={editMode} multiline />
              </div>
              <div className="atlas-funnel-strategy-wide">
                <b>Гипотеза</b>
                <Field value={funnel.meta.hypothesis} onChange={(value) => updateMeta("hypothesis", value)} editMode={editMode} multiline />
              </div>
            </div>
            {editMode ? (
              <div className="atlas-funnel-meta-editor">
                <Field label="Основной канал" value={funnel.meta.primaryChannel} onChange={(value) => updateMeta("primaryChannel", value)} editMode />
                <Field label="Источники трафика" value={funnel.meta.trafficSources} onChange={(value) => updateMeta("trafficSources", value)} editMode />
                <Field label="Ответственный" value={funnel.meta.owner} onChange={(value) => updateMeta("owner", value)} editMode />
                <Field label="Дата пилота" value={funnel.meta.launchDate} onChange={(value) => updateMeta("launchDate", value)} editMode />
              </div>
            ) : null}
          </section>

          <section className="atlas-funnel-map-section">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Путь человека</span>
                <h3>От первого касания до осознанного действия</h3>
              </div>
              <p>Проценты — рабочие цели перехода между шагами пилота, а не обещание результата.</p>
            </div>
            <div className="atlas-funnel-map">
              {funnel.stages.map((stage, index) => (
                <article key={stage.id} className="atlas-funnel-stage">
                  <div className="atlas-funnel-stage-top">
                    <span>{String(stage.order).padStart(2, "0")}</span>
                    <StatusSelect value={stage.status} onChange={(value) => updateCollection("stages", stage.id, "status", value)} editMode={editMode} />
                  </div>
                  <small>{stage.label}</small>
                  <h4>{stage.title}</h4>
                  <Field value={stage.description} onChange={(value) => updateCollection("stages", stage.id, "description", value)} editMode={editMode} multiline />
                  <div className="atlas-funnel-stage-action">{stage.action}</div>
                  <div className="atlas-funnel-stage-event">
                    <code>{stage.event}</code>
                    <b>{index === 0 ? "Старт" : `${stage.targetRate}% цель`}</b>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="atlas-funnel-patterns">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Что взято из сильных решений</span>
                <h3>Готовые механики, адаптированные под Atlas</h3>
              </div>
            </div>
            <div className="atlas-funnel-pattern-grid">
              <a href="https://docs.mautic.org/en/7.0/campaigns/campaign_builder.html" target="_blank" rel="noreferrer">
                <b>Mautic</b><span>Действия, решения, условия и отрицательные ветки.</span>
              </a>
              <a href="https://docs.typebot.com/editor/blocks/logic/webhook" target="_blank" rel="noreferrer">
                <b>Typebot</b><span>Разговорная сегментация, A/B и webhook-ready блоки.</span>
              </a>
              <a href="https://n8n.io/workflows/9700-capture-and-store-crm-contacts-with-telegram-and-gemini-ai/" target="_blank" rel="noreferrer">
                <b>n8n</b><span>Telegram-вход, проверка данных и автоматическая маршрутизация.</span>
              </a>
              <a href="https://posthog.com/docs/product-analytics/funnels" target="_blank" rel="noreferrer">
                <b>PostHog</b><span>События, воронки и измерение реальной активации.</span>
              </a>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "content" ? (
        <div className="atlas-funnel-workspace">
          <section className="atlas-funnel-sequence-intro">
            <div>
              <span className="analytics-kicker">Готовая серия</span>
              <h3>6 шагов без давления и пустого прогрева</h3>
              <p>Каждый шаг даёт самостоятельную пользу, добавляет проверяемый факт и ведёт только к одному следующему действию.</p>
            </div>
            <div className="atlas-funnel-guardrail">
              <b>Фильтр формулировок</b>
              <span>Нельзя: гарантированный доход, вклад, стабильная выплата, без риска.</span>
              <span>Можно: расчётная дельта, Claim, условия Smart Cycle, доступная ликвидность, добровольное участие.</span>
            </div>
          </section>
          <div className="atlas-funnel-sequence">
            {funnel.sequence.map((item) => (
              <article key={item.id}>
                <header>
                  <div>
                    <span>{item.day}</span>
                    <h3>{item.title}</h3>
                    <small>{item.format}</small>
                  </div>
                  <div>
                    <StatusSelect value={item.status} onChange={(value) => updateCollection("sequence", item.id, "status", value)} editMode={editMode} />
                    <label className="atlas-funnel-approval">
                      <input
                        type="checkbox"
                        checked={Boolean(item.approved)}
                        onChange={(event) => updateCollection("sequence", item.id, "approved", event.target.checked)}
                        disabled={!editMode}
                      />
                      <span>Согласовано</span>
                    </label>
                  </div>
                </header>
                <div className="atlas-funnel-sequence-grid">
                  <div>
                    <b>Задача шага</b>
                    <Field value={item.purpose} onChange={(value) => updateCollection("sequence", item.id, "purpose", value)} editMode={editMode} multiline />
                  </div>
                  <div className="atlas-funnel-hook">
                    <b>Hook</b>
                    <Field value={item.hook} onChange={(value) => updateCollection("sequence", item.id, "hook", value)} editMode={editMode} multiline />
                  </div>
                  <div className="atlas-funnel-body-copy">
                    <b>Содержание</b>
                    <Field value={item.body} onChange={(value) => updateCollection("sequence", item.id, "body", value)} editMode={editMode} multiline />
                  </div>
                  <div>
                    <b>Доказательство</b>
                    <Field value={item.proof} onChange={(value) => updateCollection("sequence", item.id, "proof", value)} editMode={editMode} multiline />
                  </div>
                </div>
                <footer>
                  <span>CTA</span>
                  <Field value={item.cta} onChange={(value) => updateCollection("sequence", item.id, "cta", value)} editMode={editMode} />
                  {editMode ? (
                    <Field label="Комментарий" value={item.comment} onChange={(value) => updateCollection("sequence", item.id, "comment", value)} editMode multiline />
                  ) : item.comment ? <em>{item.comment}</em> : null}
                </footer>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "segments" ? (
        <div className="atlas-funnel-workspace">
          <section className="atlas-funnel-section-head atlas-funnel-section-head-standalone">
            <div>
              <span>Ветка определяется в начале</span>
              <h3>Один вход, четыре разных маршрута</h3>
            </div>
            <p>Человек видит общий фундамент Atlas, но порядок доказательств, язык и финальная кнопка соответствуют его задаче.</p>
          </section>
          <div className="atlas-funnel-segments">
            {funnel.segments.map((segment) => (
              <article key={segment.id}>
                <header>
                  <span>{segment.priority}</span>
                  <h3>{segment.title}</h3>
                  <small>Lead score: {segment.score}/5</small>
                </header>
                <div>
                  <b>Сигнал</b>
                  <Field value={segment.signal} onChange={(value) => updateCollection("segments", segment.id, "signal", value)} editMode={editMode} multiline />
                </div>
                <div>
                  <b>Задача человека</b>
                  <Field value={segment.job} onChange={(value) => updateCollection("segments", segment.id, "job", value)} editMode={editMode} multiline />
                </div>
                <div>
                  <b>Главный барьер</b>
                  <Field value={segment.barrier} onChange={(value) => updateCollection("segments", segment.id, "barrier", value)} editMode={editMode} multiline />
                </div>
                <div>
                  <b>Маршрут</b>
                  <Field value={segment.route} onChange={(value) => updateCollection("segments", segment.id, "route", value)} editMode={editMode} multiline />
                </div>
                <div>
                  <b>Что доказываем</b>
                  <Field value={segment.proof} onChange={(value) => updateCollection("segments", segment.id, "proof", value)} editMode={editMode} multiline />
                </div>
                <footer>
                  <span>CTA</span>
                  <Field value={segment.cta} onChange={(value) => updateCollection("segments", segment.id, "cta", value)} editMode={editMode} />
                </footer>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "build" ? (
        <div className="atlas-funnel-workspace">
          <section className="atlas-funnel-build-section">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Production backlog</span>
                <h3>Что нужно собрать до пилота</h3>
              </div>
              <p>Воронка считается собранной только тогда, когда за лид-магнитом уже есть серия, доказательства, аналитика и корректная остановка сообщений.</p>
            </div>
            <div className="atlas-funnel-table-wrap">
              <table className="atlas-funnel-table">
                <thead>
                  <tr><th>Материал</th><th>Зачем нужен</th><th>Ответственный</th><th>Срок</th><th>Статус</th><th>Ссылка / заметка</th></tr>
                </thead>
                <tbody>
                  {funnel.assets.map((item) => (
                    <tr key={item.id}>
                      <td><small>{item.type}</small><b>{item.title}</b></td>
                      <td><Field value={item.purpose} onChange={(value) => updateCollection("assets", item.id, "purpose", value)} editMode={editMode} multiline /></td>
                      <td><Field value={item.owner} onChange={(value) => updateCollection("assets", item.id, "owner", value)} editMode={editMode} /></td>
                      <td><Field value={item.dueDate} onChange={(value) => updateCollection("assets", item.id, "dueDate", value)} editMode={editMode} /></td>
                      <td><StatusSelect value={item.status} onChange={(value) => updateCollection("assets", item.id, "status", value)} editMode={editMode} /></td>
                      <td>
                        <Field value={item.link} onChange={(value) => updateCollection("assets", item.id, "link", value)} editMode={editMode} />
                        <Field value={item.note} onChange={(value) => updateCollection("assets", item.id, "note", value)} editMode={editMode} multiline />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="atlas-funnel-gates">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Launch gate</span>
                <h3>Проверки перед первым реальным трафиком</h3>
              </div>
              <strong>{stats.readiness}% готово</strong>
            </div>
            <div className="atlas-funnel-gate-list">
              {funnel.checklist.map((item) => (
                <div key={item.id}>
                  <span className={`atlas-funnel-gate-check ${item.status === "Готово" ? "is-done" : ""}`}>{item.status === "Готово" ? "✓" : ""}</span>
                  <div>
                    <small>{item.gate}</small>
                    <b>{item.title}</b>
                    <p>{item.note}</p>
                  </div>
                  <Field value={item.owner} onChange={(value) => updateCollection("checklist", item.id, "owner", value)} editMode={editMode} />
                  <StatusSelect value={item.status} onChange={(value) => updateCollection("checklist", item.id, "status", value)} editMode={editMode} />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "metrics" ? (
        <div className="atlas-funnel-workspace">
          <section className="atlas-funnel-live-pilot">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Live pilot</span>
                <h3>Реальные прохождения Atlas Web3 Start</h3>
              </div>
              <AnalyticsActionButton onClick={refreshPilotSummary} disabled={pilotSummaryState === "loading"}>
                {pilotSummaryState === "loading" ? "Обновляю..." : "Обновить"}
              </AnalyticsActionButton>
            </div>
            {pilotSummary ? (
              <>
                <div className="atlas-funnel-live-kpis">
                  <div><span>Сессии</span><strong>{pilotSummary.totalSessions || 0}</strong><small>анонимных маршрутов</small></div>
                  <div><span>Начали</span><strong>{pilotSummary.uniqueSessionCounts?.funnel_started || 0}</strong><small>уникальных сессий</small></div>
                  <div><span>Завершили</span><strong>{pilotSummary.uniqueSessionCounts?.route_completed || 0}</strong><small>прошли 6 шагов</small></div>
                  <div><span>Целевое действие</span><strong>{pilotSummary.uniqueSessionCounts?.qualified_action || 0}</strong><small>перешли дальше</small></div>
                  <div><span>Заявки</span><strong>{pilotSummary.leads?.total || 0}</strong><small>переданы команде</small></div>
                </div>
                <div className="atlas-funnel-live-segments">
                  {Object.entries(atlasFunnelPilotSegments).map(([segmentId, item]) => (
                    <div key={segmentId}>
                      <span>{item.label}</span>
                      <strong>{pilotSummary.segmentCounts?.[segmentId] || 0}</strong>
                    </div>
                  ))}
                </div>
                {Object.keys(pilotSummary.sourceCounts || {}).length ? (
                  <div className="atlas-funnel-live-sources">
                    <span>Источники сессий</span>
                    <div>
                      {Object.entries(pilotSummary.sourceCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 8)
                        .map(([source, count]) => (
                          <b key={source}>{PILOT_SOURCE_LABELS[source] || source}<strong>{count}</strong></b>
                        ))}
                    </div>
                  </div>
                ) : null}
                <div className="atlas-funnel-lead-queue">
                  <div className="atlas-funnel-lead-queue-head">
                    <div>
                      <span>Очередь заявок</span>
                      <strong>Контакты после прохождения маршрута</strong>
                    </div>
                    <small>Хранятся 180 дней · доступны только внутри SuperSUS</small>
                  </div>
                  {pilotSummary.leadNotificationsConfigured === false ? (
                    <div className="atlas-funnel-lead-telegram-setup">
                      <b>Telegram-уведомления ещё не привязаны</b>
                      <span>В основной командной группе выполните <code>/marketing_link</code>, затем добавьте бота в нужный маркетинговый чат и отправьте там <code>/marketing_here КОД</code>.</span>
                    </div>
                  ) : null}
                  {pilotSummary.leads?.recent?.length ? (
                    <div className="atlas-funnel-lead-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Получена</th>
                            <th>Сегмент</th>
                            <th>Контакт</th>
                            <th>Страна</th>
                            <th>Сообщение</th>
                            <th>Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pilotSummary.leads.recent.map((lead) => {
                            const contactHref = lead.contactMethod === "email"
                              ? `mailto:${lead.contact}`
                              : `https://t.me/${String(lead.contact || "").replace(/^@/, "")}`;
                            return (
                              <tr key={lead.id}>
                                <td>
                                  <b>{new Date(lead.createdAt).toLocaleDateString("ru-RU")}</b>
                                  <small>{new Date(lead.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</small>
                                </td>
                                <td>
                                  <b>{atlasFunnelPilotSegments[lead.segmentId]?.label || lead.segmentId}</b>
                                  <small>{lead.leadType}</small>
                                </td>
                                <td>
                                  {lead.name ? <b>{lead.name}</b> : null}
                                  <a href={contactHref} target="_blank" rel="noreferrer">{lead.contact}</a>
                                </td>
                                <td>{lead.country || "—"}</td>
                                <td className="atlas-funnel-lead-message-cell">{lead.message || "Без сообщения"}</td>
                                <td>
                                  <select
                                    value={lead.status}
                                    onChange={(event) => void updatePilotLeadStatus(lead.id, event.target.value)}
                                    disabled={pilotLeadUpdateId === lead.id}
                                  >
                                    {PILOT_LEAD_STATUS_OPTIONS.map((status) => (
                                      <option key={status.id} value={status.id}>{status.label}</option>
                                    ))}
                                  </select>
                                  <small className={`atlas-funnel-lead-notify is-${lead.notificationStatus || "pending"}`}>
                                    {lead.notificationStatus === "sent" ? "Telegram отправлен" : "Telegram ожидает"}
                                  </small>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>Заявок пока нет. После отправки формы они появятся здесь автоматически.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="atlas-funnel-live-empty">
                {pilotSummaryState === "unavailable"
                  ? "Сводка доступна после входа в SuperSUS с активной серверной сессией."
                  : "Загружаю события пилота..."}
              </p>
            )}
          </section>
          <section className="atlas-funnel-metrics-section">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Пилотная когорта</span>
                <h3>Вводим фактические числа и сразу видим отвал</h3>
              </div>
              <p>Цели ниже — стартовая гипотеза для первых 100 визитов. После пилота их нужно заменить фактической базовой линией.</p>
            </div>
            <div className="atlas-funnel-metric-bars">
              {metricRows.map((metric, index) => (
                <div key={metric.id}>
                  <span>{index + 1}</span>
                  <div>
                    <b>{metric.label}</b>
                    <small><code>{metric.event}</code> · {index === 0 ? "точка входа" : `${metric.conversion.toFixed(1)}% от прошлого шага`}</small>
                    <i style={{ width: `${Math.min(metric.targetProgress, 100)}%` }} />
                  </div>
                  {editMode ? (
                    <label><input type="number" min="0" value={metric.current} onChange={(event) => updateCollection("metrics", metric.id, "current", numberValue(event.target.value))} /><small>факт</small></label>
                  ) : <strong>{metric.current}</strong>}
                  {editMode ? (
                    <label><input type="number" min="0" value={metric.target} onChange={(event) => updateCollection("metrics", metric.id, "target", numberValue(event.target.value))} /><small>цель</small></label>
                  ) : <em>цель {metric.target}</em>}
                </div>
              ))}
            </div>
          </section>

          <section className="atlas-funnel-experiments">
            <div className="atlas-funnel-section-head">
              <div>
                <span>Experiment backlog</span>
                <h3>Что тестируем после первого пилота</h3>
              </div>
              <p>За один тест меняется только одна гипотеза, а решение принимается по событию, не по ощущениям.</p>
            </div>
            <div className="atlas-funnel-experiment-grid">
              {funnel.experiments.map((experiment) => (
                <article key={experiment.id}>
                  <header>
                    <h4>{experiment.title}</h4>
                    <StatusSelect value={experiment.status} onChange={(value) => updateCollection("experiments", experiment.id, "status", value)} editMode={editMode} options={EXPERIMENT_STATUS_OPTIONS} />
                  </header>
                  <b>Гипотеза</b>
                  <Field value={experiment.hypothesis} onChange={(value) => updateCollection("experiments", experiment.id, "hypothesis", value)} editMode={editMode} multiline />
                  <div className="atlas-funnel-variants">
                    <span><small>A</small>{experiment.variantA}</span>
                    <span><small>B</small>{experiment.variantB}</span>
                  </div>
                  <code>{experiment.metric}</code>
                  {editMode ? <Field label="Результат" value={experiment.result} onChange={(value) => updateCollection("experiments", experiment.id, "result", value)} editMode multiline /> : experiment.result ? <p>{experiment.result}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "test" ? (
        <div className="atlas-funnel-workspace">
          <section className="atlas-funnel-test">
            <div className="atlas-funnel-test-controls">
              <span className="analytics-kicker">Dry run</span>
              <h3>Пройдите маршрут как пользователь</h3>
              <p>Этот прогон проверяет логику ветки и события до подключения внешней автоматизации.</p>
              <label>
                <span>Роль пользователя</span>
                <select value={simulatorSegmentId} onChange={(event) => {
                  setSimulatorSegmentId(event.target.value);
                  setSimulatorStep(0);
                  setSimulatorEvents([]);
                }}>
                  {funnel.segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.title}</option>)}
                </select>
              </label>
              <div className="atlas-funnel-test-profile">
                <b>{simulatorSegment.title}</b>
                <span>{simulatorSegment.job}</span>
                <small>Финальный CTA: {simulatorSegment.cta}</small>
              </div>
              <AnalyticsActionButton variant="primary" onClick={startSimulator}>Начать заново</AnalyticsActionButton>
            </div>
            <div className="atlas-funnel-test-phone">
              <div className="atlas-funnel-phone-top">
                <span>Atlas Web3 Start</span>
                <b>{simulatorMessage.day}</b>
              </div>
              <div className="atlas-funnel-phone-progress">
                <i style={{ width: `${((simulatorStep + 1) / funnel.sequence.length) * 100}%` }} />
              </div>
              <div className="atlas-funnel-phone-message">
                <small>{simulatorMessage.purpose}</small>
                <h4>{simulatorMessage.title}</h4>
                <strong>{simulatorMessage.hook}</strong>
                <p>{simulatorMessage.body}</p>
                <div><b>Проверка</b><span>{simulatorMessage.proof}</span></div>
              </div>
              <button type="button" onClick={handleSimulatorPrimaryAction}>
                {simulatorStep === funnel.sequence.length - 1 ? simulatorSegment.cta : simulatorMessage.cta}
              </button>
            </div>
            <div className="atlas-funnel-test-log">
              <span className="analytics-kicker">Event log</span>
              <h3>События тестовой сессии</h3>
              {simulatorEvents.length ? (
                simulatorEvents.map((item) => (
                  <div key={item.id}><time>{item.time}</time><code>{item.event}</code><span>{item.label}</span></div>
                ))
              ) : (
                <p>Нажмите «Начать заново» и пройдите шаги. Здесь появятся события, которые должна получить аналитика.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default AtlasFunnelBoard;
