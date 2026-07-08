import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import { MARKETING_BRIEF_STORAGE_KEY, defaultMarketingBrief, marketingBriefStatuses } from "../data/marketingBriefData";

const journeyFieldLabels = [
  ["pains", "Боли"],
  ["fears", "Страхи"],
  ["barriers", "Барьеры"],
  ["triggers", "Стимулы / триггеры"],
];

function compactText(value) {
  return String(value || "").trim();
}

function buildMarketingBriefMarkdown(brief) {
  const sections = Array.isArray(brief?.sections) ? brief.sections : [];
  const lines = [
    "# Atlas System: маркетинговый бриф",
    "",
    `Дата обновления: ${new Date(brief?.updatedAt || Date.now()).toLocaleDateString("ru-RU")}`,
    "",
    "## Как использовать документ",
    "",
    "Этот документ нужен маркетологу, контент-команде, SMM, вебинарным спикерам и региональным лидерам как единая карта: кому мы говорим, что именно говорим, через какие каналы ведем участника и какие формулировки нельзя использовать.",
    "",
  ];

  sections.forEach((section, sectionIndex) => {
    lines.push(`## ${sectionIndex + 1}. ${section.title}`);
    if (compactText(section.subtitle)) {
      lines.push("", compactText(section.subtitle));
    }

    (section.items || []).forEach((item, itemIndex) => {
      lines.push("", `### ${sectionIndex + 1}.${itemIndex + 1}. ${compactText(item.question) || "Без названия"}`);

      if (compactText(item.answer)) {
        lines.push("", compactText(item.answer));
      }

      journeyFieldLabels.forEach(([field, label]) => {
        if (compactText(item[field])) {
          lines.push("", `**${label}:** ${compactText(item[field])}`);
        }
      });

      if (compactText(item.stage)) {
        lines.push("", `**Этап:** ${compactText(item.stage)}`);
      }
      if (compactText(item.channels)) {
        lines.push("", `**Каналы:** ${compactText(item.channels)}`);
      }
      if (compactText(item.communication)) {
        lines.push("", `**Коммуникационная стратегия:** ${compactText(item.communication)}`);
      }
      if (compactText(item.comment)) {
        lines.push("", `**Комментарий редакции:** ${compactText(item.comment)}`);
      }
    });

    lines.push("");
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function createBriefItem(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question: "Новый вопрос",
    answer: "",
    pains: "",
    fears: "",
    barriers: "",
    triggers: "",
    stage: "",
    channels: "",
    communication: "",
    status: "Черновик",
    approved: false,
    comment: "",
  };
}

function normalizeItem(item, sectionId) {
  return {
    id: item.id || `${sectionId}-${Math.random().toString(16).slice(2)}`,
    question: item.question || "",
    answer: item.answer || "",
    pains: item.pains || "",
    fears: item.fears || "",
    barriers: item.barriers || "",
    triggers: item.triggers || "",
    stage: item.stage || "",
    channels: item.channels || "",
    communication: item.communication || "",
    status: marketingBriefStatuses.includes(item.status) ? item.status : "Черновик",
    approved: Boolean(item.approved),
    comment: item.comment || "",
  };
}

function hydrateBrief(savedBrief) {
  const savedSections = Array.isArray(savedBrief?.sections) ? savedBrief.sections : [];
  const savedById = new Map(savedSections.map((section) => [section.id, section]));

  const sections = defaultMarketingBrief.sections.map((section) => {
    const savedSection = savedById.get(section.id);
    const savedItems = Array.isArray(savedSection?.items) ? savedSection.items : [];
    const savedItemsById = new Map(savedItems.map((item) => [item.id, item]));

    const defaultItems = section.items.map((item) => {
      const savedItem = savedItemsById.get(item.id);
      const shouldPreserveSavedText = savedItem?.approved || Boolean(savedItem?.comment);
      return normalizeItem(shouldPreserveSavedText ? { ...item, ...savedItem } : { ...savedItem, ...item }, section.id);
    });
    const customItems = savedItems
      .filter((item) => !section.items.some((defaultItem) => defaultItem.id === item.id))
      .map((item) => normalizeItem(item, section.id));

    return {
      ...section,
      subtitle: savedSection?.subtitle || section.subtitle,
      items: [...defaultItems, ...customItems],
    };
  });

  const customSections = savedSections
    .filter((section) => !defaultMarketingBrief.sections.some((defaultSection) => defaultSection.id === section.id))
    .map((section) => ({
      id: section.id || `section-${Math.random().toString(16).slice(2)}`,
      title: section.title || "Новый раздел",
      subtitle: section.subtitle || "",
      items: Array.isArray(section.items) ? section.items.map((item) => normalizeItem(item, section.id || "custom")) : [],
    }));

  return {
    ...defaultMarketingBrief,
    ...savedBrief,
    sections: [...sections, ...customSections],
  };
}

function readStoredBrief() {
  if (typeof window === "undefined") return hydrateBrief(defaultMarketingBrief);

  try {
    const saved = window.localStorage.getItem(MARKETING_BRIEF_STORAGE_KEY);
    return saved ? hydrateBrief(JSON.parse(saved)) : hydrateBrief(defaultMarketingBrief);
  } catch {
    return hydrateBrief(defaultMarketingBrief);
  }
}

function persistBrief(brief) {
  const nextBrief = {
    ...brief,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(MARKETING_BRIEF_STORAGE_KEY, JSON.stringify(nextBrief));
  } catch {
    // Если localStorage недоступен, серверное сохранение ниже все равно попробует зафиксировать правку.
  }

  saveServerContent(MARKETING_BRIEF_STORAGE_KEY, nextBrief);
  return nextBrief;
}

function MarketingBriefBoard() {
  const [brief, setBrief] = useState(readStoredBrief);
  const [activeSectionId, setActiveSectionId] = useState(() => readStoredBrief().sections[0]?.id || "summary");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [viewMode, setViewMode] = useState("editor");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(MARKETING_BRIEF_STORAGE_KEY).then((savedBrief) => {
      if (!isMounted || !savedBrief) return;
      const hydrated = hydrateBrief(savedBrief);
      setBrief(hydrated);
      setActiveSectionId((current) => (hydrated.sections.some((section) => section.id === current) ? current : hydrated.sections[0]?.id || "summary"));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeSection = brief.sections.find((section) => section.id === activeSectionId) || brief.sections[0];

  const stats = useMemo(() => {
    const items = brief.sections.flatMap((section) => section.items || []);
    const approved = items.filter((item) => item.approved).length;
    const needsRewrite = items.filter((item) => item.status === "Нужно переписать").length;
    const inReview = items.filter((item) => item.status === "На вычитке").length;
    return {
      total: items.length,
      approved,
      needsRewrite,
      inReview,
      progress: items.length ? Math.round((approved / items.length) * 100) : 0,
    };
  }, [brief]);

  const visibleItems = (activeSection?.items || []).filter((item) => {
    if (reviewFilter === "approved") return item.approved;
    if (reviewFilter === "todo") return !item.approved;
    if (reviewFilter === "rewrite") return item.status === "Нужно переписать";
    return true;
  });

  const documentMarkdown = useMemo(() => buildMarketingBriefMarkdown(brief), [brief]);
  const journeySection = brief.sections.find((section) => section.id === "journey");
  const keySections = brief.sections.filter((section) => ["summary", "positioning", "audiences", "journey", "channels", "communication", "content", "conversion", "webinar-strategy", "kpi", "compliance", "actions"].includes(section.id));

  function updateBrief(updater) {
    setBrief((current) => persistBrief(updater(current)));
  }

  function updateItem(sectionId, itemId, field, value) {
    updateBrief((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
        };
      }),
    }));
  }

  function addItem(sectionId) {
    updateBrief((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, items: [...section.items, createBriefItem(sectionId)] } : section)),
    }));
  }

  function removeItem(sectionId, itemId) {
    updateBrief((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, items: section.items.filter((item) => item.id !== itemId) } : section)),
    }));
  }

  function updateSection(sectionId, field, value) {
    updateBrief((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, [field]: value } : section)),
    }));
  }

  function copyDocumentMarkdown() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(documentMarkdown);
  }

  return (
    <section className="analytics-surface analytics-marketing-brief">
      <div className="analytics-marketing-brief-head">
        <div>
          <span className="analytics-kicker">Маркетинговый бриф Atlas</span>
          <h2 className="analytics-agent-template-title">Путь клиента, каналы и коммуникационная стратегия</h2>
          <p className="analytics-page-subtitle">
            Рабочий основной бриф для маркетолога: вопросы, черновые ответы, каналы, этапы воронки, стратегия коммуникации и отметки вычитки.
          </p>
        </div>
        <div className="analytics-marketing-brief-score" aria-label="Прогресс вычитки маркетинг-брифа">
          <strong>{stats.progress}%</strong>
          <span>вычитано</span>
        </div>
      </div>

      <div className="analytics-marketing-brief-modebar">
        <div className="analytics-agent-template-review-filter" aria-label="Режим просмотра маркетинг-брифа">
          {[
            ["editor", "Редактор"],
            ["document", "Док для маркетолога"],
          ].map(([id, label]) => (
            <button key={id} type="button" className={viewMode === id ? "is-active" : ""} onClick={() => setViewMode(id)}>
              {label}
            </button>
          ))}
        </div>
        <AnalyticsActionButton variant="secondary" size="sm" onClick={copyDocumentMarkdown}>
          Скопировать MD
        </AnalyticsActionButton>
        <a className="analytics-marketing-brief-pdf-link" href="/generated/atlas-marketing-brief.pdf" target="_blank" rel="noreferrer">
          Открыть PDF
        </a>
      </div>

      <div className="analytics-marketing-brief-metrics" aria-label="Сводка маркетинг-брифа">
        <div>
          <span>Блоков</span>
          <strong>{brief.sections.length}</strong>
        </div>
        <div>
          <span>Вопросов</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>На вычитке</span>
          <strong>{stats.inReview}</strong>
        </div>
        <div>
          <span>Переписать</span>
          <strong>{stats.needsRewrite}</strong>
        </div>
      </div>

      {viewMode === "document" ? (
        <div className="analytics-marketing-brief-document">
          <header className="analytics-marketing-brief-document-hero">
            <span>Atlas System</span>
            <h3>Маркетинговый бриф для запуска и продвижения</h3>
            <p>
              Документ фиксирует позиционирование, аудитории, путь клиента, каналы, коммуникационную стратегию, контент-систему, вебинары, KPI и
              ограничения по формулировкам.
            </p>
          </header>

          <section className="analytics-marketing-brief-document-summary" aria-label="Ключевая сводка">
            <article>
              <span>Фокус запуска</span>
              <strong>Сетевики, MLM-лидеры и high-risk/HYIP аудитория</strong>
              <p>Первое ядро Atlas формируется вокруг людей, которые понимают структуры, команды, партнерские программы и работу с возражениями.</p>
            </article>
            <article>
              <span>Обещание бренда</span>
              <strong>Коротко, понятно, проверяемо</strong>
              <p>Atlas не строится на длинной легенде: Smart Cycle, правила, риски, Claim, партнерская программа и on-chain проверка.</p>
            </article>
            <article>
              <span>Главное правило</span>
              <strong>Показывать возможности без гарантий</strong>
              <p>В коммуникации используются расчетные сценарии, добровольное участие и самостоятельная оценка риска.</p>
            </article>
          </section>

          {journeySection ? (
            <section className="analytics-marketing-brief-document-section">
              <div className="analytics-marketing-brief-document-section-head">
                <span>Customer Journey Map</span>
                <h4>Путь участника от первого касания до лидерского продвижения</h4>
                <p>{journeySection.subtitle}</p>
              </div>
              <div className="analytics-marketing-brief-journey-timeline">
                {(journeySection.items || []).map((item, index) => (
                  <article key={item.id}>
                    <div className="analytics-marketing-brief-journey-index">{String(index + 1).padStart(2, "0")}</div>
                    <div>
                      <span>{item.stage}</span>
                      <h5>{item.question}</h5>
                      <p>{item.answer}</p>
                      <dl>
                        {journeyFieldLabels.map(([field, label]) =>
                          compactText(item[field]) ? (
                            <div key={field}>
                              <dt>{label}</dt>
                              <dd>{item[field]}</dd>
                            </div>
                          ) : null
                        )}
                        <div>
                          <dt>Каналы</dt>
                          <dd>{item.channels}</dd>
                        </div>
                        <div>
                          <dt>Коммуникация</dt>
                          <dd>{item.communication}</dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {keySections
            .filter((section) => section.id !== "journey")
            .map((section, sectionIndex) => (
              <section key={section.id} className="analytics-marketing-brief-document-section">
                <div className="analytics-marketing-brief-document-section-head">
                  <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                  <h4>{section.title}</h4>
                  <p>{section.subtitle}</p>
                </div>
                <div className="analytics-marketing-brief-document-grid">
                  {(section.items || []).map((item) => (
                    <article key={item.id}>
                      <h5>{item.question}</h5>
                      <p>{item.answer}</p>
                      <dl>
                        {compactText(item.stage) ? (
                          <div>
                            <dt>Этап</dt>
                            <dd>{item.stage}</dd>
                          </div>
                        ) : null}
                        {compactText(item.channels) ? (
                          <div>
                            <dt>Каналы</dt>
                            <dd>{item.channels}</dd>
                          </div>
                        ) : null}
                        {compactText(item.communication) ? (
                          <div>
                            <dt>Коммуникация</dt>
                            <dd>{item.communication}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
      <div className="analytics-marketing-brief-layout">
        <aside className="analytics-marketing-brief-nav" aria-label="Разделы маркетингового брифа">
          {brief.sections.map((section, index) => {
            const approvedCount = (section.items || []).filter((item) => item.approved).length;
            const totalCount = section.items?.length || 0;
            return (
              <button
                key={section.id}
                type="button"
                className={section.id === activeSection?.id ? "analytics-marketing-brief-nav-item is-active" : "analytics-marketing-brief-nav-item"}
                onClick={() => setActiveSectionId(section.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{section.title}</strong>
                <small>
                  {approvedCount}/{totalCount}
                </small>
              </button>
            );
          })}
        </aside>

        <div className="analytics-marketing-brief-workspace">
          <div className="analytics-marketing-brief-section-head">
            <label>
              <span>Название блока</span>
              <input
                className="analytics-marketing-brief-title-input"
                value={activeSection?.title || ""}
                onChange={(event) => updateSection(activeSection.id, "title", event.target.value)}
              />
            </label>
            <label>
              <span>Описание блока</span>
              <textarea
                className="analytics-agent-template-input"
                value={activeSection?.subtitle || ""}
                onChange={(event) => updateSection(activeSection.id, "subtitle", event.target.value)}
                rows="2"
              />
            </label>
            <div className="analytics-marketing-brief-actions">
              <div className="analytics-agent-template-review-filter" aria-label="Фильтр вопросов">
                {[
                  ["all", "Все"],
                  ["todo", "Не вычитано"],
                  ["approved", "Вычитано"],
                  ["rewrite", "Переписать"],
                ].map(([id, label]) => (
                  <button key={id} type="button" className={reviewFilter === id ? "is-active" : ""} onClick={() => setReviewFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <AnalyticsActionButton variant="primary" size="sm" onClick={() => addItem(activeSection.id)}>
                + вопрос
              </AnalyticsActionButton>
            </div>
          </div>

          <div className="analytics-marketing-brief-items">
            {visibleItems.map((item) => {
              const showJourneyFields =
                activeSection?.id === "journey" || Boolean(item.pains) || Boolean(item.fears) || Boolean(item.barriers) || Boolean(item.triggers);

              return (
              <article key={item.id} className={item.approved ? "analytics-marketing-brief-item is-approved" : "analytics-marketing-brief-item"}>
                <div className="analytics-marketing-brief-item-top">
                  <label className="analytics-agent-template-approval">
                    <input type="checkbox" checked={item.approved} onChange={(event) => updateItem(activeSection.id, item.id, "approved", event.target.checked)} />
                    вычитано
                  </label>
                  <select
                    className="analytics-marketing-brief-status"
                    value={item.status}
                    onChange={(event) => updateItem(activeSection.id, item.id, "status", event.target.value)}
                  >
                    {marketingBriefStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeItem(activeSection.id, item.id)} title="Удалить вопрос">
                    x
                  </AnalyticsActionButton>
                </div>

                <label className="analytics-marketing-brief-field analytics-marketing-brief-field-question">
                  <span>Вопрос брифа</span>
                  <textarea
                    className="analytics-agent-template-input"
                    value={item.question}
                    onChange={(event) => updateItem(activeSection.id, item.id, "question", event.target.value)}
                    rows="2"
                  />
                </label>

                <label className="analytics-marketing-brief-field">
                  <span>Черновой ответ / версия маркетолога</span>
                  <textarea
                    className="analytics-agent-template-input analytics-marketing-brief-answer"
                    value={item.answer}
                    onChange={(event) => updateItem(activeSection.id, item.id, "answer", event.target.value)}
                    rows="5"
                  />
                </label>

                {showJourneyFields ? (
                  <div className="analytics-marketing-brief-journey-grid">
                    <label className="analytics-marketing-brief-field">
                      <span>Боли</span>
                      <textarea
                        className="analytics-agent-template-input"
                        value={item.pains}
                        onChange={(event) => updateItem(activeSection.id, item.id, "pains", event.target.value)}
                        rows="3"
                      />
                    </label>
                    <label className="analytics-marketing-brief-field">
                      <span>Страхи</span>
                      <textarea
                        className="analytics-agent-template-input"
                        value={item.fears}
                        onChange={(event) => updateItem(activeSection.id, item.id, "fears", event.target.value)}
                        rows="3"
                      />
                    </label>
                    <label className="analytics-marketing-brief-field">
                      <span>Барьеры</span>
                      <textarea
                        className="analytics-agent-template-input"
                        value={item.barriers}
                        onChange={(event) => updateItem(activeSection.id, item.id, "barriers", event.target.value)}
                        rows="3"
                      />
                    </label>
                    <label className="analytics-marketing-brief-field">
                      <span>Стимулы / триггеры</span>
                      <textarea
                        className="analytics-agent-template-input"
                        value={item.triggers}
                        onChange={(event) => updateItem(activeSection.id, item.id, "triggers", event.target.value)}
                        rows="3"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="analytics-marketing-brief-mini-grid">
                  <label className="analytics-marketing-brief-field">
                    <span>Этап пути клиента</span>
                    <textarea
                      className="analytics-agent-template-input"
                      value={item.stage}
                      onChange={(event) => updateItem(activeSection.id, item.id, "stage", event.target.value)}
                      rows="2"
                    />
                  </label>
                  <label className="analytics-marketing-brief-field">
                    <span>Каналы на этапе</span>
                    <textarea
                      className="analytics-agent-template-input"
                      value={item.channels}
                      onChange={(event) => updateItem(activeSection.id, item.id, "channels", event.target.value)}
                      rows="2"
                    />
                  </label>
                </div>

                <div className="analytics-marketing-brief-mini-grid">
                  <label className="analytics-marketing-brief-field">
                    <span>Коммуникационная стратегия</span>
                    <textarea
                      className="analytics-agent-template-input"
                      value={item.communication}
                      onChange={(event) => updateItem(activeSection.id, item.id, "communication", event.target.value)}
                      rows="3"
                    />
                  </label>
                  <label className="analytics-marketing-brief-field">
                    <span>Комментарий / правка оранжевым смыслом</span>
                    <textarea
                      className="analytics-agent-template-input analytics-agent-template-comment"
                      value={item.comment}
                      onChange={(event) => updateItem(activeSection.id, item.id, "comment", event.target.value)}
                      placeholder="Сюда можно писать правки, сомнения и финальную редакторскую версию."
                      rows="3"
                    />
                  </label>
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </section>
  );
}

export default MarketingBriefBoard;
