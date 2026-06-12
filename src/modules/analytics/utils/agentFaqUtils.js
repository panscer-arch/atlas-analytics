import { saveServerContent } from "../services/contentStore";
import { AGENT_FAQ_STORAGE_KEY, defaultFaqSections, defaultFaqTemplate } from "../data/agentFaqData";

export function hydrateRows(defaultRows, savedRows = [], deletedRowIds = []) {
  const deletedRows = new Set(deletedRowIds);
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.filter((defaultRow) => !deletedRows.has(defaultRow.id)).map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      question: savedRow.question || defaultRow.question,
      answer: savedRow.answer || defaultRow.answer,
      source: savedRow.source || savedRow.comment || defaultRow.source,
      review: savedRow.review || defaultRow.review || "",
      approved: Boolean(savedRow.approved),
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id) && !deletedRows.has(row.id))
    .map((row) => ({ ...row, source: row.source || row.comment || "", review: row.review || "", approved: Boolean(row.approved) }));

  return [...hydratedDefaultRows, ...customRows];
}

export function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultFaqTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultFaqSections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      deletedRowIds: savedSection.deletedRowIds || [],
      rows: hydrateRows(defaultSection.rows, savedSection.rows, savedSection.deletedRowIds),
    };
  });
  const customSections = template.sections
    .filter((section) => !defaultFaqSections.some((defaultSection) => defaultSection.id === section.id))
    .map((section) => ({
      ...section,
      deletedRowIds: section.deletedRowIds || [],
      rows: (section.rows || [])
        .filter((row) => !(section.deletedRowIds || []).includes(row.id))
        .map((row) => ({ ...row, source: row.source || row.comment || "", review: row.review || "", approved: Boolean(row.approved) })),
    }));

  return { sections: [...sections, ...customSections] };
}

export function readStoredFaq() {
  if (typeof window === "undefined") return defaultFaqTemplate;

  try {
    const saved = window.localStorage.getItem(AGENT_FAQ_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultFaqTemplate;
  } catch {
    return defaultFaqTemplate;
  }
}

export function persistFaq(template) {
  try {
    window.localStorage.setItem(AGENT_FAQ_STORAGE_KEY, JSON.stringify(template));
    saveServerContent(AGENT_FAQ_STORAGE_KEY, template);
  } catch {
    // FAQ останется доступен до перезагрузки даже без localStorage.
  }
}

export function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question: "",
    answer: "",
    source: "",
    review: "Новый вопрос: после добавления ответа укажи здесь редакторскую правку, ссылку на документ или пометку, что нужно уточнить.",
    approved: false,
  };
}
