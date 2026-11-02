// Shared preference definitions and boot-time application.
//
// Preferences are stored per account in Supabase (and mirrored locally). A
// small global copy of the theme/language is kept so the correct appearance is
// applied before the auth session finishes restoring.

export const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', hint: 'Deep black, the default NutriFit look.' },
  { value: 'dim', label: 'Dim', hint: 'Softer charcoal surfaces for low light.' },
  { value: 'contrast', label: 'High contrast', hint: 'Brighter lines and text for readability.' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', locale: 'en-US' },
  { value: 'es', label: 'Español', locale: 'es-ES' },
  { value: 'fr', label: 'Français', locale: 'fr-FR' },
  { value: 'de', label: 'Deutsch', locale: 'de-DE' },
  { value: 'pt', label: 'Português', locale: 'pt-BR' },
  { value: 'fil', label: 'Filipino', locale: 'fil-PH' },
];

export const NOTIFICATION_ITEMS = [
  { key: 'daily', label: 'Daily check-in', hint: 'A nudge to log meals, water and training.' },
  { key: 'hydration', label: 'Hydration reminders', hint: 'Remind me when I am behind on water.' },
  { key: 'streak', label: 'Streak alerts', hint: 'Let me know before a streak is about to end.' },
  { key: 'weekly', label: 'Weekly summary', hint: 'A recap of progress every week.' },
];

export const DEFAULT_NOTIFICATIONS = {
  daily: true,
  hydration: true,
  streak: true,
  weekly: false,
};

export const DEFAULT_SETTINGS = {
  notifications: { ...DEFAULT_NOTIFICATIONS },
  theme: 'dark',
  language: 'en',
  units: 'metric',
};

const THEME_VALUES = new Set(THEME_OPTIONS.map((option) => option.value));
const LANGUAGE_VALUES = new Set(LANGUAGE_OPTIONS.map((option) => option.value));
const UNIT_VALUES = new Set(['metric', 'imperial']);

let activeLocale = 'en-US';

export const languageLocale = (value) =>
  LANGUAGE_OPTIONS.find((option) => option.value === value)?.locale || 'en-US';

export const languageLabel = (value) =>
  LANGUAGE_OPTIONS.find((option) => option.value === value)?.label || 'English';

export const themeLabel = (value) =>
  THEME_OPTIONS.find((option) => option.value === value)?.label || 'Dark';

export const normalizeSettings = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const notifications =
    source.notifications && typeof source.notifications === 'object' ? source.notifications : {};

  return {
    notifications: NOTIFICATION_ITEMS.reduce(
      (next, item) => ({
        ...next,
        [item.key]:
          typeof notifications[item.key] === 'boolean'
            ? notifications[item.key]
            : DEFAULT_NOTIFICATIONS[item.key],
      }),
      {}
    ),
    theme: THEME_VALUES.has(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
    language: LANGUAGE_VALUES.has(source.language) ? source.language : DEFAULT_SETTINGS.language,
    units: UNIT_VALUES.has(source.units) ? source.units : DEFAULT_SETTINGS.units,
  };
};

export const enabledNotificationCount = (settings) =>
  NOTIFICATION_ITEMS.filter((item) => settings?.notifications?.[item.key]).length;

export const getLocale = () => activeLocale;

export const applyPreferences = (settings) => {
  const normalized = normalizeSettings(settings);
  activeLocale = languageLocale(normalized.language);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = normalized.theme;
    document.documentElement.lang = normalized.language;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('nutrifit:theme', normalized.theme);
      localStorage.setItem('nutrifit:language', normalized.language);
    } catch {
      // Private mode or full storage: preferences still apply for this session.
    }
  }

  return normalized;
};

// Applied before Vue mounts so a saved theme/language is visible immediately.
export const bootPreferences = () => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;

  let theme = DEFAULT_SETTINGS.theme;
  let language = DEFAULT_SETTINGS.language;
  try {
    theme = localStorage.getItem('nutrifit:theme') || theme;
    language = localStorage.getItem('nutrifit:language') || language;
  } catch {
    // ignore
  }

  return applyPreferences({ theme, language });
};
