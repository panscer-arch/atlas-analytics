import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent } from "../services/contentStore";
import { AGENT_KNOWLEDGE_STORAGE_KEY } from "../data/agentKnowledgeData";
import { createNote, createRow, hydrateTemplate, persistTemplate, readStoredTemplate } from "../utils/agentKnowledgeUtils";

function AgentKnowledgeTemplate() {
  const [template, setTemplate] = useState(readStoredTemplate);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_KNOWLEDGE_STORAGE_KEY).then((savedTemplate) => {
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
      persistTemplate(next);
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
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: section.rows.filter((row) => row.id !== rowId) } : section)),
    }));
  }

  function updateNote(noteId, field, value) {
    updateTemplate((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === noteId ? { ...note, [field]: value } : note)),
    }));
  }

  function addNote() {
    updateTemplate((current) => ({ ...current, notes: [...current.notes, createNote()] }));
  }

  function removeNote(noteId) {
    updateTemplate((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== noteId) }));
  }

  return (
    <section className="analytics-surface analytics-agent-template">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Параметры AI-агента</span>
          <h2 className="analytics-agent-template-title">Параметры Atlas System</h2>
          <p className="analytics-page-subtitle">
            Русскоязычная база параметров для обучения AI-агента Atlas System. В третьем столбике можно хранить ссылку на документ, источник или короткое описание.
          </p>
        </div>
      </div>

      <div className="analytics-agent-template-grid">
        {template.sections.map((section) => (
          <div key={section.id} className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <h3>{section.title}</h3>
              <AnalyticsActionButton variant="primary" size="sm" onClick={() => addRow(section.id)}>
                + строка
              </AnalyticsActionButton>
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-agent-template-table">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Значение</th>
                    <th>Ссылка / описание</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.parameter}
                          onChange={(event) => updateRow(section.id, row.id, "parameter", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.value}
                          onChange={(event) => updateRow(section.id, row.id, "value", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.source || ""}
                          onChange={(event) => updateRow(section.id, row.id, "source", event.target.value)}
                          placeholder="Ссылка на документ или пояснение по значению"
                          rows="2"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(section.id, row.id)} title="Удалить строку">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-agent-notes">
        <div className="analytics-agent-template-card-head">
          <h3>ДОПОЛНИТЕЛЬНЫЕ ИДЕИ / ЗАМЕТКИ</h3>
          <AnalyticsActionButton variant="primary" size="sm" onClick={addNote}>
            + блок
          </AnalyticsActionButton>
        </div>
        <div className="analytics-agent-notes-grid">
          {template.notes.map((note) => (
            <div key={note.id} className="analytics-agent-note-card">
              <input
                className="analytics-agent-template-input analytics-agent-note-title"
                value={note.title}
                onChange={(event) => updateNote(note.id, "title", event.target.value)}
                placeholder="Название блока"
              />
              <textarea
                className="analytics-agent-template-input"
                value={note.text}
                onChange={(event) => updateNote(note.id, "text", event.target.value)}
                placeholder="Свободные идеи, заметки, спорные формулировки"
                rows="6"
              />
              <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeNote(note.id)}>
                Удалить блок
              </AnalyticsActionButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AgentKnowledgeTemplate;
