import { useMemo, useState } from "react";

const IDEAS_STORAGE_KEY = "analytics-idea-capture-v1";
const BOARD_API_URL = import.meta.env.VITE_ANALYTICS_BOARD_API_URL || "";

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

function saveIdeas(ideas) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch (error) {
    console.error("Failed to persist analytics ideas", error);
  }
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
  if (!BOARD_API_URL) {
    throw new Error("Board API URL is not configured");
  }

  const response = await fetch(BOARD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify(idea),
  });

  if (!response.ok) {
    throw new Error(`Board request failed with ${response.status}`);
  }
}

function AnalyticsIdeaCapture({ activeTab }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ideas, setIdeas] = useState(() => loadIdeas());

  const recentIdeas = useMemo(() => ideas.slice(0, 5), [ideas]);

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
      await sendIdeaToBoard(idea);
      setIdeas(nextIdeas);
      saveIdeas(nextIdeas);
      setTitle("");
      setDetails("");
      setStatus("Идея отправлена в доску аналитики.");
    } catch (error) {
      console.error("Failed to send idea to board", error);
      const offlineIdea = { ...idea, offline: true };
      const offlineIdeas = [offlineIdea, ...ideas];
      setIdeas(offlineIdeas);
      saveIdeas(offlineIdeas);
      setTitle("");
      setDetails("");
      setStatus("Доска сейчас недоступна. Идея сохранена локально.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="analytics-surface analytics-idea-capture mt-4">
      <div className="analytics-idea-head">
        <div>
          <span className="analytics-kicker">Идеи по доработке</span>
          <h2 className="analytics-idea-title">Быстро закинуть задачу в доску</h2>
          <p className="analytics-page-subtitle mb-0">
            Запиши идею по улучшению аналитики, и она сразу уйдёт в нашу доску. Дата ставится автоматически.
          </p>
        </div>
      </div>

      <form className="analytics-idea-form" onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-12 col-xl-5">
            <label className="analytics-filter-label" htmlFor="analytics-idea-title">
              Название задачи
            </label>
            <input
              id="analytics-idea-title"
              className="form-control analytics-idea-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: добавить CAC по источникам"
            />
          </div>
          <div className="col-12 col-xl-5">
            <label className="analytics-filter-label" htmlFor="analytics-idea-details">
              Комментарий
            </label>
            <input
              id="analytics-idea-details"
              className="form-control analytics-idea-input"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Коротко, что именно хотим улучшить"
            />
          </div>
          <div className="col-12 col-xl-2 d-flex align-items-end">
            <button type="submit" className="btn analytics-export-btn w-100" disabled={isSubmitting}>
              {isSubmitting ? "Отправляем..." : "Бросить в доску"}
            </button>
          </div>
        </div>
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
    </section>
  );
}

export default AnalyticsIdeaCapture;
