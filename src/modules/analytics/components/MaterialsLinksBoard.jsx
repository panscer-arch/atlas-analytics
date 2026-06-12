import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

import {
  CATEGORY_ALIASES,
  MATERIALS_STORAGE_KEY,
  MATERIAL_CATEGORIES,
  defaultMaterialItems,
} from "../data/materialsData";

import {
  buildGoogleSheetCsvUrl,
  buildMaterialItemsFromRows,
  createMaterialItem,
  hydrateMaterialItems,
  mergeMaterialItems,
  parseCsvRows,
  parseHtmlRows,
  parsePlainRows,
  persistMaterials,
  readStoredMaterials,
} from "../utils/materialsUtils";

function MaterialsLinksBoard() {
  const [items, setItems] = useState(readStoredMaterials);
  const [draft, setDraft] = useState(() => createMaterialItem({ category: "comments" }));
  const [editingItemId, setEditingItemId] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importState, setImportState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    let isMounted = true;

    loadServerContent(MATERIALS_STORAGE_KEY).then((savedItems) => {
      if (!isMounted || !savedItems) return;
      setItems(hydrateMaterialItems(savedItems));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const groupedItems = MATERIAL_CATEGORIES.map((category) => ({
    ...category,
    items: items.filter((item) => item.category === category.id),
  }));

  function updateItems(updater) {
    setItems((current) => {
      const next = updater(current);
      persistMaterials(next);
      return next;
    });
  }

  function updateItem(itemId, patch) {
    updateItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function addItem() {
    const title = draft.title.trim();
    if (!title) return;

    updateItems((current) => [createMaterialItem({ category: draft.category, title, url: draft.url.trim() }), ...current]);
    setDraft(createMaterialItem({ category: draft.category }));
  }

  function removeItem(itemId) {
    updateItems((current) => current.filter((item) => item.id !== itemId));
    if (editingItemId === itemId) setEditingItemId(null);
  }

  async function importFromGoogleSheet() {
    const csvUrl = buildGoogleSheetCsvUrl(sheetUrl);
    if (!csvUrl) {
      setImportState({ status: "error", message: "Не вижу ID таблицы. Вставь ссылку вида docs.google.com/spreadsheets/d/..." });
      return;
    }

    setImportState({ status: "loading", message: "Считываю таблицу..." });

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Google Sheets ответил ${response.status}`);

      const csvText = await response.text();
      const importedItems = buildMaterialItemsFromRows(parseCsvRows(csvText));
      if (!importedItems.length) {
        setImportState({
          status: "error",
          message: "Не нашел строки с колонками. Проверь, что в таблице есть шапка: Комментарий, ТЗ САЙТ, Документы и т.д.",
        });
        return;
      }

      updateItems((current) => mergeMaterialItems(current, importedItems));
      const linkCount = importedItems.filter((item) => item.url).length;
      setImportState({
        status: "success",
        message: `Импортировано: ${importedItems.length}. Ссылок с URL найдено: ${linkCount}.`,
      });
    } catch (error) {
      setImportState({
        status: "error",
        message: `Не удалось считать таблицу. Открой доступ по ссылке или опубликуй лист для просмотра. Деталь: ${error.message}`,
      });
    }
  }

  function importRows(rows, sourceLabel) {
    const importedItems = buildMaterialItemsFromRows(rows);
    if (!importedItems.length) {
      setImportState({
        status: "error",
        message: `Не нашел колонки в ${sourceLabel}. Скопируй таблицу вместе с шапкой: Комментарий, ТЗ САЙТ, Документы и т.д.`,
      });
      return;
    }

    updateItems((current) => mergeMaterialItems(current, importedItems));
    const linkCount = importedItems.filter((item) => item.url).length;
    setImportState({
      status: "success",
      message: `Импортировано из ${sourceLabel}: ${importedItems.length}. Ссылок с URL найдено: ${linkCount}.`,
    });
  }

  function handleTablePaste(event) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const htmlRows = parseHtmlRows(html);

    if (htmlRows.length) {
      importRows(htmlRows, "буфера Google Sheets");
      return;
    }

    importRows(parsePlainRows(text), "текста");
  }

  async function copyMaterialsJson() {
    const exportItems = items
      .filter((item) => item.title?.trim())
      .map((item) => ({
        category: item.category,
        title: item.title,
        url: item.url || "",
      }));
    const linkedItemsCount = exportItems.filter((item) => item.url).length;

    if (!linkedItemsCount) {
      setImportState({
        status: "error",
        message: "В JSON сейчас 0 ссылок. Сначала вставь таблицу в поле «Вставить таблицу с живыми ссылками» или добавь URL вручную через «Изм.» у карточек.",
      });
      return;
    }

    const json = JSON.stringify(exportItems, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setImportState({
        status: "success",
        message: `JSON скопирован: ${exportItems.length} материалов, из них со ссылками ${linkedItemsCount}. Пришли его сюда одним сообщением.`,
      });
    } catch {
      setImportState({
        status: "error",
        message: "Браузер не дал скопировать автоматически. Выдели текст в поле экспорта и скопируй вручную.",
      });
    }
  }

  return (
    <>
      <section className="analytics-surface analytics-materials-form">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Материалы</span>
          </div>
        </div>
        <div className="analytics-materials-add-grid">
          <label>
            <span>Раздел</span>
            <select
              className="analytics-launch-input"
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            >
              {MATERIAL_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Название</span>
            <input
              className="analytics-launch-input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Например: FAQ или Лендинг 1"
            />
          </label>
          <label>
            <span>Ссылка</span>
            <input
              className="analytics-launch-input"
              value={draft.url}
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://docs.google.com/..."
            />
          </label>
          <AnalyticsActionButton variant="primary" onClick={addItem} disabled={!draft.title.trim()}>
            Добавить ссылку
          </AnalyticsActionButton>
        </div>
        <div className="analytics-materials-import analytics-materials-import-hidden">
          <label>
            <span>Импорт из Google Sheets</span>
            <input
              className="analytics-launch-input"
              value={sheetUrl}
              onChange={(event) => setSheetUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
          <AnalyticsActionButton variant="primary" onClick={importFromGoogleSheet} disabled={!sheetUrl.trim() || importState.status === "loading"}>
            {importState.status === "loading" ? "Считываю..." : "Считать ссылки"}
          </AnalyticsActionButton>
          {importState.message ? (
            <div className={`analytics-materials-import-note analytics-materials-import-note-${importState.status}`}>
              {importState.message}
            </div>
          ) : null}
        </div>
        <div className="analytics-materials-paste-import">
          <label>
            <span>Вставить таблицу</span>
            <textarea
              className="analytics-launch-input"
              rows="3"
              onPaste={handleTablePaste}
              placeholder="Вставь таблицу с названиями и ссылками"
            />
          </label>
        </div>
        <div className="analytics-materials-export analytics-materials-export-hidden">
          <button type="button" className="analytics-board-btn" onClick={copyMaterialsJson}>
            Скопировать все материалы JSON
          </button>
          <textarea
            className="analytics-launch-input"
            readOnly
            value={JSON.stringify(
              items
                .filter((item) => item.title?.trim())
                .map((item) => ({ category: item.category, title: item.title, url: item.url || "" })),
              null,
              2,
            )}
            rows="4"
            aria-label="JSON всех материалов"
          />
        </div>
      </section>

      <section className="analytics-surface analytics-materials-board">
        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-materials-table">
            <thead>
              <tr>
                {MATERIAL_CATEGORIES.map((category) => (
                  <th key={category.id}>{category.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {groupedItems.map((category) => (
                  <td key={category.id}>
                    <div className="analytics-materials-column">
                      {category.items.map((item) => {
                        const isEditing = editingItemId === item.id;

                        if (isEditing) {
                          return (
                            <div key={item.id} className="analytics-materials-editor">
                              <input
                                className="analytics-launch-table-input"
                                value={item.title}
                                onChange={(event) => updateItem(item.id, { title: event.target.value })}
                                placeholder="Название"
                              />
                              <input
                                className="analytics-launch-table-input"
                                value={item.url}
                                onChange={(event) => updateItem(item.id, { url: event.target.value })}
                                placeholder="Ссылка Google Docs / Drive"
                              />
                              <div className="analytics-materials-editor-actions">
                                <AnalyticsActionButton variant="success" size="icon" onClick={() => setEditingItemId(null)} title="Готово">
                                  ✓
                                </AnalyticsActionButton>
                                <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeItem(item.id)} title="Удалить">
                                  ×
                                </AnalyticsActionButton>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="analytics-materials-link-row">
                            {item.url ? (
                              <a className="analytics-materials-link" href={item.url} target="_blank" rel="noreferrer">
                                {item.title}
                              </a>
                            ) : (
                              <button type="button" className="analytics-materials-link analytics-materials-link-empty" onClick={() => setEditingItemId(item.id)}>
                                {item.title}
                              </button>
                            )}
                            <button type="button" className="analytics-materials-edit-btn" onClick={() => setEditingItemId(item.id)} aria-label={`Изменить ссылку ${item.title}`}>
                              Изм.
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default MaterialsLinksBoard;
