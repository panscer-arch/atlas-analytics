# SuperSus Tables — Design Specification

**Status:** Approved direction, implementation pending  
**Date:** 2026-09-06  
**Product:** SuperSus System  
**Source spreadsheet:** [Таблица рост системы](https://docs.google.com/spreadsheets/d/1NDEI465gm7JQf4jIzB85yny2y0KCSl7JvTnY9qh_pKM/edit?gid=0#gid=0)

## 1. Purpose

Add a protected, native table workspace to SuperSus so the team can keep, edit, extend, and export the two planning tables currently stored in one Google Sheet. SuperSus becomes the source of truth after the initial import. The Google Sheet remains a read-only reference and backup link; there is no automatic two-way synchronization in version 1.

## 2. Observed source structure

The Google workbook contains one visible sheet, `Лист1`, with two separate data regions:

1. `A1:H19` — the named table `Рост системы`, including twelve monthly rows, a yearly plan row, and four planning notes.
2. `A25:F32` — a second table for liquidity and required inflow planning.

The initial SuperSus seed must preserve the visible values and blanks instead of inventing missing calculations.

### Table 1: Рост системы

Columns:

1. Месяца
2. Поток за месяц
3. Поток в день
4. Новых кошельков за месяц
5. Новых кошельков в день
6. Циклов в месяц
7. Циклов в день
8. Заработок платформы в месяц

Rows:

| Месяца | Поток за месяц | Поток в день | Новых кошельков за месяц | Новых кошельков в день | Циклов в месяц | Циклов в день | Заработок платформы в месяц |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Август 2026 | 1.500.000 | 50.000 | 900 | 30 | 4.500 | 150 | 75.000 |
| Сентябрь 2026 | 2.300.000 | 75.000 | 1.350 | 45 | 6.750 | 225 | 115.000 |
| Октябрь 2026 | 3.400.000 | 113.000 | 2.040 | 68 | 10.140 | 338 | 170.000 |
| Ноябрь 2026 | 5.100.000 | 169.000 | 3.030 | 101 | 15.180 | 506 | 255.000 |
| Декабрь 2026 | 7.600.000 | 253.000 | 4.560 | 152 | 22.770 | 759 | 380.000 |
| Январь 2027 | 11.400.000 | 380.000 | 6.840 | 228 | 34.170 | 1.139 | 570.000 |
| Февраль 2027 | 17.100.000 | 570.000 | 10.260 | 342 | 51.270 | 1.709 | 855.000 |
| Март 2027 | 25.600.000 | 854.000 | 15.390 | 513 | 76.890 | 2.563 | 1.280.000 |
| Апрель 2027 | 38.400.000 | 1.281.000 | 23.070 | 769 | 115.320 | 3.844 | 1.920.000 |
| Май 2027 | 57.700.000 | 1.922.000 | 34.590 | 1.153 | 173.010 | 5.767 | 2.885.000 |
| Июнь 2027 | 86.500.000 | 2.883.000 | 51.900 | 1.730 | 259.500 | 8.650 | 4.325.000 |
| Июль 2027 | 129.700.000 | 4.325.000 | 77.850 | 2.595 | 389.250 | 12.975 | 6.485.000 |
| План на год | 386.300.000 |  | 231.780 |  |  |  | 19.315.000 |

Planning notes:

- `5% с оборота`
- `13%+ выплаты по рефке с входящего потока`
- `$330 — размер среднего цикла`
- `Процент выполнения плана на месяц и на год добавить в админку`

### Table 2: План ликвидности

Columns:

1. Месяцы
2. LP
3. Необходимая сумма в месяц
4. Необходимая сумма в день
5. Входящий поток в месяц
6. Входящий поток в сутки

Rows:

| Месяцы | LP | Необходимая сумма в месяц | Необходимая сумма в день | Входящий поток в месяц | Входящий поток в сутки |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 сентября | $700.000 | $300.000 | $10.000 | $1.500.000 | $50.000 |
| 1 октября | $1.000.000 | $400.000 |  | $2.100.000 | $70.000 |
| 1 ноября | $1.400.000 | $600.000 |  | $3.000.000 | $100.000 |
| 1 декабря | $2.000.000 | $800.000 |  | $4.200.000 | $140.000 |
| 1 января | $2.800.000 | $1.200.000 |  | $6.000.000 | $200.000 |
| 1 февраля | $4.000.000 | $2.000.000 |  | $8.500.000 | $285.000 |
| 1 марта | $6.000.000 |  |  | $12.000.000 | $400.000 |

## 3. Navigation and page structure

- Add a compact `Таблицы` tool to the existing SuperSus header, using the same dimensions, tooltip behavior, and visual language as `Контакты` and `Маркетинг`.
- Route: `?board=tables`.
- Add `tables` to the main board route registry so browser back/forward and direct links work.
- Do not add another item to the already dense primary tab row.
- The page title is `Таблицы` with the subtitle `Планы роста и ликвидности`.
- The page contains two internal tabs:
  - `Рост системы`
  - `План ликвидности`
- Internal tab state is reflected in `tableView=growth|liquidity` so each table has a stable direct link.

## 4. Editing experience

The page has explicit `Просмотр` and `Редактирование` modes.

In edit mode users can:

- edit any cell as text;
- add a blank row;
- delete a row;
- add a column with a non-empty unique title;
- rename a column;
- move a column left or right;
- delete a column while preventing deletion of the final remaining column;
- edit the planning notes for `Рост системы`;
- undo the latest structural or cell change before saving.

The first column and header remain sticky while the table scrolls horizontally. Buttons have visible labels or accessible names. Destructive controls require an explicit confirmation in the product UI, and the undo action remains available until the next save.

Version 1 is a structured editable grid, not an Excel-compatible formula engine. Values are preserved as entered. SuperSus must not invent formulas or fill currently blank cells.

## 5. Save and recovery model

### Source of truth

- Server key: `supersus.tables.v1`.
- The first successful save creates the server document from the approved seed.
- Once server data exists, it always wins over the bundled seed.

### Protection

- Read and write require the existing authenticated SuperSus marketing browser session, matching the protected departments board.
- Writes are accepted only from the approved production origins or matching localhost development origin.
- The existing content API backup routine runs before replacing server content.

### Conflict and loss prevention

- Keep the last server-loaded value as the baseline.
- Before save, read the current server value and compare it with the baseline.
- If another editor changed the server document, stop and show a conflict message; never overwrite it silently.
- After a successful PUT, read the document back and compare it with the submitted snapshot before showing `Сохранено на сервере`.
- Keep each unsaved edit in `localStorage` under `supersus.tables.v1.draft`.
- Warn before closing or navigating away while unsaved changes exist.
- Allow the user to discard a draft and reload the server copy.

Save states shown in the interface:

- `Загружено с сервера`
- `Начальные данные · ещё не сохранены`
- `Есть несохранённые изменения`
- `Сохраняю…`
- `Сохранено на сервере`
- `Конфликт версий`
- `Ошибка сохранения`

## 6. Data model

```js
{
  version: 1,
  source: {
    title: "Таблица рост системы",
    url: "https://docs.google.com/spreadsheets/d/1NDEI465gm7JQf4jIzB85yny2y0KCSl7JvTnY9qh_pKM/edit?gid=0#gid=0",
    sheet: "Лист1",
    capturedAt: "2026-09-06"
  },
  tables: [
    {
      id: "growth",
      title: "Рост системы",
      sourceRange: "A1:H19",
      columns: [{ id: "month", label: "Месяца" }],
      rows: [{ id: "growth-2026-08", cells: { month: "Август 2026" } }],
      notes: [{ id: "turnover", text: "5% с оборота" }]
    }
  ]
}
```

IDs are stable strings. Cell values and labels are strings with bounded length. The validator rejects malformed objects, duplicate table/column/row IDs, duplicate normalized column labels, unknown cell keys, oversized tables, and unsupported versions before rendering or saving.

Initial limits:

- maximum 10 tables in the document;
- maximum 100 columns per table;
- maximum 5,000 rows per table;
- maximum 500 characters per cell or column label;
- maximum 5,000 characters per note;
- maximum request size remains the existing 10 MB content API limit.

## 7. Export and source access

- `Экспорт CSV` downloads the active table with UTF-8 BOM and safely escaped cells.
- `Резервная копия JSON` downloads the complete validated document.
- A compact `Открыть исходник в Google Sheets` link opens the source workbook in a new tab.
- No background calls to Google are made from SuperSus.

## 8. Mobile behavior

- At approximately 390 px, the header tool remains reachable through the existing horizontal header layout.
- The page actions wrap into two rows without overlapping the title or save state.
- The internal tabs remain at least 44 px high.
- The data grid scrolls horizontally; columns keep useful minimum widths rather than compressing into unreadable cells.
- Row and column actions remain reachable by touch and do not depend on hover.

## 9. Error and empty states

- `401`: show the existing SuperSus unlock form and retry the read after successful authentication.
- Load failure: show an error and disable saving; do not fall back to a seed that could overwrite server data.
- Invalid server document: show a format error, preserve the payload on the server, and disable editing.
- Draft exists: show `Восстановить черновик` and `Оставить серверную версию` choices.
- No search or filtering is required in version 1 because both initial tables are small.

## 10. Verification gates

Automated verification must cover:

- seed fidelity for both tables and notes;
- validation and normalization boundaries;
- row, cell, column, reorder, delete, and undo operations;
- conflict-safe save and read-back verification;
- authenticated read/write and cross-origin rejection for `supersus.tables.v1`;
- header button, `?board=tables`, `tableView` history behavior, and standalone rendering;
- CSV and JSON export behavior;
- no regression to contacts, departments, existing primary tabs, or current content keys.

Manual browser QA must cover the running local build at desktop width near 1440 px and mobile width near 390 px, including editing, a confirmed save against a temporary local content store, horizontal table scrolling, browser back/forward, refresh, and console errors.

## 11. Out of scope

- Two-way Google Sheets synchronization.
- Google OAuth or service-account setup.
- Arbitrary spreadsheet formulas, charts, merged cells, or conditional formatting.
- Public or unauthenticated access.
- Role-specific permissions beyond the existing protected SuperSus session.
- Automatic population of missing plan values.
