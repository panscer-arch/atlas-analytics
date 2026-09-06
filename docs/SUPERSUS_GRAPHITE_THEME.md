# SuperSUS Graphite

Approved Graphite is the default built-in workspace theme. The original logo,
header tool order, routes, stored records and API contracts are unchanged.
Explicit `designPreview=platinum` remains available for the earlier preview.

## Shared styling

- `styles/graphite-theme.css` defines surfaces, text, semantic statuses, focus,
  typography and the persistent Marketing sidebar.
- `build/graphite-theme.mjs` compiles paint-only overrides from legacy module CSS
  during Vite builds. It preserves selectors, media conditions and importance;
  it does not rewrite layout, visibility, state or data.
- The approved Marketing overview retains its existing preview styling.
- The internal listings CRM uses the same tokens through its shadow host.
- The local `/analytics-board/` iframe has its own small Graphite stylesheet.
- Images, chart series, exported slides and media previews retain their colors.
- External Passwords, CRM 1 and CRM 2 are separate applications, not themed here.

## Navigation

Marketing tools keep one left sidebar mounted while the right panel changes.
Existing `?board=` deep links and browser Back/Forward remain supported. At
850px and below the menu collapses and closes after selection. No storage-key
or server migration is needed.

## Verification

`npm run test:graphite` checks the CSS compiler's scope, semantic colors,
native progress track/fill distinction, responsive rules, shadow styles and
media exclusions. It also runs during `npm run build`.

With Playwright available, run:

```
node scripts/check-graphite-sidebar.cjs
node scripts/check-graphite-pages.cjs
```

Both use the local Vite server on port 4181. The sidebar check also accepts
`CHECK_BASE_URL`. The 74-route sweep checks desktop and mobile page errors,
horizontal overflow, bright legacy surfaces and approximate text contrast.
It intercepts API calls in the test browser with local read-only fixtures;
its screenshots and counts are not production data or proof of integration
health. Reports are written under `/tmp/supersus-graphite-pages`.

Review screenshots and interactive dialogs separately. Native progress fallback
text is not rendered by modern browsers and is excluded from text-contrast
sampling. Preserve meaningful status/series colors when adding new components;
prefer the shared tokens directly in new styles.
