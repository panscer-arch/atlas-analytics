import { useMemo, useState } from "react";
import {
  atlasLocalizationLanguages,
  localizationCoreRules,
  localizationLanguageGuides,
  localizationPagePipeline,
  localizationPrompts,
  localizationQaChecks,
  localizationTermRows,
  localizationWorkflow,
} from "../data/localizationBibleData";

const categoryLabels = {
  all: "Все категории",
  Product: "Product",
  Web3: "Web3",
  Economics: "Economics",
  Partner: "Partner",
  Governance: "Governance",
  Legal: "Legal",
};

function copyToClipboard(text) {
  if (typeof window === "undefined" || !window.navigator?.clipboard) return;
  window.navigator.clipboard.writeText(text);
}

function LocalizationBibleBoard() {
  const [activeLanguageCode, setActiveLanguageCode] = useState("en");
  const [activeCategory, setActiveCategory] = useState("all");
  const activeLanguage = atlasLocalizationLanguages.find((language) => language.code === activeLanguageCode) || atlasLocalizationLanguages[1];
  const activeLanguageGuide = localizationLanguageGuides.find((guide) => guide.code === activeLanguage.code) || localizationLanguageGuides[1];
  const categories = useMemo(() => ["all", ...Array.from(new Set(localizationTermRows.map((row) => row.category)))], []);
  const visibleTerms = localizationTermRows.filter((row) => activeCategory === "all" || row.category === activeCategory);
  const lockedTermsCount = localizationTermRows.filter((row) => row.keepEnglish).length;
  const translationPrompt = `${localizationPrompts.translate}\n\nTarget language: ${activeLanguage.englishName} (${activeLanguage.nativeName}).\nLocale code: ${activeLanguage.code}.\nUse approved Atlas terms for this locale. If a term sounds unnatural, keep the English Web3 term and add a short explanation.`;

  return (
    <section className="analytics-surface analytics-localization-board">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Localization Bible</span>
          <h2 className="analytics-agent-template-title">Atlas: грамотные переводы сайта</h2>
          <p className="analytics-page-subtitle">
            Рабочий стандарт локализации: русский смысловой источник, английский master copy, утверждённый glossary и QA для всех языков сайта.
            Цель — не допускать переводов вроде “срок заключения” вместо lockup period или “количество циклов” вместо cycle amount.
          </p>
        </div>
      </div>

      <div className="analytics-localization-hero">
        <div className="analytics-localization-hero-card">
          <span>Source</span>
          <strong>RU смысл</strong>
          <p>Команда пишет продуктовые смыслы на русском, потому что так быстрее и точнее формулируется идея Atlas.</p>
        </div>
        <div className="analytics-localization-hero-card">
          <span>Master</span>
          <strong>EN canonical</strong>
          <p>Английский становится международной версией, но только после редакторской вычитки, а не как машинный перевод.</p>
        </div>
        <div className="analytics-localization-hero-card">
          <span>Glossary</span>
          <strong>{localizationTermRows.length} terms</strong>
          <p>{lockedTermsCount} терминов закреплены как English/Web3 terms и не должны переводиться произвольно.</p>
        </div>
        <div className="analytics-localization-hero-card">
          <span>Locales</span>
          <strong>{atlasLocalizationLanguages.length} languages</strong>
          <p>Русский, English, Deutsch, Français, Türkçe, Português BR, Bahasa Indonesia, Tiếng Việt, हिन्दी, 简体中文.</p>
        </div>
      </div>

      <div className="analytics-localization-workflow">
        {localizationWorkflow.map((step, index) => (
          <article key={step.title} className="analytics-localization-step">
            <div className="analytics-localization-step-index">{index + 1}</div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>

      <div className="analytics-localization-pipeline">
        <div className="analytics-localization-section-head">
          <div>
            <span className="analytics-kicker">Page workflow</span>
            <h3>Как переводить любую страницу Atlas</h3>
          </div>
          <p>Это рабочий конвейер: от русского смыслового черновика до локальной версии, которую можно публиковать без потери смысла.</p>
        </div>
        <div className="analytics-localization-pipeline-grid">
          {localizationPagePipeline.map((step) => (
            <article key={step.title} className="analytics-localization-pipeline-card">
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-localization-layout">
        <aside className="analytics-localization-sidebar">
          <h3>Языки сайта</h3>
          <div className="analytics-localization-language-list">
            {atlasLocalizationLanguages.map((language) => (
              <button
                key={language.code}
                type="button"
                className={language.code === activeLanguage.code ? "is-active" : ""}
                onClick={() => setActiveLanguageCode(language.code)}
              >
                <span className="analytics-localization-flag">{language.flag}</span>
                <span>
                  <strong>{language.nativeName}</strong>
                  <small>{language.englishName} · {language.status}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="analytics-localization-main">
          <div className="analytics-localization-language-head">
            <div>
              <span className="analytics-kicker">{activeLanguage.code}</span>
              <h3>{activeLanguage.flag} {activeLanguage.nativeName}</h3>
              <p>{activeLanguage.role}: {activeLanguage.englishName}</p>
            </div>
            <div className="analytics-localization-category-filter" aria-label="Фильтр терминов по категории">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={activeCategory === category ? "is-active" : ""}
                  onClick={() => setActiveCategory(category)}
                >
                  {categoryLabels[category] || category}
                </button>
              ))}
            </div>
          </div>

          <div className="analytics-localization-language-guide">
            <article>
              <span>Tone</span>
              <p>{activeLanguageGuide.tone}</p>
            </article>
            <article>
              <span>Keep</span>
              <p>{activeLanguageGuide.keep}</p>
            </article>
            <article>
              <span>Avoid</span>
              <p>{activeLanguageGuide.avoid}</p>
            </article>
            <article>
              <span>Note</span>
              <p>{activeLanguageGuide.note}</p>
            </article>
          </div>

          <div className="analytics-table-responsive">
            <table className="analytics-table analytics-localization-table">
              <thead>
                <tr>
                  <th>Термин</th>
                  <th>RU source</th>
                  <th>EN master</th>
                  <th>{activeLanguage.nativeName}</th>
                  <th>Запрещено / риск</th>
                </tr>
              </thead>
              <tbody>
                {visibleTerms.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.id}</strong>
                      <span>{row.category}</span>
                      {row.keepEnglish ? <em>keep EN</em> : null}
                    </td>
                    <td>{row.sourceRu}</td>
                    <td>
                      <strong>{row.masterEn}</strong>
                      <small>{row.meaning}</small>
                    </td>
                    <td className="analytics-localization-approved-term">{row.locales[activeLanguage.code] || row.masterEn}</td>
                    <td>{row.forbidden}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="analytics-localization-panels">
            <article className="analytics-localization-panel">
              <div className="analytics-localization-panel-head">
                <h3>EN master prompt</h3>
                <button type="button" onClick={() => copyToClipboard(localizationPrompts.englishMaster)}>Copy</button>
              </div>
              <pre>{localizationPrompts.englishMaster}</pre>
            </article>
            <article className="analytics-localization-panel">
              <div className="analytics-localization-panel-head">
                <h3>AI translation prompt</h3>
                <button type="button" onClick={() => copyToClipboard(translationPrompt)}>Copy</button>
              </div>
              <pre>{translationPrompt}</pre>
            </article>
            <article className="analytics-localization-panel">
              <div className="analytics-localization-panel-head">
                <h3>AI review prompt</h3>
                <button type="button" onClick={() => copyToClipboard(localizationPrompts.review)}>Copy</button>
              </div>
              <pre>{localizationPrompts.review}</pre>
            </article>
            <article className="analytics-localization-panel">
              <div className="analytics-localization-panel-head">
                <h3>Terminology extract prompt</h3>
                <button type="button" onClick={() => copyToClipboard(localizationPrompts.terminologyExtract)}>Copy</button>
              </div>
              <pre>{localizationPrompts.terminologyExtract}</pre>
            </article>
          </div>
        </div>
      </div>

      <div className="analytics-localization-bottom-grid">
        <article className="analytics-localization-rules">
          <h3>Жёсткие правила перевода</h3>
          <ul>
            {localizationCoreRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </article>
        <article className="analytics-localization-rules">
          <h3>QA перед публикацией</h3>
          <div className="analytics-table-responsive">
            <table className="analytics-table analytics-localization-qa-table">
              <thead>
                <tr>
                  <th>Проверка</th>
                  <th>Вопрос</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {localizationQaChecks.map((row) => (
                  <tr key={row.check}>
                    <td>{row.check}</td>
                    <td>{row.question}</td>
                    <td><span className={`analytics-localization-severity analytics-localization-severity-${row.severity.toLowerCase()}`}>{row.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}

export default LocalizationBibleBoard;
