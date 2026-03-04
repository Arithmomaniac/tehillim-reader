import { AppSettings, DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'tehillim-reader-settings';

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applySettingsToDOM(settings: AppSettings): void {
  const root = document.documentElement;
  root.style.setProperty('--highlight-color', settings.highlightColor);
  root.style.setProperty('--font-size', `${settings.fontSize}px`);
}
