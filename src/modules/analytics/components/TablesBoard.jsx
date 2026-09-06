import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Cloud,
  ExternalLink,
  FileJson,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  loadServerContentResult,
  saveServerContent,
  unlockMarketingContent,
} from "../services/contentStore";
import {
  SOURCE_SHEET_URL,
  TABLES_CONTENT_KEY,
  TABLES_DRAFT_KEY,
  addTableColumn,
  addTableRow,
  createTablesSeed,
  deleteTableColumn,
  deleteTableRow,
  moveTableColumn,
  renameTableColumn,
  saveTablesSafely,
  tableToCsv,
  updateTableCell,
  updateTableNote,
  validateTablesDocument,
} from "../data/tablesModel";
import "../styles/tables.css";

const TABLE_TABS = [
  { id: "growth", label: "Рост системы", hint: "A1:H19" },
  { id: "liquidity", label: "План ликвидности", hint: "A25:F32" },
];

function readTableView() {
  if (typeof window === "undefined") return "growth";
  const value = new URL(window.location.href).searchParams.get("tableView");
  return TABLE_TABS.some((tab) => tab.id === value) ? value : "growth";
}

function downloadFile(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ColumnEditor({ column, canMoveLeft, canMoveRight, onRename, onMove, onDelete }) {
  return (
    <div className="tables-column-editor">
      <input
        key={`${column.id}-${column.label}`}
        defaultValue={column.label}
        maxLength={500}
        aria-label={`Название колонки ${column.label}`}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        onBlur={(event) => {
          const nextLabel = event.currentTarget.value;
          if (nextLabel.trim() === column.label) return;
          const accepted = onRename(nextLabel);
          if (!accepted) event.currentTarget.value = column.label;
        }}
      />
      <div className="tables-column-actions" aria-label={`Действия с колонкой ${column.label}`}>
        <button type="button" disabled={!canMoveLeft} onClick={() => onMove(-1)} aria-label="Сдвинуть колонку влево">
          <ArrowLeft size={15} />
        </button>
        <button type="button" disabled={!canMoveRight} onClick={() => onMove(1)} aria-label="Сдвинуть колонку вправо">
          <ArrowRight size={15} />
        </button>
        <button type="button" className="tables-icon-danger" onClick={onDelete} aria-label="Удалить колонку">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function TablesBoard() {
  const [tablesDocument, setTablesDocument] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [activeTableId, setActiveTableId] = useState(readTableView);
  const [mode, setMode] = useState("view");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [draftCandidate, setDraftCandidate] = useState(null);
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const mounted = useRef(true);

  const activeTable = tablesDocument?.tables.find((table) => table.id === activeTableId)
    || tablesDocument?.tables[0]
    || null;

  async function load() {
    setLoading(true);
    setReady(false);
    setError("");
    setMessage("");
    const result = await loadServerContentResult(TABLES_CONTENT_KEY);
    if (!mounted.current) return;
    if (result.status === 401) {
      setLocked(true);
      setLoading(false);
      return;
    }
    setLocked(false);
    if (!result.ok) {
      setError("Не удалось загрузить таблицы. Сохранение заблокировано — попробуйте ещё раз.");
      setLoading(false);
      return;
    }

    const next = result.exists ? result.value : createTablesSeed();
    const validationError = validateTablesDocument(next);
    if (validationError) {
      setError(`Серверная версия имеет неподдерживаемый формат: ${validationError}`);
      setLoading(false);
      return;
    }

    const nextBaseline = result.exists ? structuredClone(next) : null;
    setTablesDocument(structuredClone(next));
    setBaseline(nextBaseline);
    setDirty(!result.exists);
    setReady(true);
    setMessage(result.exists ? "Загружено с сервера" : "Начальная версия · ещё не сохранена");
    setUndoSnapshot(null);

    try {
      const rawDraft = window.localStorage.getItem(TABLES_DRAFT_KEY);
      const cached = rawDraft ? JSON.parse(rawDraft) : null;
      const hasDifferentDraft = cached && !validateTablesDocument(cached) && !sameValue(cached, next);
      if (hasDifferentDraft) setDraftCandidate(cached);
      else {
        setDraftCandidate(null);
        if (!result.exists) window.localStorage.setItem(TABLES_DRAFT_KEY, JSON.stringify(next));
      }
    } catch {
      setDraftCandidate(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    function onHistoryChange() {
      setActiveTableId(readTableView());
    }
    window.addEventListener("popstate", onHistoryChange);
    return () => window.removeEventListener("popstate", onHistoryChange);
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    function warn(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function persistDraft(next) {
    try {
      window.localStorage.setItem(TABLES_DRAFT_KEY, JSON.stringify(next));
      return true;
    } catch {
      setMessage("Есть несохранённые изменения · резерв браузера недоступен, скачайте JSON");
      return false;
    }
  }

  function applyMutation(mutation) {
    if (!tablesDocument || !ready || busy) return false;
    try {
      const previous = structuredClone(tablesDocument);
      const next = mutation(tablesDocument);
      setUndoSnapshot(previous);
      setTablesDocument(next);
      setDirty(!sameValue(next, baseline));
      setError("");
      setMessage("Есть несохранённые изменения");
      persistDraft(next);
      return true;
    } catch (mutationError) {
      setError(mutationError?.message || "Не удалось изменить таблицу.");
      return false;
    }
  }

  function switchTable(nextId) {
    setActiveTableId(nextId);
    setNewColumnLabel("");
    const url = new URL(window.location.href);
    url.searchParams.set("board", "tables");
    url.searchParams.set("tableView", nextId);
    window.history.pushState({}, "", url);
  }

  function undo() {
    if (!undoSnapshot) return;
    const restored = structuredClone(undoSnapshot);
    setTablesDocument(restored);
    setUndoSnapshot(null);
    const nextDirty = !sameValue(restored, baseline);
    setDirty(nextDirty);
    setError("");
    setMessage(nextDirty ? "Есть несохранённые изменения" : "Последнее изменение отменено");
    if (nextDirty) persistDraft(restored);
    else window.localStorage.removeItem(TABLES_DRAFT_KEY);
  }

  async function save() {
    if (!tablesDocument || !ready || busy || !dirty) return;
    setBusy(true);
    setError("");
    setMessage("Сохраняю…");
    const snapshot = structuredClone(tablesDocument);
    const result = await saveTablesSafely(snapshot, baseline, {
      load: () => loadServerContentResult(TABLES_CONTENT_KEY),
      save: (value) => saveServerContent(TABLES_CONTENT_KEY, value),
    });
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setMessage(result.error === "Конфликт версий" ? "Конфликт версий · перечитайте серверную версию" : result.error);
      return;
    }
    setBaseline(snapshot);
    setDirty(false);
    setUndoSnapshot(null);
    setDraftCandidate(null);
    window.localStorage.removeItem(TABLES_DRAFT_KEY);
    setMessage("Сохранено на сервере");
  }

  function exportCsv() {
    if (!activeTable) return;
    downloadFile(tableToCsv(activeTable), "text/csv;charset=utf-8", `supersus-${activeTable.id}.csv`);
  }

  function exportJson() {
    if (!tablesDocument) return;
    downloadFile(
      JSON.stringify(tablesDocument, null, 2),
      "application/json;charset=utf-8",
      `supersus-tables-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  if (locked) {
    return (
      <section className="tables-board">
        <header className="tables-hero tables-locked-hero">
          <div>
            <span className="tables-eyebrow">SuperSUS / рабочие данные</span>
            <h1>Таблицы</h1>
            <p>Раздел защищён. Введите действующий пароль SuperSUS.</p>
          </div>
          <LockKeyhole size={32} aria-hidden="true" />
        </header>
        <form
          className="tables-unlock"
          onSubmit={async (event) => {
            event.preventDefault();
            setAuthBusy(true);
            setAuthError("");
            const result = await unlockMarketingContent(password);
            setAuthBusy(false);
            if (result.ok) {
              setPassword("");
              await load();
            } else {
              setAuthError(result.status === 401 ? "Неверный пароль. Попробуйте ещё раз." : "Не удалось войти. Проверьте соединение.");
            }
          }}
        >
          <label htmlFor="tables-password">Пароль SuperSUS</label>
          <input
            id="tables-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {authError ? <p role="alert" className="tables-error">{authError}</p> : null}
          <button className="tables-button tables-button-primary" type="submit" disabled={authBusy}>
            {authBusy ? "Проверяю…" : "Открыть таблицы"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="tables-board">
      <header className="tables-hero">
        <div className="tables-heading">
          <span className="tables-eyebrow">SuperSUS / планирование</span>
          <h2>Таблицы</h2>
          <p>Планы роста и ликвидности в одном редактируемом рабочем пространстве.</p>
        </div>
        <div className="tables-hero-actions">
          <a className="tables-button" href={SOURCE_SHEET_URL} target="_blank" rel="noopener noreferrer">
            Исходная Google-таблица <ExternalLink size={16} />
          </a>
          <button className="tables-button" type="button" onClick={exportCsv} disabled={!activeTable}>
            <ArrowDownToLine size={16} /> Экспорт CSV
          </button>
          <button className="tables-button" type="button" onClick={exportJson} disabled={!tablesDocument}>
            <FileJson size={16} /> Резервная копия JSON
          </button>
        </div>
      </header>

      {loading ? <p className="tables-loading" role="status">Загружаю таблицы…</p> : null}
      {!ready && !loading ? (
        <div className="tables-load-error" role="alert">
          <p>{error}</p>
          <button className="tables-button" type="button" onClick={load}>Повторить загрузку</button>
        </div>
      ) : null}

      {ready && tablesDocument ? (
        <>
          <div className="tables-toolbar">
            <div className="tables-tabs" role="tablist" aria-label="Рабочие таблицы">
              {TABLE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTableId === tab.id}
                  onClick={() => switchTable(tab.id)}
                >
                  <span>{tab.label}</span>
                  <small>{tab.hint}</small>
                </button>
              ))}
            </div>
            <div className="tables-toolbar-actions">
              <div className="tables-mode-switch" aria-label="Режим работы">
                <button type="button" aria-pressed={mode === "view"} onClick={() => setMode("view")}>
                  Режим просмотра
                </button>
                <button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>
                  <Pencil size={15} /> Режим редактирования
                </button>
              </div>
              <button className="tables-button" type="button" onClick={undo} disabled={!undoSnapshot || busy}>
                <RotateCcw size={16} /> Отменить
              </button>
              <button className="tables-button tables-button-primary" type="button" onClick={save} disabled={!dirty || busy}>
                <Save size={16} /> {busy ? "Сохраняю…" : "Сохранить"}
              </button>
            </div>
          </div>

          <div className={`tables-save-state${error ? " is-error" : dirty ? " is-dirty" : " is-saved"}`} role="status">
            <Cloud size={16} />
            <span>{message}{dirty ? " · черновик хранится в этом браузере" : ""}</span>
          </div>

          {draftCandidate ? (
            <div className="tables-draft" role="status">
              <div>
                <strong>Найден несохранённый черновик</strong>
                <span>Выберите, какую версию открыть. Автоматической замены нет.</span>
              </div>
              <button
                className="tables-button tables-button-primary"
                type="button"
                onClick={() => {
                  setUndoSnapshot(structuredClone(tablesDocument));
                  setTablesDocument(structuredClone(draftCandidate));
                  setDirty(!sameValue(draftCandidate, baseline));
                  setDraftCandidate(null);
                  setMode("edit");
                  setMessage("Восстановлен черновик · есть несохранённые изменения");
                }}
              >
                Восстановить черновик
              </button>
              <button
                className="tables-button"
                type="button"
                onClick={() => {
                  if (baseline === null) persistDraft(tablesDocument);
                  else window.localStorage.removeItem(TABLES_DRAFT_KEY);
                  setDraftCandidate(null);
                  setMessage("Оставлена версия сервера");
                }}
              >
                Оставить версию сервера
              </button>
            </div>
          ) : null}

          {error ? <p className="tables-error" role="alert">{error}</p> : null}

          {activeTable?.notes.length ? (
            <div className="tables-notes" aria-label="Примечания к таблице">
              {activeTable.notes.map((note, index) => (
                <label key={note.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {mode === "edit" ? (
                    <textarea
                      rows={2}
                      maxLength={5000}
                      value={note.text}
                      aria-label={`Примечание ${index + 1}`}
                      onChange={(event) => applyMutation((current) => updateTableNote(current, activeTable.id, note.id, event.target.value))}
                    />
                  ) : <strong>{note.text}</strong>}
                </label>
              ))}
            </div>
          ) : null}

          <div className="tables-grid-shell" tabIndex="0" aria-label={`Таблица ${activeTable?.title || ""}. Горизонтальная прокрутка доступна.`}>
            <table className="tables-grid">
              <thead>
                <tr>
                  {activeTable?.columns.map((column, columnIndex) => (
                    <th key={column.id} scope="col">
                      {mode === "edit" ? (
                        <ColumnEditor
                          column={column}
                          canMoveLeft={columnIndex > 0}
                          canMoveRight={columnIndex < activeTable.columns.length - 1}
                          onRename={(label) => applyMutation((current) => renameTableColumn(current, activeTable.id, column.id, label))}
                          onMove={(direction) => applyMutation((current) => moveTableColumn(current, activeTable.id, column.id, direction))}
                          onDelete={() => {
                            if (window.confirm(`Удалить колонку «${column.label}» и все данные в ней?`)) {
                              applyMutation((current) => deleteTableColumn(current, activeTable.id, column.id));
                            }
                          }}
                        />
                      ) : column.label}
                    </th>
                  ))}
                  {mode === "edit" ? <th className="tables-row-actions-heading" scope="col">Строка</th> : null}
                </tr>
              </thead>
              <tbody>
                {activeTable?.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    {activeTable.columns.map((column) => (
                      <td key={column.id}>
                        {mode === "edit" ? (
                          <input
                            value={row.cells[column.id]}
                            maxLength={500}
                            aria-label={`${column.label}, строка ${rowIndex + 1}`}
                            onChange={(event) => applyMutation((current) => updateTableCell(current, activeTable.id, row.id, column.id, event.target.value))}
                          />
                        ) : <span>{row.cells[column.id] || "—"}</span>}
                      </td>
                    ))}
                    {mode === "edit" ? (
                      <td className="tables-row-actions-cell">
                        <button
                          type="button"
                          aria-label={`Удалить строку ${rowIndex + 1}`}
                          onClick={() => {
                            if (window.confirm(`Удалить строку ${rowIndex + 1}?`)) {
                              applyMutation((current) => deleteTableRow(current, activeTable.id, row.id));
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mode === "edit" ? (
            <div className="tables-edit-actions">
              <button className="tables-button" type="button" onClick={() => applyMutation((current) => addTableRow(current, activeTable.id))}>
                <Plus size={16} /> Добавить строку
              </button>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (applyMutation((current) => addTableColumn(current, activeTable.id, newColumnLabel))) setNewColumnLabel("");
                }}
              >
                <label htmlFor="tables-new-column">Новая колонка</label>
                <input
                  id="tables-new-column"
                  value={newColumnLabel}
                  maxLength={500}
                  placeholder="Например, Факт"
                  onChange={(event) => setNewColumnLabel(event.target.value)}
                />
                <button className="tables-button" type="submit"><Plus size={16} /> Добавить колонку</button>
              </form>
            </div>
          ) : null}

          <p className="tables-footnote">
            SuperSus хранит рабочую версию. Google-таблица остаётся исходным снимком и не синхронизируется автоматически.
          </p>
        </>
      ) : null}
    </section>
  );
}
