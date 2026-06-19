import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent } from "../services/contentStore";
import { AGENT_TERMINOLOGY_STORAGE_KEY, defaultTerminologyTemplate, hermesTerminologyV2Sections, TERMINOLOGY_SECTION_DESCRIPTIONS } from "../data/agentTerminologyData";
import { createRow, hydrateTemplate, persistTerminology, readStoredTerminology } from "../utils/agentTerminologyUtils";

const HERMES_TERMINOLOGY_SECTION_ID = "hermes-v2";

function buildHermesTerminologyText() {
  return hermesTerminologyV2Sections
    .map((section) => {
      const rows = section.terms
        .map(
          (term) =>
            `- ${term.term}\n  Писать: ${term.writeAs}\n  RU: ${term.ru}\n  EN: ${term.en}\n  Смысл: ${term.meaning}\n  Правило перевода: ${term.translationRule}\n  Нельзя: ${term.avoid}`,
        )
        .join("\n\n");

      return `## ${section.title}\n${section.summary}\n\n${rows}`;
    })
    .join("\n\n");
}

function HermesTerminologyV2View() {
  const [copied, setCopied] = useState(false);
  const totalTerms = hermesTerminologyV2Sections.reduce((sum, section) => sum + section.terms.length, 0);

  async function copyAll() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;

    await navigator.clipboard.writeText(buildHermesTerminologyText());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="analytics-terminology-v2">
      <div className="analytics-terminology-v2-hero">
        <div>
          <span className="analytics-kicker">Hermes memory</span>
          <h3>Терминология Atlas 2.0</h3>
          <p>
            Новый словарь для сайта, переводчиков, White Paper, лендингов и AI-агентов. Здесь зафиксированы защищённые термины, правила перевода и слова, которые нельзя использовать,
            чтобы не превращать Atlas в инвестиционный продукт или ломать Web3-смысл.
          </p>
        </div>
        <div className="analytics-terminology-v2-stats" aria-label="Статистика терминологии Hermes 2.0">
          <strong>{totalTerms}</strong>
          <span>терминов и правил</span>
          <AnalyticsActionButton variant="secondary" size="sm" onClick={copyAll}>
            {copied ? "Скопировано" : "Скопировать всё"}
          </AnalyticsActionButton>
        </div>
      </div>

      <div className="analytics-terminology-v2-rules" aria-label="Главные правила терминологии">
        <div>
          <strong>Не переводим продуктовые имена</strong>
          <span>Atlas System, Smart Cycle, Claim, Web3, DAO-inspired mechanics, BNB Smart Chain, USDT BEP20.</span>
        </div>
        <div>
          <strong>Не обещаем доход</strong>
          <span>Calculated delta и Claim описываются как расчётная возможность по правилам, ликвидности и действиям участника.</span>
        </div>
        <div>
          <strong>Проверяем юридические отрицания</strong>
          <span>Not guaranteed, must not, may not, not an investment product нельзя смягчать или переводить наоборот.</span>
        </div>
      </div>

      <div className="analytics-terminology-v2-sections">
        {hermesTerminologyV2Sections.map((section) => (
          <article key={section.id} className="analytics-agent-template-card analytics-terminology-v2-section">
            <div className="analytics-agent-template-card-head">
              <div>
                <h3>{section.title}</h3>
                <p className="analytics-agent-template-review-summary">{section.summary}</p>
              </div>
              <span className="analytics-terminology-v2-count">{section.terms.length} терминов</span>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-terminology-v2-table">
                <thead>
                  <tr>
                    <th>Термин</th>
                    <th>Как писать</th>
                    <th>Смысл</th>
                    <th>Как переводить</th>
                    <th>Нельзя</th>
                  </tr>
                </thead>
                <tbody>
                  {section.terms.map((term) => (
                    <tr key={`${section.id}-${term.term}`}>
                      <td>
                        <strong>{term.term}</strong>
                        <span>RU: {term.ru}</span>
                        <span>EN: {term.en}</span>
                      </td>
                      <td>{term.writeAs}</td>
                      <td>{term.meaning}</td>
                      <td>{term.translationRule}</td>
                      <td>{term.avoid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AgentTerminologyTemplate() {
  const [template, setTemplate] = useState(readStoredTerminology);
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (typeof window === "undefined") return defaultTerminologyTemplate.sections[0]?.id || "core";

    const url = new URL(window.location.href);
    if (url.searchParams.get("termView") === HERMES_TERMINOLOGY_SECTION_ID) return HERMES_TERMINOLOGY_SECTION_ID;
    return url.searchParams.get("term") || defaultTerminologyTemplate.sections[0]?.id || "core";
  });
  const [reviewFilter, setReviewFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_TERMINOLOGY_STORAGE_KEY).then((savedTemplate) => {
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
      persistTerminology(next);
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

  const totalTerms = template.sections.reduce((sum, section) => sum + section.rows.length, 0);
  const isHermesTerminologyActive = activeSectionId === HERMES_TERMINOLOGY_SECTION_ID;
  const activeSection = isHermesTerminologyActive ? null : template.sections.find((section) => section.id === activeSectionId) || template.sections[0] || null;
  const activeSectionDescription = activeSection ? TERMINOLOGY_SECTION_DESCRIPTIONS[activeSection.id] : "";
  const activeRows = activeSection?.rows || [];
  const approvedRowsCount = activeRows.filter((row) => row.approved).length;
  const visibleRows = activeRows.filter((row) => {
    if (reviewFilter === "approved") return row.approved;
    if (reviewFilter === "pending") return !row.approved;
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isKnownSection = activeSectionId === HERMES_TERMINOLOGY_SECTION_ID || template.sections.some((section) => section.id === activeSectionId);
    const nextSectionId = isKnownSection ? activeSectionId : defaultTerminologyTemplate.sections[0]?.id || "core";

    if (nextSectionId !== activeSectionId) {
      setActiveSectionId(nextSectionId);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", "terminology");
    url.searchParams.set("term", nextSectionId);
    url.searchParams.delete("termView");
    window.history.replaceState({}, "", url.toString());
  }, [activeSectionId, template.sections]);

  return (
    <section className="analytics-surface analytics-agent-template">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Терминология</span>
          <h2 className="analytics-agent-template-title">Глоссарий Atlas System</h2>
          <p className="analytics-page-subtitle">
            Editable-база терминов для команды и AI-агента. Сейчас в шаблоне {totalTerms} терминов; описания, статусы вычитки и оранжевые редакторские комментарии можно редактировать прямо в таблице.
          </p>
        </div>
      </div>

      <div className="analytics-agent-template-tabs" role="tablist" aria-label="Категории терминологии">
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
        <button
          type="button"
          role="tab"
          aria-selected={isHermesTerminologyActive}
          className={`analytics-agent-template-tab${isHermesTerminologyActive ? " analytics-agent-template-tab-active" : ""}`}
          onClick={() => setActiveSectionId(HERMES_TERMINOLOGY_SECTION_ID)}
        >
          ТЕРМИНОЛОГИЯ 2.0
        </button>
      </div>

      {isHermesTerminologyActive ? <HermesTerminologyV2View /> : null}

      {activeSectionDescription ? <p className="analytics-page-subtitle">{activeSectionDescription}</p> : null}

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
                <div className="analytics-agent-template-review-filter" aria-label="Фильтр вычитки терминологии">
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
                  + термин
                </AnalyticsActionButton>
              </div>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-agent-template-table">
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Термин</th>
                    <th>Описание</th>
                    <th>Комментарий / вариант</th>
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
                          value={row.term}
                          onChange={(event) => updateRow(activeSection.id, row.id, "term", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.description}
                          onChange={(event) => updateRow(activeSection.id, row.id, "description", event.target.value)}
                          rows="3"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input analytics-agent-template-comment"
                          value={row.review || row.comment || ""}
                          onChange={(event) => updateRow(activeSection.id, row.id, "review", event.target.value)}
                          placeholder="Оранжевый комментарий: вариант термина, правка, перевод или что уточнить"
                          rows="4"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(activeSection.id, row.id)} title="Удалить термин">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                  {!visibleRows.length ? (
                    <tr>
                      <td colSpan="5">
                        <div className="analytics-agent-template-empty">В этом фильтре пока нет терминов.</div>
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

export default AgentTerminologyTemplate;
