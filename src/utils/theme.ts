/**
 * Check if the theme is dark
 * @returns true if the theme is dark, false otherwise
 */
export function themeIsDark() {
  return getComputedStyle(document.documentElement).getPropertyValue('--theme-is-dark') === '1';
}
