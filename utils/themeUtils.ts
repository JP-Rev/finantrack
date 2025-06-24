export const THEME_STORAGE_KEY = 'finantrack_theme';

export enum AvailableThemes {
  LIGHT = 'light',
  DARK = 'dark',
}

export const applyTheme = (themeName: AvailableThemes): void => {
  const root = document.documentElement;
  if (themeName === AvailableThemes.DARK) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  } catch (error) {
    console.warn('Could not save theme to localStorage:', error);
  }
};

export const loadAndApplyInitialTheme = (): AvailableThemes => {
  let storedTheme: AvailableThemes = AvailableThemes.LIGHT; // Default to light
  try {
    const themeFromStorage = localStorage.getItem(THEME_STORAGE_KEY) as AvailableThemes | null;
    if (themeFromStorage && Object.values(AvailableThemes).includes(themeFromStorage)) {
      storedTheme = themeFromStorage;
    }
  } catch (error) {
     console.warn('Could not load theme from localStorage:', error);
  }
  
  // Check system preference if no theme is stored
  if (!localStorage.getItem(THEME_STORAGE_KEY) && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
     storedTheme = AvailableThemes.DARK;
  }

  applyTheme(storedTheme);
  return storedTheme;
};
