import { useEffect, useMemo, useState } from "react";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import Wrapper from "./Wrapper";
import { loadServerContentResult, saveServerContent } from "../services/contentStore";
import { mergeRecordsById, resolveSharedRecords } from "../utils/sharedContentMigration";

const IDEAS_STORAGE_KEY = "analytics-idea-capture-v1";
const BOARD_SIGNALS_STORAGE_KEY = "web3-analytics-board-signals-v1";
const IDEAS_MIGRATION_KEY = "analytics-idea-capture-server-migrated-v1";
const SIGNALS_MIGRATION_KEY = "web3-analytics-board-signals-server-migrated-v1";

function loadIdeas() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(IDEAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load analytics ideas", error);
    return [];
  }
}

async function saveIdeas(ideas) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch (error) {
    console.error("Failed to persist analytics ideas", error);
  }
  const saved = await saveServerContent(IDEAS_STORAGE_KEY, ideas);
  if (!saved) throw new Error("Idea server storage failed");
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("ru-RU");
}

function buildIdeaPayload(title, details, activeTab) {
  const createdAt = new Date().toISOString();
  return {
    id: `analytics-idea-${Date.now()}`,
    type: "analytics-idea",
    title: title.trim(),
    details: details.trim(),
    source: "analytics-module",
    activeTab,
    createdAt,
    createdAtLabel: formatDateTime(createdAt),
  };
}

async function sendIdeaToBoard(idea) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(BOARD_SIGNALS_STORAGE_KEY);
    const localSignals = raw ? JSON.parse(raw) : [];
    const serverResult = await loadServerContentResult(BOARD_SIGNALS_STORAGE_KEY);
    const migrationComplete = window.localStorage.getItem(SIGNALS_MIGRATION_KEY) === "true";
    const existingSignals = serverResult.ok && serverResult.exists && Array.isArray(serverResult.value)
      ? mergeRecordsById(serverResult.value, migrationComplete ? [] : localSignals)
      : migrationComplete ? [] : localSignals;
    const nextSignals = mergeRecordsById([
      {
        id: idea.id,
        title: idea.title,
        summary: idea.details || "Без комментария",
        source: "Analytics",
        tab: idea.activeTab,
        createdAt: idea.createdAt,
        createdAtLabel: idea.createdAtLabel,
        type: "analytics-idea",
        status: "new",
      },
    ], existingSignals).slice(0, 100);

    const saved = await saveServerContent(BOARD_SIGNALS_STORAGE_KEY, nextSignals);
    if (!saved) throw new Error("Board server storage failed");
    window.localStorage.setItem(BOARD_SIGNALS_STORAGE_KEY, JSON.stringify(nextSignals));
    window.localStorage.setItem(SIGNALS_MIGRATION_KEY, "true");
  } catch (error) {
    throw new Error(`Board storage failed: ${String(error)}`);
  }
}

function AnalyticsIdeaCapture({ activeTab }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ideas, setIdeas] = useState(() => loadIdeas());

  const recentIdeas = useMemo(() => ideas.slice(0, 5), [ideas]);

  useEffect(() => {
    let isMounted = true;
    const localIdeas = loadIdeas();

    loadServerContentResult(IDEAS_STORAGE_KEY).then(async (serverResult) => {
      const resolved = resolveSharedRecords({
        serverResult,
        localRecords: localIdeas,
        migrationComplete: window.localStorage.getItem(IDEAS_MIGRATION_KEY) === "true",
      });
      if (resolved.shouldMigrate) {
        const saved = await saveServerContent(IDEAS_STORAGE_KEY, resolved.value);
        if (saved) window.localStorage.setItem(IDEAS_MIGRATION_KEY, "true");
      } else if (serverResult.ok) {
        window.localStorage.setItem(IDEAS_MIGRATION_KEY, "true");
      }
      if (!isMounted) return;
      setIdeas(resolved.value);
      window.localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(resolved.value));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setStatus("Нужно указать хотя бы название задачи.");
      return;
    }

    const idea = buildIdeaPayload(title, details, activeTab);
    const nextIdeas = [idea, ...ideas];
    setIsSubmitting(true);
    setStatus("");

    try {
      await Promise.all([sendIdeaToBoard(idea), saveIdeas(nextIdeas)]);
      setIdeas(nextIdeas);
      setTitle("");
      setDetails("");
      setStatus("Идея отправлена в доску аналитики.");
    } catch (error) {
      console.error("Failed to send idea to board", error);
      const offlineIdea = { ...idea, offline: true };
      const offlineIdeas = [offlineIdea, ...ideas];
      setIdeas(offlineIdeas);
      try {
        window.localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(offlineIdeas));
      } catch {
        // Идея останется в состоянии страницы до следующей попытки.
      }
      setTitle("");
      setDetails("");
      setStatus("Доска сейчас недоступна. Идея сохранена локально.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Wrapper as="section" marginTop="lg">
      <div className="analytics-surface analytics-idea-capture">
      <div className="analytics-idea-head">
        <div>
          <span className="analytics-kicker">Идеи по доработке</span>
          <h2 className="analytics-idea-title">Быстро закинуть задачу в доску</h2>
          <p className="analytics-page-subtitle">
            Запиши идею по улучшению аналитики, и она сразу уйдёт в нашу доску. Дата ставится автоматически.
          </p>
        </div>
      </div>

      <form className="analytics-idea-form" onSubmit={handleSubmit}>
        <LayoutGrid columns="auto" gap="md" align="end">
          <LayoutCell span="wide">
            <label className="analytics-filter-label" htmlFor="analytics-idea-title">
              Название задачи
            </label>
            <input
              id="analytics-idea-title"
              className="analytics-idea-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: добавить CAC по источникам"
            />
          </LayoutCell>
          <LayoutCell span="wide">
            <label className="analytics-filter-label" htmlFor="analytics-idea-details">
              Комментарий
            </label>
            <input
              id="analytics-idea-details"
              className="analytics-idea-input"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Коротко, что именно хотим улучшить"
            />
          </LayoutCell>
          <LayoutCell align="end">
            <button type="submit" className="analytics-export-btn analytics-idea-submit" disabled={isSubmitting}>
              {isSubmitting ? "Отправляем..." : "Бросить в доску"}
            </button>
          </LayoutCell>
        </LayoutGrid>
      </form>

      <div className="analytics-idea-meta">
        <span>Текущая вкладка: {activeTab}</span>
        <span>Дата подставится автоматически</span>
        {status ? <span>{status}</span> : null}
      </div>

      {recentIdeas.length ? (
        <div className="analytics-idea-list">
          {recentIdeas.map((idea) => (
            <div className="analytics-idea-item" key={idea.id}>
              <div className="analytics-idea-item-top">
                <strong>{idea.title}</strong>
                <span>{idea.createdAtLabel}</span>
              </div>
              <div className="analytics-idea-item-body">
                <span>{idea.details || "Без комментария"}</span>
                <span className="analytics-idea-item-tag">{idea.activeTab}</span>
                {idea.offline ? <span className="analytics-idea-item-tag">локально</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      </div>
    </Wrapper>
  );
}

export default AnalyticsIdeaCapture;
