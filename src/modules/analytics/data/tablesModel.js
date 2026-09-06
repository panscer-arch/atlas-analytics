export const TABLES_CONTENT_KEY = "supersus.tables.v1";
export const TABLES_DRAFT_KEY = "supersus.tables.v1.draft";
export const SOURCE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1NDEI465gm7JQf4jIzB85yny2y0KCSl7JvTnY9qh_pKM/edit?gid=0#gid=0";

const LIMITS = Object.freeze({
  tables: 10,
  columns: 100,
  rows: 5000,
  cell: 500,
  label: 500,
  note: 5000,
});

const growthColumns = [
  ["month", "Месяца"],
  ["monthlyFlow", "Поток за месяц"],
  ["dailyFlow", "Поток в день"],
  ["monthlyWallets", "Новых кошельков за месяц"],
  ["dailyWallets", "Новых кошельков в день"],
  ["monthlyCycles", "Циклов в месяц"],
  ["dailyCycles", "Циклов в день"],
  ["platformRevenue", "Заработок платформы в месяц"],
];

const growthRows = [
  ["Август 2026", "1.500.000", "50.000", "900", "30", "4.500", "150", "75.000"],
  ["Сентябрь 2026", "2.300.000", "75.000", "1.350", "45", "6.750", "225", "115.000"],
  ["Октябрь 2026", "3.400.000", "113.000", "2.040", "68", "10.140", "338", "170.000"],
  ["Ноябрь 2026", "5.100.000", "169.000", "3.030", "101", "15.180", "506", "255.000"],
  ["Декабрь 2026", "7.600.000", "253.000", "4.560", "152", "22.770", "759", "380.000"],
  ["Январь 2027", "11.400.000", "380.000", "6.840", "228", "34.170", "1.139", "570.000"],
  ["Февраль 2027", "17.100.000", "570.000", "10.260", "342", "51.270", "1.709", "855.000"],
  ["Март 2027", "25.600.000", "854.000", "15.390", "513", "76.890", "2.563", "1.280.000"],
  ["Апрель 2027", "38.400.000", "1.281.000", "23.070", "769", "115.320", "3.844", "1.920.000"],
  ["Май 2027", "57.700.000", "1.922.000", "34.590", "1.153", "173.010", "5.767", "2.885.000"],
  ["Июнь 2027", "86.500.000", "2.883.000", "51.900", "1.730", "259.500", "8.650", "4.325.000"],
  ["Июль 2027", "129.700.000", "4.325.000", "77.850", "2.595", "389.250", "12.975", "6.485.000"],
  ["План на год", "386.300.000", "", "231.780", "", "", "", "19.315.000"],
];

const liquidityColumns = [
  ["month", "Месяцы"],
  ["lp", "LP"],
  ["requiredMonthly", "Необходимая сумма в месяц"],
  ["requiredDaily", "Необходимая сумма в день"],
  ["incomingMonthly", "Входящий поток в месяц"],
  ["incomingDaily", "Входящий поток в сутки"],
];

const liquidityRows = [
  ["1 сентября", "$700.000", "$300.000", "$10.000", "$1.500.000", "$50.000"],
  ["1 октября", "$1.000.000", "$400.000", "", "$2.100.000", "$70.000"],
  ["1 ноября", "$1.400.000", "$600.000", "", "$3.000.000", "$100.000"],
  ["1 декабря", "$2.000.000", "$800.000", "", "$4.200.000", "$140.000"],
  ["1 января", "$2.800.000", "$1.200.000", "", "$6.000.000", "$200.000"],
  ["1 февраля", "$4.000.000", "$2.000.000", "", "$8.500.000", "$285.000"],
  ["1 марта", "$6.000.000", "", "", "$12.000.000", "$400.000"],
];

function buildColumns(definitions) {
  return definitions.map(([id, label]) => ({ id, label }));
}

function buildRows(prefix, definitions, columns) {
  return definitions.map((values, index) => ({
    id: `${prefix}-row-${index + 1}`,
    cells: Object.fromEntries(columns.map(([id], columnIndex) => [id, values[columnIndex] ?? ""])),
  }));
}

const seedDocument = {
  version: 1,
  source: {
    title: "Таблица рост системы",
    url: SOURCE_SHEET_URL,
    sheet: "Лист1",
    capturedAt: "2026-09-06",
  },
  tables: [
    {
      id: "growth",
      title: "Рост системы",
      sourceRange: "A1:H19",
      columns: buildColumns(growthColumns),
      rows: buildRows("growth", growthRows, growthColumns),
      notes: [
        { id: "growth-note-1", text: "5% с оборота" },
        { id: "growth-note-2", text: "13%+ выплаты по рефке с входящего потока" },
        { id: "growth-note-3", text: "$330 — размер среднего цикла" },
        { id: "growth-note-4", text: "Процент выполнения плана на месяц и на год добавить в админку" },
      ],
    },
    {
      id: "liquidity",
      title: "План ликвидности",
      sourceRange: "A25:F32",
      columns: buildColumns(liquidityColumns),
      rows: buildRows("liquidity", liquidityRows, liquidityColumns),
      notes: [],
    },
  ],
};

export function createTablesSeed() {
  return structuredClone(seedDocument);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeLabel(value) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

export function validateTablesDocument(value) {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.tables)) {
    return "Неверный формат таблиц.";
  }
  if (!value.tables.length || value.tables.length > LIMITS.tables) {
    return `Количество таблиц должно быть от 1 до ${LIMITS.tables}.`;
  }

  const tableIds = new Set();
  for (const table of value.tables) {
    if (!isObject(table) || typeof table.id !== "string" || !table.id || tableIds.has(table.id)) {
      return "Идентификаторы таблиц должны быть уникальными.";
    }
    tableIds.add(table.id);
    if (typeof table.title !== "string" || table.title.length > LIMITS.label) {
      return "Название таблицы имеет неверный формат.";
    }
    if (!Array.isArray(table.columns) || !table.columns.length || table.columns.length > LIMITS.columns) {
      return `В таблице должно быть от 1 до ${LIMITS.columns} колонок.`;
    }
    if (!Array.isArray(table.rows) || table.rows.length > LIMITS.rows) {
      return `В таблице не может быть больше ${LIMITS.rows} строк.`;
    }
    if (!Array.isArray(table.notes)) return "Заметки таблицы имеют неверный формат.";

    const columnIds = new Set();
    const labels = new Set();
    for (const column of table.columns) {
      if (!isObject(column) || typeof column.id !== "string" || !column.id || columnIds.has(column.id)) {
        return "Идентификаторы колонок должны быть уникальными.";
      }
      if (typeof column.label !== "string" || !column.label.trim() || column.label.length > LIMITS.label) {
        return "Название колонки обязательно и не должно быть слишком длинным.";
      }
      const normalized = normalizeLabel(column.label);
      if (labels.has(normalized)) return "Название колонки уже используется.";
      labels.add(normalized);
      columnIds.add(column.id);
    }

    const rowIds = new Set();
    for (const row of table.rows) {
      if (!isObject(row) || typeof row.id !== "string" || !row.id || rowIds.has(row.id) || !isObject(row.cells)) {
        return "Строки таблицы имеют неверный формат.";
      }
      rowIds.add(row.id);
      for (const key of Object.keys(row.cells)) {
        if (!columnIds.has(key)) return "Строка содержит неизвестную колонку.";
      }
      for (const column of table.columns) {
        const cell = row.cells[column.id];
        if (typeof cell !== "string") return "Каждая ячейка должна быть строкой.";
        if (cell.length > LIMITS.cell) return `Ячейка не может быть длиннее ${LIMITS.cell} символов.`;
      }
    }

    const noteIds = new Set();
    for (const note of table.notes) {
      if (!isObject(note) || typeof note.id !== "string" || !note.id || noteIds.has(note.id)) {
        return "Заметки таблицы имеют неверный формат.";
      }
      if (typeof note.text !== "string" || note.text.length > LIMITS.note) {
        return `Заметка не может быть длиннее ${LIMITS.note} символов.`;
      }
      noteIds.add(note.id);
    }
  }
  return "";
}

function cloneWithTable(document, tableId, update) {
  const tableIndex = document.tables.findIndex((table) => table.id === tableId);
  if (tableIndex < 0) throw new Error("Таблица не найдена.");
  const next = structuredClone(document);
  next.tables[tableIndex] = update(next.tables[tableIndex]);
  const validationError = validateTablesDocument(next);
  if (validationError) throw new Error(validationError);
  return next;
}

function uniqueId(prefix, existing) {
  let index = existing.size + 1;
  while (existing.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

export function updateTableCell(document, tableId, rowId, columnId, value) {
  return cloneWithTable(document, tableId, (table) => {
    const row = table.rows.find((item) => item.id === rowId);
    if (!row) throw new Error("Строка не найдена.");
    if (!table.columns.some((column) => column.id === columnId)) throw new Error("Колонка не найдена.");
    row.cells[columnId] = String(value ?? "");
    return table;
  });
}

export function addTableRow(document, tableId) {
  return cloneWithTable(document, tableId, (table) => {
    if (table.rows.length >= LIMITS.rows) throw new Error(`В таблице не может быть больше ${LIMITS.rows} строк.`);
    const id = uniqueId(`${table.id}-row`, new Set(table.rows.map((row) => row.id)));
    table.rows.push({ id, cells: Object.fromEntries(table.columns.map((column) => [column.id, ""])) });
    return table;
  });
}

export function deleteTableRow(document, tableId, rowId) {
  return cloneWithTable(document, tableId, (table) => {
    if (!table.rows.some((row) => row.id === rowId)) throw new Error("Строка не найдена.");
    table.rows = table.rows.filter((row) => row.id !== rowId);
    return table;
  });
}

export function addTableColumn(document, tableId, label) {
  return cloneWithTable(document, tableId, (table) => {
    const trimmed = String(label ?? "").trim();
    if (!trimmed) throw new Error("Введите название колонки.");
    if (trimmed.length > LIMITS.label) throw new Error(`Название колонки не может быть длиннее ${LIMITS.label} символов.`);
    if (table.columns.some((column) => normalizeLabel(column.label) === normalizeLabel(trimmed))) {
      throw new Error("Название колонки уже используется.");
    }
    if (table.columns.length >= LIMITS.columns) throw new Error(`В таблице не может быть больше ${LIMITS.columns} колонок.`);
    const id = uniqueId(`${table.id}-column`, new Set(table.columns.map((column) => column.id)));
    table.columns.push({ id, label: trimmed });
    table.rows.forEach((row) => {
      row.cells[id] = "";
    });
    return table;
  });
}

export function renameTableColumn(document, tableId, columnId, label) {
  return cloneWithTable(document, tableId, (table) => {
    const column = table.columns.find((item) => item.id === columnId);
    if (!column) throw new Error("Колонка не найдена.");
    const trimmed = String(label ?? "").trim();
    if (!trimmed) throw new Error("Введите название колонки.");
    if (table.columns.some((item) => item.id !== columnId && normalizeLabel(item.label) === normalizeLabel(trimmed))) {
      throw new Error("Название колонки уже используется.");
    }
    column.label = trimmed;
    return table;
  });
}

export function moveTableColumn(document, tableId, columnId, direction) {
  return cloneWithTable(document, tableId, (table) => {
    const index = table.columns.findIndex((column) => column.id === columnId);
    if (index < 0) throw new Error("Колонка не найдена.");
    const target = index + (direction < 0 ? -1 : 1);
    if (target < 0 || target >= table.columns.length) return table;
    [table.columns[index], table.columns[target]] = [table.columns[target], table.columns[index]];
    return table;
  });
}

export function deleteTableColumn(document, tableId, columnId) {
  return cloneWithTable(document, tableId, (table) => {
    if (table.columns.length === 1) throw new Error("В таблице должна остаться хотя бы одна колонка.");
    if (!table.columns.some((column) => column.id === columnId)) throw new Error("Колонка не найдена.");
    table.columns = table.columns.filter((column) => column.id !== columnId);
    table.rows.forEach((row) => {
      delete row.cells[columnId];
    });
    return table;
  });
}

export function updateTableNote(document, tableId, noteId, value) {
  return cloneWithTable(document, tableId, (table) => {
    const note = table.notes.find((item) => item.id === noteId);
    if (!note) throw new Error("Заметка не найдена.");
    note.text = String(value ?? "");
    return table;
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function tableToCsv(table) {
  const lines = [
    table.columns.map((column) => csvCell(column.label)).join(","),
    ...table.rows.map((row) => table.columns.map((column) => csvCell(row.cells[column.id])).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export async function saveTablesSafely(document, baseline, { load, save }) {
  const validationError = validateTablesDocument(document);
  if (validationError) return { ok: false, error: validationError };
  try {
    const current = await load();
    if (!current?.ok) return { ok: false, error: "Сервер недоступен" };
    const currentValue = current.exists ? current.value : null;
    if (JSON.stringify(currentValue) !== JSON.stringify(baseline)) {
      return { ok: false, error: "Конфликт версий" };
    }
    if (!(await save(document))) return { ok: false, error: "Ошибка сохранения" };
    const verified = await load();
    if (!verified?.ok || !verified.exists || JSON.stringify(verified.value) !== JSON.stringify(document)) {
      return { ok: false, error: "Сохранение не подтверждено" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Сервер недоступен" };
  }
}
