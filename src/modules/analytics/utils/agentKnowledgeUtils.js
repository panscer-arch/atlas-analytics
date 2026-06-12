import { saveServerContent } from "../services/contentStore";
import { AGENT_KNOWLEDGE_STORAGE_KEY, defaultKnowledgeSections, defaultKnowledgeTemplate, defaultNotes } from "../data/agentKnowledgeData";

function hydrateRows(defaultRows, savedRows = []) {
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      parameter: savedRow.parameter || defaultRow.parameter,
      value: savedRow.value || defaultRow.value,
      source: savedRow.source || savedRow.comment || defaultRow.source,
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id))
    .map((row) => ({
      ...row,
      source: row.source || row.comment || "",
    }));

  return [...hydratedDefaultRows, ...customRows];
}

export function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultKnowledgeTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultKnowledgeSections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      title: defaultSection.title,
      rows: hydrateRows(defaultSection.rows, savedSection.rows),
    };
  });
  const customSections = template.sections
    .filter((section) => !defaultKnowledgeSections.some((defaultSection) => defaultSection.id === section.id))
    .map((section) => ({
      ...section,
      rows: (section.rows || []).map((row) => ({ ...row, source: row.source || row.comment || "" })),
    }));

  return {
    sections: [...sections, ...customSections],
    notes: Array.isArray(template.notes) && template.notes.length ? template.notes : defaultNotes,
  };
}

export function readStoredTemplate() {
  if (typeof window === "undefined") {
    return defaultKnowledgeTemplate;
  }

  try {
    const saved = window.localStorage.getItem(AGENT_KNOWLEDGE_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultKnowledgeTemplate;
  } catch {
    return defaultKnowledgeTemplate;
  }
}

export function persistTemplate(template) {
  try {
    window.localStorage.setItem(AGENT_KNOWLEDGE_STORAGE_KEY, JSON.stringify(template));
    saveServerContent(AGENT_KNOWLEDGE_STORAGE_KEY, template);
  } catch {
    // Документ продолжит работать до перезагрузки страницы, даже если localStorage недоступен.
  }
}

export function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    parameter: "",
    value: "",
    source: "",
  };
}

export function createNote() {
  return {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Новый блок",
    text: "",
  };
}
