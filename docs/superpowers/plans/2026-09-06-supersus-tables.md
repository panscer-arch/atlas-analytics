# SuperSus Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected `Таблицы` workspace to SuperSus with two editable, server-backed tables imported from the approved Google Sheet snapshot.

**Architecture:** Store one validated versioned document under `supersus.tables.v1` in the existing content API. A focused model module owns seed fidelity, mutations, CSV export, validation, and conflict-safe saves; a React board owns UI state, local draft recovery, and explicit edit/save modes. Navigation follows the existing header-tool and `?board=` patterns, while the content endpoint reuses the departments authentication, origin guard, backup, and read-back approach.

**Tech Stack:** React 18, Vite 5, plain JavaScript modules, Node verification scripts, existing SuperSus content API, CSS.

**Spec:** `docs/superpowers/specs/2026-09-06-supersus-tables.md`

## Global Constraints

- SuperSus is the source of truth; Google Sheets remains a manual reference link with no background synchronization.
- Preserve the two observed source ranges and all visible blank cells; do not invent missing formulas or values.
- Route the page through `?board=tables` and the internal table through `tableView=growth|liquidity`.
- Require the existing authenticated SuperSus marketing session for both reads and writes.
- Reject cross-origin writes while allowing `https://supersussystem.com`, `https://www.supersussystem.com`, and matching localhost development origins.
- Keep unsaved drafts in `localStorage`, prevent silent multi-editor overwrite, and confirm the saved snapshot by reading it back.
- Do not change existing contacts, departments, analytics, CRM, or team storage keys.
- Use current compact SuperSus controls and a horizontally scrollable table at mobile width.

---

## File structure

- Create `src/modules/analytics/data/tablesModel.js`: seed, schema validation, immutable mutations, export helpers, and conflict-safe save orchestration.
- Create `src/modules/analytics/components/TablesBoard.jsx`: protected load/unlock flow, tabs, read/edit modes, grid, draft recovery, save, undo, and exports.
- Create `src/modules/analytics/styles/tables.css`: isolated Atlas-style operational table layout and responsive behavior.
- Create `scripts/verify-tables.mjs`: behavioral verification for seed, mutations, validation, export, conflict, and read-back.
- Create `scripts/verify-tables-access.mjs`: live temporary API verification for authorization, origin checks, persistence, and backup creation.
- Create `scripts/verify-tables-navigation.mjs`: integration contract for the header tool and board routes.
- Modify `src/modules/analytics/components/AnalyticsHeader.jsx`: add `Таблицы` header tool.
- Modify `src/modules/analytics/AnalyticsPage.jsx`: map and open the `tables` board.
- Modify `src/modules/analytics/components/AnalyticsMainPanel.jsx`: render `TablesBoard` as a standalone main panel.
- Modify `src/modules/analytics/components/LaunchBoardRegistry.jsx`: resolve direct and history navigation for `tables`.
- Modify `src/modules/analytics/styles/analytics.css`: assign the table tool a distinct readable accent only.
- Modify `server/content-api.mjs`: protect `supersus.tables.v1` and apply the same origin policy used by departments.
- Modify `.github/workflows/deploy.yml`: preserve the browser `Origin` header on the exact production table endpoint.
- Modify `package.json`: add `test:tables` and include navigation verification in `prebuild`.

---

### Task 1: Build the table document model test-first

**Files:**
- Create: `scripts/verify-tables.mjs`
- Create: `src/modules/analytics/data/tablesModel.js`

**Interfaces:**
- Produces `TABLES_CONTENT_KEY`, `TABLES_DRAFT_KEY`, `SOURCE_SHEET_URL`.
- Produces `createTablesSeed(): TablesDocument` and `validateTablesDocument(value): string`.
- Produces immutable mutations `updateTableCell`, `addTableRow`, `deleteTableRow`, `addTableColumn`, `renameTableColumn`, `moveTableColumn`, `deleteTableColumn`, and `updateTableNote`.
- Produces `tableToCsv(table): string` and `saveTablesSafely(document, baseline, { load, save }): Promise<{ok:boolean,error?:string}>`.

- [ ] **Step 1: Write the failing behavioral verification**

Create `scripts/verify-tables.mjs` with literal assertions that catch a missing or altered source row and unsafe mutations:

```js
import assert from "node:assert/strict";

const model = await import("../src/modules/analytics/data/tablesModel.js");
const seed = model.createTablesSeed();

assert.equal(model.validateTablesDocument(seed), "");
assert.equal(seed.tables.length, 2);
assert.equal(seed.tables[0].columns.length, 8);
assert.equal(seed.tables[0].rows.length, 13);
assert.equal(seed.tables[0].rows[3].cells.month, "Ноябрь 2026");
assert.equal(seed.tables[0].rows[3].cells.monthlyFlow, "5.100.000");
assert.equal(seed.tables[0].rows[12].cells.platformRevenue, "19.315.000");
assert.equal(seed.tables[0].notes.length, 4);
assert.equal(seed.tables[1].columns.length, 6);
assert.equal(seed.tables[1].rows.length, 7);
assert.equal(seed.tables[1].rows[6].cells.lp, "$6.000.000");
assert.equal(seed.tables[1].rows[6].cells.requiredMonthly, "");

const edited = model.updateTableCell(seed, "growth", seed.tables[0].rows[0].id, "monthlyFlow", "1.600.000");
assert.equal(edited.tables[0].rows[0].cells.monthlyFlow, "1.600.000");
assert.equal(seed.tables[0].rows[0].cells.monthlyFlow, "1.500.000");

const withColumn = model.addTableColumn(seed, "growth", "Факт");
assert.equal(withColumn.tables[0].columns.at(-1).label, "Факт");
assert.throws(() => model.addTableColumn(withColumn, "growth", " факт "), /Название колонки уже используется/);

const csv = model.tableToCsv(seed.tables[1]);
assert.ok(csv.startsWith("\uFEFFМесяцы,LP,"));
assert.match(csv, /1 сентября,\$700\.000/);

let stored = null;
const saved = await model.saveTablesSafely(seed, null, {
  load: async () => ({ ok: true, exists: stored !== null, value: stored }),
  save: async (value) => { stored = structuredClone(value); return true; },
});
assert.equal(saved.ok, true);

const conflict = await model.saveTablesSafely(seed, null, {
  load: async () => ({ ok: true, exists: true, value: { changed: true } }),
  save: async () => { throw new Error("must not write"); },
});
assert.equal(conflict.ok, false);
assert.equal(conflict.error, "Конфликт версий");
```

- [ ] **Step 2: Run the verification and observe the expected RED state**

Run: `node scripts/verify-tables.mjs`

Expected: failure because `tablesModel.js` does not exist.

- [ ] **Step 3: Implement the minimal validated document model**

Create `tablesModel.js` with the exact seed from the spec, stable IDs, string-only cell values, bounds from the spec, immutable cloning, normalized duplicate-label checks, one-column minimum, RFC 4180-compatible CSV escaping, and this safe-save sequence:

```js
export async function saveTablesSafely(document, baseline, { load, save }) {
  const validationError = validateTablesDocument(document);
  if (validationError) return { ok: false, error: validationError };
  const current = await load();
  if (!current.ok) return { ok: false, error: "Сервер недоступен" };
  if (JSON.stringify(current.exists ? current.value : null) !== JSON.stringify(baseline)) {
    return { ok: false, error: "Конфликт версий" };
  }
  if (!(await save(document))) return { ok: false, error: "Ошибка сохранения" };
  const verified = await load();
  if (!verified.ok || !verified.exists || JSON.stringify(verified.value) !== JSON.stringify(document)) {
    return { ok: false, error: "Сохранение не подтверждено" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run the verification and make it GREEN**

Run: `node scripts/verify-tables.mjs`

Expected: one success line and exit code `0`.

- [ ] **Step 5: Commit the model slice**

```bash
git add scripts/verify-tables.mjs src/modules/analytics/data/tablesModel.js
git commit -m "feat: add editable tables model"
```

---

### Task 2: Protect and persist the tables endpoint test-first

**Files:**
- Create: `scripts/verify-tables-access.mjs`
- Modify: `server/content-api.mjs`
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes `supersus.tables.v1` from Task 1.
- Produces authenticated `GET` and `PUT /api/content/supersus.tables.v1` with same-origin write enforcement.
- Preserves generic content API backup behavior under `_backups`.

- [ ] **Step 1: Write the failing API verification**

Create a temporary-store test following `scripts/verify-departments-access.mjs`. It must assert:

```js
assert.equal((await fetch(endpoint)).status, 401);
assert.equal((await fetch(endpoint, anonymousPut)).status, 401);
assert.equal((await fetch(endpoint, authenticatedCrossOriginPut)).status, 403);
assert.equal((await fetch(endpoint, authenticatedProductionOriginPut)).status, 200);
assert.deepEqual((await (await fetch(endpoint, { headers: { Cookie: cookie } })).json()).value, payload);
```

Perform a second authenticated write and assert that the temporary store contains a backup entry for `supersus.tables.v1`. Also assert the deploy workflow contains an exact Nginx route that forwards `$http_origin`.

- [ ] **Step 2: Run the test and observe RED**

Run: `node scripts/verify-tables-access.mjs`

Expected: anonymous access currently returns `200` because the new key has not been protected.

- [ ] **Step 3: Implement endpoint protection**

Add `TABLES_CONTENT_KEY = "supersus.tables.v1"` to both `MARKETING_READ_CONTENT_KEYS` and `MARKETING_WRITE_CONTENT_KEYS`. Replace the one-off departments origin branch with `ORIGIN_RESTRICTED_CONTENT_KEYS = new Set(["supersus.departments.v1", TABLES_CONTENT_KEY])` and reuse the existing approved-origin check without loosening it.

Add the exact production route before the generic `/api/content/` block:

```nginx
location = /api/content/supersus.tables.v1 {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Origin $http_origin;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 10m;
}
```

- [ ] **Step 4: Run API checks GREEN and retain departments behavior**

Run: `node scripts/verify-tables-access.mjs`

Run: `npm run test:departments`

Expected: both commands exit `0`.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add scripts/verify-tables-access.mjs server/content-api.mjs .github/workflows/deploy.yml
git commit -m "feat: protect SuperSus tables storage"
```

---

### Task 3: Wire the header and board route test-first

**Files:**
- Create: `scripts/verify-tables-navigation.mjs`
- Modify: `src/modules/analytics/components/AnalyticsHeader.jsx`
- Modify: `src/modules/analytics/AnalyticsPage.jsx`
- Modify: `src/modules/analytics/components/AnalyticsMainPanel.jsx`
- Modify: `src/modules/analytics/components/LaunchBoardRegistry.jsx`
- Modify: `src/modules/analytics/styles/analytics.css`
- Modify: `package.json`

**Interfaces:**
- Produces `onTablesOpen` on `AnalyticsHeader`.
- Produces `activeTab === "tables"` and `MAIN_TAB_BOARD_IDS.tables === "tables"`.
- Consumes default export `TablesBoard` from Task 4; add a temporary import target only after the Task 4 component exists, or finish Task 3 and Task 4 in one RED/GREEN batch.

- [ ] **Step 1: Write navigation verification**

Create `verify-tables-navigation.mjs` to assert observable integration contracts:

```js
const checks = [
  [header.includes("onTablesOpen") && header.includes('label="Таблицы"'), "header tool missing"],
  [page.includes('tables: "tables"') && page.includes('handleMainTabChange("tables")'), "route mapping missing"],
  [panel.includes('activeTab === "tables"') && panel.includes("<TablesBoard />"), "standalone board missing"],
  [registry.includes('boardId === "tables"') && registry.includes('return "tables"'), "direct route missing"],
];
```

- [ ] **Step 2: Run navigation verification RED**

Run: `node scripts/verify-tables-navigation.mjs`

Expected: failure listing all missing integration points.

- [ ] **Step 3: Add the route and header tool**

- Import `TableProperties` from `lucide-react`.
- Render a `HeaderTool` labeled `Таблицы` between `Контакты` and `Маркетинг`.
- Map and open the `tables` main board.
- Resolve direct `?board=tables` navigation in `getAnalyticsTabForBoard`.
- Add only a `.analytics-header-tables-button` accent rule; reuse all existing tool dimensions.
- Add `test:tables` and prepend `node scripts/verify-tables-navigation.mjs` to `prebuild`.

- [ ] **Step 4: Run navigation verification GREEN**

Run: `node scripts/verify-tables-navigation.mjs`

Expected: exit code `0`.

- [ ] **Step 5: Commit the navigation slice after Task 4 supplies the rendered board**

```bash
git add scripts/verify-tables-navigation.mjs src/modules/analytics/components/AnalyticsHeader.jsx src/modules/analytics/AnalyticsPage.jsx src/modules/analytics/components/AnalyticsMainPanel.jsx src/modules/analytics/components/LaunchBoardRegistry.jsx src/modules/analytics/styles/analytics.css package.json
git commit -m "feat: add SuperSus tables navigation"
```

---

### Task 4: Build the editable table board

**Files:**
- Create: `src/modules/analytics/components/TablesBoard.jsx`
- Create: `src/modules/analytics/styles/tables.css`
- Modify: `scripts/verify-tables-navigation.mjs`

**Interfaces:**
- Consumes all model exports from Task 1.
- Consumes `loadServerContentResult`, `saveServerContent`, and `unlockMarketingContent` from `contentStore.js`.
- Produces default React component `<TablesBoard />`.

- [ ] **Step 1: Extend the failing integration test with UI outcomes**

Add checks that the component contains the two tab labels, source link, read/edit switch, row and column controls, save status, draft recovery, CSV/JSON exports, and a real grid with table semantics. The test must fail before the component exists.

- [ ] **Step 2: Run navigation/UI verification RED**

Run: `node scripts/verify-tables-navigation.mjs`

Expected: failure because `TablesBoard.jsx` is absent.

- [ ] **Step 3: Implement protected loading and draft recovery**

On mount:

```js
const result = await loadServerContentResult(TABLES_CONTENT_KEY);
if (result.status === 401) setLocked(true);
else if (!result.ok) setLoadError(true);
else {
  const next = result.exists ? result.value : createTablesSeed();
  const error = validateTablesDocument(next);
  if (error) setFormatError(error);
  else { setDocument(next); setBaseline(result.exists ? next : null); }
}
```

If `localStorage[TABLES_DRAFT_KEY]` contains a valid document different from the server value, show two explicit actions: restore it or keep the server copy. Do not silently choose either version.

- [ ] **Step 4: Implement edit, undo, and explicit save**

- Keep one previous document snapshot in `undoSnapshot` before every mutation.
- Every edit updates the local draft and sets the message to `Есть несохранённые изменения`.
- Disable server save when locked, loading, malformed, or not dirty.
- Use `saveTablesSafely` and map its exact errors to the approved save-state labels.
- On verified save, update the baseline, clear the draft and undo snapshot, and show `Сохранено на сервере`.
- Register `beforeunload` only while dirty.

- [ ] **Step 5: Implement the operational UI**

- Compact hero with title, subtitle, save state, source link, mode control, save, active-table CSV, and full JSON backup.
- Two accessible subtabs with 44 px minimum height.
- Notes strip on `Рост системы`.
- Horizontal grid with sticky header and first column.
- In edit mode, cell inputs, row delete action, column rename input, move-left, move-right, and delete controls.
- Add-row button appends an empty row.
- Add-column form rejects empty and duplicate labels before mutating state.
- Deletion uses an explicit confirmation and retains the pre-delete undo snapshot.

- [ ] **Step 6: Implement responsive styles**

Use an isolated `.tables-board` namespace. Desktop max width is `1600px`; surfaces use warm white, dark ink, subtle lines, orange action accent, 8 px maximum radius, no nested card shadows. At `max-width: 600px`, actions wrap, the table keeps minimum column widths, touch controls remain at least 44 px, and only the grid scrolls horizontally.

- [ ] **Step 7: Run model, navigation, and build checks GREEN**

Run: `node scripts/verify-tables.mjs`

Run: `node scripts/verify-tables-navigation.mjs`

Run: `npm run build`

Expected: all exit `0`; existing bundle-size and `lottie-web eval` warnings may remain but no new warnings are introduced.

- [ ] **Step 8: Commit the UI slice**

```bash
git add src/modules/analytics/components/TablesBoard.jsx src/modules/analytics/styles/tables.css scripts/verify-tables-navigation.mjs package.json
git commit -m "feat: add editable SuperSus tables workspace"
```

---

### Task 5: Verify the full feature in a real browser

**Files:**
- Modify only if verification exposes a reproducible defect; add a failing regression assertion before each fix.

**Interfaces:**
- Consumes the complete feature from Tasks 1–4.
- Produces fresh test, build, and visual evidence.

- [ ] **Step 1: Run the complete automated gate**

Run: `npm run test:tables`

Run: `npm run test:departments`

Run: `npm run build`

Expected: all commands exit `0`.

- [ ] **Step 2: Start isolated local services**

Run the content API with a temporary `ATLAS_CONTENT_STORE_DIR` and a non-production port. Run Vite with `VITE_CONTENT_API_BASE_URL` pointing to that API. Do not reuse or write production content during QA.

- [ ] **Step 3: Verify desktop behavior near 1440 px**

- Open `?board=tables`.
- Confirm the `Таблицы` header tool, two tabs, source link, seed values, sticky table structure, and no horizontal page overflow.
- Unlock through the temporary local test session, edit a cell, add a row and column, undo, save, reload, and confirm the saved result is read back.
- Confirm browser back/forward preserves both `board=tables` and `tableView`.

- [ ] **Step 4: Verify mobile behavior near 390 px**

- Confirm the header tool is reachable.
- Confirm tabs and primary actions remain tappable and do not overlap.
- Confirm the data grid scrolls horizontally without compressing text into unreadable columns.
- Confirm cell editing and save state remain visible.

- [ ] **Step 5: Inspect console and persisted files**

Confirm no new runtime errors. Confirm the temporary content store contains `supersus.tables.v1.json` and a backup after the second save. Do not treat a local result as a production deployment.

- [ ] **Step 6: Review the final diff and commit any verification fixes**

Run: `git diff --check`

Run: `git status --short`

If a regression fix was required, commit only its related test and implementation files with `fix: verify SuperSus tables workspace`.
