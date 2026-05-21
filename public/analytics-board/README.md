# Analytics CRM Board

This folder is the canonical bundled CRM/Kanban board for the analytics module.

It is intentionally committed into the repository so the board is not only a
local browser artifact. The main analytics UI embeds this board from
`/analytics-board/` in the `CRM-доска` tab and can also open it as a fullscreen
working layer from the page header.

Files:

- `index.html` — the board UI and client-side behavior.
- `status.json` — seeded task status/progress data.
- `signals.json` — seeded incoming ideas/backlog items.

