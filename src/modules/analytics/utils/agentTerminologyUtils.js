import { saveServerContent } from "../services/contentStore";
import { AGENT_TERMINOLOGY_STORAGE_KEY, defaultTerminologySections, defaultTerminologyTemplate } from "../data/agentTerminologyData";

function hydrateRows(defaultRows, savedRows = [], deletedRowIds = []) {
  const deletedRows = new Set(deletedRowIds);
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.filter((defaultRow) => !deletedRows.has(defaultRow.id)).map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      term: savedRow.term || defaultRow.term,
      description: savedRow.description || defaultRow.description,
      comment: savedRow.comment || savedRow.source || defaultRow.comment,
      review: savedRow.review || defaultRow.review || "",
      approved: Boolean(savedRow.approved),
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id) && !deletedRows.has(row.id))
    .map((row) => ({
      ...row,
      comment: row.comment || row.source || "",
      review: row.review || "",
      approved: Boolean(row.approved),
    }));

  return [...hydratedDefaultRows, ...customRows];
}

export function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultTerminologyTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultTerminologySections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      deletedRowIds: savedSection.deletedRowIds || [],
      rows: hydrateRows(defaultSection.rows, savedSection.rows, savedSection.deletedRowIds),
    };
  });

  return { sections };
}

export function readStoredTerminology() {
  if (typeof window === "undefined") return defaultTerminologyTemplate;

  try {
    const saved = window.localStorage.getItem(AGENT_TERMINOLOGY_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultTerminologyTemplate;
  } catch {
    return defaultTerminologyTemplate;
  }
}

export function persistTerminology(template) {
  try {
    window.localStorage.setItem(AGENT_TERMINOLOGY_STORAGE_KEY, JSON.stringify(template));
    saveServerContent(AGENT_TERMINOLOGY_STORAGE_KEY, template);
  } catch {
    // Терминология останется доступна до перезагрузки даже без localStorage.
  }
}

export function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    term: "",
    description: "",
    comment: "",
    review: "Новый термин: добавь здесь мой/редакторский вариант термина, пометку для перевода или что нужно уточнить.",
    approved: false,
  };
}
