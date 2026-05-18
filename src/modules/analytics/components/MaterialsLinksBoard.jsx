import { useState } from "react";

const MATERIALS_STORAGE_KEY = "atlas.analytics.materialLinks.v1";

const MATERIAL_CATEGORIES = [
  { id: "comments", title: "Комментарий" },
  { id: "site", title: "ТЗ САЙТ" },
  { id: "cabinet", title: "ТЗ Личный кабинет" },
  { id: "videos", title: "Ролики" },
  { id: "documents", title: "Документы" },
  { id: "research", title: "Идеи / Исследования" },
  { id: "marketing", title: "Маркетинг" },
];

const CATEGORY_ALIASES = {
  comments: ["комментарий", "комментарии", "наброски"],
  site: ["тз сайт", "сайт", "лендинг"],
  cabinet: ["тз личный кабинет", "личный кабинет", "кабинет"],
  videos: ["ролики", "ролик", "видео", "вебинар"],
  documents: ["документы", "документ", "юридические"],
  research: ["идеи / исследования", "идеи", "исследования", "исследование"],
  marketing: ["маркетинг", "реклама", "баннеры"],
};

const defaultMaterialItems = [
  { id: "comments-drafts", category: "comments", title: "Наброски", url: "" },
  { id: "comments-webinar", category: "comments", title: "Тезисы для вебинара", url: "" },
  { id: "comments-research", category: "comments", title: "Исследование", url: "" },
  { id: "comments-ideas", category: "comments", title: "ИДЕИ", url: "" },
  { id: "comments-benefits", category: "comments", title: "Преимущества", url: "" },
  { id: "comments-voting", category: "comments", title: "Описание Голосование", url: "" },
  { id: "comments-whitepaper", category: "comments", title: "whitepaper (вычитать)", url: "" },
  { id: "site-home", category: "site", title: "ТЗ Главная страница", url: "" },
  { id: "site-kb", category: "site", title: "База знаний", url: "" },
  { id: "site-slides", category: "site", title: "Слайды ТЗ - Презентация", url: "" },
  { id: "site-products", category: "site", title: "Описание продуктов", url: "" },
  { id: "site-landing-1", category: "site", title: "Лендинг 1", url: "" },
  { id: "site-landing-2", category: "site", title: "Лендинг 2 для криптанов", url: "" },
  { id: "site-arbitrage", category: "site", title: "правила для Арбитражника", url: "" },
  { id: "cabinet-contract", category: "cabinet", title: "Для прогера по smart-contract", url: "" },
  { id: "cabinet-step", category: "cabinet", title: "Ступенька", url: "" },
  { id: "cabinet-task", category: "cabinet", title: "ТЗ прогеру", url: "" },
  { id: "cabinet-task-v2", category: "cabinet", title: "ТЗ прогеру v.2", url: "" },
  { id: "cabinet-admin-stats", category: "cabinet", title: "Статистика админка", url: "" },
  { id: "videos-main", category: "videos", title: "Ролик", url: "" },
  { id: "videos-chris", category: "videos", title: "Обращение Криса", url: "" },
  { id: "docs-list", category: "documents", title: "Список документов", url: "" },
  { id: "docs-unity", category: "documents", title: "Описание Unity Pool", url: "" },
  { id: "docs-agreement", category: "documents", title: "Пользовательское соглашение", url: "" },
  { id: "docs-disclaimer", category: "documents", title: "Дисклеймер", url: "" },
  { id: "docs-offer-policy", category: "documents", title: "Оферта / Политика участия", url: "" },
  { id: "docs-community-rules", category: "documents", title: "Правила комьюнити", url: "" },
  { id: "docs-ai-training", category: "documents", title: "Для обучения ИИ", url: "" },
  { id: "research-mutual-aid", category: "research", title: "Кассы взаимопомощи", url: "" },
  { id: "research-web3-guide", category: "research", title: "Путеводитель по Web 3", url: "" },
  { id: "research-uat", category: "research", title: "Токен UAT", url: "" },
  { id: "research-article", category: "research", title: "Статья", url: "" },
  { id: "research-linkedin", category: "research", title: "Инфа для учетки LinkedIn", url: "" },
  { id: "research-new-articles", category: "research", title: "Темы новых статей", url: "" },
  { id: "research-project-ads", category: "research", title: "Реклама проекта", url: "" },
  { id: "research-elite", category: "research", title: "Elite club", url: "" },
  { id: "research-arbitrage", category: "research", title: "Арбитражники Условия", url: "" },
  { id: "research-landings", category: "research", title: "лендосы", url: "" },
  { id: "research-raffles", category: "research", title: "Розыгрыши", url: "" },
  { id: "marketing-banners", category: "marketing", title: "Рекламные баннеры", url: "" },
  { id: "marketing-launch", category: "marketing", title: "План запуска", url: "" },
];

function readStoredMaterials() {
  if (typeof window === "undefined") return defaultMaterialItems;

  try {
    const saved = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultMaterialItems;
  } catch {
    return defaultMaterialItems;
  }
}

function persistMaterials(nextItems) {
  try {
    window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
    // Таблица продолжит работать до перезагрузки, даже если localStorage недоступен.
  }
}

function createMaterialItem(overrides = {}) {
  return {
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: "comments",
    title: "",
    url: "",
    ...overrides,
  };
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCategoryIdByHeader(header) {
  const normalizedHeader = normalizeText(header);
  const exactCategory = MATERIAL_CATEGORIES.find((category) => normalizeText(category.title) === normalizedHeader);
  if (exactCategory) return exactCategory.id;

  return Object.entries(CATEGORY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalizedHeader.includes(alias)))?.[0] || null;
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function extractSpreadsheetId(url) {
  return String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || "";
}

function extractSheetGid(url) {
  return String(url || "").match(/[?#&]gid=(\d+)/)?.[1] || "";
}

function buildGoogleSheetCsvUrl(sheetUrl) {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return "";

  const gid = extractSheetGid(sheetUrl);
  const gidQuery = gid ? `&gid=${encodeURIComponent(gid)}` : "";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidQuery}`;
}

function extractUrlFromCell(cellValue) {
  return String(cellValue || "").match(/https?:\/\/[^\s)]+/)?.[0] || "";
}

function getTitleFromCell(cellValue) {
  return String(cellValue || "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getCellText(cellValue) {
  if (typeof cellValue === "object" && cellValue !== null) return cellValue.text || "";
  return String(cellValue || "");
}

function getCellUrl(cellValue) {
  if (typeof cellValue === "object" && cellValue !== null) return cellValue.url || extractUrlFromCell(cellValue.text);
  return extractUrlFromCell(cellValue);
}

function buildMaterialItemsFromRows(rows) {
  const headerRowIndex = rows.findIndex((row) => row.map((cellValue) => getCategoryIdByHeader(getCellText(cellValue))).filter(Boolean).length >= 2);
  if (headerRowIndex < 0) return [];

  const headerRow = rows[headerRowIndex];
  const columnCategories = headerRow.map((cellValue) => getCategoryIdByHeader(getCellText(cellValue)));
  const importedItems = [];

  rows.slice(headerRowIndex + 1).forEach((row, rowIndex) => {
    row.forEach((cellValue, columnIndex) => {
      const category = columnCategories[columnIndex];
      const cellText = getCellText(cellValue);
      const title = getTitleFromCell(cellText) || cellText.trim();
      if (!category || !title) return;

      importedItems.push(
        createMaterialItem({
          id: `imported-${category}-${headerRowIndex + rowIndex}-${columnIndex}-${title.slice(0, 24).replace(/\W+/g, "-")}`,
          category,
          title,
          url: getCellUrl(cellValue),
        }),
      );
    });
  });

  return importedItems;
}

function parsePlainRows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((row) => row.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function parseHtmlRows(html) {
  if (typeof window === "undefined" || !html) return [];

  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const tableRows = Array.from(documentNode.querySelectorAll("tr"));
  if (!tableRows.length) return [];

  return tableRows
    .map((row) =>
      Array.from(row.querySelectorAll("th,td")).map((cell) => {
        const link = cell.querySelector("a[href]");
        return {
          text: cell.textContent.replace(/\s+/g, " ").trim(),
          url: link?.href || "",
        };
      }),
    )
    .filter((row) => row.some((cell) => cell.text));
}

function mergeMaterialItems(currentItems, importedItems) {
  const nextItems = [...currentItems];

  importedItems.forEach((importedItem) => {
    const existingIndex = nextItems.findIndex(
      (item) => item.category === importedItem.category && normalizeText(item.title) === normalizeText(importedItem.title),
    );

    if (existingIndex >= 0) {
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        url: importedItem.url || nextItems[existingIndex].url,
      };
      return;
    }

    nextItems.push(importedItem);
  });

  return nextItems;
}

function MaterialsLinksBoard() {
  const [items, setItems] = useState(readStoredMaterials);
  const [draft, setDraft] = useState(() => createMaterialItem({ category: "comments" }));
  const [editingItemId, setEditingItemId] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importState, setImportState] = useState({ status: "idle", message: "" });

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

  function resetItems() {
    updateItems(() => defaultMaterialItems);
    setEditingItemId(null);
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
    const json = JSON.stringify(exportItems, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setImportState({
        status: "success",
        message: `JSON скопирован: ${exportItems.length} материалов, из них со ссылками ${exportItems.filter((item) => item.url).length}. Пришли его сюда одним сообщением.`,
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
      <section className="analytics-surface analytics-materials-form mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Google Docs / Drive</span>
            <h3 className="analytics-section-title">Реестр материалов</h3>
            <p className="analytics-page-subtitle mb-0">
              Сохраняем привычный формат: документ остается в Google Docs, а здесь лежит карта ссылок по разделам.
            </p>
          </div>
          <button type="button" className="btn analytics-launch-reset-btn" onClick={resetItems}>
            Сбросить к шаблону
          </button>
        </div>
        <div className="analytics-materials-add-grid">
          <label>
            <span>Раздел</span>
            <select
              className="form-select analytics-launch-input"
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
              className="form-control analytics-launch-input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Например: FAQ или Лендинг 1"
            />
          </label>
          <label>
            <span>Ссылка</span>
            <input
              className="form-control analytics-launch-input"
              value={draft.url}
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://docs.google.com/..."
            />
          </label>
          <button type="button" className="btn analytics-launch-add-btn" onClick={addItem} disabled={!draft.title.trim()}>
            Добавить ссылку
          </button>
        </div>
        <div className="analytics-materials-import">
          <label>
            <span>Импорт из Google Sheets</span>
            <input
              className="form-control analytics-launch-input"
              value={sheetUrl}
              onChange={(event) => setSheetUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
          <button
            type="button"
            className="btn analytics-launch-add-btn"
            onClick={importFromGoogleSheet}
            disabled={!sheetUrl.trim() || importState.status === "loading"}
          >
            {importState.status === "loading" ? "Считываю..." : "Считать ссылки"}
          </button>
          {importState.message ? (
            <div className={`analytics-materials-import-note analytics-materials-import-note-${importState.status}`}>
              {importState.message}
            </div>
          ) : null}
        </div>
        <div className="analytics-materials-paste-import">
          <label>
            <span>Вставить таблицу с живыми ссылками</span>
            <textarea
              className="form-control analytics-launch-input"
              rows="3"
              onPaste={handleTablePaste}
              placeholder="Выдели таблицу в Google Sheets вместе с шапкой, нажми Cmd+C и вставь сюда. Скрытые ссылки из ячеек подтянутся автоматически."
            />
          </label>
        </div>
        <div className="analytics-materials-export">
          <button type="button" className="btn analytics-board-btn" onClick={copyMaterialsJson}>
            Скопировать все материалы JSON
          </button>
          <textarea
            className="form-control analytics-launch-input"
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

      <section className="analytics-surface analytics-materials-board mt-4">
        <div className="table-responsive">
          <table className="table analytics-table analytics-materials-table mb-0">
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
                                className="form-control analytics-launch-table-input"
                                value={item.title}
                                onChange={(event) => updateItem(item.id, { title: event.target.value })}
                                placeholder="Название"
                              />
                              <input
                                className="form-control analytics-launch-table-input"
                                value={item.url}
                                onChange={(event) => updateItem(item.id, { url: event.target.value })}
                                placeholder="Ссылка Google Docs / Drive"
                              />
                              <div className="analytics-materials-editor-actions">
                                <button type="button" className="btn analytics-launch-icon-btn analytics-launch-done-btn" onClick={() => setEditingItemId(null)} title="Готово">
                                  ✓
                                </button>
                                <button type="button" className="btn analytics-launch-icon-btn analytics-launch-delete-btn" onClick={() => removeItem(item.id)} title="Удалить">
                                  ×
                                </button>
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
