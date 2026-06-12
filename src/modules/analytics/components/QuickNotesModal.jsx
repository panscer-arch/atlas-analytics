import { useEffect, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const QUICK_NOTES_STORAGE_KEY = "atlas.analytics.quickNotes.v1";
const defaultQuickNotes = {
  text: "",
  checklist: [],
};

export function countQuickNotes(value = defaultQuickNotes) {
  const textCount = String(value?.text || "").trim() ? 1 : 0;
  const checklistCount = Array.isArray(value?.checklist)
    ? value.checklist.filter((item) => String(item?.title || "").trim() && !item.done).length
    : 0;

  return textCount + checklistCount;
}

function createChecklistItem(title = "") {
  return {
    id: `quick-note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    done: false,
  };
}

function readStoredQuickNotes() {
  if (typeof window === "undefined") return defaultQuickNotes;

  try {
    const saved = window.localStorage.getItem(QUICK_NOTES_STORAGE_KEY);
    return saved ? { ...defaultQuickNotes, ...JSON.parse(saved) } : defaultQuickNotes;
  } catch {
    return defaultQuickNotes;
  }
}

function QuickNotesModal({ isOpen, onClose, onCountChange }) {
  const [notes, setNotes] = useState(readStoredQuickNotes);
  const [draftItem, setDraftItem] = useState("");
  const [saveState, setSaveState] = useState("Сохранено");
  const saveRequestRef = useRef(0);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;

    loadServerContent(QUICK_NOTES_STORAGE_KEY).then((savedNotes) => {
      if (!isMounted || !savedNotes) return;
      setNotes({
        ...defaultQuickNotes,
        ...savedNotes,
        checklist: Array.isArray(savedNotes.checklist) ? savedNotes.checklist : [],
      });
      onCountChange?.(countQuickNotes({
        ...defaultQuickNotes,
        ...savedNotes,
        checklist: Array.isArray(savedNotes.checklist) ? savedNotes.checklist : [],
      }));
      setSaveState("Сохранено");
      try {
        window.localStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify({
          ...defaultQuickNotes,
          ...savedNotes,
          checklist: Array.isArray(savedNotes.checklist) ? savedNotes.checklist : [],
        }));
      } catch {
        // Серверная версия уже загружена в состояние модального окна.
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  function scheduleQuickNotesSave(nextNotes) {
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    setSaveState("Сохраняю...");

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveServerContent(QUICK_NOTES_STORAGE_KEY, nextNotes).then((ok) => {
        if (saveRequestRef.current !== requestId) return;
        setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
      });
    }, 500);
  }

  if (!isOpen) return null;

  function updateNotes(updater) {
    setNotes((current) => {
      const next = updater(current);
      setSaveState("Сохраняю...");

      try {
        window.localStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Быстрые заметки продолжат работать до перезагрузки страницы.
      }

      scheduleQuickNotesSave(next);
      onCountChange?.(countQuickNotes(next));
      return next;
    });
  }

  function addChecklistItem() {
    const title = draftItem.trim();
    if (!title) return;

    updateNotes((current) => ({
      ...current,
      checklist: [createChecklistItem(title), ...current.checklist],
    }));
    setDraftItem("");
  }

  function updateChecklistItem(itemId, patch) {
    updateNotes((current) => ({
      ...current,
      checklist: current.checklist.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  }

  function removeChecklistItem(itemId) {
    updateNotes((current) => ({
      ...current,
      checklist: current.checklist.filter((item) => item.id !== itemId),
    }));
  }

  return (
    <div className="analytics-quick-notes-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="analytics-quick-notes" role="dialog" aria-modal="true" aria-label="Быстрые заметки" onMouseDown={(event) => event.stopPropagation()}>
        <div className="analytics-quick-notes-head">
          <div>
            <span className="analytics-kicker">Быстрые заметки</span>
            <h2>Заметки на лету</h2>
          </div>
          <span className={`analytics-quick-notes-save ${saveState === "Ошибка сохранения" ? "is-error" : ""}`}>{saveState}</span>
          <button type="button" className="analytics-quick-notes-close" onClick={onClose} aria-label="Закрыть заметки">
            x
          </button>
        </div>

        <label className="analytics-quick-notes-field">
          <span>Свободный текст</span>
          <textarea
            className="analytics-quick-notes-textarea"
            value={notes.text}
            onChange={(event) => updateNotes((current) => ({ ...current, text: event.target.value }))}
            placeholder="Срочная мысль, идея, поручение, кусок текста, который потом перенесёшь в нужный раздел..."
            rows="12"
          />
        </label>

        <div className="analytics-quick-notes-checklist">
          <div className="analytics-quick-notes-checklist-head">
            <span>Мини-чеклист</span>
            <small>{notes.checklist.filter((item) => item.done).length}/{notes.checklist.length}</small>
          </div>

          <div className="analytics-quick-notes-add-row">
            <input
              className="analytics-launch-input"
              value={draftItem}
              onChange={(event) => setDraftItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addChecklistItem();
              }}
              placeholder="Новый пункт"
            />
            <AnalyticsActionButton variant="primary" size="sm" onClick={addChecklistItem}>
              Добавить
            </AnalyticsActionButton>
          </div>

          <div className="analytics-quick-notes-items">
            {notes.checklist.map((item) => (
              <div key={item.id} className="analytics-quick-notes-item">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(event) => updateChecklistItem(item.id, { done: event.target.checked })}
                  aria-label="Отметить пункт"
                />
                <input
                  className="analytics-launch-input"
                  value={item.title}
                  onChange={(event) => updateChecklistItem(item.id, { title: event.target.value })}
                  placeholder="Пункт чек-листа"
                />
                <button type="button" onClick={() => removeChecklistItem(item.id)} aria-label="Удалить пункт">
                  x
                </button>
              </div>
            ))}
            {!notes.checklist.length ? <p className="analytics-quick-notes-empty">Пока нет пунктов. Добавь всё срочное, что нужно не забыть.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export default QuickNotesModal;
