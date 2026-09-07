export const WORKSPACE_THEME_KEY = 'supersus.colorMode.v1';

export function readWorkspaceTheme(storage, search = '') {
  try {
    const saved = storage?.getItem(WORKSPACE_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* The switch still works when browser storage is unavailable. */ }
  return new URLSearchParams(search).get('designPreview') === 'platinum' ? 'light' : 'dark';
}

export function saveWorkspaceTheme(storage, mode) {
  try { storage?.setItem(WORKSPACE_THEME_KEY, mode); } catch { /* Session-only preference. */ }
}
