import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORKSPACE_THEME_KEY, readWorkspaceTheme, saveWorkspaceTheme } from '../src/modules/analytics/utils/workspaceTheme.js';

const values = new Map();
const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
assert.equal(readWorkspaceTheme(storage), 'dark');
assert.equal(readWorkspaceTheme(storage, '?designPreview=platinum'), 'light');
saveWorkspaceTheme(storage, 'light');
assert.equal(readWorkspaceTheme(storage), 'light');
saveWorkspaceTheme(storage, 'dark');
assert.equal(readWorkspaceTheme(storage, '?designPreview=platinum'), 'dark');
values.set(WORKSPACE_THEME_KEY, 'invalid');
assert.equal(readWorkspaceTheme(storage), 'dark');
const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
assert.equal(readWorkspaceTheme(blocked), 'dark');
assert.doesNotThrow(() => saveWorkspaceTheme(blocked, 'light'));
const css = readFileSync(new URL('../src/modules/analytics/styles/workspace-light.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--g-([\w-]+): (#[\da-f]{6});/g)].map(m => [m[1], m[2]]));
function luminance(hex) {
  return hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
for (const foreground of ['text', 'muted', 'accent']) for (const background of ['bg', 'panel', 'raised', 'input', 'active']) {
  const ratio = (luminance(tokens[background]) + .05) / (luminance(tokens[foreground]) + .05);
  assert.ok(ratio >= 4.5, `${foreground}/${background}: ${ratio}`);
}
for (const state of ['success', 'warning', 'danger']) {
  assert.ok((luminance(tokens[`${state}-soft`]) + .05) / (luminance(tokens[state]) + .05) >= 4.5);
}
console.log('Theme: defaults, saved preference, invalid/blocked storage and light palette contrast verified.');
