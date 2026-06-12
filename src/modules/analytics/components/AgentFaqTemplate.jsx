import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

import { AGENT_FAQ_STORAGE_KEY, defaultFaqTemplate } from "../data/agentFaqData";
import { createRow, hydrateTemplate, persistFaq, readStoredFaq } from "../utils/agentFaqUtils";

function AgentFaqTemplate() {
  const [template, setTemplate] = useState(readStoredFaq);
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (typeof window === "undefined") return defaultFaqTemplate.sections[0]?.id || "start";

    const url = new URL(window.location.href);
    return url.searchParams.get("faq") || defaultFaqTemplate.sections[0]?.id || "start";
  });
  const [reviewFilter, setReviewFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_FAQ_STORAGE_KEY).then((savedTemplate) => {
      if (!isMounted || !savedTemplate) return;
      setTemplate(hydrateTemplate(savedTemplate));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateTemplate(updater) {
    setTemplate((current) => {
      const next = updater(current);
      persistFaq(next);
      return next;
    });
  }

  function updateRow(sectionId, rowId, field, value) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          rows: section.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
        };
      }),
    }));
  }

  function addRow(sectionId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: [...section.rows, createRow(sectionId)] } : section)),
    }));
  }

  function removeRow(sectionId, rowId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          deletedRowIds: Array.from(new Set([...(section.deletedRowIds || []), rowId])),
          rows: section.rows.filter((row) => row.id !== rowId),
        };
      }),
    }));
  }

  const totalQuestions = template.sections.reduce((sum, section) => sum + section.rows.length, 0);
  const activeSection =
    template.sections.find((section) => section.id === activeSectionId) || template.sections[0] || null;
  const activeRows = activeSection?.rows || [];
  const approvedRowsCount = activeRows.filter((row) => row.approved).length;
  const visibleRows = activeRows.filter((row) => {
    if (reviewFilter === "approved") return row.approved;
    if (reviewFilter === "pending") return !row.approved;
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isKnownSection = template.sections.some((section) => section.id === activeSectionId);
    const nextSectionId = isKnownSection ? activeSectionId : defaultFaqTemplate.sections[0]?.id || "start";

    if (nextSectionId !== activeSectionId) {
      setActiveSectionId(nextSectionId);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", "agentFaq");
    url.searchParams.set("faq", nextSectionId);
    window.history.replaceState({}, "", url.toString());
  }, [activeSectionId, template.sections]);

  return (
    <section className="analytics-surface analytics-agent-template">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">FAQ AI-агента</span>
          <h2 className="analytics-agent-template-title">FAQ Atlas System</h2>
          <p className="analytics-page-subtitle">
            Стартовая база вопросов участников по категориям. Сейчас в шаблоне {totalQuestions} вопросов; ответы, статусы вычитки и оранжевые редакторские комментарии можно редактировать прямо в таблицах.
          </p>
        </div>
      </div>

      <div className="analytics-agent-template-tabs" role="tablist" aria-label="Категории FAQ">
        {template.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection?.id === section.id}
            className={`analytics-agent-template-tab${activeSection?.id === section.id ? " analytics-agent-template-tab-active" : ""}`}
            onClick={() => setActiveSectionId(section.id)}
          >
            {section.title}
          </button>
        ))}
      </div>
      {activeSection ? (
        <div className="analytics-agent-template-grid">
          <div className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <div>
                <h3>{activeSection.title}</h3>
                <p className="analytics-agent-template-review-summary">
                  Одобрено {approvedRowsCount} из {activeRows.length}
                </p>
              </div>
              <div className="analytics-agent-template-review-actions">
                <div className="analytics-agent-template-review-filter" aria-label="Фильтр вычитки FAQ">
                  <button type="button" className={reviewFilter === "all" ? "is-active" : ""} onClick={() => setReviewFilter("all")}>
                    Все
                  </button>
                  <button type="button" className={reviewFilter === "pending" ? "is-active" : ""} onClick={() => setReviewFilter("pending")}>
                    Не вычитаны
                  </button>
                  <button type="button" className={reviewFilter === "approved" ? "is-active" : ""} onClick={() => setReviewFilter("approved")}>
                    Одобрены
                  </button>
                </div>
                <AnalyticsActionButton variant="primary" size="sm" onClick={() => addRow(activeSection.id)}>
                  + вопрос
                </AnalyticsActionButton>
              </div>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-agent-template-table">
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Вопрос</th>
                    <th>Вариант ответа</th>
                    <th>Комментарий / правка</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className={row.approved ? "analytics-agent-template-row-approved" : ""}>
                      <td>
                        <label className="analytics-agent-template-approval">
                          <input
                            type="checkbox"
                            checked={Boolean(row.approved)}
                            onChange={(event) => updateRow(activeSection.id, row.id, "approved", event.target.checked)}
                          />
                          <span>{row.approved ? "Вычитан" : "Не вычитан"}</span>
                        </label>
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.question}
                          onChange={(event) => updateRow(activeSection.id, row.id, "question", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.answer}
                          onChange={(event) => updateRow(activeSection.id, row.id, "answer", event.target.value)}
                          rows="3"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input analytics-agent-template-comment"
                          value={row.review || row.source || ""}
                          onChange={(event) => updateRow(activeSection.id, row.id, "review", event.target.value)}
                          placeholder="Оранжевый комментарий: правка, вариант ответа, ссылка или что уточнить"
                          rows="4"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(activeSection.id, row.id)} title="Удалить вопрос">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                  {!visibleRows.length ? (
                    <tr>
                      <td colSpan="5">
                        <div className="analytics-agent-template-empty">В этом фильтре пока нет вопросов.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AgentFaqTemplate;
