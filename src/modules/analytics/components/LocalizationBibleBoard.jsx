import { useEffect, useMemo, useRef, useState } from "react";
import {
  ATLAS_LOCALIZATION_STORAGE_KEY,
  atlasLocalizationLanguages,
  defaultLocalizationPages,
  localizationCoreRules,
  localizationForbiddenPatterns,
  localizationLanguageGuides,
  localizationLocaleStatuses,
  localizationPagePipeline,
  localizationPrompts,
  localizationQaChecks,
  localizationTermRows,
  localizationWorkflow,
} from "../data/localizationBibleData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

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

function makeLocaleProgress(overrides = {}) {
  return atlasLocalizationLanguages.reduce((acc, language) => {
    const saved = overrides?.[language.code] || {};
    acc[language.code] = {
      status: saved.status || (language.code === "ru" ? "ru-source" : language.code === "en" ? "en-master" : "not-started"),
      reviewer: saved.reviewer || "",
      notes: saved.notes || "",
      copy: saved.copy || "",
    };
    return acc;
  }, {});
}

function normalizePage(page, index = 0) {
  return {
    id: page?.id || `page-${Date.now()}-${index}`,
    title: page?.title || "Новая страница",
    path: page?.path || "/",
    owner: page?.owner || "Content",
    priority: page?.priority || "Medium",
    ruSource: page?.ruSource || "",
    enMaster: page?.enMaster || "",
    notes: page?.notes || "",
    locales: makeLocaleProgress(page?.locales),
  };
}

function mergeLocalizationPages(savedPages) {
  const saved = Array.isArray(savedPages) ? savedPages.map(normalizePage) : [];
  const savedById = new Map(saved.map((page) => [page.id, page]));
  const mergedDefaults = defaultLocalizationPages.map((page, index) => {
    const savedPage = savedById.get(page.id);
    return normalizePage({ ...page, ...savedPage, locales: savedPage?.locales || page.locales }, index);
  });
  const extraPages = saved.filter((page) => !defaultLocalizationPages.some((defaultPage) => defaultPage.id === page.id));
  return [...mergedDefaults, ...extraPages];
}

function normalizeSearchText(value) {
  return String(value || "").toLocaleLowerCase();
}

function analyzeLocalizedText(text, languageCode, pageContext = "") {
  const normalizedText = normalizeSearchText(text);
  const normalizedContext = normalizeSearchText(pageContext);
  const issues = [];
  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  localizationForbiddenPatterns.forEach((pattern) => {
    const terms = [...(pattern.terms?.[languageCode] || []), ...(languageCode === "en" ? [] : pattern.terms?.en || [])];
    terms.forEach((term) => {
      if (!term) return;
      if (normalizedText.includes(normalizeSearchText(term))) {
        issues.push({
          id: `${pattern.id}-${term}`,
          severity: pattern.severity,
          topic: pattern.topic,
          term,
          message: pattern.message,
        });
      }
    });
  });

  const lockedTerms = localizationTermRows.filter((row) => row.keepEnglish);
  lockedTerms.forEach((row) => {
    const expected = row.locales?.[languageCode] || row.masterEn;
    const mustContain = row.masterEn.split("/")[0].trim();
    const contextHints = [row.id, row.sourceRu, row.masterEn, expected].map(normalizeSearchText);
    const isExpectedOnPage = contextHints.some((hint) => hint && normalizedContext.includes(hint));
    if (!expected || !mustContain || languageCode === "ru") return;
    if (!isExpectedOnPage) return;
    if (!normalizedText.includes(normalizeSearchText(mustContain))) {
      issues.push({
        id: `missing-${row.id}`,
        severity: "Medium",
        topic: "Terminology lock",
        term: mustContain,
        message: `Проверьте, не потерян ли закреплённый English/Web3 term: ${row.masterEn}.`,
      });
    }
  });

  const high = issues.filter((issue) => issue.severity === "High").length;
  const medium = issues.filter((issue) => issue.severity === "Medium").length;
  const score = Math.max(0, 100 - high * 24 - medium * 10);

  return { issues, high, medium, wordsCount, score };
}

function LocalizationBibleBoard() {
  const [activeLanguageCode, setActiveLanguageCode] = useState("en");
  const [activeCategory, setActiveCategory] = useState("all");
  const [translationPages, setTranslationPages] = useState(() => mergeLocalizationPages());
  const [activePageId, setActivePageId] = useState(defaultLocalizationPages[0]?.id || "home");
  const [qaText, setQaText] = useState("");
  const [saveState, setSaveState] = useState("Сохранено");
  const saveRequestRef = useRef(0);
  const isHydratedRef = useRef(false);
  const activeLanguage = atlasLocalizationLanguages.find((language) => language.code === activeLanguageCode) || atlasLocalizationLanguages[1];
  const activeLanguageGuide = localizationLanguageGuides.find((guide) => guide.code === activeLanguage.code) || localizationLanguageGuides[1];
  const categories = useMemo(() => ["all", ...Array.from(new Set(localizationTermRows.map((row) => row.category)))], []);
  const visibleTerms = localizationTermRows.filter((row) => activeCategory === "all" || row.category === activeCategory);
  const lockedTermsCount = localizationTermRows.filter((row) => row.keepEnglish).length;
  const activePage = translationPages.find((page) => page.id === activePageId) || translationPages[0];
  const activeLocaleCopy = activePage?.locales?.[activeLanguage.code]?.copy || "";
  const localeStatusById = useMemo(() => new Map(localizationLocaleStatuses.map((status) => [status.id, status])), []);
  const localeProgress = useMemo(() => {
    const localeCodes = atlasLocalizationLanguages.filter((language) => !["ru", "en"].includes(language.code)).map((language) => language.code);
    const total = translationPages.length * localeCodes.length;
    const completed = translationPages.reduce((sum, page) => (
      sum + localeCodes.filter((code) => ["native-reviewed", "published"].includes(page.locales?.[code]?.status)).length
    ), 0);
    const needsFix = translationPages.reduce((sum, page) => (
      sum + localeCodes.filter((code) => page.locales?.[code]?.status === "needs-fix").length
    ), 0);
    return { total, completed, needsFix, percent: total ? Math.round((completed / total) * 100) : 0 };
  }, [translationPages]);
  const qaSourceText = qaText || activeLocaleCopy;
  const qaPageContext = `${activePage?.title || ""}\n${activePage?.path || ""}\n${activePage?.ruSource || ""}\n${activePage?.enMaster || ""}\n${activePage?.notes || ""}`;
  const qaResult = useMemo(() => analyzeLocalizedText(qaSourceText, activeLanguage.code, qaPageContext), [qaSourceText, activeLanguage.code, qaPageContext]);
  const translationPrompt = `${localizationPrompts.translate}\n\nTarget language: ${activeLanguage.englishName} (${activeLanguage.nativeName}).\nLocale code: ${activeLanguage.code}.\nUse approved Atlas terms for this locale. If a term sounds unnatural, keep the English Web3 term and add a short explanation.`;
  const activeLocalePrompt = `${translationPrompt}\n\nPage: ${activePage?.title || ""}\nPath: ${activePage?.path || ""}\n\nRU source of meaning:\n${activePage?.ruSource || ""}\n\nEN master copy:\n${activePage?.enMaster || ""}\n\nPage notes:\n${activePage?.notes || ""}`;

  useEffect(() => {
    let isMounted = true;
    try {
      const saved = window.localStorage.getItem(ATLAS_LOCALIZATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const pages = mergeLocalizationPages(parsed?.pages || parsed);
        setTranslationPages(pages);
        setActivePageId((current) => pages.some((page) => page.id === current) ? current : pages[0]?.id);
      }
    } catch {
      // Keep defaults if local cache is malformed.
    }

    loadServerContent(ATLAS_LOCALIZATION_STORAGE_KEY).then((saved) => {
      if (!isMounted || !saved) return;
      const pages = mergeLocalizationPages(saved?.pages || saved);
      setTranslationPages(pages);
      setActivePageId((current) => pages.some((page) => page.id === current) ? current : pages[0]?.id);
      try {
        window.localStorage.setItem(ATLAS_LOCALIZATION_STORAGE_KEY, JSON.stringify({ pages }));
      } catch {
        // Server content is still loaded even if local cache is unavailable.
      }
    }).finally(() => {
      if (isMounted) isHydratedRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return undefined;
    const saveTimer = window.setTimeout(() => {
      const requestId = saveRequestRef.current + 1;
      saveRequestRef.current = requestId;
      const payload = { pages: translationPages };
      setSaveState("Сохраняю...");
      try {
        window.localStorage.setItem(ATLAS_LOCALIZATION_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Server save still runs if local storage is unavailable.
      }
      saveServerContent(ATLAS_LOCALIZATION_STORAGE_KEY, payload).then((ok) => {
        if (saveRequestRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено" : "Сохранено локально");
      });
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [translationPages]);

  function updateActivePage(field, value) {
    if (!activePage) return;
    setTranslationPages((pages) => pages.map((page) => page.id === activePage.id ? { ...page, [field]: value } : page));
  }

  function updateLocale(code, field, value) {
    if (!activePage) return;
    setTranslationPages((pages) => pages.map((page) => {
      if (page.id !== activePage.id) return page;
      return {
        ...page,
        locales: {
          ...page.locales,
          [code]: {
            ...page.locales?.[code],
            [field]: value,
          },
        },
      };
    }));
  }

  function addTranslationPage() {
    const nextPage = normalizePage({
      id: `custom-page-${Date.now()}`,
      title: "Новая страница Atlas",
      path: "/new-page",
      owner: "Content",
      priority: "Medium",
      ruSource: "Кратко опишите русский смысл страницы.",
      enMaster: "",
      notes: "Добавьте термины и риски перевода.",
    });
    setTranslationPages((pages) => [nextPage, ...pages]);
    setActivePageId(nextPage.id);
  }

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

      <div className="analytics-localization-workbench">
        <div className="analytics-localization-section-head">
          <div>
            <span className="analytics-kicker">Translation Workbench</span>
            <h3>Рабочая доска страниц</h3>
          </div>
          <div className="analytics-localization-save-state">
            <strong>{localeProgress.percent}%</strong>
            <span>{localeProgress.completed}/{localeProgress.total} локалей закрыто · {localeProgress.needsFix} требуют правки · {saveState}</span>
          </div>
        </div>

        <div className="analytics-localization-workbench-grid">
          <aside className="analytics-localization-page-list">
            <button type="button" className="analytics-localization-add-page" onClick={addTranslationPage}>+ Страница</button>
            {translationPages.map((page) => (
              <button
                key={page.id}
                type="button"
                className={page.id === activePage?.id ? "is-active" : ""}
                onClick={() => setActivePageId(page.id)}
              >
                <strong>{page.title}</strong>
                <span>{page.path} · {page.priority}</span>
              </button>
            ))}
          </aside>

          {activePage ? (
            <div className="analytics-localization-page-editor">
              <div className="analytics-localization-form-grid">
                <label>
                  <span>Название страницы</span>
                  <input value={activePage.title} onChange={(event) => updateActivePage("title", event.target.value)} />
                </label>
                <label>
                  <span>URL / раздел</span>
                  <input value={activePage.path} onChange={(event) => updateActivePage("path", event.target.value)} />
                </label>
                <label>
                  <span>Ответственный</span>
                  <input value={activePage.owner} onChange={(event) => updateActivePage("owner", event.target.value)} />
                </label>
                <label>
                  <span>Приоритет</span>
                  <select value={activePage.priority} onChange={(event) => updateActivePage("priority", event.target.value)}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
              </div>

              <div className="analytics-localization-copy-grid">
                <label>
                  <span>RU смысловой источник</span>
                  <textarea value={activePage.ruSource} onChange={(event) => updateActivePage("ruSource", event.target.value)} />
                </label>
                <label>
                  <span>EN master copy</span>
                  <textarea value={activePage.enMaster} onChange={(event) => updateActivePage("enMaster", event.target.value)} />
                </label>
              </div>

              <label className="analytics-localization-notes">
                <span>Заметки, термины и риски</span>
                <textarea value={activePage.notes} onChange={(event) => updateActivePage("notes", event.target.value)} />
              </label>

              <div className="analytics-table-responsive">
                <table className="analytics-table analytics-localization-status-table">
                  <thead>
                    <tr>
                      <th>Язык</th>
                      <th>Статус</th>
                      <th>Reviewer</th>
                      <th>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atlasLocalizationLanguages.map((language) => {
                      const progress = activePage.locales?.[language.code] || makeLocaleProgress()[language.code];
                      const statusTone = localeStatusById.get(progress.status)?.tone || "neutral";
                      return (
                        <tr key={language.code}>
                          <td>
                            <strong>{language.flag} {language.nativeName}</strong>
                            <span>{language.code}</span>
                          </td>
                          <td>
                            <select
                              className={`analytics-localization-status-select analytics-localization-status-${statusTone}`}
                              value={progress.status}
                              onChange={(event) => updateLocale(language.code, "status", event.target.value)}
                            >
                              {localizationLocaleStatuses.map((status) => (
                                <option key={status.id} value={status.id}>{status.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input value={progress.reviewer} onChange={(event) => updateLocale(language.code, "reviewer", event.target.value)} placeholder="AI / native / editor" />
                          </td>
                          <td>
                            <input value={progress.notes} onChange={(event) => updateLocale(language.code, "notes", event.target.value)} placeholder="Что проверить или исправить" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="analytics-localization-locale-editor">
                <div className="analytics-localization-locale-editor-head">
                  <div>
                    <span className="analytics-kicker">Locale copy</span>
                    <h4>{activeLanguage.flag} {activeLanguage.nativeName}</h4>
                  </div>
                  <button type="button" onClick={() => copyToClipboard(activeLocalePrompt)}>Copy prompt</button>
                </div>
                <label>
                  <span>Текст перевода для выбранного языка</span>
                  <textarea
                    value={activeLocaleCopy}
                    onChange={(event) => updateLocale(activeLanguage.code, "copy", event.target.value)}
                    placeholder="Здесь хранится финальный или черновой текст локализации для выбранной страницы и языка."
                  />
                </label>
                <div className="analytics-localization-locale-meta">
                  <span>QA ниже проверяет этот текст автоматически, если отдельное поле Live QA пустое.</span>
                  <button type="button" onClick={() => setQaText(activeLocaleCopy)}>Проверить в Live QA</button>
                </div>
              </div>
            </div>
          ) : null}
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

      <div className="analytics-localization-qa-checker">
        <div className="analytics-localization-section-head">
          <div>
            <span className="analytics-kicker">Live QA</span>
            <h3>Проверка перевода перед публикацией</h3>
          </div>
          <div className="analytics-localization-qa-score">
            <strong>{qaResult.score}</strong>
            <span>{activeLanguage.flag} {activeLanguage.nativeName} · {qaResult.wordsCount} words · {qaResult.high} high / {qaResult.medium} medium</span>
          </div>
        </div>

        <div className="analytics-localization-qa-grid">
          <label className="analytics-localization-qa-input">
            <span>Вставьте текст для разовой проверки или оставьте пустым, чтобы проверять locale copy выше</span>
            <textarea
              value={qaText}
              onChange={(event) => setQaText(event.target.value)}
              placeholder="Paste localized Atlas page copy here, or keep empty to analyze saved locale copy..."
            />
          </label>

          <div className="analytics-localization-qa-results">
            {qaSourceText.trim() ? (
              qaResult.issues.length ? (
                qaResult.issues.map((issue) => (
                  <article key={issue.id} className={`analytics-localization-qa-issue analytics-localization-qa-issue-${issue.severity.toLowerCase()}`}>
                    <div>
                      <strong>{issue.severity}</strong>
                      <span>{issue.topic}</span>
                    </div>
                    <p>{issue.message}</p>
                    <em>{issue.term}</em>
                  </article>
                ))
              ) : (
                <article className="analytics-localization-qa-empty">
                  <strong>Явных рисков не найдено</strong>
                  <p>Автопроверка не заменяет native review, но быстрые стоп-слова и glossary lock выглядят чисто.</p>
                </article>
              )
            ) : (
              <article className="analytics-localization-qa-empty">
                <strong>Готово к проверке</strong>
                <p>Выберите язык слева ниже, вставьте перевод сюда и посмотрите, какие термины или обещания нужно вычитать вручную.</p>
              </article>
            )}
          </div>
        </div>
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
