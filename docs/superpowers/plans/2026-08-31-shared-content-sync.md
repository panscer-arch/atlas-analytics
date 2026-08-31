# Shared Content Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the team graph, visible SMM content plan, and CRM-board ideas on the shared server without losing the owner's existing local data.

**Architecture:** Reuse the generic content API and keep localStorage as cache/fallback. Add tested pure migration helpers so untouched default browsers cannot seed or overwrite shared data, then wire each section to server hydration and debounced writes.

**Tech Stack:** Vite, React 18, Node verification scripts, existing `/api/content/:key` service.

**Spec:** `docs/superpowers/specs/2026-08-31-shared-content-sync.md`

## Global Constraints

- Do not migrate the diary, Hermes history, access state, themes, selected users, or filters.
- Existing customized local data must be eligible for one-time migration.
- A built-in default snapshot must never overwrite an existing customized server snapshot.
- Do not deploy, push, or enable external integrations in this task.

---

### Task 1: Shared migration policy

**Files:**
- Create: `src/modules/analytics/utils/sharedContentMigration.js`
- Create: `scripts/verify-shared-content-sync.mjs`

**Interfaces:**
- Produces: `isSameContent(left, right)`, `resolveSharedContent({ serverResult, localValue, defaultValue })`, and `mergeRecordsById(primary, fallback)`.

- [ ] Write failing Node assertions for server precedence, custom-local migration, untouched defaults, default-server replacement, and stable-ID merging.
- [ ] Run `node scripts/verify-shared-content-sync.mjs` and confirm failure because the helper is absent.
- [ ] Implement the pure helper functions.
- [ ] Run the verification script and confirm all assertions pass.

### Task 2: Team graph server persistence

**Files:**
- Modify: `src/modules/analytics/components/TeamGraphBoard.jsx`
- Modify: `scripts/verify-shared-content-sync.mjs`

**Interfaces:**
- Consumes: `resolveSharedContent` and the existing `loadServerContentResult` / `saveServerContent` API.
- Produces: server hydration, safe one-time local migration, debounced server writes, and an accurate save badge for `supersus.teamGraph.v3`.

- [ ] Extend the failing migration-policy tests for customized team data.
- [ ] Run the verification script and confirm the new policy assertion fails.
- [ ] Wire hydration and writes while retaining the local cache.
- [ ] Run the verification script and confirm it passes.

### Task 3: SMM content-plan server persistence

**Files:**
- Modify: `src/modules/analytics/hooks/useContentPlanSmmState.js`
- Modify: `src/modules/analytics/components/ContentPlanBoard.jsx`
- Modify: `scripts/verify-shared-content-sync.mjs`

**Interfaces:**
- Consumes: `resolveSharedContent`, `SMM_ROWS_STORAGE_KEY`, and `SMM_APPROVAL_STORAGE_KEY`.
- Produces: server-backed rows and approvals plus `saveState` for the visible SMM board.

- [ ] Extend the failing migration-policy tests for default and customized row/approval objects.
- [ ] Run the verification script and confirm the new policy assertion fails.
- [ ] Add server hydration, local migration, debounced saves, and save-state reporting.
- [ ] Feed the SMM save state into the board badge.
- [ ] Run the verification script and confirm it passes.

### Task 4: CRM-board ideas and signals

**Files:**
- Modify: `src/modules/analytics/components/AnalyticsIdeaCapture.jsx`
- Modify: `public/analytics-board/index.html`
- Modify: `scripts/verify-shared-content-sync.mjs`

**Interfaces:**
- Consumes: `mergeRecordsById` in React and an equivalent stable-ID merge in the standalone board.
- Produces: server-backed idea submission, server signal hydration, and server-backed deletion.

- [ ] Add failing stable-ID collection tests for first migration and server authority after migration.
- [ ] Run the verification script and confirm those assertions fail.
- [ ] Persist both recent ideas and board signals from React.
- [ ] Hydrate, migrate, save, and delete signals in the standalone board.
- [ ] Run the verification script and confirm it passes.

### Task 5: Full verification

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: repeatable `test:shared-content` command.

- [ ] Add `test:shared-content` to package scripts.
- [ ] Run `npm run test:shared-content`.
- [ ] Run `npm run build`.
- [ ] Inspect `git diff --check`, `git status --short`, and the complete diff for scope.
