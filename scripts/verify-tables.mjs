import assert from "node:assert/strict";

const model = await import("../src/modules/analytics/data/tablesModel.js");
const seed = model.createTablesSeed();

assert.equal(model.TABLES_CONTENT_KEY, "supersus.tables.v1");
assert.equal(model.TABLES_DRAFT_KEY, "supersus.tables.v1.draft");
assert.equal(model.validateTablesDocument(seed), "");
assert.equal(seed.tables.length, 3);
assert.equal(seed.tables[0].id, "growth");
assert.equal(seed.tables[0].sourceRange, "A1:H19");
assert.equal(seed.tables[0].columns.length, 8);
assert.equal(seed.tables[0].rows.length, 13);
assert.equal(seed.tables[0].rows[3].cells.month, "Ноябрь 2026");
assert.equal(seed.tables[0].rows[3].cells.monthlyFlow, "5.100.000");
assert.equal(seed.tables[0].rows[12].cells.platformRevenue, "19.315.000");
assert.equal(seed.tables[0].notes.length, 4);
assert.equal(seed.tables[1].id, "liquidity");
assert.equal(seed.tables[1].sourceRange, "A25:F32");
assert.equal(seed.tables[1].columns.length, 6);
assert.equal(seed.tables[1].rows.length, 7);
assert.equal(seed.tables[1].rows[6].cells.lp, "$6.000.000");
assert.equal(seed.tables[1].rows[6].cells.requiredMonthly, "");
assert.equal(seed.tables[2].id, "forecast");
assert.equal(seed.tables[2].title, "Прогноз GPT");
assert.equal(seed.tables[2].columns.length, 15);
assert.equal(seed.tables[2].rows.length, 12);
assert.equal(seed.tables[2].rows[0].cells.scenario, "Базовый");
assert.equal(seed.tables[2].rows[0].cells.incomingPlan, "1.500.000");
assert.equal(seed.tables[2].rows[1].cells.lpTarget, "$700.000");
assert.equal(seed.tables[2].rows[0].cells.incomingFact, "");

const edited = model.updateTableCell(seed, "growth", seed.tables[0].rows[0].id, "monthlyFlow", "1.600.000");
assert.equal(edited.tables[0].rows[0].cells.monthlyFlow, "1.600.000");
assert.equal(seed.tables[0].rows[0].cells.monthlyFlow, "1.500.000");

const withRow = model.addTableRow(seed, "liquidity");
assert.equal(withRow.tables[1].rows.length, 8);
assert.deepEqual(Object.values(withRow.tables[1].rows.at(-1).cells), ["", "", "", "", "", ""]);
const withoutRow = model.deleteTableRow(withRow, "liquidity", withRow.tables[1].rows.at(-1).id);
assert.equal(withoutRow.tables[1].rows.length, 7);

const withColumn = model.addTableColumn(seed, "growth", "Факт");
assert.equal(withColumn.tables[0].columns.at(-1).label, "Факт");
assert.equal(withColumn.tables[0].rows[0].cells[withColumn.tables[0].columns.at(-1).id], "");
assert.throws(() => model.addTableColumn(withColumn, "growth", " факт "), /Название колонки уже используется/);

const renamed = model.renameTableColumn(withColumn, "growth", withColumn.tables[0].columns.at(-1).id, "Факт 2027");
assert.equal(renamed.tables[0].columns.at(-1).label, "Факт 2027");
const moved = model.moveTableColumn(renamed, "growth", renamed.tables[0].columns.at(-1).id, -1);
assert.equal(moved.tables[0].columns.at(-2).label, "Факт 2027");
const removedColumn = model.deleteTableColumn(moved, "growth", moved.tables[0].columns.at(-2).id);
assert.equal(removedColumn.tables[0].columns.length, 8);

const noteEdited = model.updateTableNote(seed, "growth", seed.tables[0].notes[0].id, "5% с оборота — уточнено");
assert.equal(noteEdited.tables[0].notes[0].text, "5% с оборота — уточнено");
assert.equal(seed.tables[0].notes[0].text, "5% с оборота");

const invalid = structuredClone(seed);
invalid.tables[0].rows[0].cells.monthlyFlow = 123;
assert.match(model.validateTablesDocument(invalid), /строкой/);

const csv = model.tableToCsv(seed.tables[1]);
assert.ok(csv.startsWith("\uFEFFМесяцы,LP,"));
assert.match(csv, /1 сентября,\$700\.000/);

let stored = null;
const saved = await model.saveTablesSafely(seed, null, {
  load: async () => ({ ok: true, exists: stored !== null, value: stored }),
  save: async (value) => {
    stored = structuredClone(value);
    return true;
  },
});
assert.equal(saved.ok, true);

const conflict = await model.saveTablesSafely(seed, null, {
  load: async () => ({ ok: true, exists: true, value: { changed: true } }),
  save: async () => {
    throw new Error("must not write");
  },
});
assert.equal(conflict.ok, false);
assert.equal(conflict.error, "Конфликт версий");

console.log("SuperSus tables model verified.");
