export type Theme = 'light' | 'dark'

export const resolveInitialTheme = (storedValue: string | null, prefersDark: boolean): Theme => {
  const isStoredTheme = storedValue === 'light' || storedValue === 'dark'

  if (isStoredTheme) return storedValue as Theme

  return prefersDark ? 'dark' : 'light'
}

export const toggleTheme = (current: Theme): Theme => {
  return current === 'dark' ? 'light' : 'dark'
}
