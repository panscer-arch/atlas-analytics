# Shared Content Sync Design

## Scope

Move collaborative browser-only data to the existing `/api/content/:key` store:

- team graph (`supersus.teamGraph.v3`);
- visible SMM content-plan rows and approvals;
- CRM analytics-board ideas and signals.

Keep the diary, Hermes conversation history, access state, themes, selected users, filters, and other personal UI preferences local.

## Source of truth and migration

The server is the source of truth once a valid record exists. `localStorage` remains a cache and offline fallback.

On the first release, a browser uploads a local record only when it differs from the built-in default. This prevents a colleague with an untouched browser from seeding defaults before the owner's richer local dataset is opened. When both a server record and an unmigrated local record exist, the local record may replace the server only when the server still equals the built-in default; otherwise the server wins.

Signals are merged once by stable `id`, then the server becomes authoritative. Deletes are written to both server and local cache so they do not reappear on the same browser.

## Save behavior

Edits write to local cache immediately and to the server with a short debounce. UI save badges distinguish server success from a local-only fallback. Page close/visibility changes flush pending shared edits where the component already supports that pattern.

## Verification

- Pure migration tests cover default, local-custom, server-custom, and stable-ID merge cases.
- The production build verifies that all three visible sections compile against the shared content API.
- Production build must pass.
