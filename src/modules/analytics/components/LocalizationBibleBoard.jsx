import { useEffect, useMemo, useRef, useState } from "react";
import {
  ATLAS_LOCALIZATION_STORAGE_KEY,
  atlasLocalizationLanguages,
  defaultLocalizationPages,
  localizationCoreRules,
  localizationForbiddenPatterns,
  localizationLanguageGuides,
  localizationMeaningMemory,
  localizationLocaleStatuses,
  localizationPagePipeline,
  localizationPrompts,
  localizationQaChecks,
  localizationTermRows,
  localizationUiPhrases,
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

const statusShortLabels = {
  "not-started": "—",
  "ru-source": "RU",
  "en-master": "EN",
  translated: "TR",
  "ai-reviewed": "AI",
  "native-reviewed": "N",
  published: "PUB",
  "needs-fix": "FIX",
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

function buildTranslationPackage({ page, language, languageGuide, localeCopy, qaResult, prompt }) {
  const glossaryRows = localizationTermRows
    .filter((row) => {
      const context = normalizeSearchText(`${page?.title || ""} ${page?.ruSource || ""} ${page?.enMaster || ""} ${page?.notes || ""}`);
      return [row.id, row.sourceRu, row.masterEn, row.meaning].map(normalizeSearchText).some((hint) => hint && context.includes(hint));
    })
    .slice(0, 18);

  const glossaryMarkdown = glossaryRows.length
    ? glossaryRows.map((row) => `- ${row.masterEn}: ${row.locales?.[language.code] || row.masterEn} | avoid: ${row.forbidden}`).join("\n")
    : "- Use the full Atlas glossary from SuperSUS. Keep brand/Web3 terms exactly as approved.";

  const issuesMarkdown = qaResult.issues.length
    ? qaResult.issues.map((issue) => `- [${issue.severity}] ${issue.topic}: ${issue.message} (${issue.term})`).join("\n")
    : "- No automatic QA issues found.";

  return `# Atlas Localization Package

Page: ${page?.title || ""}
Path: ${page?.path || ""}
Target language: ${language.nativeName} (${language.englishName}, ${language.code})
Owner: ${page?.owner || ""}
Priority: ${page?.priority || ""}

## Language Guide
Tone: ${languageGuide?.tone || ""}
Keep: ${languageGuide?.keep || ""}
Avoid: ${languageGuide?.avoid || ""}
Note: ${languageGuide?.note || ""}

## RU Source Of Meaning
${page?.ruSource || ""}

## EN Master Copy
${page?.enMaster || ""}

## Page Notes
${page?.notes || ""}

## Relevant Glossary
${glossaryMarkdown}

## Current Locale Copy
${localeCopy || ""}

## Automatic QA
Score: ${qaResult.score}
High: ${qaResult.high}
Medium: ${qaResult.medium}
Words: ${qaResult.wordsCount}

${issuesMarkdown}

## Translation Prompt
${prompt}
`;
}

function buildLanguageHandoffPackage({ language, languageGuide, terms, meaningMemory, uiPhrases }) {
  const glossaryMarkdown = terms.map((row) => [
    `### ${row.id}`,
    `Category: ${row.category}`,
    `RU source: ${row.sourceRu}`,
    `EN master: ${row.masterEn}`,
    `${language.code}: ${row.locales?.[language.code] || row.masterEn}`,
    `Meaning: ${row.meaning}`,
    `Rule: ${row.keepEnglish ? "Keep English/Web3 term where specified." : "Translate by approved locale wording."}`,
    `Avoid: ${row.forbidden}`,
  ].join("\n")).join("\n\n");

  const meaningMarkdown = meaningMemory.map((phrase) => [
    `### ${phrase.topic} / ${phrase.id}`,
    `RU: ${phrase.ruSource}`,
    `EN: ${phrase.enMaster}`,
    `${language.code}: ${phrase.value}`,
  ].join("\n")).join("\n\n");

  const uiMarkdown = uiPhrases.map((phrase) => (
    `- ${phrase.context} / ${phrase.id}: ${phrase.value} (RU: ${phrase.ruSource}; EN: ${phrase.enMaster})`
  )).join("\n");

  const qaMarkdown = localizationQaChecks.map((row) => (
    `- [${row.severity}] ${row.check}: ${row.question}`
  )).join("\n");

  const forbiddenMarkdown = localizationForbiddenPatterns.map((pattern) => {
    const termsForLocale = [...(pattern.terms?.[language.code] || []), ...(language.code === "en" ? [] : pattern.terms?.en || [])];
    return [
      `### ${pattern.topic} / ${pattern.id}`,
      `Severity: ${pattern.severity}`,
      `Rule: ${pattern.message}`,
      `Forbidden examples: ${termsForLocale.join(", ") || "Use the English/global forbidden examples."}`,
    ].join("\n");
  }).join("\n\n");

  return `# Atlas Localization Handoff Pack

Target language: ${language.nativeName} (${language.englishName}, ${language.code})
Role: ${language.role}
Status: ${language.status}

## Language Guide
Tone: ${languageGuide?.tone || ""}
Keep: ${languageGuide?.keep || ""}
Avoid: ${languageGuide?.avoid || ""}
Note: ${languageGuide?.note || ""}

## Core Rules
${localizationCoreRules.map((rule) => `- ${rule}`).join("\n")}

## Meaning Memory
${meaningMarkdown}

## UI Phrase Bank
${uiMarkdown}

## Full Glossary
${glossaryMarkdown}

## Forbidden Patterns
${forbiddenMarkdown}

## QA Checklist
${qaMarkdown}

## Working Instruction
Translate from the EN master while preserving the RU source meaning. Keep Atlas brand terms, Web3 terms, numbers, token names, blockchain names, contract addresses and percentages unchanged unless the glossary explicitly defines a local form. Do not introduce investment, deposit, guaranteed-profit, salary or risk-free language.
`;
}

function buildLanguageQaReport({ language, pages, localeStatusById }) {
  const rows = pages.map((page) => {
    const locale = page.locales?.[language.code] || makeLocaleProgress()[language.code];
    const pageContext = `${page.title}\n${page.path}\n${page.ruSource}\n${page.enMaster}\n${page.notes}`;
    const qa = analyzeLocalizedText(locale.copy || "", language.code, pageContext);
    return {
      page,
      locale,
      qa,
      statusLabel: localeStatusById.get(locale.status)?.label || locale.status,
      isEmpty: !String(locale.copy || "").trim(),
    };
  });

  const empty = rows.filter((row) => row.isEmpty).length;
  const needsFix = rows.filter((row) => row.locale.status === "needs-fix" || row.qa.high > 0).length;
  const reviewed = rows.filter((row) => ["native-reviewed", "published"].includes(row.locale.status)).length;
  const averageScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.qa.score, 0) / rows.length) : 0;

  const markdown = `# Atlas Localization QA Report

Language: ${language.nativeName} (${language.englishName}, ${language.code})
Pages: ${rows.length}
Native/published: ${reviewed}
Needs fix: ${needsFix}
Empty locale copy: ${empty}
Average QA score: ${averageScore}

| Page | Path | Status | Words | Score | High | Medium | Reviewer | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
${rows.map((row) => `| ${row.page.title} | ${row.page.path} | ${row.statusLabel} | ${row.qa.wordsCount} | ${row.qa.score} | ${row.qa.high} | ${row.qa.medium} | ${row.locale.reviewer || "-"} | ${(row.locale.notes || "-").replace(/\|/g, "/")} |`).join("\n")}

## Issues
${rows.map((row) => {
    if (row.isEmpty) return `### ${row.page.title}\n- [High] Missing locale copy: no text saved for ${language.code}.`;
    if (!row.qa.issues.length) return `### ${row.page.title}\n- No automatic QA issues found.`;
    return `### ${row.page.title}\n${row.qa.issues.map((issue) => `- [${issue.severity}] ${issue.topic}: ${issue.message} (${issue.term})`).join("\n")}`;
  }).join("\n\n")}
`;

  return {
    rows,
    summary: { pages: rows.length, reviewed, needsFix, empty, averageScore },
    markdown,
  };
}

function buildEnglishMasterGate({ pages }) {
  const englishLanguage = atlasLocalizationLanguages.find((language) => language.code === "en") || atlasLocalizationLanguages[1];
  const rows = pages.map((page) => {
    const context = `${page.title}\n${page.path}\n${page.ruSource}\n${page.notes}`;
    const qa = analyzeLocalizedText(page.enMaster || "", "en", context);
    const ruWords = page.ruSource.trim() ? page.ruSource.trim().split(/\s+/).length : 0;
    const enWords = page.enMaster.trim() ? page.enMaster.trim().split(/\s+/).length : 0;
    const isMissing = !String(page.enMaster || "").trim();
    const isTooShort = !isMissing && ruWords > 20 && enWords < Math.max(8, Math.round(ruWords * 0.25));
    const hasRisk = qa.high > 0;
    const status = isMissing ? "Missing" : hasRisk ? "Risk" : isTooShort ? "Too short" : "Ready";
    return { page, qa, ruWords, enWords, isMissing, isTooShort, hasRisk, status };
  });

  const missing = rows.filter((row) => row.isMissing).length;
  const risky = rows.filter((row) => row.hasRisk).length;
  const tooShort = rows.filter((row) => row.isTooShort).length;
  const ready = rows.filter((row) => row.status === "Ready").length;

  const markdown = `# Atlas EN Master Gate

Purpose: verify that Russian source meanings have a clear, safe English master before other locales are translated.
Pages: ${rows.length}
Ready: ${ready}
Missing EN master: ${missing}
Risky wording: ${risky}
Too short: ${tooShort}

| Page | Path | Status | RU words | EN words | QA score | High | Medium | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows.map((row) => `| ${row.page.title} | ${row.page.path} | ${row.status} | ${row.ruWords} | ${row.enWords} | ${row.isMissing ? "-" : row.qa.score} | ${row.qa.high} | ${row.qa.medium} | ${(row.page.notes || "-").replace(/\|/g, "/")} |`).join("\n")}

## Page Review
${rows.map((row) => {
    if (row.isMissing) return `### ${row.page.title}\n- [High] EN master is missing. Create canonical English copy from the RU source before translating other locales.`;
    const warnings = [];
    if (row.isTooShort) warnings.push("- [Medium] EN master may be too short compared with the RU source. Check that no meaning was lost.");
    row.qa.issues.forEach((issue) => warnings.push(`- [${issue.severity}] ${issue.topic}: ${issue.message} (${issue.term})`));
    return `### ${row.page.title}\n${warnings.length ? warnings.join("\n") : "- EN master looks ready for locale translation."}`;
  }).join("\n\n")}

## EN Master Prompt
${localizationPrompts.englishMaster}
`;

  return {
    language: englishLanguage,
    rows,
    summary: { pages: rows.length, ready, missing, risky, tooShort },
    markdown,
  };
}

function getPageTerminology(page) {
  const context = normalizeSearchText(`${page?.title || ""} ${page?.path || ""} ${page?.ruSource || ""} ${page?.enMaster || ""} ${page?.notes || ""}`);
  return localizationTermRows.filter((row) => (
    [row.id, row.sourceRu, row.masterEn, row.meaning]
      .map(normalizeSearchText)
      .some((hint) => hint && context.includes(hint))
  ));
}

function buildPageTerminologyPackage({ page, language, terms }) {
  const rows = terms.map((row) => [
    `### ${row.id}`,
    `Category: ${row.category}`,
    `RU source: ${row.sourceRu}`,
    `EN master: ${row.masterEn}`,
    `${language.code}: ${row.locales?.[language.code] || row.masterEn}`,
    `Keep English: ${row.keepEnglish ? "yes" : "no"}`,
    `Meaning: ${row.meaning}`,
    `Avoid: ${row.forbidden}`,
  ].join("\n")).join("\n\n");

  return `# Atlas Page Terminology Pack

Page: ${page?.title || ""}
Path: ${page?.path || ""}
Target language: ${language.nativeName} (${language.englishName}, ${language.code})
Terms found: ${terms.length}

## Page Source
RU source:
${page?.ruSource || ""}

EN master:
${page?.enMaster || ""}

Notes:
${page?.notes || ""}

## Terms To Preserve
${rows || "- No glossary terms detected automatically. Review the page manually and add missing terms to the Atlas glossary if needed."}

## Instruction
Use these terms as the page-level glossary. If the page uses a product, Web3, economic, partner, governance or legal concept that is not listed here, add it to the glossary before translating the page.
`;
}

function downloadTextFile(filename, content, type = "text/plain") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
  const coverageRows = useMemo(() => {
    const trackedCodes = atlasLocalizationLanguages.filter((language) => !["ru", "en"].includes(language.code)).map((language) => language.code);
    return translationPages.map((page) => {
      const completed = trackedCodes.filter((code) => ["native-reviewed", "published"].includes(page.locales?.[code]?.status)).length;
      const needsFix = trackedCodes.filter((code) => page.locales?.[code]?.status === "needs-fix").length;
      const translated = trackedCodes.filter((code) => ["translated", "ai-reviewed", "native-reviewed", "published"].includes(page.locales?.[code]?.status)).length;
      return {
        ...page,
        completed,
        needsFix,
        translated,
        total: trackedCodes.length,
        percent: trackedCodes.length ? Math.round((completed / trackedCodes.length) * 100) : 0,
      };
    });
  }, [translationPages]);
  const englishMasterGate = useMemo(() => buildEnglishMasterGate({ pages: translationPages }), [translationPages]);
  const englishMasterGateJson = useMemo(() => JSON.stringify({
    language: englishMasterGate.language,
    summary: englishMasterGate.summary,
    rows: englishMasterGate.rows.map((row) => ({
      pageId: row.page.id,
      title: row.page.title,
      path: row.page.path,
      priority: row.page.priority,
      status: row.status,
      ruWords: row.ruWords,
      enWords: row.enWords,
      qaScore: row.isMissing ? null : row.qa.score,
      high: row.qa.high,
      medium: row.qa.medium,
      issues: row.qa.issues,
      notes: row.page.notes,
    })),
    exportedAt: new Date().toISOString(),
  }, null, 2), [englishMasterGate]);
  const qaSourceText = qaText || activeLocaleCopy;
  const qaPageContext = `${activePage?.title || ""}\n${activePage?.path || ""}\n${activePage?.ruSource || ""}\n${activePage?.enMaster || ""}\n${activePage?.notes || ""}`;
  const qaResult = useMemo(() => analyzeLocalizedText(qaSourceText, activeLanguage.code, qaPageContext), [qaSourceText, activeLanguage.code, qaPageContext]);
  const activePageTerms = useMemo(() => getPageTerminology(activePage), [activePage]);
  const activePageTerminologyPackage = useMemo(() => buildPageTerminologyPackage({
    page: activePage,
    language: activeLanguage,
    terms: activePageTerms,
  }), [activePage, activeLanguage, activePageTerms]);
  const activePageTerminologyJson = useMemo(() => JSON.stringify({
    page: activePage ? {
      id: activePage.id,
      title: activePage.title,
      path: activePage.path,
      priority: activePage.priority,
      owner: activePage.owner,
    } : null,
    language: activeLanguage,
    terms: activePageTerms.map((row) => ({
      id: row.id,
      category: row.category,
      sourceRu: row.sourceRu,
      masterEn: row.masterEn,
      locale: row.locales?.[activeLanguage.code] || row.masterEn,
      keepEnglish: row.keepEnglish,
      meaning: row.meaning,
      forbidden: row.forbidden,
    })),
    exportedAt: new Date().toISOString(),
  }, null, 2), [activePage, activeLanguage, activePageTerms]);
  const translationPrompt = `${localizationPrompts.translate}\n\nTarget language: ${activeLanguage.englishName} (${activeLanguage.nativeName}).\nLocale code: ${activeLanguage.code}.\nUse approved Atlas terms for this locale. If a term sounds unnatural, keep the English Web3 term and add a short explanation.`;
  const activeLocalePrompt = `${translationPrompt}\n\nPage: ${activePage?.title || ""}\nPath: ${activePage?.path || ""}\n\nRU source of meaning:\n${activePage?.ruSource || ""}\n\nEN master copy:\n${activePage?.enMaster || ""}\n\nPage notes:\n${activePage?.notes || ""}`;
  const activeUiPhrasePack = useMemo(() => localizationUiPhrases.map((phrase) => ({
    id: phrase.id,
    context: phrase.context,
    ruSource: phrase.ruSource,
    enMaster: phrase.enMaster,
    value: phrase.translations?.[activeLanguage.code] || phrase.enMaster,
  })), [activeLanguage.code]);
  const activeUiPhraseMarkdown = useMemo(() => activeUiPhrasePack
    .map((phrase) => `- ${phrase.context}: ${phrase.value} (EN: ${phrase.enMaster})`)
    .join("\n"), [activeUiPhrasePack]);
  const activeMeaningMemoryPack = useMemo(() => localizationMeaningMemory.map((phrase) => ({
    id: phrase.id,
    topic: phrase.topic,
    ruSource: phrase.ruSource,
    enMaster: phrase.enMaster,
    value: phrase.translations?.[activeLanguage.code] || phrase.enMaster,
  })), [activeLanguage.code]);
  const activeMeaningMemoryMarkdown = useMemo(() => activeMeaningMemoryPack
    .map((phrase) => `## ${phrase.topic} / ${phrase.id}\nRU: ${phrase.ruSource}\nEN: ${phrase.enMaster}\n${activeLanguage.code}: ${phrase.value}`)
    .join("\n\n"), [activeMeaningMemoryPack, activeLanguage.code]);
  const languageHandoffPackage = useMemo(() => buildLanguageHandoffPackage({
    language: activeLanguage,
    languageGuide: activeLanguageGuide,
    terms: localizationTermRows,
    meaningMemory: activeMeaningMemoryPack,
    uiPhrases: activeUiPhrasePack,
  }), [activeLanguage, activeLanguageGuide, activeMeaningMemoryPack, activeUiPhrasePack]);
  const languageHandoffJson = useMemo(() => JSON.stringify({
    language: activeLanguage,
    languageGuide: activeLanguageGuide,
    coreRules: localizationCoreRules,
    qaChecks: localizationQaChecks,
    forbiddenPatterns: localizationForbiddenPatterns.map((pattern) => ({
      id: pattern.id,
      severity: pattern.severity,
      topic: pattern.topic,
      message: pattern.message,
      terms: [...(pattern.terms?.[activeLanguage.code] || []), ...(activeLanguage.code === "en" ? [] : pattern.terms?.en || [])],
    })),
    meaningMemory: activeMeaningMemoryPack,
    uiPhrases: activeUiPhrasePack,
    glossary: localizationTermRows.map((row) => ({
      id: row.id,
      category: row.category,
      sourceRu: row.sourceRu,
      masterEn: row.masterEn,
      locale: row.locales?.[activeLanguage.code] || row.masterEn,
      meaning: row.meaning,
      keepEnglish: row.keepEnglish,
      forbidden: row.forbidden,
    })),
    exportedAt: new Date().toISOString(),
  }, null, 2), [activeLanguage, activeLanguageGuide, activeMeaningMemoryPack, activeUiPhrasePack]);
  const languageQaReport = useMemo(() => buildLanguageQaReport({
    language: activeLanguage,
    pages: translationPages,
    localeStatusById,
  }), [activeLanguage, translationPages, localeStatusById]);
  const languageQaReportJson = useMemo(() => JSON.stringify({
    language: activeLanguage,
    summary: languageQaReport.summary,
    rows: languageQaReport.rows.map((row) => ({
      pageId: row.page.id,
      title: row.page.title,
      path: row.page.path,
      status: row.locale.status,
      statusLabel: row.statusLabel,
      reviewer: row.locale.reviewer,
      notes: row.locale.notes,
      wordsCount: row.qa.wordsCount,
      score: row.qa.score,
      high: row.qa.high,
      medium: row.qa.medium,
      issues: row.qa.issues,
      isEmpty: row.isEmpty,
    })),
    exportedAt: new Date().toISOString(),
  }, null, 2), [activeLanguage, languageQaReport]);
  const translationPackage = useMemo(() => buildTranslationPackage({
    page: activePage,
    language: activeLanguage,
    languageGuide: activeLanguageGuide,
    localeCopy: activeLocaleCopy,
    qaResult,
    prompt: activeLocalePrompt,
  }), [activePage, activeLanguage, activeLanguageGuide, activeLocaleCopy, qaResult, activeLocalePrompt]);
  const translationPackageJson = useMemo(() => JSON.stringify({
    page: activePage,
    language: activeLanguage,
    languageGuide: activeLanguageGuide,
    localeCopy: activeLocaleCopy,
    qa: qaResult,
    prompt: activeLocalePrompt,
    exportedAt: new Date().toISOString(),
  }, null, 2), [activePage, activeLanguage, activeLanguageGuide, activeLocaleCopy, qaResult, activeLocalePrompt]);

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

  function applyQaResultToActiveLocale() {
    if (!activePage) return;
    const nextStatus = qaResult.high > 0 ? "needs-fix" : "ai-reviewed";
    const nextNotes = qaResult.issues.length
      ? `AI QA: ${qaResult.high} high / ${qaResult.medium} medium. ${qaResult.issues.slice(0, 3).map((issue) => `${issue.topic}: ${issue.term}`).join("; ")}`
      : `AI QA: no automatic issues found. Score ${qaResult.score}.`;
    setTranslationPages((pages) => pages.map((page) => {
      if (page.id !== activePage.id) return page;
      return {
        ...page,
        locales: {
          ...page.locales,
          [activeLanguage.code]: {
            ...page.locales?.[activeLanguage.code],
            status: nextStatus,
            notes: nextNotes,
          },
        },
      };
    }));
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

      <div className="analytics-localization-en-gate">
        <div className="analytics-localization-en-gate-head">
          <div>
            <span className="analytics-kicker">EN Master Gate</span>
            <h3>Русский смысл → английский master copy</h3>
            <p>Перед переводом на остальные языки каждая страница должна иметь безопасный английский master: без буквальной кальки, инвестиционных обещаний и потери смысла.</p>
          </div>
          <div className="analytics-localization-report-actions">
            <button type="button" onClick={() => copyToClipboard(englishMasterGate.markdown)}>Copy EN gate</button>
            <button type="button" onClick={() => downloadTextFile("atlas-en-master-gate.md", englishMasterGate.markdown, "text/markdown")}>Download MD</button>
            <button type="button" onClick={() => downloadTextFile("atlas-en-master-gate.json", englishMasterGateJson, "application/json")}>Download JSON</button>
          </div>
        </div>
        <div className="analytics-localization-report-stats">
          <article>
            <span>Ready</span>
            <strong>{englishMasterGate.summary.ready}/{englishMasterGate.summary.pages}</strong>
          </article>
          <article>
            <span>Missing EN</span>
            <strong>{englishMasterGate.summary.missing}</strong>
          </article>
          <article>
            <span>Risky wording</span>
            <strong>{englishMasterGate.summary.risky}</strong>
          </article>
          <article>
            <span>Too short</span>
            <strong>{englishMasterGate.summary.tooShort}</strong>
          </article>
        </div>
        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-localization-en-gate-table">
            <thead>
              <tr>
                <th>Страница</th>
                <th>Status</th>
                <th>RU words</th>
                <th>EN words</th>
                <th>QA</th>
              </tr>
            </thead>
            <tbody>
              {englishMasterGate.rows.map((row) => (
                <tr key={row.page.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-localization-report-page"
                      onClick={() => setActivePageId(row.page.id)}
                    >
                      <strong>{row.page.title}</strong>
                      <span>{row.page.path} · {row.page.priority}</span>
                    </button>
                  </td>
                  <td>
                    <span className={`analytics-localization-en-status analytics-localization-en-status-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.ruWords}</td>
                  <td>{row.enWords}</td>
                  <td>{row.isMissing ? "Create EN master" : `${row.qa.score} · ${row.qa.high} high / ${row.qa.medium} medium`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="analytics-localization-coverage">
        <div className="analytics-localization-section-head">
          <div>
            <span className="analytics-kicker">Coverage Matrix</span>
            <h3>Страницы и языки: что уже готово</h3>
          </div>
          <p>Клик по статусу открывает нужную страницу и язык в редакторе ниже. Матрица показывает, где перевод начат, где нужен native review, а где есть правки.</p>
        </div>
        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-localization-coverage-table">
            <thead>
              <tr>
                <th>Страница</th>
                <th>Готовность</th>
                {atlasLocalizationLanguages.map((language) => (
                  <th key={language.code}>{language.flag} {language.code.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coverageRows.map((page) => (
                <tr key={page.id}>
                  <td>
                    <button
                      type="button"
                      className="analytics-localization-coverage-page"
                      onClick={() => setActivePageId(page.id)}
                    >
                      <strong>{page.title}</strong>
                      <span>{page.path} · {page.priority}</span>
                    </button>
                  </td>
                  <td>
                    <div className="analytics-localization-coverage-progress">
                      <strong>{page.percent}%</strong>
                      <span>{page.completed}/{page.total} native/published · {page.translated} started · {page.needsFix} fix</span>
                    </div>
                  </td>
                  {atlasLocalizationLanguages.map((language) => {
                    const progress = page.locales?.[language.code] || makeLocaleProgress()[language.code];
                    const status = localeStatusById.get(progress.status);
                    const statusTone = status?.tone || "neutral";
                    return (
                      <td key={language.code}>
                        <button
                          type="button"
                          title={`${language.nativeName}: ${status?.label || progress.status}`}
                          className={`analytics-localization-coverage-pill analytics-localization-status-${statusTone}`}
                          onClick={() => {
                            setActivePageId(page.id);
                            setActiveLanguageCode(language.code);
                          }}
                        >
                          {statusShortLabels[progress.status] || progress.status}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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

              <div className="analytics-localization-page-terms">
                <div className="analytics-localization-page-terms-head">
                  <div>
                    <span className="analytics-kicker">Page Terminology</span>
                    <h4>Термины этой страницы</h4>
                  </div>
                  <div className="analytics-localization-page-terms-actions">
                    <button type="button" onClick={() => copyToClipboard(activePageTerminologyPackage)}>Copy terms</button>
                    <button type="button" onClick={() => downloadTextFile(`atlas-${activePage.id}-${activeLanguage.code}-terms.md`, activePageTerminologyPackage, "text/markdown")}>Download MD</button>
                    <button type="button" onClick={() => downloadTextFile(`atlas-${activePage.id}-${activeLanguage.code}-terms.json`, activePageTerminologyJson, "application/json")}>Download JSON</button>
                  </div>
                </div>
                {activePageTerms.length ? (
                  <div className="analytics-localization-page-term-list">
                    {activePageTerms.map((term) => (
                      <article key={term.id}>
                        <strong>{term.masterEn}</strong>
                        <span>{term.category} · {term.keepEnglish ? "keep EN" : "localized"}</span>
                        <p>{term.locales?.[activeLanguage.code] || term.masterEn}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="analytics-localization-page-terms-empty">Автоматически термины не найдены. Проверьте страницу вручную и добавьте новые понятия в glossary перед переводом.</p>
                )}
              </div>

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
                <div className="analytics-localization-export-actions">
                  <button type="button" onClick={() => copyToClipboard(translationPackage)}>Copy package</button>
                  <button type="button" onClick={() => downloadTextFile(`atlas-${activePage.id}-${activeLanguage.code}-localization.md`, translationPackage, "text/markdown")}>Download MD</button>
                  <button type="button" onClick={() => downloadTextFile(`atlas-${activePage.id}-${activeLanguage.code}-localization.json`, translationPackageJson, "application/json")}>Download JSON</button>
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
          <div className="analytics-localization-qa-actions">
            <div className="analytics-localization-qa-score">
              <strong>{qaResult.score}</strong>
              <span>{activeLanguage.flag} {activeLanguage.nativeName} · {qaResult.wordsCount} words · {qaResult.high} high / {qaResult.medium} medium</span>
            </div>
            <button type="button" onClick={applyQaResultToActiveLocale} disabled={!qaSourceText.trim()}>Apply QA to locale</button>
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
            <div className="analytics-localization-handoff-actions">
              <button type="button" onClick={() => copyToClipboard(languageHandoffPackage)}>Copy handoff MD</button>
              <button type="button" onClick={() => downloadTextFile(`atlas-localization-${activeLanguage.code}-handoff.md`, languageHandoffPackage, "text/markdown")}>Download MD</button>
              <button type="button" onClick={() => downloadTextFile(`atlas-localization-${activeLanguage.code}-handoff.json`, languageHandoffJson, "application/json")}>Download JSON</button>
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

          <div className="analytics-localization-language-report">
            <div className="analytics-localization-language-report-head">
              <div>
                <span className="analytics-kicker">Locale QA Report</span>
                <h3>Состояние перевода по всем страницам</h3>
              </div>
              <div className="analytics-localization-report-actions">
                <button type="button" onClick={() => copyToClipboard(languageQaReport.markdown)}>Copy report</button>
                <button type="button" onClick={() => downloadTextFile(`atlas-localization-${activeLanguage.code}-qa-report.md`, languageQaReport.markdown, "text/markdown")}>Download MD</button>
                <button type="button" onClick={() => downloadTextFile(`atlas-localization-${activeLanguage.code}-qa-report.json`, languageQaReportJson, "application/json")}>Download JSON</button>
              </div>
            </div>
            <div className="analytics-localization-report-stats">
              <article>
                <span>QA score</span>
                <strong>{languageQaReport.summary.averageScore}</strong>
              </article>
              <article>
                <span>Native/published</span>
                <strong>{languageQaReport.summary.reviewed}/{languageQaReport.summary.pages}</strong>
              </article>
              <article>
                <span>Needs fix</span>
                <strong>{languageQaReport.summary.needsFix}</strong>
              </article>
              <article>
                <span>Empty copy</span>
                <strong>{languageQaReport.summary.empty}</strong>
              </article>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-localization-report-table">
                <thead>
                  <tr>
                    <th>Страница</th>
                    <th>Статус</th>
                    <th>Words</th>
                    <th>Score</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {languageQaReport.rows.map((row) => (
                    <tr key={row.page.id}>
                      <td>
                        <button
                          type="button"
                          className="analytics-localization-report-page"
                          onClick={() => setActivePageId(row.page.id)}
                        >
                          <strong>{row.page.title}</strong>
                          <span>{row.page.path}</span>
                        </button>
                      </td>
                      <td>{row.statusLabel}</td>
                      <td>{row.qa.wordsCount}</td>
                      <td><strong className={row.qa.high > 0 || row.isEmpty ? "analytics-localization-report-score-danger" : ""}>{row.isEmpty ? "—" : row.qa.score}</strong></td>
                      <td>{row.isEmpty ? "Missing copy" : `${row.qa.high} high / ${row.qa.medium} medium`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

          <div className="analytics-localization-memory-bank">
            <div className="analytics-localization-memory-bank-head">
              <div>
                <span className="analytics-kicker">Meaning Memory</span>
                <h3>Готовые смысловые фразы Atlas</h3>
              </div>
              <button type="button" onClick={() => copyToClipboard(activeMeaningMemoryMarkdown)}>Copy meaning pack</button>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-localization-memory-table">
                <thead>
                  <tr>
                    <th>Тема</th>
                    <th>RU смысл</th>
                    <th>EN master</th>
                    <th>{activeLanguage.nativeName}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMeaningMemoryPack.map((phrase) => (
                    <tr key={phrase.id}>
                      <td>
                        <strong>{phrase.topic}</strong>
                        <span>{phrase.id}</span>
                      </td>
                      <td>{phrase.ruSource}</td>
                      <td>{phrase.enMaster}</td>
                      <td className="analytics-localization-approved-term">{phrase.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analytics-localization-phrase-bank">
            <div className="analytics-localization-phrase-bank-head">
              <div>
                <span className="analytics-kicker">UI Phrase Bank</span>
                <h3>Короткие фразы интерфейса</h3>
              </div>
              <button type="button" onClick={() => copyToClipboard(activeUiPhraseMarkdown)}>Copy phrases</button>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-localization-phrase-table">
                <thead>
                  <tr>
                    <th>Контекст</th>
                    <th>RU source</th>
                    <th>EN master</th>
                    <th>{activeLanguage.nativeName}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUiPhrasePack.map((phrase) => (
                    <tr key={phrase.id}>
                      <td>
                        <strong>{phrase.context}</strong>
                        <span>{phrase.id}</span>
                      </td>
                      <td>{phrase.ruSource}</td>
                      <td>{phrase.enMaster}</td>
                      <td className="analytics-localization-approved-term">{phrase.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
