# SuperSUS UI Harness

This document is the local design contract for operational SuperSUS screens.
Read it before changing a board, modal, table, toolbar, or dashboard component.

## Product Character

SuperSUS is a private operating system for repeated work. It should feel calm,
compact, precise, and fast to scan. It is not a marketing site.

- Prefer a dense operational header over a hero section.
- Put the current state and the next useful action in the first viewport.
- Use cards only for repeated records or metrics. Do not nest cards.
- Keep surfaces at an 8px radius with quiet borders and minimal shadows.
- Use cyan for system state, orange for attention, green for success, and red
  only for genuine errors or blockers.
- One primary action per working area. Secondary actions should be visually
  quieter or icon-only when the icon is familiar.
- UI copy is Russian-first, literal, and short. Avoid promotional language.

## Layout Contract

- Desktop content must remain usable at 1440px without page-level horizontal
  scrolling.
- Mobile content must remain usable at 390px. Wide data tables may scroll only
  inside their own table container.
- Page sections are unframed layout bands or a single working surface. Avoid a
  stack of decorative containers.
- Controls must have stable heights and may not move the surrounding layout
  when loading text or counts change.
- Headings inside operational panels stay compact: 24-30px for a page title,
  16-20px for a panel title.

## Tokens

Canonical tokens live in:

`src/modules/analytics/styles/supersus-harness.css`

Do not introduce a new color, radius, shadow, or control height when an
existing token describes the same role.

## Components

Reusable primitives live in:

`src/modules/analytics/components/ui/SuperSusUi.jsx`

Use these primitives for buttons, metrics, status badges, and empty states.
Extend them only when the new behavior will be reused by another board.

## Required States

Every data board must define and visually verify:

- loading;
- loaded with data;
- empty result;
- recoverable error;
- attention/blocker;
- mobile table overflow;
- keyboard focus for controls.

## Change Workflow

1. Capture the existing screen before editing.
2. Preserve API calls, persistence, filters, and business rules unless the task
   explicitly changes them.
3. Build the screen from the shared tokens and primitives.
4. Run `npm run build`.
5. Run the board-specific visual check when one exists.
6. Inspect desktop and mobile screenshots.
7. Do not deploy until the local result is reviewed and approved.

## Pilot Acceptance Criteria: taskMonitor

- The monitor reads as a work queue, not a promotional dashboard.
- Check, refresh, and auto-check controls are visible without dominating.
- Attention tasks are a compact list, not a row of large cards.
- Metrics remain readable without occupying most of the first viewport.
- Search and status filters sit with the task table.
- Existing YouTrack API calls, Telegram notification behavior, filtering, and
  links remain unchanged.
